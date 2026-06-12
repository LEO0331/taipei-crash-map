import { useEffect, useState } from 'react';
import type { AccidentHotspot, AccidentRecord, AccidentSummary } from '../types/accident';
import { appUrl } from '../utils/urls';

type AccidentDataState = {
  accidents: AccidentRecord[];
  hotspots: AccidentHotspot[];
  summary: AccidentSummary | null;
  isLoading: boolean;
  error?: string;
};

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function useAccidentData(): AccidentDataState {
  const [state, setState] = useState<AccidentDataState>({
    accidents: [],
    hotspots: [],
    summary: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJson<AccidentRecord[]>(appUrl('data/accidents.json')),
      loadJson<AccidentHotspot[]>(appUrl('data/accident-hotspots.json')),
      loadJson<AccidentSummary>(appUrl('data/accident-summary.json')),
    ])
      .then(([accidents, hotspots, summary]) => {
        if (!cancelled) {
          setState({ accidents, hotspots, summary, isLoading: false });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({
            accidents: [],
            hotspots: [],
            summary: null,
            isLoading: false,
            error: error.message,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
