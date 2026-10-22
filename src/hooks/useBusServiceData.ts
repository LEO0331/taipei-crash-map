import { useEffect, useState } from 'react';
import type { BusManifest, BusRouteDetail, BusRouteIndex, BusSnapshot } from '../types/busService';
import { assertBusManifest, assertBusSnapshot, isSafeBusArtifactPath, verifyBusArtifact } from '../utils/busService';
import { appUrl } from '../utils/urls';

let cached: BusSnapshot | undefined;
let manifest: BusManifest | undefined;
let pending: Promise<BusSnapshot> | undefined;
const details = new Map<string, BusRouteDetail>();
const pendingDetails = new Map<string, Promise<BusRouteDetail>>();
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
function assertDetail(value: unknown, routeId: string): asserts value is BusRouteDetail {
  if (!object(value) || value.routeId !== routeId || !Array.isArray(value.stops) || !Array.isArray(value.candidates) || !Array.isArray(value.schedules) || !Array.isArray(value.shapes) || !Array.isArray(value.routeRaw)) throw new Error('Invalid bus route detail schema');
  for (const stop of value.stops) if (!object(stop) || !['occurrenceId', 'variantId', 'stopId', 'nameZh', 'nameEn'].every((key) => text(stop[key])) || !['0', '1', 'unknown'].includes(String(stop.direction)) || !Number.isFinite(stop.sequence) || !(stop.lat === null || (typeof stop.lat === 'number' && Number.isFinite(stop.lat) && Math.abs(stop.lat) <= 90)) || !(stop.lon === null || (typeof stop.lon === 'number' && Number.isFinite(stop.lon) && Math.abs(stop.lon) <= 180))) throw new Error('Invalid bus stop detail');
  for (const schedule of value.schedules) if (!object(schedule) || !text(schedule.variantId) || !['headway', 'departure'].includes(String(schedule.kind)) || !object(schedule.raw)) throw new Error('Invalid published schedule');
}
async function fetchVerified(path: string, contract: BusManifest) {
  const expected = contract.files[path];
  if (!isSafeBusArtifactPath(path) || !expected) throw new Error('Unlisted bus artifact');
  const response = await fetch(appUrl(`data/bus-service/${path}`));
  if (!response.ok) throw new Error(`Bus artifact HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  return verifyBusArtifact(bytes, expected);
}
function loadSnapshot() {
  if (cached) return Promise.resolve(cached);
  if (!pending) pending = (async () => {
    const response = await fetch(appUrl('data/bus-service/manifest.json'));
    if (!response.ok) throw new Error(`Bus manifest HTTP ${response.status}`);
    const contract: unknown = await response.json();
    assertBusManifest(contract);
    const value = await fetchVerified(contract.snapshotFile, contract);
    assertBusSnapshot(value);
    if (value.summary.snapshotId !== contract.snapshotId || value.routes.some((route) => !contract.files[route.detailFile])) throw new Error('Bus snapshot edition mismatch');
    manifest = contract; cached = value;
    return value;
  })().finally(() => { pending = undefined; });
  return pending;
}
export function useBusServiceData() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ snapshot: BusSnapshot | null; isLoading: boolean; error: string | null }>({ snapshot: cached ?? null, isLoading: !cached, error: null });
  useEffect(() => {
    let active = true;
    setState({ snapshot: cached ?? null, isLoading: !cached, error: null });
    loadSnapshot().then((snapshot) => { if (active) setState({ snapshot, isLoading: false, error: null }); }).catch((error: unknown) => { if (active) setState({ snapshot: null, isLoading: false, error: error instanceof Error ? error.message : 'Invalid bus snapshot' }); });
    return () => { active = false; };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
export function useBusRouteDetail(route: BusRouteIndex | undefined, snapshotId: string) {
  const key = route ? `${snapshotId}:${route.detailFile}` : '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; detail: BusRouteDetail | null; isLoading: boolean; error: string | null }>({ key: '', detail: null, isLoading: false, error: null });
  useEffect(() => {
    let active = true;
    if (!route) { setState({ key, detail: null, isLoading: false, error: null }); return; }
    const known = details.get(key);
    setState({ key, detail: known ?? null, isLoading: !known, error: null });
    if (known) return;
    if (!pendingDetails.has(key)) pendingDetails.set(key, (async () => {
      if (!manifest || manifest.snapshotId !== snapshotId) throw new Error('Bus manifest edition unavailable');
      const detail = await fetchVerified(route.detailFile, manifest);
      assertDetail(detail, route.id);
      details.set(key, detail);
      // Keep route browsing bounded in long-lived sessions.
      if (details.size > 12) details.delete(details.keys().next().value!);
      return detail;
    })().finally(() => { pendingDetails.delete(key); }));
    pendingDetails.get(key)!.then((detail) => { if (active) setState({ key, detail, isLoading: false, error: null }); }).catch((error: unknown) => { if (active) setState({ key, detail: null, isLoading: false, error: error instanceof Error ? error.message : 'Invalid bus detail' }); });
    return () => { active = false; };
  }, [key, route, snapshotId, attempt]);
  return { ...(state.key === key ? state : { detail: null, isLoading: !!route, error: null }), retry: () => setAttempt((value) => value + 1) };
}
