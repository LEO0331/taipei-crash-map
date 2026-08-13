import type { AccidentAppraisalReconsiderationRecord } from '../types/accident';

const fields = {
  period: '年/月', discussed: '申請件數_有進覆議會討論之件數', cases: '覆議件數_申請件數扣除不予覆議件數',
  judicial: '司法囑託', individual: '個人申請', rejected: '不予覆議', a1: 'A1件數（總計）', a2: 'A2件數（總計）', a3: 'A3件數（總計）',
  a1Rate: 'A1比例_%', a2Rate: 'A2比例_%', a3Rate: 'A3比例_%',
} as const;

const value = (row: Record<string, string>, key: keyof typeof fields) => String(row[fields[key]] ?? '').trim();
export const parseCount = (raw: string) => /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : null;
export const parsePercent = (raw: string) => {
  const cleaned = raw.trim().replace(/%$/, '');
  return /^\d+(?:\.\d+)?$/.test(cleaned) ? Number(cleaned) : null;
};
export function parseReconsiderationPeriod(raw: string) {
  const match = raw.trim().match(/^(\d{2,4})\s*年\s*(\d{1,2})\s*月$/);
  if (!match) return { year: null, month: null, period: null };
  const sourceYear = Number(match[1]); const month = Number(match[2]);
  if (month < 1 || month > 12) return { year: null, month: null, period: null };
  const year = sourceYear < 1911 ? sourceYear + 1911 : sourceYear;
  return { year, month, period: `${year}-${String(month).padStart(2, '0')}` };
}
export function normalizeAppraisalReconsiderationRows(rows: Record<string, string>[]) {
  return rows.map((row, index): AccidentAppraisalReconsiderationRecord => {
    const periodRaw = value(row, 'period');
    return { id: `traffic_accident_appraisal_reconsiderations-${index + 1}`, module: 'traffic_accident_appraisal_reconsiderations', periodRaw, ...parseReconsiderationPeriod(periodRaw),
      applicationsDiscussedRaw: value(row, 'discussed'), applicationsDiscussed: parseCount(value(row, 'discussed')),
      reconsiderationCasesRaw: value(row, 'cases'), reconsiderationCases: parseCount(value(row, 'cases')),
      judicialReferralsRaw: value(row, 'judicial'), judicialReferrals: parseCount(value(row, 'judicial')),
      individualApplicationsRaw: value(row, 'individual'), individualApplications: parseCount(value(row, 'individual')),
      rejectedReconsiderationsRaw: value(row, 'rejected'), rejectedReconsiderations: parseCount(value(row, 'rejected')),
      a1CasesRaw: value(row, 'a1'), a1Cases: parseCount(value(row, 'a1')), a2CasesRaw: value(row, 'a2'), a2Cases: parseCount(value(row, 'a2')), a3CasesRaw: value(row, 'a3'), a3Cases: parseCount(value(row, 'a3')),
      a1RateRaw: value(row, 'a1Rate'), a1Rate: parsePercent(value(row, 'a1Rate')), a2RateRaw: value(row, 'a2Rate'), a2Rate: parsePercent(value(row, 'a2Rate')), a3RateRaw: value(row, 'a3Rate'), a3Rate: parsePercent(value(row, 'a3Rate')),
      sourceFields: row,
    };
  }).sort((a, b) => (a.period ?? '').localeCompare(b.period ?? ''));
}
export function derivedSeverity(record: AccidentAppraisalReconsiderationRecord) {
  const total = (record.a1Cases ?? 0) + (record.a2Cases ?? 0) + (record.a3Cases ?? 0);
  return total ? { total, a1: (record.a1Cases ?? 0) / total * 100, a2: (record.a2Cases ?? 0) / total * 100, a3: (record.a3Cases ?? 0) / total * 100 } : null;
}
