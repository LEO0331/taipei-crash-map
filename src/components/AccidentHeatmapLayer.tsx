import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { AccidentRecord } from '../types/accident';

export function AccidentHeatmapLayer({ accidents }: { accidents: AccidentRecord[] }) {
  const map = useMap();

  useEffect(() => {
    const points = accidents.map((accident) => [
      accident.latitude,
      accident.longitude,
      accident.accidentType === 1 ? 1.8 : 0.55,
    ]) as Array<[number, number, number]>;
    const layer = L.heatLayer(points, {
      radius: 11,
      blur: 16,
      maxZoom: 17,
      minOpacity: 0.05,
      gradient: {
        0.35: '#22c55e',
        0.68: '#eab308',
        0.9: '#f97316',
        1: '#dc2626',
      },
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [accidents, map]);

  return null;
}
