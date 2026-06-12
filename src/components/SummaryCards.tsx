import type { AccidentHotspot, AccidentRecord } from '../types/accident';
import type { Translation } from '../i18n';

type Props = {
  accidents: AccidentRecord[];
  hotspots: AccidentHotspot[];
  t: Translation;
};

export function SummaryCards({ accidents, hotspots, t }: Props) {
  const summary = accidents.reduce(
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
  const a2Count = accidents.length - summary.a1Count;
  const topDistrict = [...summary.districtCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  const peakHour = [...summary.hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topHotspot = hotspots[0]?.location ?? '-';
  const cards = [
    { label: t.totalAccidents, value: accidents.length.toLocaleString() },
    { label: t.fatalAccidents, value: summary.a1Count.toLocaleString() },
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
