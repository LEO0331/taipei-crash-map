/// <reference types="vite/client" />

declare module 'leaflet.heat';
declare module 'leaflet.markercluster';
declare module '*.css';

declare namespace L {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      minOpacity?: number;
      gradient?: Record<number, string>;
    },
  ): Layer;

  function markerClusterGroup(options?: Record<string, unknown>): MarkerClusterGroup;

  interface MarkerClusterGroup extends FeatureGroup {
    addLayer(layer: Layer): this;
    clearLayers(): this;
  }
}
