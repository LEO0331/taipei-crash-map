import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { AccidentFilters, AccidentHotspot, AccidentRecord, MapMode } from '../types/accident';
import type { Language, Translation } from '../i18n';
import { AccidentHeatmapLayer } from './AccidentHeatmapLayer';
import { AccidentClusterLayer } from './AccidentClusterLayer';
import { HotspotLayer } from './HotspotLayer';
import { MapModeToggle } from './MapModeToggle';
import { useEffect } from 'react';

type Props = {
  accidents: AccidentRecord[];
  hotspots: AccidentHotspot[];
  filters: AccidentFilters;
  mode: MapMode;
  language: Language;
  t: Translation;
  userLocation?: { latitude: number; longitude: number };
  onModeChange: (mode: MapMode) => void;
};

function Recenter({ location }: { location?: { latitude: number; longitude: number } }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.latitude, location.longitude], 15);
    }
  }, [location, map]);
  return null;
}

const userIcon = L.divIcon({
  className: 'user-location-marker',
  iconSize: [20, 20],
});

export function AccidentMap({
  accidents,
  hotspots,
  filters,
  mode,
  language,
  t,
  userLocation,
  onModeChange,
}: Props) {
  const visibleHotspots = hotspots.filter((hotspot) => {
    if (filters.district !== 'all' && hotspot.district !== filters.district) return false;
    if (filters.search) return hotspot.location.includes(filters.search);
    return true;
  });

  return (
    <section className="map-shell">
      <div className="map-toolbar">
        <MapModeToggle mode={mode} t={t} onChange={onModeChange} />
        <span className="record-badge">{t.recordsShown}: {accidents.length.toLocaleString()}</span>
      </div>
      <MapContainer
        center={[25.0478, 121.517]}
        zoom={12}
        minZoom={10}
        maxZoom={18}
        scrollWheelZoom
        className="accident-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mode === 'heatmap' ? <AccidentHeatmapLayer accidents={accidents} /> : null}
        {mode === 'clusters' ? (
          <AccidentClusterLayer accidents={accidents} language={language} t={t} />
        ) : null}
        {mode === 'hotspots' ? <HotspotLayer hotspots={visibleHotspots} t={t} /> : null}
        {userLocation ? (
          <>
            <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
              <Popup>{t.showNearby}</Popup>
            </Marker>
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              radius={16}
              pathOptions={{ color: '#2563eb', fillOpacity: 0.08 }}
            />
          </>
        ) : null}
        <Recenter location={userLocation} />
      </MapContainer>
    </section>
  );
}
