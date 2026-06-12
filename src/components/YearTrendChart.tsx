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
import type { AccidentRecord } from '../types/accident';
import type { Translation } from '../i18n';
import { aggregateByYear } from '../utils/accidents';

export function YearTrendChart({ accidents, t }: { accidents: AccidentRecord[]; t: Translation }) {
  const data = aggregateByYear(accidents);
  return (
    <section className="chart-block">
      <h3>{t.typeByYear}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis width={42} />
          <Tooltip />
          <Legend />
          <Bar dataKey="a1Count" name="A1" fill="#b91c1c" />
          <Bar dataKey="a2Count" name="A2" fill="#f97316" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
