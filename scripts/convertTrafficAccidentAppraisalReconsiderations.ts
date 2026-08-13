import { parse } from 'csv-parse/sync';
import iconv from 'iconv-lite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeAppraisalReconsiderationRows } from '../src/utils/appraisalReconsiderations';

const rawPath = path.resolve('data/raw/traffic-accident-appraisal-reconsiderations/source.csv');
const outDir = path.resolve('public/data/traffic-accident-appraisal-reconsiderations');
async function main() {
  const buffer = await readFile(rawPath);
  const utf8 = iconv.decode(buffer, 'utf8');
  const text = (utf8.includes('\uFFFD') ? iconv.decode(buffer, 'cp950') : utf8).replace(/^\uFEFF/, '');
  const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  const records = normalizeAppraisalReconsiderationRows(rows);
  const periods = records.map((record) => record.period).filter((period): period is string => Boolean(period));
  const missingPeriods: string[] = [];
  if (periods.length) {
    const [startYear, startMonth] = periods[0].split('-').map(Number); const [endYear, endMonth] = periods.at(-1)!.split('-').map(Number);
    for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth); month += 1) {
      if (month === 13) { year += 1; month = 1; }
      const period = `${year}-${String(month).padStart(2, '0')}`;
      if (!periods.includes(period)) missingPeriods.push(period);
    }
  }
  const duplicatePeriods = periods.filter((period, index) => periods.indexOf(period) !== index);
  const quality = [
    ...records.filter((record) => !record.period).map((record) => `Invalid period: ${record.periodRaw}`),
    ...records.filter((record) => [record.a1Rate, record.a2Rate, record.a3Rate].some((rate) => rate !== null && (rate < 0 || rate > 100))).map((record) => `Out-of-range percentage: ${record.periodRaw}`),
    ...[...new Set(duplicatePeriods)].map((period) => `Duplicate monthly period: ${period}`),
  ];
  const metadata = { sourceUrl: 'https://data.taipei/dataset/detail?id=9479ef01-8f57-40a0-b894-63f172595145', sourceUpdateDate: '2025-07-09 15:33:07', metadataUpdatedAt: '2026-04-17 15:28:28', ingestedAt: new Date().toISOString(), earliestPeriod: periods[0] ?? null, latestPeriod: periods.at(-1) ?? null, recordCount: records.length, missingPeriods, periodParsing: 'Source values use ROC YYYY年M月; Gregorian year = ROC year + 1911. Month is validated from 1 through 12 and no daily date is inferred.', fieldDefinitions: { period: '年/月', applicationsDiscussed: '申請件數_有進覆議會討論之件數', reconsiderationCases: '覆議件數_申請件數扣除不予覆議件數', judicialReferrals: '司法囑託', individualApplications: '個人申請', rejectedReconsiderations: '不予覆議', a1Cases: 'A1件數（總計）', a2Cases: 'A2件數（總計）', a3Cases: 'A3件數（總計）', a1Rate: 'A1比例_%', a2Rate: 'A2比例_%', a3Rate: 'A3比例_%' }, dataQuality: quality };
  await mkdir(outDir, { recursive: true });
  await Promise.all([writeFile(path.join(outDir, 'records.json'), JSON.stringify(records)), writeFile(path.join(outDir, 'metadata.json'), JSON.stringify(metadata, null, 2))]);
  console.log(`Converted ${records.length} monthly appraisal reconsideration records.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
