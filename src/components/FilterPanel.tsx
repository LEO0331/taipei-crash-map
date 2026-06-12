import type { AccidentFilters, AccidentType } from '../types/accident';
import type { Translation } from '../i18n';

type Props = {
  filters: AccidentFilters;
  districts: string[];
  t: Translation;
  onChange: (filters: AccidentFilters) => void;
};

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

export function FilterPanel({ filters, districts, t, onChange }: Props) {
  const toggleYear = (year: number) => {
    const years = filters.years.includes(year)
      ? filters.years.filter((current) => current !== year)
      : [...filters.years, year].sort();
    onChange({ ...filters, years: years.length ? years : YEARS });
  };

  return (
    <section className="filter-panel" aria-label="Filters">
      <label className="field field-wide">
        <span>{t.searchPlaceholder}</span>
        <input
          value={filters.search}
          placeholder={t.searchPlaceholder}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>

      <div className="field field-wide">
        <span>{t.year}</span>
        <div className="year-pills">
          {YEARS.map((year) => (
            <button
              className={filters.years.includes(year) ? 'active' : ''}
              key={year}
              type="button"
              aria-pressed={filters.years.includes(year)}
              onClick={() => toggleYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>{t.accidentType}</span>
        <select
          value={filters.accidentType}
          onChange={(event) =>
            onChange({
              ...filters,
              accidentType:
                event.target.value === 'all' ? 'all' : (Number(event.target.value) as AccidentType),
            })
          }
        >
          <option value="all">{t.all}</option>
          <option value="1">{t.a1}</option>
          <option value="2">{t.a2}</option>
        </select>
      </label>

      <label className="field">
        <span>{t.district}</span>
        <select
          value={filters.district}
          onChange={(event) => onChange({ ...filters, district: event.target.value })}
        >
          <option value="all">{t.all}</option>
          {districts.map((district) => (
            <option key={district} value={district}>
              {district}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t.timePeriod}</span>
        <select
          value={filters.timePeriod}
          onChange={(event) =>
            onChange({ ...filters, timePeriod: event.target.value as AccidentFilters['timePeriod'] })
          }
        >
          <option value="all">{t.all}</option>
          <option value="morning">{t.morning}</option>
          <option value="afternoon">{t.afternoon}</option>
          <option value="evening">{t.evening}</option>
          <option value="lateNight">{t.lateNight}</option>
        </select>
      </label>

      <label className="field">
        <span>{t.weekdayWeekend}</span>
        <select
          value={filters.weekdayWeekend}
          onChange={(event) =>
            onChange({
              ...filters,
              weekdayWeekend: event.target.value as AccidentFilters['weekdayWeekend'],
            })
          }
        >
          <option value="all">{t.all}</option>
          <option value="weekday">{t.weekday}</option>
          <option value="weekend">{t.weekend}</option>
        </select>
      </label>
    </section>
  );
}
