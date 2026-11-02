// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTrafficViolationReportData } from '../src/hooks/useTrafficViolationReportData';
import { useAppraisalReconsiderationData } from '../src/hooks/useAppraisalReconsiderationData';

type Result = { records: unknown[]; isLoading: boolean; error?: string };
let host: HTMLDivElement;
let root: Root;
let latest: Result;
let pending: Array<{ resolve: (value: unknown) => void; reject: (error: Error) => void }>;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  pending = [];
  vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve, reject) => pending.push({ resolve, reject }))));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe.each([
  ['reported violations', useTrafficViolationReportData],
  ['appraisal reconsiderations', useAppraisalReconsiderationData],
] as const)('%s data on tab entry', (_name, useData) => {
  function Probe({ enabled }: { enabled?: boolean }) {
    latest = useData(enabled);
    return <p>{latest.isLoading ? 'loading' : latest.error ?? latest.records.length}</p>;
  }
  async function render(enabled?: boolean) {
    await act(async () => root.render(<Probe enabled={enabled} />));
  }
  async function succeed() {
    await act(async () => {
      pending[0].resolve({ ok: true, json: async () => [{ id: 'record' }] });
      pending[1].resolve({ ok: true, json: async () => ({ source: 'official' }) });
    });
  }

  it('makes no request until enabled, then fetches its records and summary', async () => {
    await render();
    expect(fetch).not.toHaveBeenCalled();
    await render(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(latest.isLoading).toBe(true);
    await succeed();
    expect(latest.records).toEqual([{ id: 'record' }]);
    expect(latest.isLoading).toBe(false);
    expect(latest.error).toBeUndefined();
  });

  it('keeps an in-flight request alive across quick exit and reentry', async () => {
    await render(false);
    await render(true);
    await render(false);
    await render(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    await succeed();
    expect(latest.isLoading).toBe(false);
    expect(latest.records).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('retains completed records after leaving and reentering', async () => {
    await render(false);
    await render(true);
    await succeed();
    const records = latest.records;
    await render(false);
    await render(true);
    expect(latest.records).toBe(records);
    expect(latest.isLoading).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('settles failures without an automatic fetch loop or lost error on reentry', async () => {
    await render(true);
    await act(async () => pending[0].reject(new Error('Data unavailable')));
    expect(latest.isLoading).toBe(false);
    expect(latest.error).toBe('Data unavailable');
    expect(latest.records).toEqual([]);
    await render(false);
    await render(true);
    expect(latest.error).toBe('Data unavailable');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
