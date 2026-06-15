import { useCallback, useEffect, useState } from 'react';
import type {
  AccidentHotspot,
  HeatmapDataset,
  AccidentRecord,
  AccidentSummary,
  HeatmapPoint,
} from '../types/accident';
import { expandHeatmapDataset } from '../utils/accidents';
import { appUrl } from '../utils/urls';

type AccidentDataState = {
  accidents: AccidentRecord[] | null;
  heatmapPoints: HeatmapPoint[];
  hotspots: AccidentHotspot[];
  summary: AccidentSummary | null;
  isLoading: boolean;
  isAccidentsLoading: boolean;
  error?: string;
  accidentsError?: string;
  loadAccidents: () => Promise<void>;
};

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function useAccidentData(): AccidentDataState {
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [hotspots, setHotspots] = useState<AccidentHotspot[]>([]);
  const [summary, setSummary] = useState<AccidentSummary | null>(null);
  const [accidents, setAccidents] = useState<AccidentRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccidentsLoading, setIsAccidentsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [accidentsError, setAccidentsError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadJson<HeatmapDataset>(appUrl('data/heatmap-points.json')),
      loadJson<AccidentHotspot[]>(appUrl('data/accident-hotspots.json')),
      loadJson<AccidentSummary>(appUrl('data/accident-summary.json')),
    ])
      .then(([nextHeatmapDataset, nextHotspots, nextSummary]) => {
        if (!cancelled) {
          setHeatmapPoints(expandHeatmapDataset(nextHeatmapDataset));
          setHotspots(nextHotspots);
          setSummary(nextSummary);
          setIsLoading(false);
        }
      })
      .catch((loadError: Error) => {
        if (!cancelled) {
          setHeatmapPoints([]);
          setHotspots([]);
          setSummary(null);
          setIsLoading(false);
          setError(loadError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loadAccidents = useCallback(async () => {
    if (accidents || isAccidentsLoading) return;

    setIsAccidentsLoading(true);
    setAccidentsError(undefined);
    try {
      setAccidents(await loadJson<AccidentRecord[]>(appUrl('data/accidents.json')));
    } catch (loadError) {
      setAccidentsError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsAccidentsLoading(false);
    }
  }, [accidents, isAccidentsLoading]);

  return {
    accidents,
    heatmapPoints,
    hotspots,
    summary,
    isLoading,
    isAccidentsLoading,
    error,
    accidentsError,
    loadAccidents,
  };
}
