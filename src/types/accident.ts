export type AccidentType = 1 | 2;

export type AccidentRecord = {
  id: string;
  year: number;
  accidentTime: string;
  month: number;
  weekday: number;
  hour: number;
  accidentType: AccidentType;
  accidentTypeLabelZh: string;
  accidentTypeLabelEn: string;
  location: string;
  district?: string;
  longitude: number;
  latitude: number;
  sourceFile: string;
  isCoordinateOutlier?: boolean;
};

export type AccidentHotspot = {
  id: string;
  location: string;
  district?: string;
  longitude: number;
  latitude: number;
  totalCount: number;
  a1Count: number;
  a2Count: number;
  years: number[];
};

export type AccidentSummary = {
  generatedAt: string;
  totalRecords: number;
  validCoordinateRecords: number;
  a1Count: number;
  a2Count: number;
  years: number[];
  districts: string[];
  byYear: Array<{ year: number; totalCount: number; a1Count: number; a2Count: number }>;
  byHour: Array<{ hour: number; totalCount: number; a1Count: number; a2Count: number }>;
  byDistrict: Array<{ district: string; totalCount: number; a1Count: number; a2Count: number }>;
};

export type TimePeriod = 'all' | 'morning' | 'afternoon' | 'evening' | 'lateNight';
export type WeekdayWeekend = 'all' | 'weekday' | 'weekend';
export type MapMode = 'clusters' | 'hotspots';

export type AccidentFilters = {
  years: number[];
  accidentType: 'all' | AccidentType;
  district: string;
  timePeriod: TimePeriod;
  weekdayWeekend: WeekdayWeekend;
  search: string;
  nearby?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
};

export type YearSummary = {
  year: number;
  totalCount: number;
  a1Count: number;
  a2Count: number;
};

export type HourSummary = {
  hour: number;
  totalCount: number;
};

export type DistrictSummary = {
  district: string;
  totalCount: number;
};

export type CoordinateStatus = 'valid' | 'missing' | 'outlier';

export type CrashSeverity = 'a1_fatal_24h' | 'a2_injury_or_late_death' | 'unknown';

export type CrashDetailPartyRecord = {
  id: string;
  accidentKey: string;

  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  occurredAt: string;

  district?: string;
  location: string;
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;

  deathWithin24hCount: number;
  death2To30DayCount: number;
  injuryCount: number;
  severity: CrashSeverity;

  partySequence?: string;
  vehicleType?: string;
  sex?: string;
  age?: number | null;
  ageGroup?: string;
  injurySeverity?: string;
  mainInjuryPart?: string;
  protectionDevice?: string;
  phoneUse?: string;
  vehiclePurpose?: string;
  partyActionStatus?: string;
  drivingQualification?: string;
  driverLicenseType?: string;
  alcoholCondition?: string;
  vehicleImpactPart1?: string;
  vehicleImpactPart2?: string;
  individualCauseCode?: string;
  mainCauseCode?: string;
  hitAndRun?: string;
  occupation?: string;

  weather?: string;
  lighting?: string;
  roadType?: string;
  speedLimit?: number | null;
  roadShape?: string;
  accidentPosition?: string;
  roadSurfaceCondition1?: string;
  roadSurfaceCondition2?: string;
  roadSurfaceCondition3?: string;
  roadObstacle1?: string;
  roadObstacle2?: string;
  signal1?: string;
  signal2?: string;
  laneDirectionDivision?: string;
  laneDivision1?: string;
  laneDivision2?: string;
  laneDivision3?: string;
  accidentPattern?: string;

  sourceResource: string;
};

export type CrashDetailAccidentRecord = {
  id: string;
  accidentKey: string;

  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  occurredAt: string;

  district?: string;
  location: string;
  longitude?: number;
  latitude?: number;
  coordinateStatus: CoordinateStatus;

  deathWithin24hCount: number;
  death2To30DayCount: number;
  injuryCount: number;
  severity: CrashSeverity;

  partyCount: number;
  vehicleTypes: string[];

  weather?: string;
  lighting?: string;
  roadType?: string;
  speedLimit?: number | null;
  roadShape?: string;
  accidentPosition?: string;
  roadSurfaceCondition1?: string;
  roadSurfaceCondition2?: string;
  roadSurfaceCondition3?: string;
  roadObstacle1?: string;
  roadObstacle2?: string;
  signal1?: string;
  signal2?: string;
  accidentPattern?: string;
  mainCauseCodes: string[];

  sourceResources: string[];
};

export type CountSummary = {
  label: string;
  count: number;
};

