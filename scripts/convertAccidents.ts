import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ACCIDENT_TYPE_LABELS,
  aggregateByYear,
  buildHotspots,
  extractDistrict,
  isCoordinateOutlier,
  parseAccidentTime,
} from '../src/utils/accidents';
import type { AccidentRecord, AccidentSummary, AccidentType } from '../src/types/accident';

type RawCsvRow = Record<string, string | undefined>;

const CSV_FILES = [
  '/Users/Leo/Downloads/108年臺北市道路交通事故斑點圖(改A1A2).csv',
  '/Users/Leo/Downloads/109年臺北市道路交通事故斑點圖(改A1A2).csv',
  '/Users/Leo/Downloads/110年臺北市道路交通事故斑點圖(改A1A2).csv',
  '/Users/Leo/Downloads/111年臺北市道路交通事故斑點圖(改A1A2).csv',
  '/Users/Leo/Downloads/112年臺北市道路交通事故斑點圖.csv',
  '/Users/Leo/Downloads/113年臺北市道路交通事故斑點圖 .csv',
  '/Users/Leo/Downloads/114年臺北市道路交通事故斑點圖.csv',
];

const OUTPUT_DIR = path.resolve('public/data');

function cleanCell(value: string | undefined): string {
  return (value ?? '').replace(/^"+|"+$/g, '').trim();
}

function sourceYearFromFilename(filePath: string): number {
  const filename = path.basename(filePath);
  const match = filename.match(/^(\d{3})年/);
  if (!match) {
    throw new Error(`Cannot extract ROC year from ${filename}`);
  }
  return Number(match[1]) + 1911;
}

