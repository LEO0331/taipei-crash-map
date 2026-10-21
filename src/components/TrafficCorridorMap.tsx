import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import type { TrafficDevice } from '../types/trafficCongestion';

function FitPoints({ devices }: { devices: TrafficDevice[] }) {
  const map = useMap();
  useEffect(() => {
    const points = devices.flatMap((device) => device.location ? [[device.location.latitude, device.location.longitude] as [number, number]] : []);
    if (points.length) map.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
    map.invalidateSize();
  }, [devices, map]);
  return null;
}

export function TrafficCorridorMap({ devices, language }: { devices: TrafficDevice[]; language: 'zh' | 'en' }) {
  const zh = language === 'zh';
  const located = devices.filter((device) => device.location && Number.isFinite(device.location.latitude) && Number.isFinite(device.location.longitude));
  return <div className="neihu-map-wrap">
    <p className="neihu-map-legend"><span aria-hidden="true">●</span> {zh ? '官方 VD 設備點位；顏色代表設備位置，不代表壅塞程度。無官方道路線形，因此不繪製廊帶連線。' : 'Official VD locations. Marker color identifies equipment, not congestion. No corridor lines are drawn without authoritative road geometry.'}</p>
    {located.length ? <MapContainer center={[25.075, 121.57]} zoom={13} scrollWheelZoom={false} className="neihu-map" aria-label={zh ? '已驗證設備位置地圖' : 'Verified detector location map'}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      <FitPoints devices={located} />
      {located.map((device) => <CircleMarker key={device.deviceId} center={[device.location!.latitude, device.location!.longitude]} radius={6} pathOptions={{ color: '#0f766e', fillOpacity: 0.65 }}><Popup><strong>{device.roadName}</strong><br />VD: {device.deviceId}<br />Link: {device.verifiedLinkId ?? '—'}<br />{zh ? '方向' : 'Direction'}: {device.direction ?? '—'}<br />{zh ? '無可比較歷史觀測' : 'No comparable historical observations'}</Popup></CircleMarker>)}
    </MapContainer> : <p className="neihu-empty">{zh ? '此範圍沒有已驗證座標。請參閱下方清冊；無設備不表示無壅塞。' : 'No verified coordinates in this scope. Consult the inventory below; absent equipment does not imply absent congestion.'}</p>}
  </div>;
}
