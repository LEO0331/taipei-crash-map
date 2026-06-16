import type {
  CountSummary,
  CoordinateStatus,
  CrashDetailAccidentRecord,
  CrashDetailFilters,
  CrashDetailPartyRecord,
  CrashDetailSummary,
  CrashFactorSummary,
  CrashSeverity,
} from '../types/accident';
import { extractDistrict, isCoordinateOutlier } from './accidents';

export type RawCrashDetailRow = Record<string, string | number | null | undefined>;

const UNKNOWN = '未辨識';

const FIELD_ALIASES: Record<string, string[]> = {
  year: ['發生年度', '年度', '年'],
  month: ['發生月', '月'],
  day: ['發生日', '日'],
  hour: ['發生時-Hours', '發生時', '時'],
  minute: ['發生分', '分'],
  district: ['區序', '行政區'],
  location: ['肇事地點', '發生地點', '地點'],
  deathWithin24hCount: ['死亡人數'],
  death2To30DayCount: ['2-30日死亡人數', '2至30日死亡人數'],
  injuryCount: ['受傷人數'],
  partySequence: ['當事人序號'],
  vehicleType: ['車種'],
  weather: ['天候'],
  lighting: ['光線'],
  roadType: ['道路類別'],
  speedLimit: ['速限-速度限制', '速限'],
  roadShape: ['道路型態'],
  accidentPosition: ['事故位置'],
  roadSurfaceCondition1: ['路面狀況1'],
  roadSurfaceCondition2: ['路面狀況2'],
  roadSurfaceCondition3: ['路面狀況3'],
  roadObstacle1: ['道路障礙1'],
  roadObstacle2: ['道路障礙2'],
  signal1: ['號誌1'],
  signal2: ['號誌2'],
  laneDirectionDivision: ['車道劃分-分向'],
  laneDivision1: ['車道劃分-分道1'],
  laneDivision2: ['車道劃分-分道2'],
  laneDivision3: ['車道劃分-分道3'],
  accidentPattern: ['事故類型及型態'],
  sex: ['性別'],
  age: ['年齡'],
  injurySeverity: ['受傷程度'],
  mainInjuryPart: ['主要傷處'],
  protectionDevice: ['保護裝置'],
  phoneUse: ['行動電話'],
  vehiclePurpose: ['車輛用途'],
  partyActionStatus: ['當事者行動狀態'],
  drivingQualification: ['駕駛資格情形'],
  driverLicenseType: ['駕駛執照種類'],
  alcoholCondition: ['飲酒情形'],
  vehicleImpactPart1: ['車輛撞擊部位1'],
  vehicleImpactPart2: ['車輛撞擊部位2'],
  individualCauseCode: ['肇因碼-個別'],
  mainCauseCode: ['肇因碼-主要'],
  hitAndRun: ['個人肇逃否'],
  occupation: ['職業'],
  longitude: ['座標-X', '經度', 'X'],
  latitude: ['座標-Y', '緯度', 'Y'],
};

export function cleanCrashDetailCell(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/^"+|"+$/g, '')
    .trim();
}

export function normalizeCrashDetailHeader(header: string): string {
  return cleanCrashDetailCell(header)
    .replace(/[－–—-]/g, '-')
    .replace(/\s+/g, '')
    .toLocaleLowerCase('en-US');
}

export function valueFor(row: RawCrashDetailRow, field: keyof typeof FIELD_ALIASES): string {
  for (const alias of FIELD_ALIASES[field]) {
    const normalizedAlias = normalizeCrashDetailHeader(alias);
    const direct = row[alias];
    if (direct !== undefined && cleanCrashDetailCell(direct)) return cleanCrashDetailCell(direct);

    const matchingKey = Object.keys(row).find((key) => normalizeCrashDetailHeader(key) === normalizedAlias);
    if (matchingKey && cleanCrashDetailCell(row[matchingKey])) return cleanCrashDetailCell(row[matchingKey]);
  }
  return '';
}

