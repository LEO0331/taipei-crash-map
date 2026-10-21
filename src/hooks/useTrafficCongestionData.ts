import { useEffect, useState } from 'react';
import type { TrafficCongestionSnapshot } from '../types/trafficCongestion';
import { assertTrafficSnapshot } from '../utils/trafficCongestion';
import { appUrl } from '../utils/urls';

let cached: TrafficCongestionSnapshot | undefined;
let pending: Promise<TrafficCongestionSnapshot> | undefined;

function loadSnapshot() {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch(appUrl('data/neihu-congestion/snapshot.json'))
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const value: unknown = await response.json();
        assertTrafficSnapshot(value);
        cached = value;
        return value;
      }).finally(() => { pending = undefined; });
  }
  return pending;
}

/** Mount only inside the lazy congestion tab; no live API calls or accident data. */
export function useTrafficCongestionData() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ snapshot: TrafficCongestionSnapshot | null; isLoading: boolean; error: string | null }>({ snapshot: cached ?? null, isLoading: !cached, error: null });
  useEffect(() => {
    let active = true;
    setState({ snapshot: cached ?? null, isLoading: !cached, error: null });
    loadSnapshot().then((snapshot) => {
      if (active) setState({ snapshot, isLoading: false, error: null });
    }).catch((error: unknown) => {
      if (active) setState({ snapshot: null, isLoading: false, error: error instanceof Error ? error.message : 'Invalid snapshot' });
    });
    return () => { active = false; };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
