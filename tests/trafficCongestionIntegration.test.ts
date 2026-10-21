// @vitest-environment jsdom
/// <reference lib="dom" />
/// <reference path="../src/declarations.d.ts" />
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrafficCongestionSnapshot } from '../src/types/trafficCongestion';

const snapshot = JSON.parse(readFileSync(resolve('public/data/neihu-congestion/snapshot.json'), 'utf8')) as TrafficCongestionSnapshot;
let host: HTMLDivElement;
let root: Root;

async function flush() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

function button(text: string) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent?.trim() === text);
  expect(found, `Expected button ${text}`).toBeTruthy();
  return found!;
}

function select(label: string) {
  const found = [...host.querySelectorAll('label')].find(node => node.firstChild?.textContent === label)?.querySelector('select');
  expect(found, `Expected select ${label}`).toBeTruthy();
  return found!;
}

async function choose(node: HTMLSelectElement, value: string) {
  await act(async () => {
    node.value = value;
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeEach(() => {
  vi.resetModules();
  // Isolate the data cache while keeping the renderer and components on one React instance.
  vi.doMock('react', () => React);
  vi.doMock('../src/components/TrafficCorridorMap', () => ({
    TrafficCorridorMap: () => React.createElement('div', { 'aria-label': 'Map rendering is covered by browser smoke checks' }),
  }));
  vi.doMock('../src/components/AccidentMap', () => ({ AccidentMap: () => null }));
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  localStorage.clear();
});

describe('Neihu dashboard integration', () => {
  it('exposes localized loading and recoverable error states in both languages', async () => {
    let reject!: (reason: Error) => void;
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }))
      .mockResolvedValueOnce({ ok: true, json: async () => snapshot });
    vi.stubGlobal('fetch', fetchMock);
    const { NeihuCongestionDashboard } = await import('../src/components/NeihuCongestionDashboard');
    await act(async () => root.render(React.createElement(NeihuCongestionDashboard, { language: 'zh' })));
    expect(host.querySelector('[role="status"]')?.textContent).toBe('正在載入已稽核交通資料快照…');
    await act(async () => root.render(React.createElement(NeihuCongestionDashboard, { language: 'en' })));
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Loading the audited traffic snapshot…');
    await act(async () => reject(new Error('Network unavailable')));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Traffic data could not be loaded');
    await act(async () => root.render(React.createElement(NeihuCongestionDashboard, { language: 'zh' })));
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('交通資料無法載入');
    await act(async () => button('重新載入').click());
    expect(host.querySelector('#neihu-a')?.textContent).toContain('政策問題與資料狀態');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('filters verified inventory, keeps unavailable performance controls disabled, and exports the current evidence scope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot }));
    const downloads: Blob[] = [];
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn((blob: Blob) => { downloads.push(blob); return 'blob:briefing'; }) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { NeihuCongestionDashboard } = await import('../src/components/NeihuCongestionDashboard');
    await act(async () => root.render(React.createElement(NeihuCongestionDashboard, { language: 'en' })));
    expect(host.querySelectorAll('.neihu-section h2, .neihu-section h3')).toHaveLength(10);
    expect(host.textContent).toContain('Evidence-readiness mode');
    expect(select('Analysis window (Taipei time)').disabled).toBe(true);
    expect([...select('Scenario strategy').options].filter(option => option.disabled).map(option => option.value)).toEqual(['slowdown', 'balanced']);
    const corridor = snapshot.corridors.find(item => snapshot.devices.some(device => device.corridorId === item.corridorId))!;
    await choose(select('Corridor'), corridor.corridorId);
    const inventory = host.querySelector('[aria-label="Detector inventory (scroll horizontally)"]')!;
    const expectedDevices = snapshot.devices.filter(device => device.corridorId === corridor.corridorId);
    expect(inventory.querySelectorAll('tbody tr')).toHaveLength(Math.min(10, expectedDevices.length));
    expect(inventory.textContent).toContain(expectedDevices[0].deviceId);
    await choose(select('Investigation slots'), '10');
    await act(async () => button('Export briefing JSON').click());
    await act(async () => button('Export review briefing CSV').click());
    async function read(blob: Blob): Promise<string> {
      return new Promise((resolveText, rejectRead) => {
        const reader = new FileReader();
        reader.onload = () => resolveText(String(reader.result));
        reader.onerror = () => rejectRead(reader.error);
        reader.readAsText(blob);
      });
    }
    const briefing = JSON.parse(await read(downloads[0]));
    expect(briefing.snapshotId).toBe(snapshot.snapshotId);
    expect(briefing.performanceIndicatorsAvailable).toBe(false);
    expect(briefing.scenario.config).toMatchObject({ strategy: 'quality', capacity: 10 });
    expect(briefing.evidenceScope.deviceIds).toEqual(expectedDevices.map(device => device.deviceId).sort());
    expect(briefing.sourceSha256).toEqual(snapshot.sourceSha256);
    expect(briefing.scenario.selected.every((candidate: { eligible: boolean }) => !candidate.eligible)).toBe(true);
    const csv = await read(downloads[1]);
    expect(csv).toContain(snapshot.snapshotId);
    expect(csv).toContain('evidenceScope');
    expect(csv).toContain('sourceGap');
    for (const checkbox of [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]) {
      await act(async () => checkbox.click());
    }
    expect(inventory.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(host.textContent).toContain('No equipment matches this scope.');
    expect(host.textContent).toContain('No candidates match this objective and scope.');
  });

  it('requests the congestion snapshot only after its lazy tab opens, and keeps the snapshot across tab remounts', async () => {
    const fetchMock = vi.fn(async (url: string) => url.endsWith('neihu-congestion/snapshot.json')
      ? { ok: true, json: async () => snapshot }
      : { ok: false, status: 404 });
    vi.stubGlobal('fetch', fetchMock);
    // The browser entry's Leaflet plugin augmentations belong to tsconfig.app;
    // keep this runtime integration from also compiling that tree in tsconfig.node.
    const browserEntry = '../src/App';
    const { default: App } = await import(browserEntry) as { default: React.ComponentType };
    const { translations } = await import('../src/i18n');
    await act(async () => root.render(React.createElement(App)));
    await flush();
    const trafficRequests = () => fetchMock.mock.calls.filter(([url]) => url.includes('neihu-congestion'));
    expect(trafficRequests()).toHaveLength(0);
    await act(async () => button(translations.zh.neihuCongestion).click());
    await flush();
    expect(trafficRequests()).toHaveLength(1);
    expect(host.querySelector('#neihu-a')?.textContent).toContain('政策問題與資料狀態');
    await act(async () => button('EN').click());
    expect(host.querySelector('#neihu-a')?.textContent).toContain('Policy Problem & Evidence Status');
    await act(async () => button(translations.en.dataNotes).click());
    expect(host.querySelector('#neihu-a')).toBeNull();
    await act(async () => button(translations.en.neihuCongestion).click());
    await flush();
    expect(host.querySelector('#neihu-a')).toBeTruthy();
    expect(trafficRequests()).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([url]) => /accidents\.json|crash-detail/.test(url))).toBe(false);
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('traffic snapshot loading lifecycle', () => {
  it('loads from the deployment base path, shares an in-flight request, and reuses data after remount', async () => {
    let finish!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const { useTrafficCongestionData } = await import('../src/hooks/useTrafficCongestionData');
    function Probe() {
      const data = useTrafficCongestionData();
      return React.createElement('output', null, data.isLoading ? 'loading' : data.snapshot?.snapshotId ?? data.error);
    }
    await act(async () => root.render(React.createElement(React.Fragment, null, React.createElement(Probe), React.createElement(Probe))));
    expect([...host.querySelectorAll('output')].map(node => node.textContent)).toEqual(['loading', 'loading']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const base = (import.meta as ImportMeta & { env: { BASE_URL: string } }).env.BASE_URL;
    expect(fetchMock).toHaveBeenCalledWith(`${base}data/neihu-congestion/snapshot.json`);
    await act(async () => finish({ ok: true, json: async () => snapshot } as Response));
    expect(host.textContent).toContain(snapshot.snapshotId);
    await act(async () => root.render(null));
    await act(async () => root.render(React.createElement(Probe)));
    expect(host.textContent).toBe(snapshot.snapshotId);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('lets a user retry a failed load and rejects malformed snapshots before displaying data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ schemaVersion: '1.0.0' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => snapshot });
    vi.stubGlobal('fetch', fetchMock);
    const { useTrafficCongestionData } = await import('../src/hooks/useTrafficCongestionData');
    function Probe() {
      const data = useTrafficCongestionData();
      return React.createElement('div', null,
        React.createElement('output', null, data.isLoading ? 'loading' : data.snapshot?.snapshotId ?? data.error),
        React.createElement('button', { onClick: data.retry }, 'Retry'));
    }
    await act(async () => root.render(React.createElement(Probe)));
    expect(host.textContent).toContain('HTTP 503');
    await act(async () => button('Retry').click());
    expect(host.textContent).toContain('Unsupported or invalid traffic snapshot');
    expect(host.textContent).not.toContain(snapshot.snapshotId);
    await act(async () => button('Retry').click());
    expect(host.textContent).toContain(snapshot.snapshotId);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
