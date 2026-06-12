import { useMemo } from 'react';
import type { AccidentHotspot, AccidentRecord } from '../types/accident';
import type { Translation } from '../i18n';
import { buildHotspots } from '../utils/accidents';
import { SummaryCards } from './SummaryCards';
import { YearTrendChart } from './YearTrendChart';
import { HourTrendChart } from './HourTrendChart';
import { DistrictRankingChart } from './DistrictRankingChart';
import { HotspotRankingTable } from './HotspotRankingTable';

type Props = {
  accidents: AccidentRecord[];
  baseHotspots: AccidentHotspot[];
  t: Translation;
};

export function Dashboard({ accidents, baseHotspots, t }: Props) {
  const filteredHotspots = useMemo(
    () => (accidents.length > 0 ? buildHotspots(accidents, 50) : baseHotspots.slice(0, 50)),
    [accidents, baseHotspots],
  );

  return (
    <section className="dashboard">
      <div className="section-heading">
        <p className="eyebrow dark">Selected filters</p>
        <h2>{t.dashboard}</h2>
      </div>
      <SummaryCards accidents={accidents} hotspots={filteredHotspots} t={t} />
      <div className="chart-grid">
        <YearTrendChart accidents={accidents} t={t} />
        <HourTrendChart accidents={accidents} t={t} />
        <DistrictRankingChart accidents={accidents} t={t} />
        <HotspotRankingTable hotspots={filteredHotspots} t={t} />
      </div>
    </section>
  );
}
