// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DeferredDashboard } from '../src/components/DeferredDashboard';

let host: HTMLDivElement;
let root: Root;
let notify: IntersectionObserverCallback;
const disconnect = vi.fn();
const observe = vi.fn();
const chart = vi.fn();
function Chart({ value }: { value: number }) {
  chart();
  return <p data-chart>{value}</p>;
}
async function render(immediate = false, value = 1) {
  await act(async () => root.render(
    <DeferredDashboard immediate={immediate} fallback={<p data-placeholder>Loading charts</p>}>
      <Chart value={value} />
    </DeferredDashboard>,
  ));
}
async function intersect(isIntersecting: boolean) {
  await act(async () => notify([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe = observe;
    disconnect = disconnect;
  });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  vi.clearAllMocks();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

it('defers chart rendering until approaching the viewport and retains it afterward', async () => {
  await render();
  expect(chart).not.toHaveBeenCalled();
  expect(host.querySelector('[data-placeholder]')).toBeTruthy();
  expect(observe).toHaveBeenCalledWith(host.querySelector('.dashboard-slot'));
  await intersect(false);
  expect(chart).not.toHaveBeenCalled();
  await intersect(true);
  const mounted = host.querySelector('[data-chart]');
  expect(mounted?.textContent).toBe('1');
  expect(disconnect).toHaveBeenCalled();
  await render(false, 2);
  expect(host.querySelector('[data-chart]')).toBe(mounted);
  expect(mounted?.textContent).toBe('2');
});

it('renders the explicit analysis destination immediately without observing', async () => {
  await render(true);
  expect(host.querySelector('[data-chart]')).toBeTruthy();
  expect(observe).not.toHaveBeenCalled();
});

it('activates an already deferred dashboard when switching to explicit analysis', async () => {
  await render();
  expect(chart).not.toHaveBeenCalled();
  await render(true);
  expect(host.querySelector('[data-chart]')).toBeTruthy();
  expect(disconnect).toHaveBeenCalled();
});

it('loads charts when IntersectionObserver is unavailable', async () => {
  Reflect.deleteProperty(window, 'IntersectionObserver');
  await render();
  expect(host.querySelector('[data-chart]')).toBeTruthy();
});

it('disconnects when leaving the map before the dashboard becomes visible', async () => {
  await render();
  await act(async () => root.render(<p>Other tab</p>));
  expect(disconnect).toHaveBeenCalledOnce();
  expect(chart).not.toHaveBeenCalled();
});
