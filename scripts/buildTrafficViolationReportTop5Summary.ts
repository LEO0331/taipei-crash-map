import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildTrafficViolationSummary } from '../src/utils/trafficViolations';
import type { AccidentSummary, TrafficViolationReportTop5StatisticRecord } from '../src/types/accident';

const OUTPUT_DIR = path.resolve('public/data');

async function main() {
  const records = JSON.parse(
    await readFile(path.join(OUTPUT_DIR, 'traffic-violation-report-top5-statistics-records.json'), 'utf8'),
  ) as TrafficViolationReportTop5StatisticRecord[];
  let crashSummary: AccidentSummary | undefined;
  try {
    crashSummary = JSON.parse(await readFile(path.join(OUTPUT_DIR, 'accident-summary.json'), 'utf8')) as AccidentSummary;
  } catch {
    crashSummary = undefined;
  }
  const summary = buildTrafficViolationSummary(records, crashSummary);
  await writeFile(
    path.join(OUTPUT_DIR, 'traffic-violation-report-top5-statistics-summary.json'),
    JSON.stringify(summary, null, 2),
  );
  await writeFile(
    path.join(OUTPUT_DIR, 'crash-dashboard-summary.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), trafficViolationReportTop5Statistics: summary }, null, 2),
  );
  console.log('Rebuilt reported violation summary');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
