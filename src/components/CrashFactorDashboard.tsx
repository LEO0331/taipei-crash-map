import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  CountSummary,
  CrashDetailAccidentRecord,
  CrashDetailFilters,
  CrashDetailPartyRecord,
  CrashDetailSummary,
  CrashFactorSummary,
  CrashSeverity,
} from '../types/accident';
import type { Translation } from '../i18n';
import {
  buildCrashDetailSummary,
  buildCrashFactorSummary,
  filterCrashDetailData,
  optionsFromCounts,
} from '../utils/crashDetails';

type Props = {
  accidents: CrashDetailAccidentRecord[];
  parties: CrashDetailPartyRecord[];
  detailSummary: CrashDetailSummary | null;
  factorSummary: CrashFactorSummary | null;
  isLoading: boolean;
  error?: string;
  t: Translation;
};

const defaultFilters: CrashDetailFilters = {
  years: [],
  months: [],
  district: 'all',
  severity: 'all',
  vehicleType: 'all',
  weather: 'all',
  lighting: 'all',
  roadType: 'all',
  speedLimit: 'all',
  roadShape: 'all',
  accidentPosition: 'all',
  roadSurfaceCondition: 'all',
  signalCondition: 'all',
  accidentPattern: 'all',
  sex: 'all',
  ageGroup: 'all',
  injurySeverity: 'all',
  alcoholCondition: 'all',
  protectionDevice: 'all',
  phoneUse: 'all',
  causeCode: 'all',
  hitAndRun: 'all',
  search: '',
};

function severityLabel(severity: CrashSeverity, t: Translation): string {
  if (severity === 'a1_fatal_24h') return t.deathsWithin24h;
  if (severity === 'a2_injury_or_late_death') return t.injuries;
  return 'Unknown';
}

function topLabel(items: CountSummary[] | undefined): string {
  return items?.[0]?.label ?? '-';
}

