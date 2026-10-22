// @vitest-environment jsdom
/// <reference lib="dom" />
/// <reference path="../src/declarations.d.ts" />
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusSnapshot } from '../src/types/busService';

let host: HTMLDivElement;
let root: Root;
const directory = resolve('public/data/bus-service');

function publishedSnapshot() {
  const manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8')) as { snapshotId: string; snapshotFile: string };
  const snapshot = JSON.parse(readFileSync(resolve(directory, manifest.snapshotFile), 'utf8')) as BusSnapshot;
  return { manifest, snapshot };
}

function publishedFetch() {
  return vi.fn(async (input: string) => {
    const path = String(input).split('data/bus-service/')[1];
    if (!path) return { ok: false, status: 404 };
    const content = readFileSync(resolve(directory, path), 'utf8');
    return { ok: true, status: 200, text: async () => content, json: async () => JSON.parse(content), arrayBuffer: async () => new TextEncoder().encode(content).buffer };
  });
}

function button(text: string) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent?.trim() === text);
  expect(found, `Expected button ${text}`).toBeTruthy();
  return found!;
}

function select(label: string) {
  const found = [...host.querySelectorAll('label')].find(node => node.textContent?.startsWith(label))?.querySelector('select');
  expect(found, `Expected select ${label}`).toBeTruthy();
  return found!;
}

async function choose(node: HTMLSelectElement, value: string) {
  await act(async () => {
    node.value = value;
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function settle() {
  for (let iteration = 0; iteration < 8; iteration++) {
    await act(async () => { await new Promise(resolveDone => setTimeout(resolveDone, 0)); });
  }
}

async function waitForElement(selector: string) {
  for (let attempt = 0; attempt < 100 && !host.querySelector(selector); attempt++) {
    await act(async () => { await new Promise(resolveDone => setTimeout(resolveDone, 10)); });
  }
  expect(host.querySelector(selector), `Expected ${selector} after asynchronous loading`).toBeTruthy();
}

async function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolveText, rejectRead) => {
    const reader = new FileReader();
    reader.onload = () => resolveText(String(reader.result));
    reader.onerror = () => rejectRead(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.doMock('react', () => React);
  vi.doMock('../src/components/BusServiceNetworkMap', () => ({ BusServiceNetworkMap: () => null }));
  vi.doMock('../src/components/TrafficCorridorMap', () => ({ TrafficCorridorMap: () => null }));
  vi.doMock('../src/components/AccidentMap', () => ({ AccidentMap: () => null }));
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.clear();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('bus snapshot and selected-route loading', () => {
  it('shares the initial request, resolves deployment-base URLs, and caches only selected route details', async () => {
    const { manifest, snapshot } = publishedSnapshot();
    const fetchMock = publishedFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { useBusServiceData, useBusRouteDetail } = await import('../src/hooks/useBusServiceData');
    function Probe({ selected = false }: { selected?: boolean }) {
      const data = useBusServiceData();
      const route = selected ? data.snapshot?.routes[0] : undefined;
      const detail = useBusRouteDetail(route, data.snapshot?.summary.snapshotId ?? '');
      return React.createElement('output', null, data.error ?? detail.error ?? detail.detail?.routeId ?? data.snapshot?.summary.snapshotId ?? 'loading');
    }
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Probe), React.createElement(Probe))));
    await settle();
    expect([...host.querySelectorAll('output')].map(node => node.textContent)).toEqual([manifest.snapshotId, manifest.snapshotId]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const base = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([`${base}data/bus-service/manifest.json`, `${base}data/bus-service/${manifest.snapshotFile}`]);
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Probe, { selected: true }), React.createElement(Probe, { selected: true }))));
    await settle();
    expect([...host.querySelectorAll('output')].map(node => node.textContent)).toEqual([snapshot.routes[0].id, snapshot.routes[0].id]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenLastCalledWith(`${base}data/bus-service/${snapshot.routes[0].detailFile}`);
    await act(async () => root.render(null));
    await act(async () => root.render(React.createElement(Probe, { selected: true })));
    await settle();
    expect(host.textContent).toBe(snapshot.routes[0].id);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejects a corrupted selected-route artifact and allows a clean retry without reloading the snapshot', async () => {
    const { snapshot } = publishedSnapshot();
    const validFetch = publishedFetch();
    let corrupt = true;
    const fetchMock = vi.fn(async (url: string) => {
      const response = await validFetch(url);
      if (corrupt && url.endsWith(snapshot.routes[0].detailFile)) {
        const bytes = new Uint8Array(await response.arrayBuffer!());
        bytes[0] ^= 1;
        return { ...response, arrayBuffer: async () => bytes.buffer };
      }
      return response;
    });
    vi.stubGlobal('fetch', fetchMock);
    const { useBusServiceData, useBusRouteDetail } = await import('../src/hooks/useBusServiceData');
    function Probe() {
      const data = useBusServiceData();
      const detail = useBusRouteDetail(data.snapshot?.routes[0], data.snapshot?.summary.snapshotId ?? '');
      return React.createElement('div', null,
        React.createElement('output', null, data.error ?? detail.error ?? detail.detail?.routeId ?? 'loading'),
        React.createElement('button', { onClick: detail.retry }, 'Retry route'));
    }
    await act(async () => root.render(React.createElement(Probe)));
    await settle();
    expect(host.textContent).toContain('SHA-256 mismatch');
    expect(host.querySelector('output')?.textContent).not.toBe(snapshot.routes[0].id);
    corrupt = false;
    await act(async () => button('Retry route').click());
    await settle();
    expect(host.querySelector('output')?.textContent).toBe(snapshot.routes[0].id);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('manifest.json'))).toHaveLength(1);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith(snapshot.routes[0].detailFile))).toHaveLength(2);
  });

  it('rejects unsupported manifest versions and mismatched editions before exposing snapshot data', async () => {
    const { manifest } = publishedSnapshot();
    const validFetch = publishedFetch();
    const otherEdition = 'pto-bus-ffffffffffffffff';
    const mismatchedManifest = JSON.parse(JSON.stringify(manifest).replaceAll(manifest.snapshotId, otherEdition));
    let attempt = 0;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('manifest.json')) {
        attempt++;
        return { ok: true, json: async () => attempt === 1 ? { ...manifest, schemaVersion: '999' } : attempt === 2 ? mismatchedManifest : manifest };
      }
      return validFetch(url.replace(otherEdition, manifest.snapshotId));
    }));
    const { useBusServiceData } = await import('../src/hooks/useBusServiceData');
    function Probe() {
      const data = useBusServiceData();
      return React.createElement('div', null, React.createElement('output', null, data.error ?? data.snapshot?.summary.snapshotId ?? 'loading'), React.createElement('button', { onClick: data.retry }, 'Retry snapshot'));
    }
    await act(async () => root.render(React.createElement(Probe)));
    await settle();
    expect(host.textContent).toContain('Invalid bus manifest');
    await act(async () => button('Retry snapshot').click());
    await settle();
    expect(host.textContent).toContain('edition mismatch');
    await act(async () => button('Retry snapshot').click());
    await settle();
    expect(host.querySelector('output')?.textContent).toBe(manifest.snapshotId);
  });
});

