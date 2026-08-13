import { useEffect, useState } from 'react';
import type { AccidentAppraisalReconsiderationMetadata, AccidentAppraisalReconsiderationRecord } from '../types/accident';
import { appUrl } from '../utils/urls';
type State = { records: AccidentAppraisalReconsiderationRecord[]; metadata: AccidentAppraisalReconsiderationMetadata | null; isLoading: boolean; error?: string };
async function load<T>(path: string) { const response = await fetch(appUrl(path)); if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`); return response.json() as Promise<T>; }
export function useAppraisalReconsiderationData(): State {
  const [state, setState] = useState<State>({ records: [], metadata: null, isLoading: true });
  useEffect(() => { let cancelled = false; Promise.all([load<AccidentAppraisalReconsiderationRecord[]>('data/traffic-accident-appraisal-reconsiderations/records.json'), load<AccidentAppraisalReconsiderationMetadata>('data/traffic-accident-appraisal-reconsiderations/metadata.json')]).then(([records, metadata]) => !cancelled && setState({ records, metadata, isLoading: false })).catch((error: Error) => !cancelled && setState({ records: [], metadata: null, isLoading: false, error: error.message })); return () => { cancelled = true; }; }, []);
  return state;
}
