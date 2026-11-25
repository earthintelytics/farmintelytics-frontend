/**
 * A map of the frontline states coloured by a value (a drought index class, poverty, people displaced...), with its
 * legend, a tooltip and a click that picks the state. Drawn smooth on the light or dark base.
 */
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function Fit({ data }) {
  const map = useMap();
  useEffect(() => { if (data) { try { map.fitBounds(L.geoJSON(data).getBounds(), { padding: [12, 12] }); } catch { /* empty */ } } }, [data, map]);
  return null;
}

/** colorOf(state) -> colour, label(state) -> tooltip html, legend [{color, label}] */
export default function Choropleth({ states, colorOf, label, legend, picked, onPick, height = 420, dark = false }) {
  const key = useMemo(() => (states?.features || []).map((f) => `${f.properties.state}:${colorOf(f.properties.state)}`).join('|') + picked + dark, [states, colorOf, picked, dark]);
  if (!states) return null;
  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height }}>
        <MapContainer center={[11.8, 9]} zoom={6} style={{ height: '100%' }} zoomControl={false} scrollWheelZoom={false} attributionControl={false}>
          <TileLayer url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${dark ? 'Dark' : 'Light'}_Gray_Base/MapServer/tile/{z}/{y}/{x}`} />
          <GeoJSON key={key} data={states}
            style={(f) => ({ color: f.properties.state === picked ? '#0E2D41' : dark ? '#0B1820' : '#FFFFFF', weight: f.properties.state === picked ? 3 : 1.5, fillColor: colorOf(f.properties.state) || '#E5E7EB', fillOpacity: 0.85 })}
            onEachFeature={(f, lyr) => {
              lyr.bindTooltip(label(f.properties.state), { sticky: true });
              lyr.on('click', () => onPick && onPick(f.properties.state));
            }} />
          <Fit data={states} />
        </MapContainer>
      </div>
      {legend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {legend.map((l) => <span key={l.label} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-gray-200" style={{ background: l.color }} />{l.label}</span>)}
        </div>
      )}
    </div>
  );
}