function SelectField({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DistributionChart({
  title,
  data,
  color = '#0f766e',
}: {
  title: string;
  data: CountSummary[];
  color?: string;
}) {
  return (
    <section className="chart-block">
      <h3>{title}</h3>
      {data.length ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ left: 24 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="label" type="category" width={96} />
            <Tooltip />
            <Bar dataKey="count" fill={color} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="empty-state">No data</p>
      )}
    </section>
  );
}

export function CrashFactorDashboard({
  accidents,
  parties,
  detailSummary,
  factorSummary,
  isLoading,
  error,
  t,
}: Props) {
  const [filters, setFilters] = useState(defaultFilters);
  const filtered = useMemo(
    () => filterCrashDetailData(accidents, parties, filters),
    [accidents, parties, filters],
  );
  const currentDetailSummary = useMemo(
    () => buildCrashDetailSummary(filtered.accidents, filtered.parties),
    [filtered.accidents, filtered.parties],
  );
  const currentFactorSummary = useMemo(
    () => buildCrashFactorSummary(filtered.parties),
    [filtered.parties],
  );
  const baseDetailSummary = detailSummary ?? currentDetailSummary;
  const baseFactorSummary = factorSummary ?? currentFactorSummary;
  const severityOptions: CrashSeverity[] = ['a1_fatal_24h', 'a2_injury_or_late_death', 'unknown'];
  const cards = [
    { label: t.fatalInjuryAccidents, value: currentDetailSummary.accidentRecordCount.toLocaleString() },
    { label: t.involvedParties, value: currentFactorSummary.partyRecordCount.toLocaleString() },
    { label: t.injuries, value: currentDetailSummary.injuryCount.toLocaleString() },
    { label: t.deathsWithin24h, value: currentDetailSummary.deathWithin24hCount.toLocaleString() },
    { label: t.deaths2To30Days, value: currentDetailSummary.death2To30DayCount.toLocaleString() },
    { label: t.topVehicleType, value: topLabel(currentFactorSummary.byVehicleType) },
    { label: t.topCrashPattern, value: topLabel(currentDetailSummary.byAccidentPattern) },
    { label: t.topWeatherCondition, value: topLabel(currentDetailSummary.byWeather) },
    { label: t.topRoadType, value: topLabel(currentDetailSummary.byRoadType) },
    { label: t.topMainCauseCode, value: topLabel(currentDetailSummary.byMainCauseCode) },
  ];

  const setFilter = <Key extends keyof CrashDetailFilters>(key: Key, value: CrashDetailFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="dashboard crash-factor-dashboard">
      <div className="section-heading">
        <p className="eyebrow dark">{t.factorDistribution}</p>
        <h2>{t.crashFactors}</h2>
      </div>
      <p className="notice crash-detail-disclaimer">{t.crashDetailDisclaimer}</p>
      <p className="notice crash-detail-disclaimer">{t.partyLevelNotice}</p>
      {isLoading ? <p className="loading">Loading crash detail records...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <section className="filter-panel crash-filter-panel" aria-label={t.crashFactors}>
        <label className="field field-wide">
          <span>{t.searchPlaceholder}</span>
          <input
            value={filters.search}
            placeholder={t.searchPlaceholder}
            onChange={(event) => setFilter('search', event.target.value)}
          />
        </label>
        <SelectField
          label={t.year}
          value={filters.years[0]?.toString() ?? 'all'}
          allLabel={t.all}
          options={baseDetailSummary.years.map(String)}
          onChange={(value) => setFilter('years', value === 'all' ? [] : [Number(value)])}
        />
        <SelectField
          label={t.month}
          value={filters.months[0]?.toString() ?? 'all'}
          allLabel={t.all}
          options={Array.from({ length: 12 }, (_, index) => String(index + 1))}
          onChange={(value) => setFilter('months', value === 'all' ? [] : [Number(value)])}
        />
        <SelectField
          label={t.district}
          value={filters.district}
          allLabel={t.all}
          options={baseDetailSummary.districts}
          onChange={(value) => setFilter('district', value)}
        />
        <label className="field">
          <span>{t.crashSeverity}</span>
          <select
            value={filters.severity}
            onChange={(event) => setFilter('severity', event.target.value as CrashDetailFilters['severity'])}
          >
            <option value="all">{t.all}</option>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {severityLabel(severity, t)}
              </option>
            ))}
          </select>
        </label>
        <SelectField label={t.vehicleType} value={filters.vehicleType} allLabel={t.all} options={optionsFromCounts(baseFactorSummary.byVehicleType)} onChange={(value) => setFilter('vehicleType', value)} />
        <SelectField label={t.weather} value={filters.weather} allLabel={t.all} options={optionsFromCounts(baseDetailSummary.byWeather)} onChange={(value) => setFilter('weather', value)} />
        <SelectField label={t.lighting} value={filters.lighting} allLabel={t.all} options={optionsFromCounts(baseDetailSummary.byLighting)} onChange={(value) => setFilter('lighting', value)} />
        <SelectField label={t.roadType} value={filters.roadType} allLabel={t.all} options={optionsFromCounts(baseDetailSummary.byRoadType)} onChange={(value) => setFilter('roadType', value)} />
        <SelectField label={t.speedLimit} value={filters.speedLimit} allLabel={t.all} options={optionsFromCounts(baseDetailSummary.bySpeedLimit)} onChange={(value) => setFilter('speedLimit', value)} />
        <SelectField label={t.roadShape} value={filters.roadShape} allLabel={t.all} options={optionsFromCounts(baseDetailSummary.byRoadShape)} onChange={(value) => setFilter('roadShape', value)} />
        <SelectField label={t.signalCondition} value={filters.signalCondition} allLabel={t.all} options={optionsFromCounts(baseDetailSummary.bySignal)} onChange={(value) => setFilter('signalCondition', value)} />
        <SelectField label={t.crashPattern} value={filters.accidentPattern} allLabel={t.all} options={optionsFromCounts(baseDetailSummary.byAccidentPattern)} onChange={(value) => setFilter('accidentPattern', value)} />
        <SelectField label={t.sex} value={filters.sex} allLabel={t.all} options={optionsFromCounts(baseFactorSummary.bySex)} onChange={(value) => setFilter('sex', value)} />
        <SelectField label={t.ageGroup} value={filters.ageGroup} allLabel={t.all} options={optionsFromCounts(baseFactorSummary.byAgeGroup)} onChange={(value) => setFilter('ageGroup', value)} />
        <SelectField label={t.injurySeverity} value={filters.injurySeverity} allLabel={t.all} options={optionsFromCounts(baseFactorSummary.byInjurySeverity)} onChange={(value) => setFilter('injurySeverity', value)} />
        <SelectField label={t.alcoholCondition} value={filters.alcoholCondition} allLabel={t.all} options={optionsFromCounts(baseFactorSummary.byAlcoholCondition)} onChange={(value) => setFilter('alcoholCondition', value)} />
        <SelectField label={t.protectionDevice} value={filters.protectionDevice} allLabel={t.all} options={optionsFromCounts(baseFactorSummary.byProtectionDevice)} onChange={(value) => setFilter('protectionDevice', value)} />
        <SelectField label={t.phoneUse} value={filters.phoneUse} allLabel={t.all} options={optionsFromCounts(baseFactorSummary.byPhoneUse)} onChange={(value) => setFilter('phoneUse', value)} />
        <SelectField label={t.mainCauseCode} value={filters.causeCode} allLabel={t.all} options={optionsFromCounts(baseDetailSummary.byMainCauseCode)} onChange={(value) => setFilter('causeCode', value)} />
        <SelectField label={t.hitAndRun} value={filters.hitAndRun} allLabel={t.all} options={optionsFromCounts(baseFactorSummary.byHitAndRun)} onChange={(value) => setFilter('hitAndRun', value)} />
      </section>
      <div className="summary-grid crash-summary-grid">
        {cards.map((card, index) => (
          <article className="summary-card" data-priority={index < 5 ? 'primary' : 'secondary'} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>
      <div className="chart-grid">
        <section className="chart-block">
          <h3>{t.accidentsByYear}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={currentDetailSummary.byYear}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis width={42} />
              <Tooltip />
              <Legend />
              <Bar dataKey="fatalCount" name={t.deathsWithin24h} fill="#b42318" />
              <Bar dataKey="injuryOrLateDeathCount" name={t.injuries} fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <DistributionChart title={t.accidentsByMonth} data={currentDetailSummary.byMonth.map((item) => ({ label: String(item.month), count: item.totalCount }))} color="#2563eb" />
        <DistributionChart title={t.accidentsByHour} data={currentDetailSummary.byHour.map((item) => ({ label: `${item.hour}:00`, count: item.totalCount }))} color="#2563eb" />
        <DistributionChart title={t.topDistricts} data={currentDetailSummary.byDistrict} />
        <DistributionChart title={t.severityDistribution} data={currentDetailSummary.bySeverity.map((item) => ({ ...item, label: severityLabel(item.label as CrashSeverity, t) }))} color="#b42318" />
        <DistributionChart title={t.weatherDistribution} data={currentDetailSummary.byWeather} />
        <DistributionChart title={t.lightingDistribution} data={currentDetailSummary.byLighting} />
        <DistributionChart title={t.roadTypeDistribution} data={currentDetailSummary.byRoadType} />
        <DistributionChart title={t.speedLimitDistribution} data={currentDetailSummary.bySpeedLimit} />
        <DistributionChart title={t.roadShapeDistribution} data={currentDetailSummary.byRoadShape} />
        <DistributionChart title={t.signalDistribution} data={currentDetailSummary.bySignal} />
        <DistributionChart title={t.crashPatternDistribution} data={currentDetailSummary.byAccidentPattern} />
        <DistributionChart title={t.causeCodeDistribution} data={currentDetailSummary.byMainCauseCode} />
        <DistributionChart title={t.vehicleTypeDistribution} data={currentFactorSummary.byVehicleType} color="#dca54c" />
        <DistributionChart title={t.ageGroupDistribution} data={currentFactorSummary.byAgeGroup} color="#dca54c" />
        <DistributionChart title={t.sexDistribution} data={currentFactorSummary.bySex} color="#dca54c" />
        <DistributionChart title={t.injurySeverityDistribution} data={currentFactorSummary.byInjurySeverity} color="#dca54c" />
        <DistributionChart title={t.alcoholDistribution} data={currentFactorSummary.byAlcoholCondition} color="#dca54c" />
        <DistributionChart title={t.protectionDeviceDistribution} data={currentFactorSummary.byProtectionDevice} color="#dca54c" />
        <DistributionChart title={t.phoneUseDistribution} data={currentFactorSummary.byPhoneUse} color="#dca54c" />
        <DistributionChart title={t.hitAndRunDistribution} data={currentFactorSummary.byHitAndRun} color="#dca54c" />
        <DistributionChart title={t.drivingQualificationDistribution} data={currentFactorSummary.byDrivingQualification} color="#dca54c" />
        <DistributionChart title={t.driverLicenseDistribution} data={currentFactorSummary.byDriverLicenseType} color="#dca54c" />
      </div>
    </section>
  );
}
