import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildCrashDetailAccidents,
  buildCrashDetailSummary,
  buildCrashFactorSummary,
  normalizeCrashDetailHeader,
  normalizeCrashDetailPartyRecord,
} from '../src/utils/crashDetails';
import type { CrashDetailPartyRecord } from '../src/types/accident';

type RawCrashDetailFileReport = {
  file: string;
  sourceResource: string;
  rawRows: number;
  convertedRows: number;
  skippedRows: number;
};

const RAW_DIR = path.resolve('data/raw/crash-details');
const OUTPUT_DIR = path.resolve('public/data');

function recordsFromJson(payload: unknown): Record<string, string | number | null | undefined>[] {
  if (!payload || typeof payload !== 'object') return [];
  const candidate = payload as Record<string, unknown>;
  const result = candidate.result;
  const arrays = [
    Array.isArray(result) ? result : undefined,
    result && typeof result === 'object' ? (result as Record<string, unknown>).results : undefined,
    result && typeof result === 'object' ? (result as Record<string, unknown>).records : undefined,
    result && typeof result === 'object' ? (result as Record<string, unknown>).data : undefined,
    candidate.results,
    candidate.records,
    candidate.data,
  ];
  const rows = arrays.find(Array.isArray) ?? [];
  return rows.filter((row): row is Record<string, string | number | null | undefined> => Boolean(row && typeof row === 'object'));
}

function sourceResourceFromFile(filename: string): string {
  return filename.replace(/-offset-\d+\.json$/i, '').replace(/\.(csv|json)$/i, '');
}

async function parseJsonFile(filename: string) {
  const payload = JSON.parse(await readFile(path.join(RAW_DIR, filename), 'utf8')) as unknown;
  return recordsFromJson(payload);
}

async function parseCsvFile(filename: string) {
  const buffer = await readFile(path.join(RAW_DIR, filename));
  const utf8 = buffer.toString('utf8');
  const decoded = utf8.includes('\uFFFD') ? iconv.decode(buffer, 'cp950') : utf8;
  return parse(decoded, {
    columns: (headers: string[]) => headers.map(normalizeCrashDetailHeader),
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true,
    trim: true,
  }) as Record<string, string | number | null | undefined>[];
}

async function convertFile(filename: string): Promise<{ records: CrashDetailPartyRecord[]; report: RawCrashDetailFileReport }> {
  const rows = filename.toLowerCase().endsWith('.csv') ? await parseCsvFile(filename) : await parseJsonFile(filename);
  const sourceResource = sourceResourceFromFile(filename);
  const records = rows
    .map((row, index) => normalizeCrashDetailPartyRecord(row, sourceResource, index))
    .filter((record): record is CrashDetailPartyRecord => Boolean(record));

  return {
    records,
    report: {
      file: filename,
      sourceResource,
      rawRows: rows.length,
      convertedRows: records.length,
      skippedRows: rows.length - records.length,
    },
  };
}

async function rawFiles(): Promise<string[]> {
  try {
    const entries = await readdir(RAW_DIR);
    return entries
      .filter((entry) => entry !== 'resource-index.json')
      .filter((entry) => /\.(json|csv)$/i.test(entry))
      .sort();
  } catch {
    return [];
  }
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const files = await rawFiles();
  const conversions = await Promise.all(files.map(convertFile));
  const partyRecords = conversions.flatMap((conversion) => conversion.records);
  const accidentRecords = buildCrashDetailAccidents(partyRecords);
  const detailSummary = buildCrashDetailSummary(accidentRecords, partyRecords);
  const factorSummary = buildCrashFactorSummary(partyRecords);
  const report = {
    generatedAt: new Date().toISOString(),
    inputDirectory: RAW_DIR,
    outputDirectory: OUTPUT_DIR,
    inputFiles: files,
    totalRawRows: conversions.reduce((sum, conversion) => sum + conversion.report.rawRows, 0),
    totalPartyRecords: partyRecords.length,
    totalAccidentRecords: accidentRecords.length,
    totalSkippedRows: conversions.reduce((sum, conversion) => sum + conversion.report.skippedRows, 0),
    missingCoordinatePartyCount: detailSummary.missingCoordinatePartyCount,
    outlierCoordinatePartyCount: detailSummary.outlierCoordinatePartyCount,
    byFile: conversions.map((conversion) => conversion.report),
  };

  await Promise.all([
    writeFile(path.join(OUTPUT_DIR, 'crash-detail-party-records.json'), JSON.stringify(partyRecords), 'utf8'),
    writeFile(path.join(OUTPUT_DIR, 'crash-detail-accidents.json'), JSON.stringify(accidentRecords), 'utf8'),
    writeFile(path.join(OUTPUT_DIR, 'crash-detail-summary.json'), JSON.stringify(detailSummary, null, 2), 'utf8'),
    writeFile(path.join(OUTPUT_DIR, 'crash-factor-summary.json'), JSON.stringify(factorSummary, null, 2), 'utf8'),
    writeFile(path.join(OUTPUT_DIR, 'crash-detail-conversion-report.json'), JSON.stringify(report, null, 2), 'utf8'),
  ]);

  console.table(report.byFile);
  console.log(`Converted ${report.totalPartyRecords.toLocaleString()} party rows`);
  console.log(`Deduplicated accidents: ${report.totalAccidentRecords.toLocaleString()}`);
  console.log(`Missing coordinates: ${report.missingCoordinatePartyCount}`);
  console.log(`Coordinate outliers: ${report.outlierCoordinatePartyCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
