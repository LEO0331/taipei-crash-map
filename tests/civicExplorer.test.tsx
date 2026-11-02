// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CivicExplorer from '../src/components/CivicExplorer';
import { appTabs, explorerGroups, filterExplorerGroups } from '../src/utils/explorer';
import { translations, type Language } from '../src/i18n';

let host: HTMLDivElement;
let root: Root;
const onNavigate = vi.fn();
const onBack = vi.fn();
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  onNavigate.mockClear(); onBack.mockClear();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const button = (text: string) => [...host.querySelectorAll('button')].find(node => node.textContent?.trim().replace(/^[←]\s*/, '').replace(/\s*↗$/, '') === text)!;
async function render(language: Language = 'en') {
  await act(async () => root.render(<CivicExplorer language={language} groups={explorerGroups(language, translations[language])} activeTab="crashMap" onNavigate={onNavigate} onBack={onBack} />));
}
async function click(text: string) { expect(button(text)).toBeTruthy(); await act(async () => button(text).click()); }
async function search(value: string) {
  const input = host.querySelector('input')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

it('maps exactly five presentation groups to all eight existing tab identities in both languages', () => {
  const expected = [['crashMap', 'hotspotAnalysis'], ['crashFactors'], ['reportedViolations', 'appraisalReconsiderations'], ['neihuCongestion', 'busService'], ['dataNotes']];
  for (const language of ['en', 'zh'] as const) {
    const groups = explorerGroups(language, translations[language]);
    expect(groups.map(group => group.items.map(item => item.id))).toEqual(expected);
    expect(groups.flatMap(group => group.items.map(({ id, label }) => ({ id, label })))).toEqual(appTabs(translations[language]));
    expect(new Set(groups.map(group => group.title)).size).toBe(5);
  }
  expect(explorerGroups('en', translations.en).map(group => group.title)).toEqual(['Crash Exploration', 'Accident Factors', 'Traffic Records', 'Transport Research', 'Data & Methodology']);
  expect(explorerGroups('zh', translations.zh).map(group => group.title)).toEqual(['事故探索', '事故因素', '交通紀錄', '運輸研究', '資料與方法']);
});

it('filters literal text and selected groups without changing the catalogue', () => {
  const groups = explorerGroups('en', translations.en);
  const before = JSON.stringify(groups);
  expect(filterExplorerGroups(groups, null, ' BUS ').flatMap(group => group.items).map(item => item.id)).toEqual(['busService']);
  expect(filterExplorerGroups(groups, 'records', 'bus').flatMap(group => group.items)).toEqual([]);
  expect(JSON.stringify(groups)).toBe(before);
});

it('searches, resets, selects existing destinations and returns through native buttons', async () => {
  await render();
  expect(host.querySelectorAll('.explore-hub')).toHaveLength(5);
  expect(host.querySelectorAll('.explore-result-group li button')).toHaveLength(8);
  expect(host.querySelector('[aria-current="page"]')?.textContent).toContain(translations.en.crashMap);
  await search('bus');
  expect(host.querySelectorAll('.explore-result-group li button')).toHaveLength(1);
  await click(translations.en.busService); expect(onNavigate).toHaveBeenLastCalledWith('busService');
  await click('Reset navigation'); expect(host.querySelectorAll('.explore-result-group li button')).toHaveLength(8);
  expect(document.activeElement).toBe(host.querySelector('input'));
  await click('Back to current view'); expect(onBack).toHaveBeenCalledOnce();
  await click('Return to crash map'); expect(onNavigate).toHaveBeenLastCalledWith('crashMap');
});

it('focuses selected details and restores the selected hub on Escape', async () => {
  await render();
  await click('Transport Research');
  expect(document.activeElement).toBe(host.querySelector('.explore-results h3'));
  expect(host.querySelectorAll('.explore-result-group li button')).toHaveLength(2);
  await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.activeElement).toBe(host.querySelector('[data-explore-group="research"]'));
  expect(host.querySelectorAll('.explore-result-group li button')).toHaveLength(8);
  expect([...host.querySelectorAll('button')].every(node => node.type === 'button')).toBe(true);
});

it('opens a compact Chinese list on mobile and retains a native hubs switch', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  await render('zh');
  expect(host.querySelector('.explore-hubs')).toBeNull();
  expect(button('清單').getAttribute('aria-pressed')).toBe('true');
  expect(host.querySelectorAll('.explore-result-group li button')).toHaveLength(8);
  expect(host.textContent).toContain('找到 8 個項目');
  await click('主題圖'); expect(host.querySelectorAll('.explore-hub')).toHaveLength(5);
  await search('不存在的目的地'); expect(host.textContent).toContain('找不到相符的目的地');
  await click('清除搜尋與主題'); expect(host.querySelectorAll('.explore-result-group li button')).toHaveLength(8);
});
