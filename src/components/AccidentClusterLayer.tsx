import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { AccidentRecord } from '../types/accident';
import type { Language, Translation } from '../i18n';
import { renderAccidentPopup } from './AccidentPopup';

const a1Icon = L.divIcon({
  className: 'accident-marker accident-marker-a1',
  iconSize: [18, 18],
});

const a2Icon = L.divIcon({
  className: 'accident-marker accident-marker-a2',
  iconSize: [14, 14],
});

type Props = {
  accidents: AccidentRecord[];
  language: Language;
  t: Translation;
};

export function AccidentClusterLayer({ accidents, language, t }: Props) {
  const map = useMap();

  useEffect(() => {
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 54,
    });

    accidents.forEach((accident) => {
      const marker = L.marker([accident.latitude, accident.longitude], {
        icon: accident.accidentType === 1 ? a1Icon : a2Icon,
      }).bindPopup(renderAccidentPopup({ accident, language, t }));
      cluster.addLayer(marker);
    });

    cluster.addTo(map);
    return () => {
      cluster.remove();
    };
  }, [accidents, language, map, t]);

  return null;
}
