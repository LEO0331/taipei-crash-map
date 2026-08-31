import { useMemo } from 'react';
import type { AccidentHotspot, AccidentRecord, AccidentSummary } from '../types/accident';
import type { Translation } from '../i18n';
import { buildHotspots } from '../utils/accidents';
import { SummaryCards } from './SummaryCards';
import { YearTrendChart } from './YearTrendChart';
import { HourTrendChart } from './HourTrendChart';
import { DistrictRankingChart } from './DistrictRankingChart';
import { HotspotRankingTable } from './HotspotRankingTable';

type Props = {
  accidents: AccidentRecord[] | null;
  baseHotspots: AccidentHotspot[];
  summary: AccidentSummary | null;
  t: Translation;
};

export function Dashboard({ accidents, baseHotspots, summary, t }: Props) {
  const filteredHotspots = useMemo(
    () => (accidents !== null ? buildHotspots(accidents, 50) : baseHotspots.slice(0, 50)),
    [accidents, baseHotspots],
  );
  const yearData = accidents ? undefined : summary?.byYear;
  const hourData = accidents ? undefined : summary?.byHour;
  const districtData = accidents ? undefined : summary?.byDistrict;

  return (
    <section className="dashboard">
      <div className="section-heading">
        <div>
          <p className="eyebrow dark">{t.selectedFilters}</p>
          <h2>{t.dashboard}</h2>
        </div>
      </div>
      <SummaryCards accidents={accidents} hotspots={filteredHotspots} summary={summary} t={t} />
      <div className="chart-grid">
        <YearTrendChart accidents={accidents ?? []} data={yearData} t={t} />
        <HourTrendChart accidents={accidents ?? []} data={hourData} t={t} />
        <DistrictRankingChart accidents={accidents ?? []} data={districtData} t={t} />
        <HotspotRankingTable hotspots={filteredHotspots} t={t} />
      </div>
    </section>
  );
}
