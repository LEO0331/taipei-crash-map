import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(resolve('public/sw.js'), 'utf8');

function worker(scopePath: string) {
  const scope = `https://example.test${scopePath}`;
  const listeners = new Map<string, (event: unknown) => void>();
  const stored = new Map<string, Response>();
  const key = (request: Request | string) => typeof request === 'string' ? new URL(request, scope).href : request.url;
  const cache = {
    addAll: vi.fn(async (_urls: string[]) => undefined),
    put: vi.fn(async (request: Request | string, response: Response) => { stored.set(key(request), response); }),
  };
  const caches = { open: vi.fn(async (_name: string) => cache), match: vi.fn(async (request: Request | string) => stored.get(key(request))?.clone()), keys: vi.fn(async () => ['taipei-crash-map-v3', 'taipei-crash-map-v4', 'portfolio-v1', 'taipei-safety-map-v1']), delete: vi.fn(async (_name: string) => true) };
  const fetch = vi.fn(async (_request: Request) => new Response('{"records":1}', { headers: { 'Content-Type': 'application/json' } }));
  runInNewContext(source, { URL, caches, fetch, self: { registration: { scope }, location: { origin: new URL(scope).origin }, addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener), skipWaiting: vi.fn(), clients: { claim: vi.fn() } } });
  async function lifecycle(name: string) {
    let pending: Promise<unknown> | undefined;
    listeners.get(name)!({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
  }
  async function request(path: string) {
    let response: Promise<Response> | undefined;
    listeners.get('fetch')!({ request: new Request(new URL(path, scope)), respondWith: (promise: Promise<Response>) => { response = promise; } });
    return response;
  }
  return { cache, caches, fetch, lifecycle, request };
}

describe.each(['/', '/taipei-crash-map/'])('service worker first load under %s', base => {
  it('precaches only the map essentials, never unused detailed datasets', async () => {
    const sw = worker(base);
    await sw.lifecycle('install');
    expect(sw.cache.addAll).toHaveBeenCalledOnce();
    expect(Array.from(sw.cache.addAll.mock.calls[0][0])).toEqual([
      base, `${base}manifest.webmanifest`, `${base}data/accident-summary.json`, `${base}data/accident-hotspots.json`,
    ]);
    expect(sw.caches.open).toHaveBeenCalledWith('taipei-crash-map-v4');
    expect(sw.fetch).not.toHaveBeenCalled();
  });

  it('caches detailed data on demand and serves the visited data offline', async () => {
    const sw = worker(base);
    const path = 'data/crash-detail-party-records.json';
    const first = await sw.request(path);
    expect(await first?.json()).toEqual({ records: 1 });
    expect(sw.cache.put).toHaveBeenCalledOnce();
    sw.fetch.mockRejectedValue(new Error('Offline'));
    const offline = await sw.request(path);
    expect(await offline?.json()).toEqual({ records: 1 });
    expect(sw.fetch).toHaveBeenCalledTimes(2);
  });

  it('removes only previous crash-map caches and preserves sibling applications', async () => {
    const sw = worker(base);
    await sw.lifecycle('activate');
    expect(sw.caches.delete.mock.calls).toEqual([['taipei-crash-map-v3']]);
  });
});
