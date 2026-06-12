import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AccidentRecord } from '../types/accident';
import type { Translation } from '../i18n';
import { aggregateByHour } from '../utils/accidents';

export function HourTrendChart({ accidents, t }: { accidents: AccidentRecord[]; t: Translation }) {
  const data = aggregateByHour(accidents);
  return (
    <section className="chart-block">
      <h3>{t.accidentsByHour}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis width={42} />
          <Tooltip />
          <Area dataKey="totalCount" name={t.totalAccidents} stroke="#2563eb" fill="#bfdbfe" />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}
