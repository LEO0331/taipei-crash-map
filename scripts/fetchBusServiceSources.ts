import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { BUS_RAW_DIR, BUS_SOURCES, COMPRESSED_LIMIT, decodeBusSource, sha256, atomicJson, immutableWrite, readBusSources, type BusAcquisitionManifest, type BusRetainedSource } from './busServiceSources';
export async function boundedBusFetch(url: string, fetcher: typeof fetch = fetch, sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))) {
  if (!BUS_SOURCES.some(s => s.url === url)) throw new Error('Unreviewed endpoint');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
      if (response.status === 429 || response.status >= 500) {
        const retry = response.headers.get('retry-after');
        const retryMs = retry ? /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now() : 0;
        await response.body?.cancel();
        if (attempt === 2 || retryMs > 5000) throw new Error(`HTTP ${response.status}: retry deferred`);
        await sleep(Math.max(500 * 2 ** attempt, Number.isFinite(retryMs) ? retryMs : 0)); continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error('Empty response');
      let size = 0; const chunks: Uint8Array[] = [];
      for await (const chunk of response.body) { size += chunk.byteLength; if (size > COMPRESSED_LIMIT) { throw new Error('Compressed size limit'); } chunks.push(chunk); }
      if (!size) throw new Error('Empty source');
      return { bytes: Buffer.concat(chunks), lastModified: response.headers.get('last-modified'), httpStatus: response.status };
    } catch (error) {
      // Only transient transport failures retry here; HTTP/schema/limit failures preserve last good manifest.
      if (attempt === 2 || !(error instanceof TypeError || (error instanceof Error && error.name === 'TimeoutError'))) throw error;
      await sleep(500 * 2 ** attempt);
    }
  }
  throw new Error('Retries exhausted');
}
export async function fetchBusServiceSources(refresh = false, rawDir = BUS_RAW_DIR) {
  await mkdir(rawDir, { recursive: true });
  if (!refresh) { try { await readFile(path.join(rawDir, 'manifest.json')); await readBusSources(rawDir); console.log('Validated retained bus edition; use --refresh to acquire a new edition.'); return; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
  const sources: BusRetainedSource[] = [];
  for (const source of BUS_SOURCES) {
    const result = await boundedBusFetch(source.url); const decoded = decodeBusSource(source.id, result.bytes); const hash = sha256(result.bytes); const file = `${hash}.gz`;
    await immutableWrite(path.join(rawDir, file), result.bytes);
    sources.push({ ...source, file, sha256: hash, bytes: result.bytes.length, decodedBytes: decoded.decodedBytes, recordCount: decoded.records.length, retrievedAt: new Date().toISOString(), sourceUpdatedAt: decoded.sourceUpdatedAt, lastModified: result.lastModified, httpStatus: result.httpStatus, schemaVersion: 'pto-api-v6.3' });
  }
  const manifest: BusAcquisitionManifest = { schemaVersion: '1.0.0', sources }; await atomicJson(path.join(rawDir, 'manifest.json'), manifest);
  console.log(`Retained ${sources.length} bus sources; ${sources.reduce((n,s)=>n+s.bytes,0)} compressed bytes.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) fetchBusServiceSources(process.argv.includes('--refresh')).catch(error => { console.error(String(error)); process.exitCode = 1; });
