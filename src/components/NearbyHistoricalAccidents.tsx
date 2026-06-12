import { useEffect, useState } from 'react';
import type { AccidentFilters } from '../types/accident';
import type { Translation } from '../i18n';

type Props = {
  filters: AccidentFilters;
  t: Translation;
  onChange: (filters: AccidentFilters) => void;
  onLocate: (location?: { latitude: number; longitude: number }) => void;
};

export function NearbyHistoricalAccidents({ filters, t, onChange, onLocate }: Props) {
  const [radius, setRadius] = useState(filters.nearby?.radiusMeters ?? 500);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (filters.nearby) {
      setRadius(filters.nearby.radiusMeters);
    }
  }, [filters.nearby]);

  const locate = () => {
    if (!navigator.geolocation) {
      setMessage(t.geolocationUnavailable);
      return;
    }

    setMessage(t.geolocationRequesting);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearby = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radiusMeters: radius,
        };
        setMessage('');
        onChange({ ...filters, nearby });
        onLocate({ latitude: nearby.latitude, longitude: nearby.longitude });
      },
      () => setMessage(t.geolocationFailed),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  };

  const updateRadius = (radiusMeters: number) => {
    setRadius(radiusMeters);
    if (filters.nearby) {
      onChange({ ...filters, nearby: { ...filters.nearby, radiusMeters } });
    }
  };

  const clearNearby = () => {
    setMessage('');
    onChange({ ...filters, nearby: undefined });
    onLocate();
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
          <button type="button" onClick={clearNearby}>
            {t.clearNearby}
          </button>
        ) : null}
      </div>
      {message ? <p role="status">{message}</p> : null}
      <p>{t.nearbyDisclaimer}</p>
    </section>
  );
}
