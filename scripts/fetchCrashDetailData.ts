import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_RESOURCE_ID = '83d6d29c-6801-41a2-95c6-47d551646db3';
const API_BASE = 'https://data.taipei/api/v1/dataset';
const RAW_DIR = path.resolve('data/raw/crash-details');
const DEFAULT_LIMIT = 1000;

type ResourceIndexEntry = {
  resourceId: string;
  fetchedAt: string;
  pages: Array<{ file: string; offset: number; limit: number; rowCount: number }>;
};

type ResourceIndex = {
  generatedAt: string;
  resources: ResourceIndexEntry[];
};

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function resourceIdsFromArgs(): string[] {
  const raw = argValue('resources') ?? argValue('resource') ?? DEFAULT_RESOURCE_ID;
  return raw
    .split(',')
    .map((resource) => resource.trim())
    .filter(Boolean);
}

function recordsFromPayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const candidate = payload as Record<string, unknown>;
  const result = candidate.result;
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    const resultObject = result as Record<string, unknown>;
    if (Array.isArray(resultObject.results)) return resultObject.results;
    if (Array.isArray(resultObject.records)) return resultObject.records;
    if (Array.isArray(resultObject.data)) return resultObject.data;
  }
  if (Array.isArray(candidate.results)) return candidate.results;
  if (Array.isArray(candidate.records)) return candidate.records;
  if (Array.isArray(candidate.data)) return candidate.data;
  return [];
}

async function readExistingIndex(): Promise<ResourceIndex> {
  try {
    const raw = await readFile(path.join(RAW_DIR, 'resource-index.json'), 'utf8');
    return JSON.parse(raw) as ResourceIndex;
  } catch {
    return { generatedAt: new Date().toISOString(), resources: [] };
  }
}

async function fetchResource(resourceId: string, limit: number): Promise<ResourceIndexEntry> {
  const pages: ResourceIndexEntry['pages'] = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${API_BASE}/${resourceId}`);
    url.searchParams.set('scope', 'resourceAquire');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${resourceId} offset ${offset}: ${response.status}`);
    }

    const payload = await response.json();
    const records = recordsFromPayload(payload);
    const file = `${resourceId}-offset-${offset}.json`;
    await writeFile(path.join(RAW_DIR, file), JSON.stringify(payload, null, 2), 'utf8');
    pages.push({ file, offset, limit, rowCount: records.length });

    if (records.length < limit || records.length === 0) break;
    offset += limit;
  }

  return {
    resourceId,
    fetchedAt: new Date().toISOString(),
    pages,
  };
}

async function main() {
  const resourceIds = resourceIdsFromArgs();
  const limit = Number(argValue('limit') ?? DEFAULT_LIMIT);
  await mkdir(RAW_DIR, { recursive: true });
  const existing = await readExistingIndex();
  const fetched = [];

  for (const resourceId of resourceIds) {
    fetched.push(await fetchResource(resourceId, limit));
  }

  const fetchedIds = new Set(fetched.map((entry) => entry.resourceId));
  const nextIndex: ResourceIndex = {
    generatedAt: new Date().toISOString(),
    resources: [...existing.resources.filter((entry) => !fetchedIds.has(entry.resourceId)), ...fetched],
  };
  await writeFile(path.join(RAW_DIR, 'resource-index.json'), JSON.stringify(nextIndex, null, 2), 'utf8');

  console.table(
    fetched.map((entry) => ({
      resourceId: entry.resourceId,
      pages: entry.pages.length,
      rows: entry.pages.reduce((sum, page) => sum + page.rowCount, 0),
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
