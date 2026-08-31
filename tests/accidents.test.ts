import { describe, expect, it } from 'vitest';
import {
  buildCrashDetailAccidents,
  buildCrashDetailSummary,
  deriveCrashSeverity,
  filterCrashDetailData,
  normalizeCrashDetailPartyRecord,
} from '../src/utils/crashDetails';
import {
  aggregateByHour,
  buildHotspots,
  calculateDistanceMeters,
  extractDistrict,
  filterAccidents,
  isCoordinateOutlier,
  parseAccidentTime,
} from '../src/utils/accidents';
import { renderAccidentPopup } from '../src/components/AccidentPopup';
import { translations } from '../src/i18n';
import {
  classifyTrafficViolationItem,
  filterTrafficViolationRecords,
  buildTrafficViolationSummary,
  normalizeTrafficViolationRows,
  parseRocYear,
  parseReportCount,
} from '../src/utils/trafficViolations';
import type { AccidentRecord } from '../src/types/accident';
import { normalizeAppraisalReconsiderationRows, parseCount, parsePercent, parseReconsiderationPeriod } from '../src/utils/appraisalReconsiderations';

const baseRecord: AccidentRecord = {
  id: '2019-1',
  year: 2019,
  accidentTime: '2019-01-02T08:37:00.000+08:00',
  month: 1,
  weekday: 3,
  hour: 8,
  accidentType: 2,
  accidentTypeLabelZh: 'A2／2類：受傷事故',
  accidentTypeLabelEn: 'A2 / Type 2: Injury accident',
  location: '大同區重慶北路3段137巷與民族西路182巷口',
  district: '大同區',
  longitude: 121.5148545,
  latitude: 25.0680094,
  sourceFile: '108年臺北市道路交通事故斑點圖(改A1A2).csv',
};

