import { createHash } from 'node:crypto';
import { mkdir, writeFile, rename, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RAW_DIR = path.resolve('data/raw/neihu-congestion');
export const SOURCE_EDITIONS = [
  { id: 'A', resourceId: '47cb9090-e1c9-4b1d-b299-b11c375c5ee2', file: 'vd-static.xml', url: 'https://tcgbusfs.blob.core.windows.net/blobtisv/VD.xml', edition: 'taipei-vd-static-v2' },
  { id: 'B', resourceId: 'e57afe7f-3c9e-4f31-9208-eed859a92600', file: 'vd-dynamic.xml', url: 'https://tcgbusfs.blob.core.windows.net/blobtisv/GetVDDATA.xml', edition: 'taipei-vd-legacy' },
  { id: 'C', resourceId: 'b5aaf33a-a6dc-4836-bce6-09986241fe11', file: 'road-speed.xml.gz', url: 'https://tcgbusfs.blob.core.windows.net/blobtisv/GetVD.xml.gz', edition: 'taipei-road-speed-legacy' },
  { id: 'D', resourceId: 'e3aa9aa3-6e77-4537-8b7a-4a41908b2089', file: 'sections.xml', url: 'https://tcgbusfs.blob.core.windows.net/blobtisv/Section.xml', edition: 'taipei-section-v2' },
  { id: 'E', resourceId: '6ccdeddb-c66a-4cf5-8742-46c322f01b3b', file: 'travel-time.xml', url: 'https://tcgbusfs.blob.core.windows.net/blobtisv/ETagPairLive.xml', edition: 'taipei-etag-live-v2' },
  { id: 'F', resourceId: '9a5139ca-f3fe-494e-a737-5f761c037f37', file: 'travel-pairs.xml', url: 'https://tcgbusfs.blob.core.windows.net/blobtisv/ETagPair.xml', edition: 'taipei-etag-pair-v2' },
] as const;
export const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export interface RetainedSource { id: string; resourceId: string; file: string; url: string; edition: string; sha256: string; bytes: number; retrievedAt: string; httpStatus: number }
export interface AcquisitionManifest { schemaVersion: '1.0.0'; sources: RetainedSource[] }

export async function boundedFetch(url: string, fetcher: typeof fetch = fetch): Promise<Buffer> {
  if (!SOURCE_EDITIONS.some(source => source.url === url)) throw new Error('Unreviewed endpoint');
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
    if (response.status === 429 && attempt === 0) {
      const header = response.headers.get('retry-after');
      const seconds = header && /^\d+$/.test(header) ? Number(header)
        : header && Number.isFinite(Date.parse(header)) ? Math.max(0, Math.ceil((Date.parse(header) - Date.now()) / 1000)) : 1;
      await response.body?.cancel();
      if (seconds > 5) throw new Error('Rate limited; retry deferred to a later manual acquisition');
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      continue;
    }
    if (!response.ok) throw new Error(`Official source HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty response');
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('Source exceeds reviewed 4 MiB bound'); }
      chunks.push(value);
    }
    if (!size) throw new Error('Empty source');
    return Buffer.concat(chunks);
  }
  throw new Error('Rate limit retry exhausted');
}

export async function fetchNeihuSources() {
  await mkdir(RAW_DIR, { recursive: true });
  if (!process.argv.includes('--refresh')) {
    try { await readFile(path.join(RAW_DIR, 'manifest.json')); console.log('Retained acquisition exists; use --refresh for an intentional new edition.'); return; } catch { /* first acquisition */ }
  }
  const retained: RetainedSource[] = [];
  // Stage all resources; publication of the manifest is the commit point.
  for (const source of SOURCE_EDITIONS) {
    const body = await boundedFetch(source.url);
    const digest = sha256(body);
    const file = `${digest.slice(0, 16)}-${source.file}`;
    await writeFile(path.join(RAW_DIR, file), body);
    retained.push({ ...source, file, sha256: digest, bytes: body.length, retrievedAt: new Date().toISOString(), httpStatus: 200 });
  }
  const manifest: AcquisitionManifest = { schemaVersion: '1.0.0', sources: retained };
  await writeFile(path.join(RAW_DIR, 'manifest.pending.json'), JSON.stringify(manifest, null, 2) + '\n');
  await rename(path.join(RAW_DIR, 'manifest.pending.json'), path.join(RAW_DIR, 'manifest.json'));
  console.log(`Retained ${retained.length} official resources (${retained.reduce((n, s) => n + s.bytes, 0)} bytes).`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  fetchNeihuSources().catch(error => { console.error(String(error)); process.exitCode = 1; });
}
