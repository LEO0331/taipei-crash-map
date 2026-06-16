import { useCallback, useState } from 'react';
import type {
  CrashDetailAccidentRecord,
  CrashDetailPartyRecord,
  CrashDetailSummary,
  CrashFactorSummary,
} from '../types/accident';
import { appUrl } from '../utils/urls';

type CrashDetailDataState = {
  accidents: CrashDetailAccidentRecord[];
  parties: CrashDetailPartyRecord[];
  detailSummary: CrashDetailSummary | null;
  factorSummary: CrashFactorSummary | null;
  isLoading: boolean;
  error?: string;
  loadCrashDetails: () => Promise<void>;
};

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function useCrashDetailData(): CrashDetailDataState {
  const [accidents, setAccidents] = useState<CrashDetailAccidentRecord[]>([]);
  const [parties, setParties] = useState<CrashDetailPartyRecord[]>([]);
  const [detailSummary, setDetailSummary] = useState<CrashDetailSummary | null>(null);
  const [factorSummary, setFactorSummary] = useState<CrashFactorSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();

  const loadCrashDetails = useCallback(async () => {
    if (detailSummary || isLoading) return;

    setIsLoading(true);
    setError(undefined);
    try {
      const [nextAccidents, nextParties, nextDetailSummary, nextFactorSummary] = await Promise.all([
        loadJson<CrashDetailAccidentRecord[]>(appUrl('data/crash-detail-accidents.json')),
        loadJson<CrashDetailPartyRecord[]>(appUrl('data/crash-detail-party-records.json')),
        loadJson<CrashDetailSummary>(appUrl('data/crash-detail-summary.json')),
        loadJson<CrashFactorSummary>(appUrl('data/crash-factor-summary.json')),
      ]);
      setAccidents(nextAccidents);
      setParties(nextParties);
      setDetailSummary(nextDetailSummary);
      setFactorSummary(nextFactorSummary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [detailSummary, isLoading]);

  return {
    accidents,
    parties,
    detailSummary,
    factorSummary,
    isLoading,
    error,
    loadCrashDetails,
  };
}
