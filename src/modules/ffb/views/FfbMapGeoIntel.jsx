import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ffbCall } from '../api/ffbApi';

const LAYER_COLORS = {
  harvester: '#3F8432',
  loader: '#2563EB',
  owner: '#D97706',
};

export default function FfbMapGeoIntel({ tenantSlug }) {
  const [geo, setGeo] = useState({ plots: null, points: null });
  const [show, setShow] = useState({ harvester: true, loader: true, owner: true });
  const [err, setErr] = useState('');

  useEffect(() => {
    ffbCall('/analytics/geo', { tenantSlug })
      .then(setGeo)
      .catch((e) => setErr(e.message));
  }, [tenantSlug]);

  const points = (geo.points?.features || []).filter((f) => show[f.properties?.layer]);
  const center = points[0]?.geometry?.coordinates
    ? [points[0].geometry.coordinates[1], points[0].geometry.coordinates[0]]
    : [6.35, 5.35];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-main)]">Geospatial Intel Map</h1>
          <p className="text-sm text-[var(--text-muted)]">Plot geofences overlaid with Harvester, Loading Clerk, and Owner capture coordinates.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {['harvester', 'loader', 'owner'].map((k) => (
            <button key={k} onClick={() => setShow({ ...show, [k]: !show[k] })}
              className={`px-3 py-1.5 rounded-xl border font-semibold capitalize ${show[k] ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: LAYER_COLORS[k] }} />
              {k}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}

      <div className="h-[540px] rounded-2xl overflow-hidden border border-[var(--border-light)] bg-white">
        <MapContainer center={center} zoom={12} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {geo.plots?.features?.length > 0 && (
            <GeoJSON data={geo.plots} style={{ color: '#034321', weight: 1.5, fillColor: '#5AA041', fillOpacity: 0.12 }} />
          )}
          {points.map((f, idx) => {
            const [lon, lat] = f.geometry.coordinates;
            const p = f.properties;
            return (
              <CircleMarker key={`${p.layer}-${p.id}-${idx}`} center={[lat, lon]} radius={6}
                pathOptions={{ color: '#fff', weight: 1.5, fillColor: LAYER_COLORS[p.layer] || '#3F8432', fillOpacity: 0.9 }}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold capitalize">{p.layer} · Plot {p.plot_id}</p>
                    <p>Count: <span className="font-mono">{p.count}</span> {p.score != null && `· Score ${p.score}`}</p>
                    <p className="text-gray-500">{p.captured_at?.slice(0, 16).replace('T', ' ')}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