describe('accident utilities', () => {
  it('parses Taipei accident time formats with dash or space separators', () => {
    expect(parseAccidentTime('2019/1/2-08:37')?.getHours()).toBe(8);
    expect(parseAccidentTime('2020/1/1 00:30')?.getMinutes()).toBe(30);
    expect(parseAccidentTime('not-a-date')).toBeNull();
  });

  it('extracts Taipei district prefixes from accident locations', () => {
    expect(extractDistrict('大同區重慶北路3段與民族西路口')).toBe('大同區');
    expect(extractDistrict('無行政區道路')).toBeUndefined();
  });

  it('flags coordinates outside broad Taipei bounds', () => {
    expect(isCoordinateOutlier(121.5, 25.05)).toBe(false);
    expect(isCoordinateOutlier(120, 25.05)).toBe(true);
    expect(isCoordinateOutlier(121.5, 26)).toBe(true);
  });

  it('calculates nearby distances in meters', () => {
    const distance = calculateDistanceMeters(25.0478, 121.517, 25.0478, 121.518);
    expect(distance).toBeGreaterThan(90);
    expect(distance).toBeLessThan(120);
  });

  it('filters accidents by year, type, period, weekend and text', () => {
    const accidents = [
      baseRecord,
      {
        ...baseRecord,
        id: '2020-1',
        year: 2020,
        accidentType: 1 as const,
        hour: 22,
        weekday: 0,
        location: '信義區市府路口',
        district: '信義區',
      },
    ];

    const filtered = filterAccidents(accidents, {
      years: [2020],
      accidentType: 1,
      district: '信義區',
      timePeriod: 'lateNight',
      weekdayWeekend: 'weekend',
      search: '市府',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2020-1');
  });

  it('sorts nearby filtered accidents by distance from the user', () => {
    const accidents = [
      { ...baseRecord, id: 'far', latitude: 25.0478, longitude: 121.527 },
      { ...baseRecord, id: 'near', latitude: 25.0478, longitude: 121.518 },
    ];

    const filtered = filterAccidents(accidents, {
      years: [2019],
      accidentType: 'all',
      district: 'all',
      timePeriod: 'all',
      weekdayWeekend: 'all',
      search: '',
      nearby: {
        latitude: 25.0478,
        longitude: 121.517,
        radiusMeters: 2_000,
      },
    });

    expect(filtered.map((accident) => accident.id)).toEqual(['near', 'far']);
  });

  it('keeps hour aggregation stable when a malformed record has an out-of-range hour', () => {
    const hourly = aggregateByHour([{ ...baseRecord, hour: 25 }]);

    expect(hourly).toHaveLength(24);
    expect(hourly.every((hour) => hour.totalCount === 0)).toBe(true);
  });

  it('builds repeated-location hotspot totals with A1 and A2 counts', () => {
    const hotspots = buildHotspots([
      baseRecord,
      { ...baseRecord, id: '2019-2', accidentType: 1 },
      { ...baseRecord, id: '2020-1', year: 2020 },
    ]);

    expect(hotspots[0]).toMatchObject({
      totalCount: 3,
      a1Count: 1,
      a2Count: 2,
      years: [2019, 2020],
    });
  });

  it('escapes dataset text before rendering Leaflet popup HTML', () => {
    const popup = renderAccidentPopup({
      accident: {
        ...baseRecord,
        location: '大同區<script>alert("xss")</script>',
        district: '<img src=x onerror=alert(1)>',
      },
      language: 'zh',
      t: translations.zh,
    });

    expect(popup).toContain('&lt;script&gt;');
    expect(popup).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(popup).not.toContain('<script>');
    expect(popup).not.toContain('<img src=x');
  });
});

describe('appraisal reconsideration utilities', () => {
  it('converts ROC monthly periods and keeps malformed values missing', () => {
    expect(parseReconsiderationPeriod('106年1月')).toEqual({ year: 2017, month: 1, period: '2017-01' });
    expect(parseReconsiderationPeriod('106年13月').period).toBeNull();
    expect(parseCount('—')).toBeNull();
    expect(parsePercent('12.4%')).toBe(12.4);
  });

  it('preserves source values alongside normalized fields', () => {
    const [record] = normalizeAppraisalReconsiderationRows([{ '年/月': '106年1月', '申請件數_有進覆議會討論之件數': '26', '覆議件數_申請件數扣除不予覆議件數': '25', '司法囑託': '18', '個人申請': '8', '不予覆議': '1', 'A1件數（總計）': '3', 'A2件數（總計）': '17', 'A3件數（總計）': '6', 'A1比例_%': '11.54%', 'A2比例_%': '65.38%', 'A3比例_%': '23.08%' }]);
    expect(record).toMatchObject({ period: '2017-01', reconsiderationCases: 25, a3Rate: 23.08, a3RateRaw: '23.08%' });
  });
});

describe('traffic violation report utilities', () => {
  it('parses ROC years and missing counts without treating missing as zero', () => {
    expect(parseRocYear('104年')).toMatchObject({ rocYear: 104, year: 2015 });
    expect(parseRocYear('2023')).toMatchObject({ year: 2023 });
    expect(parseReportCount('--')).toBeUndefined();
    expect(parseReportCount('0')).toBe(0);
  });

  it('classifies violation items and derives dense rank, share, and YoY by item', () => {
    const records = normalizeTrafficViolationRows([
      { 序號: '1', 年度: '104', 縣市: '臺北市', 縣市代碼: '063000', 違規項目: '違規停車', 筆數: '100' },
      { 序號: '2', 年度: '104', 縣市: '臺北市', 縣市代碼: '063000', 違規項目: '闖紅燈', 筆數: '50' },
      { 序號: '3', 年度: '105', 縣市: '臺北市', 縣市代碼: '063000', 違規項目: '違規停車', 筆數: '150' },
    ]);

    expect(classifyTrafficViolationItem('違規臨時停車')).toBe('parking_or_stopping');
    expect(records.find((record) => record.year === 2015 && record.violationItem === '違規停車')).toMatchObject({
      rankWithinYear: 1,
      shareWithinYearPercent: 66.66666666666666,
      isTopItemWithinYear: true,
    });
    expect(records.find((record) => record.year === 2016)?.reportCountYoYChangePercent).toBe(50);
  });

  it('filters violation records and rebuilds summary totals for the selected records', () => {
    const records = normalizeTrafficViolationRows([
      { 序號: '1', 年度: '104', 縣市: '臺北市', 縣市代碼: '063000', 違規項目: '違規停車', 筆數: '100' },
      { 序號: '2', 年度: '104', 縣市: '臺北市', 縣市代碼: '063000', 違規項目: '闖紅燈', 筆數: '50' },
      { 序號: '3', 年度: '105', 縣市: '臺北市', 縣市代碼: '063000', 違規項目: '違規停車', 筆數: '150' },
    ]);

    const filtered = filterTrafficViolationRecords(
      records,
      { search: '停車', year: 'all', category: 'all' },
      (category) => category,
    );
    const summary = buildTrafficViolationSummary(filtered);

    expect(filtered).toHaveLength(2);
    expect(summary.latestYearTotalReportCount).toBe(150);
    expect(summary.byYear.map((item) => item.totalReportCount)).toEqual([100, 150]);
  });
});

describe('crash detail utilities', () => {
  const rawParty = {
    發生年度: '113',
    發生月: '5',
    發生日: '20',
    '發生時-Hours': '8',
    發生分: '30',
    區序: '大安區',
    肇事地點: '大安區仁愛路與復興南路口',
    死亡人數: '0',
    '2-30日死亡人數': '0',
    受傷人數: '1',
    當事人序號: '1',
    車種: '普通重型機車',
    天候: '晴',
    光線: '日間自然光線',
    道路類別: '市區道路',
    '速限-速度限制': '50',
    道路型態: '交岔路',
    事故位置: '交叉路口內',
    路面狀況1: '乾燥',
    號誌1: '行車管制號誌',
    事故類型及型態: '側撞',
    性別: '男',
    年齡: '23',
    受傷程度: '受傷',
    保護裝置: '戴安全帽',
    行動電話: '未使用',
    駕駛資格情形: '有適當駕照',
    駕駛執照種類: '普通重型機車',
    飲酒情形: '未飲酒',
    '肇因碼-主要': '未注意車前狀態',
    個人肇逃否: '否',
    '座標-X': '121.543',
    '座標-Y': '25.037',
  };

  it('normalizes party rows with ROC year, severity, age group and Taipei coordinate status', () => {
    const party = normalizeCrashDetailPartyRecord(rawParty, 'sample', 0);

    expect(party).toMatchObject({
      year: 2024,
      month: 5,
      hour: 8,
      severity: 'a2_injury_or_late_death',
      coordinateStatus: 'valid',
      ageGroup: '18-24',
      vehicleType: '普通重型機車',
    });
  });

  it('deduplicates involved-party rows into one accident record', () => {
    const first = normalizeCrashDetailPartyRecord(rawParty, 'sample', 0);
    const second = normalizeCrashDetailPartyRecord({ ...rawParty, 當事人序號: '2', 車種: '自用小客車' }, 'sample', 1);
    const accidents = buildCrashDetailAccidents([first!, second!]);

    expect(accidents).toHaveLength(1);
    expect(accidents[0]).toMatchObject({
      partyCount: 2,
      injuryCount: 1,
      vehicleTypes: ['普通重型機車', '自用小客車'],
    });
  });

  it('keeps party row count separate from deduplicated accident count in summaries', () => {
    const first = normalizeCrashDetailPartyRecord(rawParty, 'sample', 0)!;
    const second = normalizeCrashDetailPartyRecord({ ...rawParty, 當事人序號: '2', 車種: '自用小客車' }, 'sample', 1)!;
    const accidents = buildCrashDetailAccidents([first, second]);
    const summary = buildCrashDetailSummary(accidents, [first, second]);

    expect(summary.partyRecordCount).toBe(2);
    expect(summary.accidentRecordCount).toBe(1);
  });

  it('filters crash detail data by accident and party-level factors', () => {
    const motorcycle = normalizeCrashDetailPartyRecord(rawParty, 'sample', 0)!;
    const car = normalizeCrashDetailPartyRecord(
      { ...rawParty, 肇事地點: '中山區南京東路口', 區序: '中山區', 車種: '自用小客車', 性別: '女' },
      'sample',
      1,
    )!;
    const accidents = buildCrashDetailAccidents([motorcycle, car]);
    const filtered = filterCrashDetailData(accidents, [motorcycle, car], {
      years: [],
      months: [],
      district: 'all',
      severity: 'all',
      vehicleType: '普通重型機車',
      weather: 'all',
      lighting: 'all',
      roadType: 'all',
      speedLimit: 'all',
      roadShape: 'all',
      accidentPosition: 'all',
      roadSurfaceCondition: 'all',
      signalCondition: 'all',
      accidentPattern: 'all',
      sex: '男',
      ageGroup: 'all',
      injurySeverity: 'all',
      alcoholCondition: 'all',
      protectionDevice: 'all',
      phoneUse: 'all',
      causeCode: 'all',
      hitAndRun: 'all',
      search: '',
    });

    expect(filtered.accidents).toHaveLength(1);
    expect(filtered.parties).toHaveLength(1);
  });

  it('derives fatal and unknown severity without adding A3', () => {
    expect(deriveCrashSeverity(1, 0, 0)).toBe('a1_fatal_24h');
    expect(deriveCrashSeverity(0, 0, 0)).toBe('unknown');
  });
});
