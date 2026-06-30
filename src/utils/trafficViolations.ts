import type {
  AccidentSummary,
  TrafficViolationReportItemCategory,
  TrafficViolationReportTop5StatisticRecord,
  TrafficViolationReportTop5StatisticSummary,
} from '../types/accident';

export const TRAFFIC_VIOLATION_SOURCE = '臺北市民眾檢舉前五大違規項目統計表';
export const TRAFFIC_VIOLATION_SOURCE_AGENCY = '臺北市政府警察局交通警察大隊';

type RawViolationRow = Record<string, unknown>;

export function cleanText(raw: unknown): string | undefined {
  const text = String(raw ?? '').replace(/\u3000/g, ' ').trim();
  if (!text || ['-', '--', 'NaN', 'NULL', 'null'].includes(text)) return undefined;
  return text;
}

export function parseIntegerText(raw: unknown): number | undefined {
  const text = cleanText(raw)?.replaceAll(',', '');
  if (!text) return undefined;
  const value = Number.parseInt(text, 10);
  return Number.isFinite(value) ? value : undefined;
}

export function parseCityCode(raw: unknown): string | undefined {
  return cleanText(raw);
}

export function parseRocYear(raw: unknown): {
  yearRaw?: string;
  rocYear?: number;
  year?: number;
  warning?: string;
} {
  const yearRaw = cleanText(raw);
  if (!yearRaw) return {};
  const yearText = yearRaw.replace('年', '');
  const parsed = Number.parseInt(yearText, 10);
  if (!Number.isFinite(parsed)) return { yearRaw, warning: `Invalid year: ${yearRaw}` };

  const rocYear = parsed < 1911 ? parsed : undefined;
  const year = rocYear ? rocYear + 1911 : parsed;
  if (year < 2010 || year > 2100) return { yearRaw, rocYear, year, warning: `Unusual year: ${yearRaw}` };
  return { yearRaw, rocYear, year };
}

export function parseReportCount(raw: unknown): number | undefined {
  return parseIntegerText(raw);
}

export function normalizeTrafficViolationItem(raw: unknown): string | undefined {
  return cleanText(raw);
}

export function classifyTrafficViolationItem(raw: string | undefined): TrafficViolationReportItemCategory {
  const text = raw?.trim() ?? '';
  if (!text) return 'unknown';
  if (text.includes('停車') || text.includes('臨停') || text.includes('停等') || text.includes('併排')) {
    return 'parking_or_stopping';
  }
  if (text.includes('紅燈') || text.includes('號誌') || text.includes('闖越')) return 'red_light_or_signal';
  if (text.includes('車道') || text.includes('轉彎') || text.includes('變換車道') || text.includes('未依規定行駛')) {
    return 'lane_or_turn';
  }
  if (text.includes('速限') || text.includes('超速')) return 'speed';
  if (text.includes('牌照') || text.includes('號牌') || text.includes('無照')) return 'license_or_registration';
  if (text.includes('手機') || text.includes('手持') || text.includes('使用行動電話')) {
    return 'mobile_phone_or_distraction';
  }
  if (text.includes('安全帽') || text.includes('安全帶')) return 'helmet_or_seatbelt';
  if (text.includes('行人') || text.includes('斑馬線') || text.includes('行穿線')) return 'pedestrian_or_crosswalk';
  return 'other';
}

export function safeRatioPercent(numerator: number | undefined, denominator: number | undefined): number | undefined {
  if (numerator === undefined || denominator === undefined || denominator === 0) return undefined;
  return (numerator / denominator) * 100;
}