describe('independent lazy bus tab', () => {
  it('downloads bus evidence only when opened and preserves independent Neihu navigation and language switching', async () => {
    const { snapshot } = publishedSnapshot();
    const busFetch = publishedFetch();
    const congestion = JSON.parse(readFileSync(resolve('public/data/neihu-congestion/snapshot.json'), 'utf8'));
    const fetchMock = vi.fn(async (url: string) => url.includes('data/bus-service/') ? busFetch(url)
      : url.endsWith('neihu-congestion/snapshot.json') ? { ok: true, json: async () => congestion }
        : { ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);
    // Avoid compiling browser-only Leaflet augmentation through tsconfig.node.
    const browserEntry = '../src/App';
    const { default: App } = await import(browserEntry) as { default: React.ComponentType };
    const { translations } = await import('../src/i18n');
    await act(async () => root.render(React.createElement(App)));
    await settle();
    expect(busFetch).not.toHaveBeenCalled();
    await act(async () => button(translations.zh.busService).click());
    await waitForElement('.bus-dashboard');
    expect(busFetch).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain('公車路網');
    expect(busFetch.mock.calls.some(([url]) => url.includes('/details/'))).toBe(false);
    await act(async () => button('EN').click());
    expect(host.textContent).toContain('Bus Network');
    expect(busFetch).toHaveBeenCalledTimes(2);
    await act(async () => button(translations.en.neihuCongestion).click());
    await waitForElement('#neihu-a');
    expect(host.querySelector('#neihu-a')?.textContent).toContain('Policy Problem & Evidence Status');
    await act(async () => button(translations.en.busService).click());
    await settle();
    expect(busFetch).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain(snapshot.summary.snapshotId);
    expect(fetchMock.mock.calls.some(([url]) => /accidents\.json|crash-detail/.test(url))).toBe(false);
  });
});

describe('bilingual bus dashboard evidence workflow', () => {
  it('localizes loading and errors, rejects an invalid snapshot contract, and recovers through retry', async () => {
    let reject!: (reason: Error) => void;
    const validFetch = publishedFetch();
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ schemaVersion: 'unsupported' }) })
      .mockImplementation(validFetch);
    vi.stubGlobal('fetch', fetchMock);
    const { BusServiceDecisionDashboard } = await import('../src/components/BusServiceDecisionDashboard');
    await act(async () => root.render(React.createElement(BusServiceDecisionDashboard, { language: 'zh' })));
    expect(host.querySelector('[role="status"]')?.textContent).toBe('正在載入已稽核公車資料快照…');
    await act(async () => root.render(React.createElement(BusServiceDecisionDashboard, { language: 'en' })));
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Loading the audited bus snapshot…');
    await act(async () => reject(new Error('Network unavailable')));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Bus data could not be loaded');
    await act(async () => root.render(React.createElement(BusServiceDecisionDashboard, { language: 'zh' })));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('公車資料無法載入');
    await act(async () => button('重試').click());
    await settle();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Invalid bus manifest');
    expect(host.querySelector('.bus-dashboard')).toBeNull();
    await act(async () => button('重試').click());
    await settle();
    expect(host.querySelectorAll('.bus-dashboard h2, .bus-dashboard h3')).toHaveLength(12);
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('exports real filtered candidate identities and source hashes across capacity and sensitivity controls', async () => {
    const { snapshot } = publishedSnapshot();
    const fetchMock = publishedFetch();
    vi.stubGlobal('fetch', fetchMock);
    const downloads: Blob[] = [];
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((blob: Blob) => { downloads.push(blob); return 'blob:bus-briefing'; }) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { BusServiceDecisionDashboard } = await import('../src/components/BusServiceDecisionDashboard');
    await act(async () => root.render(React.createElement(BusServiceDecisionDashboard, { language: 'en' })));
    await settle();
    const modeB = button('Mode B ineligible');
    expect(modeB.disabled).toBe(true);
    expect(host.textContent).toContain('history-gate:actualEventSemantics');
    expect(host.textContent).toContain('history-gate:completeness');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    async function exportJson() {
      await act(async () => button('Export briefing JSON').click());
      return JSON.parse(await readBlob(downloads.at(-1)!));
    }
    const five = await exportJson();
    expect(five.scenario.config.capacity).toBe(5);
    expect(five.scenario.selected).toHaveLength(5);
    await choose(select('Review capacity'), '10');
    await choose(select('Review strategy'), 'balanced');
    const ten = await exportJson();
    expect(ten.scenario.config).toMatchObject({ capacity: 10, strategy: 'balanced' });
    expect(ten.scenario.selected).toHaveLength(10);
    const realIds = new Set(snapshot.candidates.map(candidate => candidate.id));
    expect(ten.scenario.selected.every((candidate: { id: string }) => realIds.has(candidate.id))).toBe(true);
    expect(ten.sources).toEqual(snapshot.sources);
    expect(ten.snapshot.snapshotId).toBe(snapshot.summary.snapshotId);
    expect(ten.sources.some((source: { sha256: string | null }) => /^[a-f0-9]{64}$/.test(source.sha256 ?? ''))).toBe(true);
    await choose(select('Review capacity'), 'all');
    const all = await exportJson();
    expect(all.scenario.config.capacity).toBeNull();
    expect(all.scenario.selected).toHaveLength(all.scenario.eligible.length);
    expect(all.scenario.selected.length).toBeGreaterThan(10);

    const route = snapshot.routes.find(item => snapshot.candidates.some(candidate => candidate.routeId === item.id && candidate.direction === '0'))!;
    await choose(select('Main route'), route.id);
    await settle();
    await choose(select('Direction'), '0');
    await choose(select('Sensitivity assumption'), 'broader');
    const filtered = await exportJson();
    const expected = snapshot.candidates.filter(candidate => candidate.routeId === route.id && candidate.direction === '0');
    expect(filtered.scenario.population).toBe(expected.length);
    expect(filtered.filters).toEqual({ routeId: route.id, variantId: 'all', direction: '0' });
    expect([...filtered.scenario.eligible, ...filtered.scenario.excluded].map((candidate: { id: string }) => candidate.id).sort()).toEqual(expected.map(candidate => candidate.id).sort());
    expect(filtered.scenario.selected.every((candidate: { routeId: string; direction: string; eligibility: { historical: boolean; published: boolean } }) => candidate.routeId === route.id && candidate.direction === '0' && !candidate.eligibility.historical && !candidate.eligibility.published)).toBe(true);
    await act(async () => button('Export review briefing CSV').click());
    const csv = await readBlob(downloads.at(-1)!);
    expect(csv).toContain(snapshot.summary.snapshotId);
    for (const candidate of filtered.scenario.selected) expect(csv).toContain(candidate.id);
    for (const source of snapshot.sources.filter(source => source.sha256)) expect(csv).toContain(source.sha256!);
    expect(button('Mode B ineligible').disabled).toBe(true);
    // Filter changes, capacity changes and exports never refetch a cached detail.
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/details/'))).toHaveLength(1);
  });
});
