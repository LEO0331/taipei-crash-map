import { CircleMarker, Popup } from 'react-leaflet';
import type { AccidentHotspot } from '../types/accident';
import type { Translation } from '../i18n';
import { getGoogleMapsUrl } from '../utils/accidents';

type Props = {
  hotspots: AccidentHotspot[];
  t: Translation;
};

export function HotspotLayer({ hotspots, t }: Props) {
  const maxCount = Math.max(...hotspots.map((hotspot) => hotspot.totalCount), 1);
  return (
    <>
      {hotspots.map((hotspot) => (
        <CircleMarker
          center={[hotspot.latitude, hotspot.longitude]}
          key={hotspot.id}
          radius={Math.max(7, Math.sqrt(hotspot.totalCount / maxCount) * 28)}
          pathOptions={{
            color: '#991b1b',
            fillColor: hotspot.a1Count > 0 ? '#dc2626' : '#f97316',
            fillOpacity: 0.68,
            weight: 2,
          }}
        >
          <Popup>
            <div className="popup">
              <strong>{t.location}</strong>
              <p>{hotspot.location}</p>
              <p>
                {t.district}: {hotspot.district ?? '-'}
              </p>
              <p>
                {t.totalAccidents}: {hotspot.totalCount.toLocaleString()}
              </p>
              <p>
                {t.fatalAccidents}: {hotspot.a1Count.toLocaleString()}
              </p>
              <p>
                {t.injuryAccidents}: {hotspot.a2Count.toLocaleString()}
              </p>
              <p>
                {t.yearsCovered}: {hotspot.years.join(', ')}
              </p>
              <a
                href={getGoogleMapsUrl(hotspot.latitude, hotspot.longitude)}
                target="_blank"
                rel="noreferrer"
              >
                {t.openGoogleMaps}
              </a>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