function parseInteger(value: string): number | null {
  const normalized = value.replace(/[^\d.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseCount(value: string): number {
  return Math.max(0, parseInteger(value) ?? 0);
}

function parseYear(raw: string): number | null {
  const year = parseInteger(raw);
  if (!year) return null;
  return year < 1911 ? year + 1911 : year;
}

function optionalText(value: string): string | undefined {
  const cleaned = cleanCrashDetailCell(value);
  if (!cleaned || cleaned === '0' || cleaned === '無' || cleaned === '不明') return undefined;
  return cleaned;
}

function normalizeDistrict(value: string, location: string): string | undefined {
  const cleaned = optionalText(value)?.replace(/^\d+/, '');
  return cleaned ?? extractDistrict(location);
}

function toIsoWithTaipeiOffset(year: number, month: number, day: number, hour: number, minute: number): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+08:00`;
}

function isValidDateTime(year: number, month: number, day: number, hour: number, minute: number): boolean {
  const date = new Date(year, month - 1, day, hour, minute);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
}

export function deriveCrashSeverity(
  deathWithin24hCount: number,
  death2To30DayCount: number,
  injuryCount: number,
): CrashSeverity {
  if (deathWithin24hCount > 0) return 'a1_fatal_24h';
  if (injuryCount > 0 || death2To30DayCount > 0) return 'a2_injury_or_late_death';
  return 'unknown';
}

export function ageGroupFor(age: number | null): string | undefined {
  if (age === null || age < 0 || age > 120) return undefined;
  if (age <= 17) return '0-17';
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  if (age <= 54) return '45-54';
  if (age <= 64) return '55-64';
  return '65+';
}

function coordinateStatus(longitude?: number, latitude?: number): CoordinateStatus {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return 'missing';
  if (longitude === undefined || latitude === undefined) return 'missing';
  return isCoordinateOutlier(longitude, latitude) ? 'outlier' : 'valid';
}

export function crashDetailAccidentKey(record: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  location: string;
  longitude?: number;
  latitude?: number;
}): string {
  return [
    record.year,
    record.month,
    record.day,
    record.hour,
    record.minute,
    record.location.replace(/\s+/g, ''),
    record.longitude?.toFixed(6) ?? '',
    record.latitude?.toFixed(6) ?? '',
  ].join('-');
}

export function normalizeCrashDetailPartyRecord(
  row: RawCrashDetailRow,
  sourceResource: string,
  rowIndex: number,
): CrashDetailPartyRecord | null {
  const year = parseYear(valueFor(row, 'year'));
  const month = parseInteger(valueFor(row, 'month'));
  const day = parseInteger(valueFor(row, 'day'));
  const hour = parseInteger(valueFor(row, 'hour'));
  const minute = parseInteger(valueFor(row, 'minute')) ?? 0;
  const location = valueFor(row, 'location');

  if (!year || !month || !day || hour === null || !isValidDateTime(year, month, day, hour, minute) || !location) {
    return null;
  }

  const rawLongitude = Number(valueFor(row, 'longitude'));
  const rawLatitude = Number(valueFor(row, 'latitude'));
  const longitude = Number.isFinite(rawLongitude) ? rawLongitude : undefined;
  const latitude = Number.isFinite(rawLatitude) ? rawLatitude : undefined;
  const status = coordinateStatus(longitude, latitude);
  const deathWithin24hCount = parseCount(valueFor(row, 'deathWithin24hCount'));
  const death2To30DayCount = parseCount(valueFor(row, 'death2To30DayCount'));
  const injuryCount = parseCount(valueFor(row, 'injuryCount'));
  const age = parseInteger(valueFor(row, 'age'));
  const district = normalizeDistrict(valueFor(row, 'district'), location);
  const base = {
    year,
    month,
    day,
    hour,
    minute,
    location,
    longitude,
    latitude,
  };

  return {
    id: `${sourceResource}-${rowIndex + 1}`,
    accidentKey: crashDetailAccidentKey(base),
    ...base,
    occurredAt: toIsoWithTaipeiOffset(year, month, day, hour, minute),
    ...(district ? { district } : {}),
    coordinateStatus: status,
    deathWithin24hCount,
    death2To30DayCount,
    injuryCount,
    severity: deriveCrashSeverity(deathWithin24hCount, death2To30DayCount, injuryCount),
    partySequence: optionalText(valueFor(row, 'partySequence')),
    vehicleType: optionalText(valueFor(row, 'vehicleType')),
    sex: optionalText(valueFor(row, 'sex')),
    age,
    ageGroup: ageGroupFor(age),
    injurySeverity: optionalText(valueFor(row, 'injurySeverity')),
    mainInjuryPart: optionalText(valueFor(row, 'mainInjuryPart')),
    protectionDevice: optionalText(valueFor(row, 'protectionDevice')),
    phoneUse: optionalText(valueFor(row, 'phoneUse')),
    vehiclePurpose: optionalText(valueFor(row, 'vehiclePurpose')),
    partyActionStatus: optionalText(valueFor(row, 'partyActionStatus')),
    drivingQualification: optionalText(valueFor(row, 'drivingQualification')),
    driverLicenseType: optionalText(valueFor(row, 'driverLicenseType')),
    alcoholCondition: optionalText(valueFor(row, 'alcoholCondition')),
    vehicleImpactPart1: optionalText(valueFor(row, 'vehicleImpactPart1')),
    vehicleImpactPart2: optionalText(valueFor(row, 'vehicleImpactPart2')),
    individualCauseCode: optionalText(valueFor(row, 'individualCauseCode')),
    mainCauseCode: optionalText(valueFor(row, 'mainCauseCode')),
    hitAndRun: optionalText(valueFor(row, 'hitAndRun')),
    occupation: optionalText(valueFor(row, 'occupation')),
    weather: optionalText(valueFor(row, 'weather')),
    lighting: optionalText(valueFor(row, 'lighting')),
    roadType: optionalText(valueFor(row, 'roadType')),
    speedLimit: parseInteger(valueFor(row, 'speedLimit')),
    roadShape: optionalText(valueFor(row, 'roadShape')),
    accidentPosition: optionalText(valueFor(row, 'accidentPosition')),
    roadSurfaceCondition1: optionalText(valueFor(row, 'roadSurfaceCondition1')),
    roadSurfaceCondition2: optionalText(valueFor(row, 'roadSurfaceCondition2')),
    roadSurfaceCondition3: optionalText(valueFor(row, 'roadSurfaceCondition3')),
    roadObstacle1: optionalText(valueFor(row, 'roadObstacle1')),
    roadObstacle2: optionalText(valueFor(row, 'roadObstacle2')),
    signal1: optionalText(valueFor(row, 'signal1')),
    signal2: optionalText(valueFor(row, 'signal2')),
    laneDirectionDivision: optionalText(valueFor(row, 'laneDirectionDivision')),
    laneDivision1: optionalText(valueFor(row, 'laneDivision1')),
    laneDivision2: optionalText(valueFor(row, 'laneDivision2')),
    laneDivision3: optionalText(valueFor(row, 'laneDivision3')),
    accidentPattern: optionalText(valueFor(row, 'accidentPattern')),
    sourceResource,
  };
}

export function buildCrashDetailAccidents(parties: CrashDetailPartyRecord[]): CrashDetailAccidentRecord[] {
  const grouped = new Map<string, CrashDetailPartyRecord[]>();
  parties.forEach((party) => {
    grouped.set(party.accidentKey, [...(grouped.get(party.accidentKey) ?? []), party]);
  });

  return [...grouped.entries()].map(([accidentKey, records], index) => {
    const first = records[0];
    const validCoordinate = records.find((record) => record.coordinateStatus === 'valid') ?? first;
    const vehicleTypes = [...new Set(records.map((record) => record.vehicleType).filter(Boolean))] as string[];
    const mainCauseCodes = [...new Set(records.map((record) => record.mainCauseCode).filter(Boolean))] as string[];
    const sourceResources = [...new Set(records.map((record) => record.sourceResource))];

    return {
      id: `crash-detail-${index + 1}`,
      accidentKey,
      year: first.year,
      month: first.month,
      day: first.day,
      hour: first.hour,
      minute: first.minute,
      occurredAt: first.occurredAt,
      district: first.district,
      location: first.location,
      longitude: validCoordinate.longitude,
      latitude: validCoordinate.latitude,
      coordinateStatus: validCoordinate.coordinateStatus,
      deathWithin24hCount: Math.max(...records.map((record) => record.deathWithin24hCount)),
      death2To30DayCount: Math.max(...records.map((record) => record.death2To30DayCount)),
      injuryCount: Math.max(...records.map((record) => record.injuryCount)),
      severity: deriveCrashSeverity(
        Math.max(...records.map((record) => record.deathWithin24hCount)),
        Math.max(...records.map((record) => record.death2To30DayCount)),
        Math.max(...records.map((record) => record.injuryCount)),
      ),
      partyCount: records.length,
      vehicleTypes,
      weather: first.weather,
      lighting: first.lighting,
      roadType: first.roadType,
      speedLimit: first.speedLimit,
      roadShape: first.roadShape,
      accidentPosition: first.accidentPosition,
      roadSurfaceCondition1: first.roadSurfaceCondition1,
      roadSurfaceCondition2: first.roadSurfaceCondition2,
      roadSurfaceCondition3: first.roadSurfaceCondition3,
      roadObstacle1: first.roadObstacle1,
      roadObstacle2: first.roadObstacle2,
      signal1: first.signal1,
      signal2: first.signal2,
      accidentPattern: first.accidentPattern,
      mainCauseCodes,
      sourceResources,
    };
  });
}

function countBy<T>(items: T[], getter: (item: T) => string | number | null | undefined, limit = 12): CountSummary[] {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const rawLabel = getter(item);
    const label = rawLabel === null || rawLabel === undefined || rawLabel === '' ? UNKNOWN : String(rawLabel);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh-Hant'))
    .slice(0, limit);
}

export function buildCrashDetailSummary(
  accidents: CrashDetailAccidentRecord[],
  parties: CrashDetailPartyRecord[],
): CrashDetailSummary {
  const generatedAt = new Date().toISOString();
  const years = [...new Set(accidents.map((record) => record.year))].sort();
  const months = [...new Set(accidents.map((record) => record.month))].sort((a, b) => a - b);
  const districts = accidents
    .map((record) => record.district)
    .filter((district): district is string => Boolean(district))
    .filter((district, index, allDistricts) => allDistricts.indexOf(district) === index)
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  return {
    generatedAt,
    partyRecordCount: parties.length,
    accidentRecordCount: accidents.length,
    validCoordinateAccidentCount: accidents.filter((record) => record.coordinateStatus === 'valid').length,
    missingCoordinatePartyCount: parties.filter((record) => record.coordinateStatus === 'missing').length,
    outlierCoordinatePartyCount: parties.filter((record) => record.coordinateStatus === 'outlier').length,
    deathWithin24hCount: accidents.reduce((sum, record) => sum + record.deathWithin24hCount, 0),
    death2To30DayCount: accidents.reduce((sum, record) => sum + record.death2To30DayCount, 0),
    injuryCount: accidents.reduce((sum, record) => sum + record.injuryCount, 0),
    years,
    months,
    districts,
    byYear: years.map((year) => {
      const matching = accidents.filter((record) => record.year === year);
      return {
        year,
        totalCount: matching.length,
        fatalCount: matching.filter((record) => record.severity === 'a1_fatal_24h').length,
        injuryOrLateDeathCount: matching.filter((record) => record.severity === 'a2_injury_or_late_death').length,
      };
    }),
    byMonth: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return { month, totalCount: accidents.filter((record) => record.month === month).length };
    }),
    byHour: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      totalCount: accidents.filter((record) => record.hour === hour).length,
    })),
    byDistrict: countBy(accidents, (record) => record.district),
    bySeverity: countBy(accidents, (record) => record.severity),
    byWeather: countBy(accidents, (record) => record.weather),
    byLighting: countBy(accidents, (record) => record.lighting),
    byRoadType: countBy(accidents, (record) => record.roadType),
    bySpeedLimit: countBy(accidents, (record) => record.speedLimit),
    byRoadShape: countBy(accidents, (record) => record.roadShape),
    bySignal: countBy(accidents, (record) => record.signal1 ?? record.signal2),
    byAccidentPattern: countBy(accidents, (record) => record.accidentPattern),
    byMainCauseCode: countBy(
      accidents.flatMap((record) => record.mainCauseCodes),
      (causeCode) => causeCode,
    ),
  };
}

export function buildCrashFactorSummary(parties: CrashDetailPartyRecord[]): CrashFactorSummary {
  return {
    generatedAt: new Date().toISOString(),
    partyRecordCount: parties.length,
    byVehicleType: countBy(parties, (record) => record.vehicleType),
    byAgeGroup: countBy(parties, (record) => record.ageGroup),
    bySex: countBy(parties, (record) => record.sex),
    byInjurySeverity: countBy(parties, (record) => record.injurySeverity),
    byAlcoholCondition: countBy(parties, (record) => record.alcoholCondition),
    byProtectionDevice: countBy(parties, (record) => record.protectionDevice),
    byPhoneUse: countBy(parties, (record) => record.phoneUse),
    byHitAndRun: countBy(parties, (record) => record.hitAndRun),
    byDrivingQualification: countBy(parties, (record) => record.drivingQualification),
    byDriverLicenseType: countBy(parties, (record) => record.driverLicenseType),
  };
}

function matchesText(value: string | undefined, selected: string): boolean {
  return selected === 'all' || value === selected;
}

export function filterCrashDetailData(
  accidents: CrashDetailAccidentRecord[],
  parties: CrashDetailPartyRecord[],
  filters: CrashDetailFilters,
) {
  const search = filters.search.trim().toLocaleLowerCase('zh-Hant');
  const partyByAccident = new Map<string, CrashDetailPartyRecord[]>();
  parties.forEach((party) => {
    partyByAccident.set(party.accidentKey, [...(partyByAccident.get(party.accidentKey) ?? []), party]);
  });

  const filteredAccidents = accidents.filter((record) => {
    const relatedParties = partyByAccident.get(record.accidentKey) ?? [];
    const roadSurface = record.roadSurfaceCondition1 ?? record.roadSurfaceCondition2 ?? record.roadSurfaceCondition3;
    const signal = record.signal1 ?? record.signal2;
    const text = [
      record.location,
      record.district,
      record.accidentPattern,
      record.weather,
      roadSurface,
      ...record.vehicleTypes,
      ...record.mainCauseCodes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('zh-Hant');

    return (
      (filters.years.length === 0 || filters.years.includes(record.year)) &&
      (filters.months.length === 0 || filters.months.includes(record.month)) &&
      matchesText(record.district, filters.district) &&
      (filters.severity === 'all' || record.severity === filters.severity) &&
      matchesText(record.weather, filters.weather) &&
      matchesText(record.lighting, filters.lighting) &&
      matchesText(record.roadType, filters.roadType) &&
      matchesText(String(record.speedLimit ?? undefined), filters.speedLimit) &&
      matchesText(record.roadShape, filters.roadShape) &&
      matchesText(record.accidentPosition, filters.accidentPosition) &&
      matchesText(roadSurface, filters.roadSurfaceCondition) &&
      matchesText(signal, filters.signalCondition) &&
      matchesText(record.accidentPattern, filters.accidentPattern) &&
      (filters.causeCode === 'all' || record.mainCauseCodes.includes(filters.causeCode)) &&
      (filters.vehicleType === 'all' || record.vehicleTypes.includes(filters.vehicleType)) &&
      (filters.sex === 'all' || relatedParties.some((party) => party.sex === filters.sex)) &&
      (filters.ageGroup === 'all' || relatedParties.some((party) => party.ageGroup === filters.ageGroup)) &&
      (filters.injurySeverity === 'all' ||
        relatedParties.some((party) => party.injurySeverity === filters.injurySeverity)) &&
      (filters.alcoholCondition === 'all' ||
        relatedParties.some((party) => party.alcoholCondition === filters.alcoholCondition)) &&
      (filters.protectionDevice === 'all' ||
        relatedParties.some((party) => party.protectionDevice === filters.protectionDevice)) &&
      (filters.phoneUse === 'all' || relatedParties.some((party) => party.phoneUse === filters.phoneUse)) &&
      (filters.hitAndRun === 'all' || relatedParties.some((party) => party.hitAndRun === filters.hitAndRun)) &&
      (!search || text.includes(search))
    );
  });
  const allowedKeys = new Set(filteredAccidents.map((record) => record.accidentKey));
  const filteredParties = parties.filter((party) => allowedKeys.has(party.accidentKey));

  return { accidents: filteredAccidents, parties: filteredParties };
}

export function optionsFromCounts(counts: CountSummary[]): string[] {
  return counts.map((item) => item.label).filter((label) => label !== UNKNOWN);
}
