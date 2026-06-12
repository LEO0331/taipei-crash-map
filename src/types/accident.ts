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
export type MapMode = 'heatmap' | 'clusters' | 'hotspots';

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
