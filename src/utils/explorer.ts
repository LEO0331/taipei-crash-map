import type { Language, Translation } from '../i18n';

export type AppTab = 'crashMap' | 'hotspotAnalysis' | 'crashFactors' | 'reportedViolations' | 'appraisalReconsiderations' | 'neihuCongestion' | 'busService' | 'dataNotes';

export type ExplorerGroup = {
  id: string;
  title: string;
  description: string;
  items: { id: AppTab; label: string; keywords: string }[];
};

export function appTabs(t: Translation): { id: AppTab; label: string }[] {
  return [
    { id: 'crashMap', label: t.crashMap },
    { id: 'hotspotAnalysis', label: t.hotspotAnalysis },
    { id: 'crashFactors', label: t.crashFactors },
    { id: 'reportedViolations', label: t.reportedViolationsTop5 },
    { id: 'appraisalReconsiderations', label: t.appraisalReconsiderations },
    { id: 'neihuCongestion', label: t.neihuCongestion },
    { id: 'busService', label: t.busService },
    { id: 'dataNotes', label: t.dataNotes },
  ];
}

const hubs: { id: string; title: Record<Language, string>; tabs: AppTab[] }[] = [
  { id: 'exploration', title: { en: 'Crash Exploration', zh: '事故探索' }, tabs: ['crashMap', 'hotspotAnalysis'] },
  { id: 'factors', title: { en: 'Accident Factors', zh: '事故因素' }, tabs: ['crashFactors'] },
  { id: 'records', title: { en: 'Traffic Records', zh: '交通紀錄' }, tabs: ['reportedViolations', 'appraisalReconsiderations'] },
  { id: 'research', title: { en: 'Transport Research', zh: '運輸研究' }, tabs: ['neihuCongestion', 'busService'] },
  { id: 'methodology', title: { en: 'Data & Methodology', zh: '資料與方法' }, tabs: ['dataNotes'] },
];

/** Presentation catalogue only: no data imports, joins or derived metrics. */
export function explorerGroups(language: Language, t: Translation): ExplorerGroup[] {
  const tabs = appTabs(t);
  return hubs.map(hub => ({
    id: hub.id,
    title: hub.title[language],
    description: '',
    items: hub.tabs.map(id => ({
      id,
      label: tabs.find(tab => tab.id === id)!.label,
      keywords: `${id} ${hub.title.zh} ${hub.title.en}`,
    })),
  }));
}

/** A selected hub scopes search; caller-owned catalogues remain unchanged. */
export function filterExplorerGroups(groups: ExplorerGroup[], selectedId: string | null, query: string): ExplorerGroup[] {
  const term = query.trim().toLocaleLowerCase();
  const selected = groups.find(group => group.id === selectedId);
  return (selected ? [selected] : groups).map(group => ({
    ...group,
    items: group.items.filter(item => `${group.title} ${item.label} ${item.keywords}`.toLocaleLowerCase().includes(term)),
  }));
}
