import type { AccidentHotspot, AccidentRecord, AccidentSummary } from '../types/accident';
import type { Translation } from '../i18n';

type Props = {
  accidents: AccidentRecord[] | null;
  hotspots: AccidentHotspot[];
  summary: AccidentSummary | null;
  t: Translation;
};

export function SummaryCards({ accidents, hotspots, summary, t }: Props) {
  const calculated = accidents?.reduce(
    (current, accident) => {
      if (accident.accidentType === 1) current.a1Count += 1;

      const district = accident.district ?? '未辨識';
      current.districtCounts.set(district, (current.districtCounts.get(district) ?? 0) + 1);
      current.hourCounts.set(accident.hour, (current.hourCounts.get(accident.hour) ?? 0) + 1);
      return current;
    },
    {
      a1Count: 0,
      districtCounts: new Map<string, number>(),
      hourCounts: new Map<number, number>(),
    },
  );
  const totalCount = accidents?.length ?? summary?.totalRecords ?? 0;
  const a1Count = calculated?.a1Count ?? summary?.a1Count ?? 0;
  const a2Count = accidents ? accidents.length - a1Count : (summary?.a2Count ?? 0);
  const topDistrict =
    calculated
      ? ([...calculated.districtCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-')
      : (summary?.byDistrict[0]?.district ?? '-');
  const peakHour = calculated
    ? [...calculated.hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    : summary?.byHour.slice().sort((a, b) => b.totalCount - a.totalCount)[0]?.hour;
  const topHotspot = hotspots[0]?.location ?? '-';
  const cards = [
    { label: t.totalAccidents, value: totalCount.toLocaleString() },
    { label: t.fatalAccidents, value: a1Count.toLocaleString() },
    { label: t.injuryAccidents, value: a2Count.toLocaleString() },
    { label: t.mostFrequentDistrict, value: topDistrict },
    { label: t.peakHour, value: peakHour === undefined ? '-' : `${peakHour}:00` },
    { label: t.topHotspot, value: topHotspot },
  ];

  return (
    <div className="summary-grid">
      {cards.map((card, index) => (
        <article className="summary-card" data-priority={index < 3 ? 'primary' : 'secondary'} key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </div>
  );
}
