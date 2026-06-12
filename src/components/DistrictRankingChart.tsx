import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AccidentRecord } from '../types/accident';
import type { Translation } from '../i18n';
import { aggregateByDistrict } from '../utils/accidents';

export function DistrictRankingChart({
  accidents,
  t,
}: {
  accidents: AccidentRecord[];
  t: Translation;
}) {
  const data = aggregateByDistrict(accidents).slice(0, 10);
  return (
    <section className="chart-block">
      <h3>{t.topDistricts}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="district" type="category" width={74} />
          <Tooltip />
          <Bar dataKey="totalCount" name={t.totalAccidents} fill="#0f766e" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
