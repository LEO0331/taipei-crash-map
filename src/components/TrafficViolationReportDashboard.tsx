import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AccidentSummary,
  TrafficViolationReportItemCategory,
  TrafficViolationReportTop5StatisticRecord,
  TrafficViolationReportTop5StatisticSummary,
} from '../types/accident';
import type { Translation } from '../i18n';

type Props = {
  records: TrafficViolationReportTop5StatisticRecord[];
  summary: TrafficViolationReportTop5StatisticSummary | null;
  crashSummary: AccidentSummary | null;
  isLoading: boolean;
  error?: string;
  t: Translation;
};

const categoryKey: Record<TrafficViolationReportItemCategory, keyof Translation> = {
  parking_or_stopping: 'parkingOrStopping',
  red_light_or_signal: 'redLightOrSignal',
  lane_or_turn: 'laneOrTurn',
  speed: 'speed',
  license_or_registration: 'licenseOrRegistration',
  mobile_phone_or_distraction: 'mobilePhoneOrDistraction',
  helmet_or_seatbelt: 'helmetOrSeatbelt',
  pedestrian_or_crosswalk: 'pedestrianOrCrosswalk',
  other: 'other',
  unknown: 'unknown',
};

function percent(value: number | undefined) {
  return value === undefined ? '-' : `${value.toFixed(1)}%`;
}

export function TrafficViolationReportDashboard({ records, summary, crashSummary, isLoading, error, t }: Props) {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('zh-Hant');
    return records.filter((record) => {
      const text = `${record.year} ${record.violationItem} ${t[categoryKey[record.violationItemCategory]]} ${record.cityName ?? ''} ${record.cityCode ?? ''}`.toLocaleLowerCase('zh-Hant');
      return (
        (year === 'all' || record.year === Number(year)) &&
        (category === 'all' || record.violationItemCategory === category) &&
        (!query || text.includes(query))
      );
    });
  }, [category, records, search, t, year]);

  if (isLoading) return <p className="loading">Loading reported violation statistics...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!summary) return null;

  const highestYear = summary.byYear.reduce((best, current) =>
    current.totalReportCount > best.totalReportCount ? current : best,
  summary.byYear[0]);
  const latestTop = summary.latestYearTopItems[0];
  const years = summary.byYear.map((item) => item.year);
  const categories = [...new Set(records.map((record) => record.violationItemCategory))];
  const comparisonData = summary.byYear.map((item) => ({
    ...item,
    crashCount: crashSummary?.byYear.find((crashYear) => crashYear.year === item.year)?.totalCount,
  }));
  const categoryTrend = years.map((trendYear) => {
    const entry: Record<string, number | string> = { year: trendYear };
    records
      .filter((record) => record.year === trendYear)
      .forEach((record) => {
        const label = t[categoryKey[record.violationItemCategory]];
        entry[label] = Number(entry[label] ?? 0) + (record.reportCount ?? 0);
      });
    return entry;
  });

  const cards = [
    [t.latestYear, summary.latestYear ?? '-'],
    [t.latestYearReportedCount, summary.latestYearTotalReportCount?.toLocaleString() ?? '-'],
    [t.latestYearTopViolationItem, latestTop?.violationItem ?? '-'],
    [t.topViolationItemCount, latestTop?.reportCount?.toLocaleString() ?? '-'],
    [t.uniqueViolationItemCount, summary.uniqueViolationItemCount.toLocaleString()],
    [t.violationCategoryCount, summary.uniqueViolationCategoryCount.toLocaleString()],
    [t.highestAnnualReportedCount, highestYear?.totalReportCount.toLocaleString() ?? '-'],
    [t.yearWithHighestReportedCount, highestYear?.year ?? '-'],
  ];

  return (
    <section className="dashboard violation-dashboard">
      <div className="section-heading">
        <p className="eyebrow dark">{t.trafficViolationsCrashContext}</p>
        <h2>{t.trafficViolationReportTop5Statistics}</h2>
      </div>
      <p className="module-subtitle">
        {t.trafficViolationReportChartNotice}
      </p>
      <div className="summary-grid">
        {cards.map(([label, value]) => (
          <article className="summary-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <section className="filter-panel violation-filters" aria-label="Violation filters">
        <label className="field field-wide">
          <span>{t.trafficViolationReportSearchPlaceholder}</span>
          <input value={search} placeholder={t.trafficViolationReportSearchPlaceholder} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label className="field">
          <span>{t.year}</span>
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="all">{t.all}</option>
            {years.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t.violationCategory}</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">{t.all}</option>
            {categories.map((item) => <option key={item} value={item}>{t[categoryKey[item]]}</option>)}
          </select>
        </label>
      </section>

      <div className="chart-grid">
        <section className="chart-block">
          <h3>{t.totalReportedViolationCountByYear}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={summary.byYear}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis width={52} />
              <Tooltip />
              <Line dataKey="totalReportCount" name={t.reportCount} stroke="#0f766e" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="chart-block">
          <h3>{t.latestYearTopFiveViolationItems}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={summary.latestYearTopItems} layout="vertical" margin={{ left: 24 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="violationItem" type="category" width={110} />
              <Tooltip />
              <Bar dataKey="reportCount" name={t.reportCount} fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="chart-block">
          <h3>{t.violationCategoryTrend}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis width={52} />
              <Tooltip />
              <Legend />
              {categories.map((item, index) => (
                <Bar key={item} dataKey={t[categoryKey[item]]} stackId="category" fill={['#0f766e', '#f97316', '#2563eb', '#b42318', '#dca54c'][index % 5]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </section>

        {comparisonData.some((item) => item.crashCount !== undefined) ? (
          <section className="chart-block">
            <h3>{t.reportedViolationsVsCrashCountByYear}</h3>
            <p className="small-note">{t.trafficViolationCrashComparisonNote}</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis width={52} />
                <Tooltip />
                <Legend />
                <Line dataKey="totalReportCount" name={t.reportCount} stroke="#0f766e" strokeWidth={3} />
                <Line dataKey="crashCount" name={t.totalAccidents} stroke="#b42318" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </section>
        ) : null}
      </div>

      <section className="chart-block">
        <h3>{t.violationItems}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.year}</th>
                <th>{t.rankWithinYear}</th>
                <th>{t.violationItem}</th>
                <th>{t.violationCategory}</th>
                <th>{t.reportCount}</th>
                <th>{t.shareWithinYear}</th>
                <th>{t.yoyChange}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id}>
                  <td>{record.year}</td>
                  <td>{record.rankWithinYear ?? '-'}</td>
                  <td>{record.violationItem}</td>
                  <td>{t[categoryKey[record.violationItemCategory]]}</td>
                  <td>{record.reportCount?.toLocaleString() ?? '-'}</td>
                  <td>{percent(record.shareWithinYearPercent)}</td>
                  <td>{percent(record.reportCountYoYChangePercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="notice">
        <p>{t.trafficViolationReportMapNotice}</p>
        <p>{t.trafficViolationReportDataNote}</p>
        <p>{t.trafficViolationReportInterpretationNote}</p>
      </section>
    </section>
  );
}
