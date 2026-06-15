import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { HeatmapPoint } from '../types/accident';

export function AccidentHeatmapLayer({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const heatPoints = points.map((point) => [
      point.latitude,
      point.longitude,
      point.weight,
    ]) as Array<[number, number, number]>;
    const layer = L.heatLayer(heatPoints, {
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
  }, [points, map]);

  return null;
}