function toIsoWithTaipeiOffset(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:00+08:00`;
}

function normalizeHeader(header: string): string {
  return cleanCell(header).replace(/^\uFEFF/, '');
}

function parseAccidentType(raw: string): AccidentType | null {
  const cleaned = cleanCell(raw);
  if (cleaned.includes('1') || cleaned.toUpperCase().includes('A1')) return 1;
  if (cleaned.includes('2') || cleaned.toUpperCase().includes('A2')) return 2;
  return null;
}

async function convertFile(filePath: string) {
  const buffer = await readFile(filePath);
  const decoded = iconv.decode(buffer, 'cp950');
  const rows = parse(decoded, {
    columns: (headers: string[]) => headers.map(normalizeHeader),
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true,
    trim: true,
  }) as RawCsvRow[];

  const sourceYear = sourceYearFromFilename(filePath);
  const sourceFile = path.basename(filePath);
  const records: AccidentRecord[] = [];
  const report = {
    sourceFile,
    sourceYear,
    rawRows: rows.length,
    convertedRows: 0,
    skippedRows: 0,
    missingCoordinates: 0,
    coordinateOutliers: 0,
    invalidTimes: 0,
    invalidTypes: 0,
    decodeReplacementCharacters: (decoded.match(/\uFFFD/g) ?? []).length,
  };

  rows.forEach((row, rowIndex) => {
    const rawTime = cleanCell(row['發生時間']);
    const accidentType = parseAccidentType(cleanCell(row['處理別']));
    const location = cleanCell(row['肇事地點']);
    const longitude = Number(cleanCell(row['座標-X']));
    const latitude = Number(cleanCell(row['座標-Y']));
    const parsedTime = parseAccidentTime(rawTime);

    if (!accidentType) {
      report.invalidTypes += 1;
      report.skippedRows += 1;
      return;
    }

    if (!parsedTime) {
      report.invalidTimes += 1;
      report.skippedRows += 1;
      return;
    }

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      report.missingCoordinates += 1;
      report.skippedRows += 1;
      return;
    }

    const outlier = isCoordinateOutlier(longitude, latitude);
    if (outlier) {
      report.coordinateOutliers += 1;
    }

    const labels = ACCIDENT_TYPE_LABELS[accidentType];
    records.push({
      id: `${sourceYear}-${rowIndex + 1}`,
      year: sourceYear,
      accidentTime: toIsoWithTaipeiOffset(parsedTime),
      month: parsedTime.getMonth() + 1,
      weekday: parsedTime.getDay(),
      hour: parsedTime.getHours(),
      accidentType,
      accidentTypeLabelZh: labels.zh,
      accidentTypeLabelEn: labels.en,
      location,
      district: extractDistrict(location),
      longitude,
      latitude,
      sourceFile,
      ...(outlier ? { isCoordinateOutlier: true } : {}),
    });
  });

  report.convertedRows = records.length;
  return { records, report };
}

function buildSummary(records: AccidentRecord[]): AccidentSummary {
  const districtCounts = new Map<string, { district: string; totalCount: number; a1Count: number; a2Count: number }>();
  const hourCounts = new Map<number, { hour: number; totalCount: number; a1Count: number; a2Count: number }>();
  const districts = new Set<string>();
  const years = new Set<number>();
  let validCoordinateRecords = 0;
  let a1Count = 0;
  let a2Count = 0;

  for (let hour = 0; hour < 24; hour += 1) {
    hourCounts.set(hour, { hour, totalCount: 0, a1Count: 0, a2Count: 0 });
  }

  records.forEach((record) => {
    if (!record.isCoordinateOutlier && Number.isFinite(record.longitude) && Number.isFinite(record.latitude)) {
      validCoordinateRecords += 1;
    }

    years.add(record.year);
    if (record.district) districts.add(record.district);

    if (record.accidentType === 1) a1Count += 1;
    if (record.accidentType === 2) a2Count += 1;

    const hour = hourCounts.get(record.hour)!;
    hour.totalCount += 1;
    if (record.accidentType === 1) hour.a1Count += 1;
    if (record.accidentType === 2) hour.a2Count += 1;

    const districtName = record.district ?? '未辨識';
    const district = districtCounts.get(districtName) ?? {
      district: districtName,
      totalCount: 0,
      a1Count: 0,
      a2Count: 0,
    };
    district.totalCount += 1;
    if (record.accidentType === 1) district.a1Count += 1;
    if (record.accidentType === 2) district.a2Count += 1;
    districtCounts.set(districtName, district);
  });

  return {
    generatedAt: new Date().toISOString(),
    totalRecords: records.length,
    validCoordinateRecords,
    a1Count,
    a2Count,
    years: [...years].sort(),
    districts: [...districts].sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    byYear: aggregateByYear(records),
    byHour: [...hourCounts.values()],
    byDistrict: [...districtCounts.values()].sort((a, b) => b.totalCount - a.totalCount),
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const conversions = await Promise.all(CSV_FILES.map(convertFile));
  const records = conversions.flatMap((conversion) => conversion.records);
  const hotspots = buildHotspots(records, 500);
  const report = {
    generatedAt: new Date().toISOString(),
    inputFiles: CSV_FILES.map((filePath) => path.basename(filePath)),
    totalRawRows: conversions.reduce((sum, conversion) => sum + conversion.report.rawRows, 0),
    totalConvertedRows: records.length,
    totalSkippedRows: conversions.reduce((sum, conversion) => sum + conversion.report.skippedRows, 0),
    totalMissingCoordinates: conversions.reduce(
      (sum, conversion) => sum + conversion.report.missingCoordinates,
      0,
    ),
    totalCoordinateOutliers: conversions.reduce(
      (sum, conversion) => sum + conversion.report.coordinateOutliers,
      0,
    ),
    totalInvalidTimes: conversions.reduce((sum, conversion) => sum + conversion.report.invalidTimes, 0),
    totalInvalidTypes: conversions.reduce((sum, conversion) => sum + conversion.report.invalidTypes, 0),
    totalDecodeReplacementCharacters: conversions.reduce(
      (sum, conversion) => sum + conversion.report.decodeReplacementCharacters,
      0,
    ),
    byFile: conversions.map((conversion) => conversion.report),
  };

  await Promise.all([
    writeFile(path.join(OUTPUT_DIR, 'accidents.json'), JSON.stringify(records), 'utf8'),
    writeFile(path.join(OUTPUT_DIR, 'accident-summary.json'), JSON.stringify(buildSummary(records), null, 2), 'utf8'),
    writeFile(path.join(OUTPUT_DIR, 'accident-hotspots.json'), JSON.stringify(hotspots, null, 2), 'utf8'),
    writeFile(path.join(OUTPUT_DIR, 'conversion-report.json'), JSON.stringify(report, null, 2), 'utf8'),
  ]);

  console.table(report.byFile);
  console.log(`Converted ${report.totalConvertedRows.toLocaleString()} rows`);
  console.log(`Missing coordinates: ${report.totalMissingCoordinates}`);
  console.log(`Coordinate outliers: ${report.totalCoordinateOutliers}`);
  console.log(`Decode replacement characters: ${report.totalDecodeReplacementCharacters}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
