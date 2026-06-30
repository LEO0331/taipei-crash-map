import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { request } from 'node:https';

const RAW_DIR = path.resolve('data/raw/traffic-violation-report-top5-statistics');
const FORCE = process.argv.includes('--force');
const RESOURCE_URLS = [
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=8c105798-8fb5-46af-8ffb-693b24007494',
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=e64741ea-f8dc-41ec-a236-e872cbc6019c',
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=c4c925ed-2ee6-4ad7-b8c9-39190a529fb5',
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=cd1e16b0-a81f-485d-b26f-c44b04a675ef',
  'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=c76c0eb1-7904-4888-82ca-830d5dc428e5',
];

function download(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    request(url, (response) => {
      if (!response.statusCode || response.statusCode >= 400) {
        reject(new Error(`Download failed ${response.statusCode}: ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    })
      .on('error', reject)
      .end();
  });
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  const existing = (await readdir(RAW_DIR)).filter((file) => file.endsWith('.csv'));
  const downloads: Array<{ url: string; file: string; size: number }> = [];
  const warnings: string[] = [];

  for (const [index, url] of RESOURCE_URLS.entries()) {
    const file = `resource-${index + 1}.csv`;
    const outputPath = path.join(RAW_DIR, file);
    if (!FORCE && existing.includes(file)) {
      downloads.push({ url, file, size: (await stat(outputPath)).size });
      continue;
    }
    try {
      const body = await download(url);
      await writeFile(outputPath, body);
      downloads.push({ url, file, size: body.byteLength });
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  await writeFile(
    path.join(RAW_DIR, 'fetch-report.json'),
    JSON.stringify({ downloadedAt: new Date().toISOString(), downloads, warnings }, null, 2),
  );

  console.log(`Traffic violation raw CSV files available: ${downloads.length}`);
  warnings.forEach((warning) => console.warn(warning));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