export function percentChange(current: number | undefined, previous: number | undefined): number | undefined {
  if (current === undefined || previous === undefined || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function hashSourceRecord(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

export function normalizeTrafficViolationRows(rows: RawViolationRow[]) {
  const records: TrafficViolationReportTop5StatisticRecord[] = rows.flatMap((row, index) => {
      const yearParts = parseRocYear(row['年度']);
      const violationItemRaw = cleanText(row['違規項目']);
      const violationItem = violationItemRaw;
      if (!yearParts.year || !violationItem) return [];

      const cityName = cleanText(row['縣市']);
      const cityCode = parseCityCode(row['縣市代碼']);
      const reportCount = parseReportCount(row['筆數']);
      const key = `${yearParts.yearRaw ?? yearParts.year}|${cityCode ?? ''}|${violationItem}`;

      return [{
        id: `traffic-violation-${hashSourceRecord(`${key}|${index}`)}`,
        module: 'traffic_violation_report_top5_statistics',
        sourceSequenceNumber: parseIntegerText(row['序號']),
        yearRaw: yearParts.yearRaw,
        rocYear: yearParts.rocYear,
        year: yearParts.year,
        cityName,
        cityNameNormalized: cityName,
        cityCode,
        cityCodeNormalized: cityCode,
        violationItemRaw,
        violationItem,
        violationItemNormalized: normalizeTrafficViolationItem(violationItem),
        violationItemCategory: classifyTrafficViolationItem(violationItem),
        reportCount,
        rankWithinYear: undefined,
        shareWithinYearPercent: undefined,
        reportCountYoYChangePercent: undefined,
        firstYearReportCount: undefined,
        changeFromFirstYearPercent: undefined,
        isTopItemWithinYear: false,
        source: TRAFFIC_VIOLATION_SOURCE,
        sourceAgency: TRAFFIC_VIOLATION_SOURCE_AGENCY,
      }];
    });

  return deriveTrafficViolationMetrics(records);
}

export function deriveTrafficViolationMetrics(records: TrafficViolationReportTop5StatisticRecord[]) {
  const byYear = new Map<number, TrafficViolationReportTop5StatisticRecord[]>();
  records.forEach((record) => {
    byYear.set(record.year, [...(byYear.get(record.year) ?? []), record]);
  });

  byYear.forEach((yearRecords) => {
    const sorted = [...yearRecords].sort((a, b) => (b.reportCount ?? -1) - (a.reportCount ?? -1));
    const total = sorted.reduce((sum, record) => sum + (record.reportCount ?? 0), 0);
    let rank = 0;
    let previousCount: number | undefined;
    sorted.forEach((record) => {
      if (record.reportCount !== previousCount) rank += 1;
      record.rankWithinYear = rank;
      record.shareWithinYearPercent = safeRatioPercent(record.reportCount, total);
      record.isTopItemWithinYear = rank === 1;
      previousCount = record.reportCount;
    });
  });

  const byItem = new Map<string, TrafficViolationReportTop5StatisticRecord[]>();
  records.forEach((record) => {
    const key = record.violationItemNormalized ?? record.violationItem;
    byItem.set(key, [...(byItem.get(key) ?? []), record]);
  });

  byItem.forEach((itemRecords) => {
    const sorted = [...itemRecords].sort((a, b) => a.year - b.year);
    const first = sorted.find((record) => record.reportCount !== undefined);
    sorted.forEach((record) => {
      const previous = sorted.find((candidate) => candidate.year === record.year - 1);
      record.reportCountYoYChangePercent = percentChange(record.reportCount, previous?.reportCount);
      record.firstYearReportCount = first?.reportCount;
      record.changeFromFirstYearPercent = percentChange(record.reportCount, first?.reportCount);
    });
  });

  return records;
}

export function buildTrafficViolationSummary(
  records: TrafficViolationReportTop5StatisticRecord[],
  crashSummary?: AccidentSummary,
): TrafficViolationReportTop5StatisticSummary {
  const years = [...new Set(records.map((record) => record.year))].sort((a, b) => a - b);
  const latestYear = years.at(-1);
  const latestYearRecords = records
    .filter((record) => record.year === latestYear)
    .sort((a, b) => (a.rankWithinYear ?? 99) - (b.rankWithinYear ?? 99));

  const byYear = years.map((year) => {
    const yearRecords = records.filter((record) => record.year === year);
    const totalReportCount = yearRecords.reduce((sum, record) => sum + (record.reportCount ?? 0), 0);
    const top = [...yearRecords].sort((a, b) => (b.reportCount ?? 0) - (a.reportCount ?? 0))[0];
    return {
      year,
      totalReportCount,
      itemCount: yearRecords.length,
      topViolationItem: top?.violationItem,
      topViolationReportCount: top?.reportCount,
      crashCount: crashSummary?.byYear.find((crashYear) => crashYear.year === year)?.totalCount,
    };
  });

  const itemKeys = [...new Set(records.map((record) => record.violationItemNormalized ?? record.violationItem))];
  const byViolationItem = itemKeys.map((itemKey) => {
    const itemRecords = records.filter((record) => (record.violationItemNormalized ?? record.violationItem) === itemKey);
    const latest = [...itemRecords].sort((a, b) => b.year - a.year)[0];
    return {
      violationItem: latest.violationItem,
      violationItemCategory: latest.violationItemCategory,
      recordCount: itemRecords.length,
      firstYear: Math.min(...itemRecords.map((record) => record.year)),
      latestYear: latest.year,
      latestReportCount: latest.reportCount,
      totalReportCountAcrossYears: itemRecords.reduce((sum, record) => sum + (record.reportCount ?? 0), 0),
      maxAnnualReportCount: Math.max(...itemRecords.map((record) => record.reportCount ?? 0)),
    };
  });

  const categoryKeys = [...new Set(records.map((record) => record.violationItemCategory))];
  const byViolationCategory = categoryKeys.map((category) => {
    const categoryRecords = records.filter((record) => record.violationItemCategory === category);
    return {
      violationItemCategory: category,
      recordCount: categoryRecords.length,
      totalReportCountAcrossYears: categoryRecords.reduce((sum, record) => sum + (record.reportCount ?? 0), 0),
    };
  });

  return {
    totalRecords: records.length,
    minYear: years[0],
    maxYear: latestYear,
    latestYear,
    uniqueViolationItemCount: itemKeys.length,
    uniqueViolationCategoryCount: categoryKeys.length,
    latestYearTotalReportCount: latestYearRecords.reduce((sum, record) => sum + (record.reportCount ?? 0), 0),
    latestYearTopItems: latestYearRecords.map((record) => ({
      rankWithinYear: record.rankWithinYear,
      violationItem: record.violationItem,
      violationItemCategory: record.violationItemCategory,
      reportCount: record.reportCount,
      shareWithinYearPercent: record.shareWithinYearPercent,
    })),
    byYear,
    byViolationItem,
    byViolationCategory,
  };
}
