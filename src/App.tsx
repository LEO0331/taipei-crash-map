import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { AccidentFilters, MapMode } from './types/accident';
import type { Language } from './i18n';
import { translations } from './i18n';
import { useAccidentData } from './hooks/useAccidentData';
import { useCrashDetailData } from './hooks/useCrashDetailData';
import { useTrafficViolationReportData } from './hooks/useTrafficViolationReportData';
import { filterAccidents } from './utils/accidents';
import { LanguageToggle } from './components/LanguageToggle';
import { FilterPanel } from './components/FilterPanel';
import { AccidentMap } from './components/AccidentMap';
import { NearbyHistoricalAccidents } from './components/NearbyHistoricalAccidents';
import { DisclaimerNotice } from './components/DisclaimerNotice';
import { Footer } from './components/Footer';
import { appUrl } from './utils/urls';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const Dashboard = lazy(() =>
  import('./components/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const CrashFactorDashboard = lazy(() =>
  import('./components/CrashFactorDashboard').then((module) => ({ default: module.CrashFactorDashboard })),
);
const TrafficViolationReportDashboard = lazy(() =>
  import('./components/TrafficViolationReportDashboard').then((module) => ({ default: module.TrafficViolationReportDashboard })),
);

type AppTab = 'crashMap' | 'hotspotAnalysis' | 'crashFactors' | 'reportedViolations' | 'dataNotes';

function DashboardFallback({ title }: { title: string }) {
  return (
    <section className="dashboard dashboard-placeholder" aria-busy="true">
      <div className="section-heading">
        <p className="eyebrow dark">Selected filters</p>
        <h2>{title}</h2>
      </div>
      <div className="placeholder-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

const defaultFilters: AccidentFilters = {
  years: [2019, 2020, 2021, 2022, 2023, 2024, 2025],
  accidentType: 'all',
  district: 'all',
  timePeriod: 'all',
  weekdayWeekend: 'all',
  search: '',
};

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('language');
      return saved === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  });
  const [filters, setFilters] = useState(defaultFilters);
  const [mapMode, setMapMode] = useState<MapMode>('hotspots');
  const [activeTab, setActiveTab] = useState<AppTab>('crashMap');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>();
  const {
    accidents,
    hotspots,
    summary,
    isLoading,
    isAccidentsLoading,
    error,
    accidentsError,
    loadAccidents,
  } = useAccidentData();
  const {
    accidents: crashDetailAccidents,
    parties: crashDetailParties,
    detailSummary: crashDetailSummary,
    factorSummary: crashFactorSummary,
    isLoading: isCrashDetailsLoading,
    error: crashDetailsError,
    loadCrashDetails,
  } = useCrashDetailData();
  const trafficViolationReport = useTrafficViolationReportData();
  const t = translations[language];

  useEffect(() => {
    try {
      localStorage.setItem('language', language);
    } catch {
      // Language persistence is optional; keep the UI usable if storage is unavailable.
    }
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
  }, [language]);

  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register(appUrl('sw.js')).catch(() => undefined);
    }
  }, []);

  const needsRawAccidents =
    mapMode === 'clusters' || Boolean(filters.search.trim()) || Boolean(filters.nearby);

  useEffect(() => {
    if (needsRawAccidents) {
      void loadAccidents();
    }
  }, [loadAccidents, needsRawAccidents]);

  useEffect(() => {
    if (activeTab === 'crashFactors') {
      void loadCrashDetails();
    }
  }, [activeTab, loadCrashDetails]);

  const districts = summary?.districts ?? [];
  const filteredAccidents = useMemo(
    () => (accidents ? filterAccidents(accidents, filters) : []),
    [accidents, filters],
  );
  const visibleRecordCount = accidents ? filteredAccidents.length : (summary?.totalRecords ?? 0);
  const heroStats = [
    { label: 'Records', value: summary?.totalRecords.toLocaleString() ?? '...' },
    { label: 'A1', value: summary?.a1Count.toLocaleString() ?? '...' },
    { label: 'A2', value: summary?.a2Count.toLocaleString() ?? '...' },
  ];
  const tabs: Array<{ id: AppTab; label: string }> = [
    { id: 'crashMap', label: t.crashMap },
    { id: 'hotspotAnalysis', label: t.hotspotAnalysis },
    { id: 'crashFactors', label: t.crashFactors },
    { id: 'reportedViolations', label: t.reportedViolationsTop5 },
    { id: 'dataNotes', label: t.dataNotes },
  ];

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">A1/A2 · 2019-2025 · Taipei Open Data</p>
          <h1>{t.appTitle}</h1>
          <p>{t.appSubtitle}</p>
        </div>
        <div className="hero-panel">
          <LanguageToggle language={language} onChange={setLanguage} />
          <dl className="hero-stats">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <nav className="app-tabs" aria-label="App sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            aria-pressed={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className={`workspace workspace-${activeTab}`}>
        {activeTab === 'crashMap' || activeTab === 'hotspotAnalysis' ? (
          <>
            <aside className="control-deck">
              <DisclaimerNotice t={t} />
              <FilterPanel filters={filters} districts={districts} t={t} onChange={setFilters} />
              {activeTab === 'crashMap' ? (
                <NearbyHistoricalAccidents
                  filters={filters}
                  t={t}
                  onChange={setFilters}
                  onLocate={setUserLocation}
                />
              ) : null}
            </aside>
            {isLoading ? <p className="loading">Loading accident data...</p> : null}
            {error ? <p className="error">{error}</p> : null}
            {needsRawAccidents && isAccidentsLoading ? (
              <p className="loading">Loading detailed accident records...</p>
            ) : null}
            {needsRawAccidents && accidentsError ? <p className="error">{accidentsError}</p> : null}
            {!isLoading && !error ? (
              <>
                {activeTab === 'crashMap' ? (
                  <AccidentMap
                    accidents={filteredAccidents}
                    hotspots={hotspots}
                    filters={filters}
                    mode={mapMode}
                    language={language}
                    t={t}
                    userLocation={userLocation}
                    recordCount={visibleRecordCount}
                    onModeChange={setMapMode}
                  />
                ) : null}
                <div className="dashboard-slot">
                  <Suspense fallback={<DashboardFallback title={t.dashboard} />}>
                    <Dashboard
                      accidents={accidents ? filteredAccidents : null}
                      baseHotspots={hotspots}
                      summary={summary}
                      t={t}
                    />
                  </Suspense>
                </div>
              </>
            ) : null}
          </>
        ) : null}

        {activeTab === 'crashFactors' ? (
          <div className="full-width-panel">
            <Suspense fallback={<DashboardFallback title={t.crashFactors} />}>
              <CrashFactorDashboard
                accidents={crashDetailAccidents}
                parties={crashDetailParties}
                detailSummary={crashDetailSummary}
                factorSummary={crashFactorSummary}
                isLoading={isCrashDetailsLoading}
                error={crashDetailsError}
                t={t}
              />
            </Suspense>
          </div>
        ) : null}

        {activeTab === 'reportedViolations' ? (
          <div className="full-width-panel">
            <Suspense fallback={<DashboardFallback title={t.trafficViolationReportTop5Statistics} />}>
              <TrafficViolationReportDashboard
                records={trafficViolationReport.records}
                summary={trafficViolationReport.summary}
                crashSummary={summary}
                isLoading={trafficViolationReport.isLoading}
                error={trafficViolationReport.error}
                t={t}
              />
            </Suspense>
          </div>
        ) : null}

        {activeTab === 'dataNotes' ? (
          <section className="dashboard data-notes full-width-panel">
            <div className="section-heading">
              <p className="eyebrow dark">Taipei Open Data</p>
              <h2>{t.dataNotes}</h2>
            </div>
            <p>{t.dataDisclaimer}</p>
            <p>{t.crashDetailDisclaimer}</p>
            <p>{t.partyLevelNotice}</p>
            <p>{t.trafficViolationReportDataNote}</p>
            <p>{t.trafficViolationReportInterpretationNote}</p>
          </section>
        ) : null}
      </main>

      <Footer t={t} />
    </div>
  );
}
