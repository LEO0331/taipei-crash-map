// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { translations } from '../src/i18n';

vi.mock('../src/hooks/useCrashDetailData', () => ({ useCrashDetailData: () => ({ loadCrashDetails: vi.fn() }) }));
vi.mock('../src/hooks/useTrafficViolationReportData', () => ({ useTrafficViolationReportData: () => ({}) }));
vi.mock('../src/hooks/useAppraisalReconsiderationData', () => ({ useAppraisalReconsiderationData: () => ({}) }));
vi.mock('../src/components/Dashboard', () => ({ Dashboard: () => <div data-dashboard>Dashboard loaded</div> }));
vi.mock('../src/components/AccidentMap', () => ({ AccidentMap: ({ hotspots }: { hotspots: unknown[] }) => {
  const [pan, setPan] = React.useState(0);
  return <section data-map data-hotspots={hotspots.length} data-pan={pan}><button onClick={() => setPan(value => value + 1)}>Pan map</button></section>;
} }));
import App from '../src/App';

let host: HTMLDivElement;
let root: Root;
let finishHotspots: (value: unknown) => void;
let finishSummary: (value: unknown) => void;
let rejectHotspots: (reason: Error) => void;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  localStorage.setItem('language', 'en');
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  vi.stubGlobal('fetch', vi.fn((url: string) => new Promise((resolve, reject) => {
    if (url.endsWith('accident-hotspots.json')) { finishHotspots = resolve; rejectHotspots = reject; }
    else if (url.endsWith('accident-summary.json')) finishSummary = resolve;
    else reject(new Error(`Unexpected initial request: ${url}`));
  })));
});

afterEach(async () => { await act(async () => root.unmount()); host.remove(); localStorage.clear(); vi.unstubAllGlobals(); });

it('mounts the basemap before data, keeps it through loading, and adds the dashboard only after success', async () => {
  await act(async () => root.render(<App />));
  const map = host.querySelector('[data-map]');
  expect(map).toBeTruthy();
  expect(host.textContent).toContain(translations.en.loadingAccidentData);
  expect(host.querySelector('[data-dashboard]')).toBeNull();
  await act(async () => (map!.querySelector('button') as HTMLButtonElement).click());
  await act(async () => finishHotspots({ ok: true, json: async () => [{ id: 'test', district: '中山區', location: 'Test' }] }));
  expect(host.querySelector('[data-map]')).toBe(map);
  expect(host.querySelector('[data-dashboard]')).toBeNull();
  await act(async () => finishSummary({ ok: true, json: async () => ({ districts: ['中山區'], totalRecords: 10 }) }));
  for (let n = 0; n < 4; n++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(host.querySelector('[data-map]')).toBe(map);
  expect(map?.getAttribute('data-pan')).toBe('1');
  expect(map?.getAttribute('data-hotspots')).toBe('1');
  expect(host.textContent).not.toContain(translations.en.loadingAccidentData);
  expect(host.querySelector('[data-dashboard]')).toBeTruthy();
});

it('keeps the map available when initial data fails and preserves localized feedback', async () => {
  localStorage.setItem('language', 'zh');
  await act(async () => root.render(<App />));
  const map = host.querySelector('[data-map]');
  expect(map).toBeTruthy();
  expect(host.textContent).toContain(translations.zh.loadingAccidentData);
  await act(async () => rejectHotspots(new Error('Network unavailable')));
  expect(host.querySelector('[data-map]')).toBe(map);
  expect(host.textContent).toContain(translations.zh.dataLoadError);
  expect(host.textContent).not.toContain(translations.zh.loadingAccidentData);
  expect(host.querySelector('[data-dashboard]')).toBeNull();
});
