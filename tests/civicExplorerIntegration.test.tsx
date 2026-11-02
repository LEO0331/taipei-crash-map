// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const probes = vi.hoisted(() => ({ bus: vi.fn(), neihu: vi.fn(), crashDetails: vi.fn(), loadAccidents: vi.fn() }));
vi.mock('../src/hooks/useAccidentData', () => ({ useAccidentData: () => ({ accidents: null, hotspots: [], summary: { districts: ['中山區'], totalRecords: 100 }, isLoading: false, isAccidentsLoading: false, loadAccidents: probes.loadAccidents }) }));
vi.mock('../src/hooks/useCrashDetailData', () => ({ useCrashDetailData: () => ({ loadCrashDetails: probes.crashDetails }) }));
vi.mock('../src/hooks/useTrafficViolationReportData', () => ({ useTrafficViolationReportData: () => ({}) }));
vi.mock('../src/hooks/useAppraisalReconsiderationData', () => ({ useAppraisalReconsiderationData: () => ({}) }));
vi.mock('../src/components/Dashboard', () => ({ Dashboard: () => <div>Existing dashboard</div> }));
vi.mock('../src/components/NeihuCongestionDashboard', () => { probes.neihu(); return { NeihuCongestionDashboard: () => <div>Neihu view</div> }; });
vi.mock('../src/components/BusServiceDecisionDashboard', () => { probes.bus(); return { BusServiceDecisionDashboard: () => <div>Bus view</div> }; });
vi.mock('../src/components/AccidentMap', () => ({ AccidentMap: ({ mode, onModeChange }: { mode: string; onModeChange: (mode: string) => void }) => {
  const [local, setLocal] = React.useState(0);
  return <section data-map-mode={mode} data-map-local={local}><button type="button" onClick={() => onModeChange('clusters')}>Cluster mode probe</button><button type="button" onClick={() => setLocal(value => value + 1)}>Pan probe</button></section>;
} }));
import App from '../src/App';
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  localStorage.setItem('language', 'en');
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  probes.crashDetails.mockClear(); probes.loadAccidents.mockClear();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); localStorage.clear(); });
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll('button')].find(node => node.textContent?.trim().replace(/^←\s*/, '').replace(/\s*↗$/, '') === text)!;
async function settle() { for (let n = 0; n < 8; n++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function click(text: string, scope?: ParentNode) { expect(button(text, scope)).toBeTruthy(); await act(async () => button(text, scope).click()); await settle(); }

it('keeps the mounted map, filters, mode, language and URL through Explorer and returns to the map', async () => {
  const url = window.location.href;
  await act(async () => root.render(<App />)); await settle();
  expect(host.querySelector('.workspace-crashMap')).toBeTruthy();
  await click('Cluster mode probe'); await click('Pan probe');
  const map = host.querySelector('[data-map-mode]');
  const district = [...host.querySelectorAll('select')].find(node => [...node.options].some(option => option.value === '中山區'))!;
  await act(async () => { district.value = '中山區'; district.dispatchEvent(new Event('change', { bubbles: true })); });
  await click('Civic Explorer');
  expect(map?.closest('[hidden]')).toBeTruthy();
  expect(host.querySelector('.data-explorer')).toBeTruthy();
  expect(probes.bus).not.toHaveBeenCalled(); expect(probes.neihu).not.toHaveBeenCalled(); expect(probes.crashDetails).not.toHaveBeenCalled();
  await click('Back to current view');
  expect(host.querySelector('[data-map-mode]')).toBe(map);
  expect(map?.getAttribute('data-map-mode')).toBe('clusters'); expect(map?.getAttribute('data-map-local')).toBe('1');
  expect(district.value).toBe('中山區'); expect(document.activeElement).toBe(button('Civic Explorer'));
  await click('Civic Explorer'); await click('Data Notes', host.querySelector('.explore-results')!);
  expect(host.querySelector('.workspace-dataNotes')).toBeTruthy();
  await click('Civic Explorer'); await click('Return to crash map');
  expect(host.querySelector('.workspace-crashMap')).toBeTruthy();
  expect(host.querySelector('[data-map-mode]')?.getAttribute('data-map-mode')).toBe('clusters');
  expect(district.isConnected).toBe(false);
  expect([...host.querySelectorAll('select')].find(node => node.value === '中山區')).toBeTruthy();
  expect(localStorage.getItem('language')).toBe('en'); expect(document.documentElement.lang).toBe('en'); expect(window.location.href).toBe(url);
  expect(document.activeElement).toBe(host.querySelector('.workspace'));
});

it('leaves all eight direct destinations available while Explorer is open', async () => {
  await act(async () => root.render(<App />)); await settle();
  await click('Civic Explorer');
  const direct = host.querySelector('.app-tabs')!;
  expect(direct.querySelectorAll('button[aria-pressed]')).toHaveLength(8);
  await click('Data Notes', direct);
  expect(host.querySelector('.data-explorer')).toBeNull(); expect(host.querySelector('.workspace-dataNotes')).toBeTruthy();
});
