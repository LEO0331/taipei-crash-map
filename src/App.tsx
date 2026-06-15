import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { AccidentFilters, AccidentHotspot, AccidentRecord, MapMode } from './types/accident';
import type { Language, Translation } from './i18n';
import { translations } from './i18n';
import { useAccidentData } from './hooks/useAccidentData';
import { buildHeatmapPoints, filterAccidents, filterHeatmapPoints } from './utils/accidents';
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

function DashboardLoader({
  accidents,
  baseHotspots,
  isLoading,
  title,
  error,
  t,
  onVisible,
}: {
  accidents: AccidentRecord[] | null;
  baseHotspots: AccidentHotspot[];
  isLoading: boolean;
  title: string;
  error?: string;
  t: Translation;
  onVisible: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || accidents) return;

    if (!('IntersectionObserver' in window)) {
      onVisible();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onVisible();
          observer.disconnect();
        }
      },
      { rootMargin: '320px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [accidents, onVisible]);

  return (
    <div className="dashboard-slot" ref={containerRef}>
      {error ? <p className="error">{error}</p> : null}
      {!accidents || isLoading ? (
        <DashboardFallback title={title} />
      ) : (
        <Suspense fallback={<DashboardFallback title={title} />}>
          <Dashboard accidents={accidents} baseHotspots={baseHotspots} t={t} />
        </Suspense>
      )}
    </div>
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
  const [mapMode, setMapMode] = useState<MapMode>('heatmap');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>();
  const {
    accidents,
    heatmapPoints,
    hotspots,
    summary,
    isLoading,
    isAccidentsLoading,
    error,
    accidentsError,
    loadAccidents,
  } = useAccidentData();
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

  const districts = summary?.districts ?? [];
  const filteredAccidents = useMemo(
    () => (accidents ? filterAccidents(accidents, filters) : []),
    [accidents, filters],
  );
  const filteredHeatmapPoints = useMemo(
    () =>
      accidents
        ? buildHeatmapPoints(filteredAccidents)
        : filterHeatmapPoints(heatmapPoints, filters),
    [accidents, filteredAccidents, filters, heatmapPoints],
  );
  const visibleRecordCount = accidents
    ? filteredAccidents.length
    : filteredHeatmapPoints.reduce((total, point) => total + point.count, 0);
  const heroStats = [
    { label: 'Records', value: summary?.totalRecords.toLocaleString() ?? '...' },
    { label: 'A1', value: summary?.a1Count.toLocaleString() ?? '...' },
    { label: 'A2', value: summary?.a2Count.toLocaleString() ?? '...' },
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

      <main className="workspace">
        <aside className="control-deck">
          <DisclaimerNotice t={t} />
          <FilterPanel filters={filters} districts={districts} t={t} onChange={setFilters} />
          <NearbyHistoricalAccidents
            filters={filters}
            t={t}
            onChange={setFilters}
            onLocate={setUserLocation}
          />
        </aside>
        {isLoading ? <p className="loading">Loading accident data...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {needsRawAccidents && isAccidentsLoading ? (
          <p className="loading">Loading detailed accident records...</p>
        ) : null}
        {needsRawAccidents && accidentsError ? <p className="error">{accidentsError}</p> : null}
        {!isLoading && !error ? (
          <>
            <AccidentMap
              accidents={filteredAccidents}
              heatmapPoints={filteredHeatmapPoints}
              hotspots={hotspots}
              filters={filters}
              mode={mapMode}
              language={language}
              t={t}
              userLocation={userLocation}
              recordCount={visibleRecordCount}
              onModeChange={setMapMode}
            />
            <DashboardLoader
              accidents={accidents}
              baseHotspots={hotspots}
              isLoading={isAccidentsLoading}
              title={t.dashboard}
              error={accidentsError}
              t={t}
              onVisible={() => void loadAccidents()}
            />
          </>
        ) : null}
      </main>

      <Footer t={t} />
    </div>
  );
}
