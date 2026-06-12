import type { AccidentFilters } from '../types/accident';
import type { Translation } from '../i18n';

type Props = {
  filters: AccidentFilters;
  t: Translation;
  onChange: (filters: AccidentFilters) => void;
  onLocate: (latitude: number, longitude: number) => void;
};

export function NearbyHistoricalAccidents({ filters, t, onChange, onLocate }: Props) {
  const radius = filters.nearby?.radiusMeters ?? 500;

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const nearby = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        radiusMeters: radius,
      };
      onChange({ ...filters, nearby });
      onLocate(nearby.latitude, nearby.longitude);
    });
  };

  const updateRadius = (radiusMeters: number) => {
    if (filters.nearby) {
      onChange({ ...filters, nearby: { ...filters.nearby, radiusMeters } });
    }
  };

  return (
    <section className="nearby">
      <div className="nearby-controls">
        <button type="button" onClick={locate}>
          {t.showNearby}
        </button>
        <label>
          <span>{t.radius}</span>
          <select
            value={radius}
            onChange={(event) => updateRadius(Number(event.target.value))}
          >
            <option value={300}>300m</option>
            <option value={500}>500m</option>
            <option value={1000}>1km</option>
          </select>
        </label>
        {filters.nearby ? (
          <button type="button" onClick={() => onChange({ ...filters, nearby: undefined })}>
            {t.clearNearby}
          </button>
        ) : null}
      </div>
      <p>{t.nearbyDisclaimer}</p>
    </section>
  );
}
