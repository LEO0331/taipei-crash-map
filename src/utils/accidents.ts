import type {
  AccidentFilters,
  AccidentHotspot,
  AccidentRecord,
  AccidentType,
  DistrictSummary,
  HourSummary,
  YearSummary,
} from '../types/accident';

export const TAIPEI_BOUNDS = {
  minLng: 121.43,
  maxLng: 121.7,
  minLat: 24.9,
  maxLat: 25.25,
};

export const ACCIDENT_TYPE_LABELS: Record<
  AccidentType,
  { zh: string; en: string }
> = {
  1: {
    zh: 'A1／1類：死亡事故',
    en: 'A1 / Type 1: Fatal accident',
  },
  2: {
    zh: 'A2／2類：受傷事故',
    en: 'A2 / Type 2: Injury accident',
  },
};

const TAIPEI_DISTRICTS = [
  '中正區',
  '大同區',
  '中山區',
  '松山區',
  '大安區',
  '萬華區',
  '信義區',
  '士林區',
  '北投區',
  '內湖區',
  '南港區',
  '文山區',
];

export function parseAccidentTime(raw: string): Date | null {
  const cleaned = raw.replaceAll('"', '').trim();
  const match = cleaned.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[-\sT]+)(\d{1,2}):(\d{1,2})/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}

export function extractDistrict(location: string): string | undefined {
  const normalized = location.replaceAll('"', '').trim();
  return TAIPEI_DISTRICTS.find((district) => normalized.startsWith(district));
}

export function isCoordinateOutlier(longitude: number, latitude: number): boolean {
  return (
    longitude < TAIPEI_BOUNDS.minLng ||
    longitude > TAIPEI_BOUNDS.maxLng ||
    latitude < TAIPEI_BOUNDS.minLat ||
    latitude > TAIPEI_BOUNDS.maxLat
  );
}

export function calculateDistanceMeters(
  userLat: number,
  userLng: number,
  accidentLat: number,
  accidentLng: number,
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const dLat = toRadians(accidentLat - userLat);
  const dLng = toRadians(accidentLng - userLng);
  const lat1 = toRadians(userLat);
  const lat2 = toRadians(accidentLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchesTimePeriod(record: AccidentRecord, timePeriod: AccidentFilters['timePeriod']) {
  if (timePeriod === 'all') return true;
  if (timePeriod === 'morning') return record.hour >= 6 && record.hour <= 11;
  if (timePeriod === 'afternoon') return record.hour >= 12 && record.hour <= 16;
  if (timePeriod === 'evening') return record.hour >= 17 && record.hour <= 20;
  return record.hour >= 21 || record.hour <= 5;
}

function matchesWeekdayWeekend(
  record: AccidentRecord,
  weekdayWeekend: AccidentFilters['weekdayWeekend'],
) {
  if (weekdayWeekend === 'all') return true;
  const isWeekend = record.weekday === 0 || record.weekday === 6;
  return weekdayWeekend === 'weekend' ? isWeekend : !isWeekend;
}

export function filterAccidents(
  accidents: AccidentRecord[],
  filters: AccidentFilters,
): AccidentRecord[] {
  const search = filters.search.trim().toLocaleLowerCase('zh-Hant');
  const matchesFilters = (record: AccidentRecord) => {
    const text = `${record.location} ${record.district ?? ''}`.toLocaleLowerCase('zh-Hant');
    return (
      filters.years.includes(record.year) &&
      (filters.accidentType === 'all' || record.accidentType === filters.accidentType) &&
      (filters.district === 'all' || record.district === filters.district) &&
      matchesTimePeriod(record, filters.timePeriod) &&
      matchesWeekdayWeekend(record, filters.weekdayWeekend) &&
      (!search || text.includes(search))
    );
  };

  if (!filters.nearby) {
    return accidents.filter(matchesFilters);
  }

  return accidents
    .filter(matchesFilters)
    .map((record) => ({
      record,
      distance: calculateDistanceMeters(
        filters.nearby!.latitude,
        filters.nearby!.longitude,
        record.latitude,
        record.longitude,
      ),
    }))
    .filter(({ distance }) => distance <= filters.nearby!.radiusMeters)
    .sort((a, b) => a.distance - b.distance)
    .map(({ record }) => record);
}

export function aggregateByYear(accidents: AccidentRecord[]): YearSummary[] {
  const byYear = new Map<number, YearSummary>();
  accidents.forEach((record) => {
    const current = byYear.get(record.year) ?? {
      year: record.year,
      totalCount: 0,
      a1Count: 0,
      a2Count: 0,
    };
    current.totalCount += 1;
    if (record.accidentType === 1) current.a1Count += 1;
    if (record.accidentType === 2) current.a2Count += 1;
    byYear.set(record.year, current);
  });
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export function aggregateByHour(accidents: AccidentRecord[]): HourSummary[] {
  const byHour = new Map<number, HourSummary>();
  for (let hour = 0; hour < 24; hour += 1) {
    byHour.set(hour, { hour, totalCount: 0 });
  }
  accidents.forEach((record) => {
    byHour.get(record.hour)!.totalCount += 1;
  });
  return [...byHour.values()];
}

export function aggregateByDistrict(accidents: AccidentRecord[]): DistrictSummary[] {
  const byDistrict = new Map<string, DistrictSummary>();
  accidents.forEach((record) => {
    const district = record.district ?? '未辨識';
    const current = byDistrict.get(district) ?? { district, totalCount: 0 };
    current.totalCount += 1;
    byDistrict.set(district, current);
  });
  return [...byDistrict.values()].sort((a, b) => b.totalCount - a.totalCount);
}

function normalizeLocationKey(record: AccidentRecord): string {
  const location = record.location.replace(/\s+/g, '').replaceAll('"', '');
  if (location.length >= 4) return location;
  return `${record.longitude.toFixed(4)},${record.latitude.toFixed(4)}`;
}

export function buildHotspots(accidents: AccidentRecord[], limit = 300): AccidentHotspot[] {
  const grouped = new Map<string, AccidentHotspot>();

  accidents.forEach((record) => {
    const key = normalizeLocationKey(record);
    const current =
      grouped.get(key) ??
      ({
        id: `hotspot-${grouped.size + 1}`,
        location: record.location,
        district: record.district,
        longitude: record.longitude,
        latitude: record.latitude,
        totalCount: 0,
        a1Count: 0,
        a2Count: 0,
        years: [],
      } satisfies AccidentHotspot);

    current.totalCount += 1;
    if (record.accidentType === 1) current.a1Count += 1;
    if (record.accidentType === 2) current.a2Count += 1;
    if (!current.years.includes(record.year)) {
      current.years.push(record.year);
      current.years.sort((a, b) => a - b);
    }
    grouped.set(key, current);
  });

  return [...grouped.values()]
    .sort((a, b) => b.totalCount - a.totalCount || b.a1Count - a.a1Count)
    .slice(0, limit)
    .map((hotspot, index) => ({ ...hotspot, id: `hotspot-${index + 1}` }));
}

export function getGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
