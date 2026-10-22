import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import type { BusStopOccurrence } from '../types/busService';

function FitStops({ stops }: { stops: BusStopOccurrence[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length) map.fitBounds(stops.map((stop) => [stop.lat!, stop.lon!] as [number, number]), { padding: [24, 24], maxZoom: 15 });
    map.invalidateSize();
  }, [map, stops]);
  return null;
}

/** Only a selected route's verified coordinate occurrences; never connect stop points. */
export function BusServiceNetworkMap({ stops, language }: { stops: BusStopOccurrence[]; language: 'zh' | 'en' }) {
  const zh = language === 'zh';
  const located = useMemo(() => stops.filter((stop) => stop.lat !== null && stop.lon !== null && Number.isFinite(stop.lat) && Number.isFinite(stop.lon) && Math.abs(stop.lat) <= 90 && Math.abs(stop.lon) <= 180), [stops]);
  const shown = useMemo(() => located.slice(0, 140), [located]);
  return <div>
    <p className="bus-map-legend">{zh ? '● 已驗證站序關聯的站牌座標；僅顯示所選路線與方向，最多 140 個站次。站點不連線；本圖不代表步行涵蓋、需求或服務績效。' : '● Verified route-stop coordinates for the selected route and direction, capped at 140 occurrences. Points are not connected; this map does not represent walking catchments, demand or service performance.'}</p>
    {shown.length ? <><MapContainer center={[25.04, 121.54]} zoom={12} scrollWheelZoom={false} className="bus-map" aria-label={zh ? '所選路線已驗證站牌地圖' : 'Selected route verified stop map'}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <FitStops stops={shown} />
      {shown.map((stop) => <CircleMarker key={stop.occurrenceId} center={[stop.lat!, stop.lon!]} radius={5} pathOptions={{ color: '#245b8a', fillOpacity: .7 }}><Popup><strong>{zh ? stop.nameZh : stop.nameEn || stop.nameZh}</strong><br />{zh ? '支線 / 方向 / 站序' : 'Variant / direction / sequence'}: {stop.variantId} / {stop.direction} / {stop.sequence}<br />Stop: {stop.stopId}<br />StopLocation: {stop.stopLocationId ?? '—'}</Popup></CircleMarker>)}
    </MapContainer><small>{zh ? '顯示站次' : 'Shown occurrences'}: {shown.length} / {located.length} · {zh ? '不繪製未確認支線、方向與新鮮度的線形。' : 'Shapes with unresolved variant, direction or freshness are not drawn.'}</small></> : <p className="bus-empty">{zh ? '目前篩選沒有有效站牌座標；資料缺漏不代表沒有公車服務。' : 'No valid stop coordinates for this selection; missing data do not mean absent service.'}</p>}
  </div>;
}
