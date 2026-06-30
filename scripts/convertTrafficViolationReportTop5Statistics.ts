import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildTrafficViolationSummary,
  normalizeTrafficViolationRows,
  TRAFFIC_VIOLATION_SOURCE,
} from '../src/utils/trafficViolations';
import type { AccidentSummary } from '../src/types/accident';

const RAW_DIR = path.resolve('data/raw/traffic-violation-report-top5-statistics');
const OUTPUT_DIR = path.resolve('public/data');

function decodeCsv(buffer: Buffer) {
  const utf8 = iconv.decode(buffer, 'utf8');
  if (!utf8.includes('\uFFFD')) return { text: utf8.replace(/^\uFEFF/, ''), encoding: 'utf-8-sig' };
  return { text: iconv.decode(buffer, 'cp950'), encoding: 'cp950' };
}

async function maybeCrashSummary(): Promise<AccidentSummary | undefined> {
  try {
    return JSON.parse(await readFile(path.join(OUTPUT_DIR, 'accident-summary.json'), 'utf8')) as AccidentSummary;
  } catch {
    return undefined;
  }
}

async function writeCombinedConversionReport(report: unknown) {
  const reportPath = path.join(OUTPUT_DIR, 'conversion-report.json');
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(await readFile(reportPath, 'utf8')) as Record<string, unknown>;
  } catch {
    existing = {};
  }
  await writeFile(
    reportPath,
    JSON.stringify({ ...existing, trafficViolationReportTop5Statistics: report }, null, 2),
  );
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const files = (await readdir(RAW_DIR)).filter((file) => file.endsWith('.csv')).sort();
  const rows: Record<string, string>[] = [];
  const fileReports: Array<{ file: string; encoding: string; rowCount: number }> = [];

  for (const file of files) {
    const decoded = decodeCsv(await readFile(path.join(RAW_DIR, file)));
    const parsed = parse(decoded.text, {
      columns: (headers: string[]) => headers.map((header) => header.trim()),
      skip_empty_lines: true,
      bom: true,
      trim: true,
    }) as Record<string, string>[];
    rows.push(...parsed);
    fileReports.push({ file, encoding: decoded.encoding, rowCount: parsed.length });
  }

  const records = normalizeTrafficViolationRows(rows);
  const duplicateKeys = new Map<string, number>();
  records.forEach((record) => {
    const key = `${record.year}|${record.cityCodeNormalized ?? ''}|${record.violationItemNormalized ?? record.violationItem}`;
    duplicateKeys.set(key, (duplicateKeys.get(key) ?? 0) + 1);
  });
  const duplicates = [...duplicateKeys.entries()].filter(([, count]) => count > 1);
  const summary = buildTrafficViolationSummary(records, await maybeCrashSummary());
  const latest = records
    .filter((record) => record.year === summary.latestYear)
    .sort((a, b) => (a.rankWithinYear ?? 99) - (b.rankWithinYear ?? 99));
  const report = {
    generatedAt: new Date().toISOString(),
    source: TRAFFIC_VIOLATION_SOURCE,
    sourceAgencyOfficialMetadata: '警察局交通大隊',
    rankingMethod: 'Dense rank by reportCount descending within Gregorian year.',
    files: fileReports,
    rawRows: rows.length,
    convertedRows: records.length,
    duplicateYearCityCodeViolationItemPairs: duplicates,
    notes: [
      'No geocoding is performed.',
      'No map markers are generated because the dataset has no coordinates, roads, intersections, or districts.',
    ],
  };

  await Promise.all([
    writeFile(
      path.join(OUTPUT_DIR, 'traffic-violation-report-top5-statistics-records.json'),
      JSON.stringify(records),
    ),
    writeFile(
      path.join(OUTPUT_DIR, 'traffic-violation-report-top5-statistics-summary.json'),
      JSON.stringify(summary, null, 2),
    ),
    writeFile(
      path.join(OUTPUT_DIR, 'traffic-violation-report-top5-statistics-latest.json'),
      JSON.stringify(latest, null, 2),
    ),
    writeFile(path.join(OUTPUT_DIR, 'traffic-violation-report-top5-statistics-report.json'), JSON.stringify(report, null, 2)),
    writeCombinedConversionReport(report),
    writeFile(
      path.join(OUTPUT_DIR, 'crash-dashboard-summary.json'),
      JSON.stringify({ generatedAt: new Date().toISOString(), trafficViolationReportTop5Statistics: summary }, null, 2),
    ),
  ]);

  console.log(`Converted reported violation records: ${records.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
