import { describe, expect, it } from 'vitest';
import {
  buildHotspots,
  calculateDistanceMeters,
  extractDistrict,
  filterAccidents,
  isCoordinateOutlier,
  parseAccidentTime,
} from '../src/utils/accidents';
import { renderAccidentPopup } from '../src/components/AccidentPopup';
import { translations } from '../src/i18n';
import type { AccidentRecord } from '../src/types/accident';

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
