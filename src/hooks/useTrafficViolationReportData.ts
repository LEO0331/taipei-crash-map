import { useEffect, useState } from 'react';
import type {
  TrafficViolationReportTop5StatisticRecord,
  TrafficViolationReportTop5StatisticSummary,
} from '../types/accident';
import { appUrl } from '../utils/urls';

type State = {
  records: TrafficViolationReportTop5StatisticRecord[];
  summary: TrafficViolationReportTop5StatisticSummary | null;
  isLoading: boolean;
  error?: string;
};

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(appUrl(path));
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json() as Promise<T>;
}

export function useTrafficViolationReportData(enabled = false): State {
  const [state, setState] = useState<State>({ records: [], summary: null, isLoading: true });
  const [requested, setRequested] = useState(enabled);

  useEffect(() => {
    if (enabled) setRequested(true);
  }, [enabled]);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    Promise.all([
      loadJson<TrafficViolationReportTop5StatisticRecord[]>('data/traffic-violation-report-top5-statistics-records.json'),
      loadJson<TrafficViolationReportTop5StatisticSummary>('data/traffic-violation-report-top5-statistics-summary.json'),
    ])
      .then(([records, summary]) => {
        if (!cancelled) setState({ records, summary, isLoading: false });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ records: [], summary: null, isLoading: false, error: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [requested]);

  return state;
}
