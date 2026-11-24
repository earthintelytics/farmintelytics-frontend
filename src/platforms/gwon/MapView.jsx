/**
 * GWON's map view, on the FarmIntelytics monitoring design: the map takes the screen; a Layers panel floats on it
 * (each layer switched on or off, its opacity, its legend from NASA's own colour scale, an (i) for what it shows);
 * headline figures float top right; the strip under the map holds the timeline (the year's 16-day vegetation
 * pictures, or the last weeks day by day), step and play, and a calendar. Maps are drawn smooth.
 */
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, X, ChevronLeft, ChevronRight, Play, Pause, CalendarDays } from 'lucide-react';
import InfoTip from '../../components/page/InfoTip';
import LEGENDS from './legends.json';

import { LAYERS, ORDER, iso, daysAgo, ndviDate, ndviPeriods, dailyDays, tileUrl } from './layers';

const short = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const long = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmt = (n) => Math.round(n).toLocaleString('en-GB');

function Fit({ data }) {
  const map = useMap();
  useEffect(() => { if (data) { try { map.fitBounds(L.geoJSON(data).getBounds(), { padding: [20, 20] }); } catch { /* empty */ } } }, [data, map]);
  return null;
}

function Legend({ k }) {
  const l = LEGENDS[k];
  if (!l) return null;
  if (l.kind === 'classes') {
    return (
      <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
        {l.stops.map((s) => <span key={s.label} className="flex items-center gap-2 text-xs text-gray-700"><span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />{s.label}</span>)}
      </div>
    );
  }
  return (
    <div>
      <div className="h-2.5 rounded-sm" style={{ background: `linear-gradient(to right, ${l.stops.map((s) => s.color).join(',')})` }} />
      <div className="flex justify-between text-[11px] text-gray-600 mt-1 tabular-nums">
        <span>{Number(l.stops[0].label).toLocaleString('en-GB', { maximumFractionDigits: 2 })}</span>
        <span>{Number(l.stops[l.stops.length - 1].label).toLocaleString('en-GB', { maximumFractionDigits: 2 })}{l.unit ? ` ${l.unit}` : ''}</span>
      </div>
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${on ? 'bg-[#0F766E]' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

// A month calendar: days with a picture can be picked.
function Calendar({ dates, value, onPick, onClose }) {
  const [month, setMonth] = useState(() => (value || dates[dates.length - 1] || iso(new Date())).slice(0, 7));
  const have = new Set(dates);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const step = (n) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setMonth(iso(d).slice(0, 7)); };
  return (
    <div className="absolute bottom-full mb-2 right-0 w-72 rounded-2xl border border-gray-200 bg-white p-3 z-[1100]">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => step(-1)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Month before"><ChevronLeft size={16} /></button>
        <p className="text-sm font-semibold">{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => step(1)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Month after"><ChevronRight size={16} /></button>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close"><X size={15} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, '0')}`;
          const ok = have.has(d);
          return (
            <button key={d} type="button" disabled={!ok} onClick={() => { onPick(d); onClose(); }}
              className={`h-8 rounded-lg text-xs ${d === value ? 'bg-[#0F766E] text-white font-semibold' : ok ? 'bg-[#ECFDF8] text-[#0F5F57] hover:bg-[#D3F4EA] font-medium' : 'text-gray-300'}`}>{i + 1}</button>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-500 mt-2">Days with a picture can be chosen.</p>
    </div>
  );
}

/**
 * props: initial (layer keys switched on), states, sites, stats ([{label, value, sub, tip}]), height, title, date
 * (a controlled timeline date, optional), onDate.
 */
export default function MapView({ initial = ['ndvi'], states, sites, stats = [], height = 'calc(100vh - 290px)', title, date: dateIn, onDate, compact = false }) {
  const [layers, setLayers] = useState(() => Object.fromEntries(ORDER.map((k) => [k, { on: initial.includes(k), opacity: k === 'truecolor' ? 100 : 85 }])));
  const [panel, setPanel] = useState(!compact);
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const periodMode = layers.ndvi.on;
  const dailyLag = Math.max(1, ...ORDER.filter((k) => layers[k].on && LAYERS[k].time === 'daily').map((k) => LAYERS[k].lag || 1));
  const timeline = useMemo(() => (periodMode ? ndviPeriods(year) : dailyDays(dailyLag)), [periodMode, year, dailyLag]);
  const [own, setOwn] = useState(null);
  // The chosen day, while it is on the timeline; otherwise the newest picture.
  const date = dateIn ?? (own && timeline.includes(own) ? own : timeline[timeline.length - 1]);
  const setDate = (d) => { if (onDate) onDate(d); else setOwn(d); };
  const idx = Math.max(0, timeline.indexOf(date));
  const [playing, setPlaying] = useState(false);
  const [cal, setCal] = useState(false);
  const anyTime = ORDER.some((k) => layers[k].on && LAYERS[k].time);

  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => setDate(timeline[(timeline.indexOf(date) + 1) % timeline.length]), 1300);
    return () => clearInterval(t);
  }, [playing, timeline, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k, patch) => setLayers((s) => ({ ...s, [k]: { ...s[k], ...patch } }));
  // The day each layer shows: the timeline's day, the nearest 16-day picture, or the layer's fixed year.
  const dayFor = (k) => {
    const l = LAYERS[k];
    if (l.fixed) return l.fixed;
    if (l.time === 'period') return periodMode ? date : ndviDate(new Date(`${date}T00:00:00Z`));
    return periodMode ? iso(daysAgo(l.lag || 1)) : date;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Smooth maps (owner's rule): coarse layers (9 to 10 km cells) are softened, never shown as blocks. */}
      <style>{'.gwon-soft img { filter: blur(2.5px); }'}</style>
      <div className="relative" style={{ height }}>
        <MapContainer center={[11.5, 8.5]} zoom={6} style={{ height: '100%' }} zoomControl={false} scrollWheelZoom>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}" attribution="Base map: Esri" maxNativeZoom={16} />
          {ORDER.filter((k) => layers[k].on).map((k) => (
            <TileLayer key={`${k}-${dayFor(k)}`} url={tileUrl(k, dayFor(k))} maxNativeZoom={LAYERS[k].level} maxZoom={13}
              opacity={layers[k].opacity / 100} attribution="NASA GIBS (public domain)" className={LAYERS[k].coarse ? 'gwon-soft' : ''} />
          ))}
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="Places: Esri" opacity={0.9} />
          {states && <GeoJSON key="st-w" data={states} style={{ color: '#FFFFFF', weight: 3, fill: false }} />}
          {states && <GeoJSON key="st" data={states} style={{ color: '#0F5F57', weight: 1.4, fillOpacity: 0 }}
            onEachFeature={(f, lyr) => lyr.bindTooltip(`<b>${f.properties.state}</b><br/>${fmt(f.properties.area_ha)} ha`, { sticky: true })} />}
          {sites?.features?.length > 0 && <GeoJSON key={`s-${sites.features.length}`} data={sites} style={{ color: '#B45309', weight: 2, fillColor: '#F59E0B', fillOpacity: 0.4 }}
            onEachFeature={(f, lyr) => lyr.bindTooltip(f.properties?.name || f.properties?.ref || 'Site', { sticky: true })} />}
          <Fit data={states} />
        </MapContainer>

        {/* Layers */}
        <div className="absolute top-3 left-3 z-[1000] w-[300px] max-w-[calc(100%-24px)]">
          {!panel ? (
            <button type="button" onClick={() => setPanel(true)} className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-800">
              <Layers size={16} className="text-[#0F766E]" /> Layers <span className="text-gray-400 font-normal">{ORDER.filter((k) => layers[k].on).length}</span>
            </button>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-200 max-h-[calc(100%-20px)] overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white">
                <p className="text-sm font-semibold flex items-center gap-2"><Layers size={16} className="text-[#0F766E]" /> {title || 'Layers'}</p>
                <button type="button" onClick={() => setPanel(false)} className="p-1 rounded-lg hover:bg-gray-100" aria-label="Close layers"><X size={15} /></button>
              </div>
              <div className="p-3 space-y-2">
                {[...ORDER].reverse().map((k) => (
                  <div key={k} className={`rounded-xl border p-3 ${layers[k].on ? 'border-[#A7E3D4] bg-[#F3FBF8]' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">{LAYERS[k].name} <InfoTip text={LAYERS[k].info} side="bottom" /></p>
                      <Switch on={layers[k].on} onChange={(on) => set(k, { on })} label={LAYERS[k].name} />
                    </div>
                    {layers[k].on && (
                      <div className="mt-2.5 space-y-2">
                        <Legend k={k} />
                        <label className="block">
                          <span className="flex justify-between text-[11px] text-gray-600"><span>Opacity</span><span>{layers[k].opacity}%</span></span>
                          <input type="range" min="10" max="100" value={layers[k].opacity} onChange={(e) => set(k, { opacity: Number(e.target.value) })} className="w-full accent-[#0F766E]" />
                        </label>
                        <p className="text-[11px] text-gray-500">{LAYERS[k].fixed ? `Year ${LAYERS[k].fixed.slice(0, 4)}` : `Showing ${long(dayFor(k))}`}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Headline figures */}
        {stats.length > 0 && (
          <div className="absolute top-3 right-3 z-[1000] hidden md:grid gap-2 w-56">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/95 border border-gray-200 px-3.5 py-2.5">
                <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">{s.label} {s.tip && <InfoTip text={s.tip} side="bottom" />}</p>
                <p className="font-display text-lg font-semibold text-gray-900 tabular-nums">{s.value}</p>
                {s.sub && <p className="text-[11px] text-gray-500">{s.sub}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The strip under the map: timeline, step, play, calendar */}
      {anyTime && (
        <div className="border-t border-gray-100 px-3 py-2.5 flex items-center gap-2">
          <button type="button" onClick={() => setPlaying((p) => !p)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F766E] text-white text-sm font-semibold shrink-0" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={15} /> : <Play size={15} />}<span className="hidden sm:inline">{playing ? 'Pause' : 'Play'}</span>
          </button>
          <button type="button" onClick={() => setDate(timeline[Math.max(0, idx - 1)])} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 shrink-0" aria-label="Picture before"><ChevronLeft size={16} /></button>
          <div className="flex-1 min-w-0 overflow-x-auto">
            <div className="flex gap-1 w-max">
              {timeline.map((d) => (
                <button key={d} type="button" onClick={() => setDate(d)} data-active={d === date}
                  className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap border ${d === date ? 'bg-[#0F766E] border-[#0F766E] text-white font-semibold' : 'bg-white border-gray-200 text-gray-600 hover:border-[#0F766E]'}`}>{short(d)}</button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setDate(timeline[Math.min(timeline.length - 1, idx + 1)])} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 shrink-0" aria-label="Picture after"><ChevronRight size={16} /></button>
          {periodMode && (
            <select value={year} onChange={(e) => { setYear(Number(e.target.value)); setOwn(null); }} className="px-2 py-2 rounded-lg border border-gray-200 text-sm shrink-0" aria-label="Year">
              {Array.from({ length: new Date().getUTCFullYear() - 2015 }, (_, i) => new Date().getUTCFullYear() - i).map((y) => <option key={y}>{y}</option>)}
            </select>
          )}
          <div className="relative shrink-0">
            <button type="button" onClick={() => setCal((c) => !c)} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" aria-label="Calendar"><CalendarDays size={16} /></button>
            {cal && <Calendar dates={timeline} value={date} onPick={setDate} onClose={() => setCal(false)} />}
          </div>
          <span className="hidden lg:block text-sm font-semibold tabular-nums text-gray-900 shrink-0 w-32 text-right">{long(date)}</span>
        </div>
      )}
    </div>
  );
}