export type CrashDetailSummary = {
  generatedAt: string;
  partyRecordCount: number;
  accidentRecordCount: number;
  validCoordinateAccidentCount: number;
  missingCoordinatePartyCount: number;
  outlierCoordinatePartyCount: number;
  deathWithin24hCount: number;
  death2To30DayCount: number;
  injuryCount: number;
  years: number[];
  months: number[];
  districts: string[];
  byYear: Array<{ year: number; totalCount: number; fatalCount: number; injuryOrLateDeathCount: number }>;
  byMonth: Array<{ month: number; totalCount: number }>;
  byHour: Array<{ hour: number; totalCount: number }>;
  byDistrict: CountSummary[];
  bySeverity: CountSummary[];
  byWeather: CountSummary[];
  byLighting: CountSummary[];
  byRoadType: CountSummary[];
  bySpeedLimit: CountSummary[];
  byRoadShape: CountSummary[];
  bySignal: CountSummary[];
  byAccidentPattern: CountSummary[];
  byMainCauseCode: CountSummary[];
};

export type CrashFactorSummary = {
  generatedAt: string;
  partyRecordCount: number;
  byVehicleType: CountSummary[];
  byAgeGroup: CountSummary[];
  bySex: CountSummary[];
  byInjurySeverity: CountSummary[];
  byAlcoholCondition: CountSummary[];
  byProtectionDevice: CountSummary[];
  byPhoneUse: CountSummary[];
  byHitAndRun: CountSummary[];
  byDrivingQualification: CountSummary[];
  byDriverLicenseType: CountSummary[];
};

export type CrashDashboardModule =
  | 'crash_points'
  | 'crash_factors'
  | 'crash_trends'
  | 'district_summary'
  | 'traffic_violation_report_top5_statistics'
  | 'data_table'
  | 'data_notes';

export type TrafficViolationReportItemCategory =
  | 'parking_or_stopping'
  | 'red_light_or_signal'
  | 'lane_or_turn'
  | 'speed'
  | 'license_or_registration'
  | 'mobile_phone_or_distraction'
  | 'helmet_or_seatbelt'
  | 'pedestrian_or_crosswalk'
  | 'other'
  | 'unknown';

export type TrafficViolationReportTop5StatisticRecord = {
  id: string;
  module: 'traffic_violation_report_top5_statistics';
  sourceSequenceNumber?: number;
  yearRaw?: string;
  rocYear?: number;
  year: number;
  cityName?: string;
  cityNameNormalized?: string;
  cityCode?: string;
  cityCodeNormalized?: string;
  violationItemRaw: string;
  violationItem: string;
  violationItemNormalized?: string;
  violationItemCategory: TrafficViolationReportItemCategory;
  reportCount?: number;
  rankWithinYear?: number;
  shareWithinYearPercent?: number;
  reportCountYoYChangePercent?: number;
  firstYearReportCount?: number;
  changeFromFirstYearPercent?: number;
  isTopItemWithinYear: boolean;
  source: string;
  sourceAgency: string;
};

export type TrafficViolationReportTop5StatisticSummary = {
  totalRecords: number;
  minYear?: number;
  maxYear?: number;
  latestYear?: number;
  uniqueViolationItemCount: number;
  uniqueViolationCategoryCount: number;
  latestYearTotalReportCount?: number;
  latestYearTopItems: Array<{
    rankWithinYear?: number;
    violationItem: string;
    violationItemCategory: TrafficViolationReportItemCategory;
    reportCount?: number;
    shareWithinYearPercent?: number;
  }>;
  byYear: Array<{
    year: number;
    totalReportCount: number;
    itemCount: number;
    topViolationItem?: string;
    topViolationReportCount?: number;
    crashCount?: number;
  }>;
  byViolationItem: Array<{
    violationItem: string;
    violationItemCategory: TrafficViolationReportItemCategory;
    recordCount: number;
    firstYear?: number;
    latestYear?: number;
    latestReportCount?: number;
    totalReportCountAcrossYears: number;
    maxAnnualReportCount?: number;
  }>;
  byViolationCategory: Array<{
    violationItemCategory: TrafficViolationReportItemCategory;
    recordCount: number;
    totalReportCountAcrossYears: number;
  }>;
};

export type CrashDetailFilters = {
  years: number[];
  months: number[];
  district: string;
  severity: 'all' | CrashSeverity;
  vehicleType: string;
  weather: string;
  lighting: string;
  roadType: string;
  speedLimit: string;
  roadShape: string;
  accidentPosition: string;
  roadSurfaceCondition: string;
  signalCondition: string;
  accidentPattern: string;
  sex: string;
  ageGroup: string;
  injurySeverity: string;
  alcoholCondition: string;
  protectionDevice: string;
  phoneUse: string;
  causeCode: string;
  hitAndRun: string;
  search: string;
};
