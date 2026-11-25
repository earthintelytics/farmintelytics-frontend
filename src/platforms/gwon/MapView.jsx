/**
 * GWON's map view, on the FarmIntelytics monitoring design: the map takes the screen; a Layers panel floats on it
 * (layers in groups, each switched on or off, its opacity, its legend from the source's own colour scale, an (i) for
 * what it shows); headline figures float top right; the strip under the map is the time slider (the year's 16-day
 * vegetation pictures, or the last weeks day by day) with play, speed and a calendar. Split screen compares two
 * dates side by side or with a swipe line. The chosen state, LGA or ward stands out; the rest is dimmed.
 * Maps are drawn smooth.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Layers, X, ChevronLeft, ChevronRight, ChevronDown, Play, Pause, CalendarDays, Columns2, SplitSquareHorizontal, RotateCcw } from 'lucide-react';
import InfoTip from '../../components/page/InfoTip';
import LEGENDS from './legends.json';

import { LAYERS, ORDER, GROUPS, GIBS_WMS, iso, daysAgo, ndviDate, ndviPeriods, dailyDays, periodOf, tileUrl } from './layers';

const short = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const long = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthName = (m) => new Date(Date.UTC(2000, m, 1)).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
const fmt = (n) => Math.round(n).toLocaleString('en-GB');
const SPEEDS = [{ id: 'slow', label: 'Slow', ms: 2200 }, { id: 'normal', label: 'Normal', ms: 1300 }, { id: 'fast', label: 'Fast', ms: 650 }];
const BASE = {
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
};
const LABELS = {
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
};

function Fit({ data }) {
  const map = useMap();
  useEffect(() => { if (data) { try { map.fitBounds(L.geoJSON(data).getBounds(), { padding: [20, 20] }); } catch { /* empty */ } } }, [data, map]);
  return null;
}

// Split screen: the maps of one view pan and zoom together.
const SYNC = {};   // split-screen map groups: { maps, moving }
function Sync({ group, id }) {
  const map = useMap();
  useEffect(() => {
    const g = (SYNC[group] ||= { maps: {}, moving: false });
    g.maps[id] = map;
    const follow = () => {
      if (g.moving) return;
      g.moving = true;
      Object.entries(g.maps).forEach(([k, m]) => { if (k !== id && m) m.setView(map.getCenter(), map.getZoom(), { animate: false }); });
      g.moving = false;
    };
    map.on('move', follow);
    return () => { map.off('move', follow); delete g.maps[id]; };
  }, [group, id, map]);
  return null;
}

// Everything outside the chosen area, dimmed: the world with the area cut out of it.
function maskOf(feature) {
  const g = feature?.geometry;
  if (!g) return null;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], ...polys.map((p) => p[0])] } };
}

function Legend({ k }) {
  const l = LEGENDS[k];
  if (!l) return null;
  if (l.kind === 'classes') {
    return (
      <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
        {l.stops.map((s) => <span key={s.label} className="flex items-center gap-2 text-xs text-gray-700"><span className="w-3 h-3 rounded-sm shrink-0 border border-gray-200" style={{ background: s.color }} />{s.label}</span>)}
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
      className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${on ? 'bg-[#007248]' : 'bg-gray-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

// The calendar: month and year to choose, days with a picture tinted; the newest picture one click away.
function Calendar({ dates, value, onPick, onClose, years, onYear }) {
  const [month, setMonth] = useState(() => (value || dates[dates.length - 1] || iso(new Date())).slice(0, 7));
  const have = new Set(dates);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const go = (yy, mm) => { const d = new Date(Date.UTC(yy, mm, 1)); setMonth(iso(d).slice(0, 7)); if (onYear && d.getUTCFullYear() !== y) onYear(d.getUTCFullYear()); };
  const inMonth = dates.filter((d) => d.startsWith(month)).length;
  const sel = 'px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-800';
  return (
    <div className="absolute bottom-full mb-2 right-0 w-80 rounded-2xl border border-gray-200 bg-white p-3 z-[1100]">
      <div className="flex items-center gap-1.5 mb-2">
        <button type="button" onClick={() => go(y, m - 2)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Month before"><ChevronLeft size={16} /></button>
        <select value={m - 1} onChange={(e) => go(y, Number(e.target.value))} className={sel} aria-label="Month">
          {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{monthName(i)}</option>)}
        </select>
        <select value={y} onChange={(e) => go(Number(e.target.value), m - 1)} className={sel} aria-label="Year">
          {(years || [y]).map((yy) => <option key={yy} value={yy}>{yy}</option>)}
        </select>
        <button type="button" onClick={() => go(y, m)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Month after"><ChevronRight size={16} /></button>
        <button type="button" onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close"><X size={15} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = `${month}-${String(i + 1).padStart(2, '0')}`;
          const ok = have.has(d);
          return (
            <button key={d} type="button" disabled={!ok} onClick={() => { onPick(d); onClose(); }} aria-label={long(d)}
              className={`h-8 rounded-lg text-xs ${d === value ? 'bg-[#007248] text-white font-semibold' : ok ? 'bg-[#E8F5EE] text-[#0E2D41] hover:bg-[#D2EDDD] font-semibold' : 'text-gray-300'}`}>{i + 1}</button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <p className="text-[11px] text-gray-500">{inMonth ? `${inMonth} picture${inMonth > 1 ? 's' : ''} this month (tinted days)` : 'No picture this month'}</p>
        {dates.length > 0 && <button type="button" onClick={() => { onPick(dates[dates.length - 1]); onClose(); }} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50">Newest</button>}
      </div>
    </div>
  );
}

// The time slider: every picture on a track, month marks under it, the chosen date above the thumb.
function TimeSlider({ dates, value, onChange }) {
  const i = Math.max(0, dates.indexOf(value));
  const n = Math.max(1, dates.length - 1);
  const marks = dates.map((d, k) => ({ d, k })).filter(({ d, k }) => k === 0 || d.slice(5, 7) !== dates[k - 1].slice(5, 7));
  const pct = (k) => `${(k / n) * 100}%`;
  return (
    <div className="flex-1 min-w-[220px] px-2">
      <div className="relative h-5">
        <span className="absolute -translate-x-1/2 text-[11px] font-semibold text-[#0E2D41] whitespace-nowrap tabular-nums" style={{ left: pct(i) }}>{short(value || dates[0] || iso(new Date()))}</span>
      </div>
      <div className="relative h-[18px]">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-gray-200">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[#007248]" style={{ width: pct(i) }} />
          {dates.map((d, k) => <span key={d} className={`absolute top-1/2 -translate-y-1/2 w-px h-2.5 ${k <= i ? 'bg-[#007248]' : 'bg-gray-300'}`} style={{ left: pct(k) }} />)}
        </div>
        <input type="range" min="0" max={Math.max(0, dates.length - 1)} value={i} onChange={(e) => onChange(dates[Number(e.target.value)])} aria-label="Date"
          aria-valuetext={value ? long(value) : ''} className="gwon-range absolute -inset-x-[9px] top-0 w-[calc(100%+18px)]" />
      </div>
      <div className="relative h-4 mt-0.5">
        {marks.map(({ d, k }) => <span key={d} className="absolute -translate-x-1/2 text-[10.5px] text-gray-500" style={{ left: pct(k) }}>{monthName(Number(d.slice(5, 7)) - 1)}</span>)}
      </div>
    </div>
  );
}

/**
 * props: initial (layer keys switched on), states (frontline), allStates (every state, thin outline), sites, stats
 * ([{label, value, sub, tip}]), height, title, date (a controlled timeline date, optional), onDate, focus (the chosen
 * state, LGA or ward feature), outlines (inner boundaries to draw, e.g. the LGAs of the chosen state), dark.
 */
export default function MapView({ detail = false, focus = null, initial = ['ndvi'], states, allStates, outlines, sites, stats = [], height = (typeof window !== 'undefined' && window.innerWidth < 768) ? '62vh' : 'calc(100vh - 330px)', title, date: dateIn, onDate, compact = false, dark = false }) {
  const [layers, setLayers] = useState(() => Object.fromEntries(ORDER.map((k) => [k, { on: initial.includes(k), opacity: k === 'truecolor' ? 100 : 85 }])));
  const [panel, setPanel] = useState(() => !compact && (typeof window === 'undefined' || window.innerWidth >= 768));
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(GROUPS.map((g) => [g, GROUPS.slice(0, 2).includes(g) || ORDER.some((k) => LAYERS[k].group === g && initial.includes(k))])));
  const [year, setYear] = useState(() => new Date().getUTCFullYear());
  const periodMode = layers.ndvi.on || layers.evi.on;
  const dailyLag = Math.max(1, ...ORDER.filter((k) => layers[k].on && LAYERS[k].time === 'daily').map((k) => LAYERS[k].lag || 1));
  // A date given from outside (the Date filter) sets the year and the day; otherwise the map keeps its own.
  const anchor = dateIn ? (periodMode ? periodOf(dateIn) : dateIn) : null;
  const shownYear = periodMode && anchor ? Number(anchor.slice(0, 4)) : year;
  const timeline = useMemo(() => (periodMode ? ndviPeriods(shownYear) : dailyDays(dailyLag, 45, anchor)), [periodMode, shownYear, dailyLag, anchor]);
  const [own, setOwn] = useState(null);
  // The chosen day, while it is on the timeline; otherwise the newest picture.
  const date = anchor && timeline.includes(anchor) ? anchor : (own && timeline.includes(own) ? own : timeline[timeline.length - 1]);
  const setDate = (d) => { if (onDate) onDate(d); setOwn(d); };
  const setMainYear = (y) => { const tl = ndviPeriods(y); if (onDate) onDate(tl.find((d) => d.slice(5) >= (date || '').slice(5)) || tl[tl.length - 1]); else { setYear(y); setOwn(null); } };
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('normal');
  const [cal, setCal] = useState(false);
  const anyTime = ORDER.some((k) => isOn(k) && LAYERS[k].time);
  const years = Array.from({ length: new Date().getUTCFullYear() - 2014 }, (_, i) => new Date().getUTCFullYear() - i);
  // Split screen: a second map with its own date (by default the same picture a year earlier, or 30 days earlier).
  const [split, setSplit] = useState(null);         // null, 'side' or 'swipe'
  const [side, setSide] = useState('B');           // which map the strip moves: A (before) or B (after, the main date)
  const [yearA, setYearA] = useState(() => new Date().getUTCFullYear() - 1);
  const timelineA = useMemo(() => (periodMode ? ndviPeriods(yearA) : dailyDays(dailyLag)), [periodMode, yearA, dailyLag]);
  const [ownA, setOwnA] = useState(null);
  const defaultA = periodMode ? (timelineA.find((d) => d.slice(5) >= (date || '').slice(5)) || timelineA[timelineA.length - 1]) : timelineA[Math.max(0, timelineA.indexOf(date) - 30)];
  const dateA = ownA && timelineA.includes(ownA) ? ownA : defaultA;
  const [swipe, setSwipe] = useState(50);
  const boxRef = useRef(null);
  const sync = useId();
  const act = split && side === 'A'
    ? { tl: timelineA, d: dateA, set: setOwnA, year: yearA, setYear: (y) => { setYearA(y); setOwnA(null); } }
    : { tl: timeline, d: date, set: setDate, year: shownYear, setYear: setMainYear };
  const actIdx = Math.max(0, act.tl.indexOf(act.d));
  const step = (which, n) => {
    const s = which === 'A' ? { tl: timelineA, d: dateA, set: setOwnA } : { tl: timeline, d: date, set: setDate };
    const k = Math.max(0, s.tl.indexOf(s.d));
    s.set(s.tl[Math.min(s.tl.length - 1, Math.max(0, k + n))]);
  };

  useEffect(() => {
    if (!playing) return undefined;
    const ms = SPEEDS.find((s) => s.id === speed)?.ms || 1300;
    const t = setInterval(() => act.set(act.tl[(act.tl.indexOf(act.d) + 1) % act.tl.length]), ms);
    return () => clearInterval(t);
  }, [playing, speed, act.tl, act.d]); // eslint-disable-line react-hooks/exhaustive-deps

  // Zoomed to an LGA or ward: sharp satellite imagery underneath, and the coarse layers off until the reader turns
  // one on (owner, 25 Nov 2026). A layer switched on by hand stays on.
  const [touched, setTouched] = useState({});
  const isOn = (k) => layers[k].on && (!detail || touched[k] || !['ndvi', 'evi', 'truecolor', 'landcover', 'soil', 'rain', 'lst', 'photo', 'population', 'droughthaz', 'droughtloss', 'nightlights'].includes(k));
  const set = (k, patch) => { if ('on' in patch) setTouched((s) => ({ ...s, [k]: true })); setLayers((s) => ({ ...s, [k]: { ...s[k], ...patch } })); };
  // The day each layer shows: the timeline's day, the nearest 16-day picture, or the layer's fixed date.
  const dayFor = (k, d = date) => {
    const l = LAYERS[k];
    if ('fixed' in l) return l.fixed;
    if (l.time === 'period') return periodMode ? d : ndviDate(new Date(`${d}T00:00:00Z`));
    return periodMode ? iso(daysAgo(l.lag || 1)) : d;
  };
  const shownAs = (k) => {
    const l = LAYERS[k];
    if ('fixed' in l) return l.period || (l.fixed ? `Year ${l.fixed.slice(0, 4)}` : 'Fixed map');
    return `Showing ${long(dayFor(k))}`;
  };
  const mask = useMemo(() => maskOf(focus), [focus]);
  const theme = dark ? 'dark' : 'light';
  const focusKey = focus ? (focus.properties.name || focus.properties.state) : '';

  // One map at a date: drawn once, twice side by side, or twice under a swipe line.
  const drawMap = (d, id) => (
    <MapContainer center={[11.5, 8.5]} zoom={6} style={{ height: '100%' }} zoomControl={false} scrollWheelZoom>
      <Sync group={sync} id={id} />
      {detail ? <TileLayer key="base-imagery" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Imagery: Esri, Maxar, Earthstar Geographics" maxNativeZoom={18} maxZoom={19} />
        : <TileLayer key={`base-${theme}`} url={BASE[theme]} attribution="Base map: Esri" maxNativeZoom={16} />}
      {ORDER.filter((k) => isOn(k)).map((k) => {
        const l = LAYERS[k];
        const cls = l.coarse ? 'gwon-soft' : '';
        if (l.kind === 'wms') {
          return <WMSTileLayer key={`${k}-${dayFor(k, d)}`} url={GIBS_WMS} params={{ layers: l.id, format: 'image/png', transparent: true, time: dayFor(k, d) }}
            opacity={layers[k].opacity / 100} attribution="NASA GIBS (public domain)" className={cls} />;
        }
        return <TileLayer key={`${k}-${dayFor(k, d)}`} url={tileUrl(k, l.kind === 'xyz' ? null : dayFor(k, d))} maxNativeZoom={l.level} maxZoom={14}
          opacity={layers[k].opacity / 100} attribution={l.kind === 'xyz' ? (k === 'protected' ? 'WDPA, UNEP-WCMC and IUCN' : 'Hansen/UMD/Google/USGS/NASA') : 'NASA GIBS (public domain)'} className={cls} />;
      })}
      <TileLayer key={`lab-${detail ? 'img' : theme}`} url={detail ? LABELS.light : LABELS[theme]} attribution="Places: Esri" opacity={0.9} />
      {allStates && <GeoJSON key={`all-${theme}`} data={allStates} style={{ color: dark ? '#5E7A8A' : '#94A3B8', weight: 0.8, fill: false }}
        onEachFeature={(f, lyr) => lyr.bindTooltip(`<b>${f.properties.name || f.properties.state}</b>`, { sticky: true })} />}
      {states && <GeoJSON key={`st-w-${theme}`} data={states} style={{ color: dark ? '#0B1820' : '#FFFFFF', weight: 3, fill: false }} />}
      {states && <GeoJSON key="st" data={states} style={{ color: '#007248', weight: 1.5, fillOpacity: 0 }}
        onEachFeature={(f, lyr) => lyr.bindTooltip(`<b>${f.properties.state}</b><br/>${fmt(f.properties.area_ha)} ha`, { sticky: true })} />}
      {outlines?.features?.length > 0 && <GeoJSON key={`ol-${outlines.features.length}-${outlines.features[0]?.properties?.name}`} data={outlines} style={{ color: dark ? '#9FB3BF' : '#0E2D41', weight: 0.7, opacity: 0.7, fill: false, dashArray: '3 3' }}
        onEachFeature={(f, lyr) => lyr.bindTooltip(`<b>${f.properties.name}</b>`, { sticky: true })} />}
      {/* The chosen state, LGA or ward stands out; the rest is dimmed. */}
      {mask && <GeoJSON key={`mask-${focusKey}-${theme}`} data={mask} interactive={false} style={{ stroke: false, fillColor: dark ? '#0B1820' : '#FFFFFF', fillOpacity: detail ? 0.45 : 0.6 }} />}
      {focus && <GeoJSON key={`focus-${focusKey}`} data={focus} interactive={false} style={{ color: detail ? '#FACC15' : dark ? '#7FD3A6' : '#0E2D41', weight: 3, fill: false }} />}
      {sites?.features?.length > 0 && <GeoJSON key={`s-${sites.features.length}`} data={sites} style={{ color: '#B45309', weight: 2, fillColor: '#F59E0B', fillOpacity: 0.4 }}
        onEachFeature={(f, lyr) => lyr.bindTooltip(f.properties?.name || f.properties?.ref || 'Site', { sticky: true })} />}
      <Fit data={focus || states} />
    </MapContainer>
  );

  // The swipe line: drag it (or use the arrow keys) to show more of either date.
  const dragSwipe = (e) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const move = (ev) => setSwipe(Math.min(95, Math.max(5, ((ev.clientX - box.left) / box.width) * 100)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    e.preventDefault();
  };
  const dateCard = (id, d, pos) => (
    <div className={`absolute top-3 z-[1000] flex items-center rounded-xl border bg-white ${side === id ? 'border-[#007248]' : 'border-gray-200'}`} style={pos}>
      <button type="button" onClick={() => step(id, -1)} className="p-2 hover:bg-gray-50 rounded-l-xl" aria-label="Picture before"><ChevronLeft size={15} /></button>
      <button type="button" onClick={() => setSide(id)} className="px-2 py-1.5 text-left" aria-pressed={side === id}>
        <span className={`block text-[10.5px] font-semibold uppercase tracking-wider ${side === id ? 'text-[#007248]' : 'text-gray-500'}`}>{id === 'A' ? 'Before' : 'After'}{side === id ? ' · timeline' : ''}</span>
        <span className="block text-xs font-semibold text-gray-900 tabular-nums whitespace-nowrap">{long(d)}</span>
      </button>
      <button type="button" onClick={() => step(id, 1)} className="p-2 hover:bg-gray-50 rounded-r-xl" aria-label="Picture after"><ChevronRight size={15} /></button>
    </div>
  );

  const ctl = 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold shrink-0';
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Smooth maps (owner's rule): coarse layers (1 to 10 km cells) are softened, never shown as blocks. */}
      <style>{`.gwon-soft img { filter: blur(2.5px); } .leaflet-container path.leaflet-interactive:focus, .leaflet-container .leaflet-interactive:focus { outline: none; }
        .gwon-range { -webkit-appearance: none; appearance: none; background: transparent; height: 18px; cursor: pointer; margin: 0; }
        .gwon-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 9999px; background: #fff; border: 3px solid #007248; }
        .gwon-range::-moz-range-thumb { width: 14px; height: 14px; border-radius: 9999px; background: #fff; border: 3px solid #007248; }
        .gwon-range::-webkit-slider-runnable-track { background: transparent; } .gwon-range::-moz-range-track { background: transparent; }`}</style>
      <div ref={boxRef} className="relative" style={{ height }}>
        {split === 'side' && (
          <div className="grid grid-cols-2 h-full gap-0.5 bg-gray-200">
            {[['A', dateA], ['B', date]].map(([id, d]) => (
              <div key={id} className="relative h-full">{drawMap(d, id)}{dateCard(id, d, { left: '50%', transform: 'translateX(-50%)' })}</div>
            ))}
          </div>
        )}
        {split === 'swipe' && (
          <>
            <div className="absolute inset-0">{drawMap(date, 'B')}</div>
            <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - swipe}% 0 0)` }}>{drawMap(dateA, 'A')}</div>
            <div className="absolute inset-y-0 z-[1001] w-0.5 bg-white" style={{ left: `${swipe}%` }}>
              <button type="button" onPointerDown={dragSwipe} aria-label="Swipe line: drag, or use the arrow keys"
                onKeyDown={(e) => { if (e.key === 'ArrowLeft') setSwipe((s) => Math.max(5, s - 5)); if (e.key === 'ArrowRight') setSwipe((s) => Math.min(95, s + 5)); }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white border-2 border-[#007248] text-[#007248] flex items-center justify-center cursor-ew-resize touch-none">
                <SplitSquareHorizontal size={16} />
              </button>
            </div>
            {dateCard('A', dateA, { right: `calc(${100 - swipe}% + 12px)`, top: '64px' })}
            {dateCard('B', date, { left: `calc(${swipe}% + 12px)`, top: '64px' })}
          </>
        )}
        {!split && drawMap(date, 'B')}

        {/* Layers */}
        <div className="absolute top-3 left-3 z-[1002] w-[310px] max-w-[calc(100%-24px)] max-h-[calc(100%-24px)] flex">
          {!panel ? (
            <button type="button" onClick={() => setPanel(true)} className="self-start inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-800">
              <Layers size={16} className="text-[#007248]" /> Layers <span className="text-gray-500 font-normal">{ORDER.filter((k) => isOn(k)).length} on</span>
            </button>
          ) : (
            <div className="rounded-2xl bg-white border border-gray-200 overflow-y-auto w-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                <p className="text-sm font-semibold flex items-center gap-2"><Layers size={16} className="text-[#007248]" /> {title || 'Layers'}</p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setLayers((s) => Object.fromEntries(ORDER.map((k) => [k, { ...s[k], on: initial.includes(k) }])))} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Back to the first layers" title="Back to the first layers"><RotateCcw size={14} /></button>
                  <button type="button" onClick={() => setPanel(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close layers"><X size={15} /></button>
                </div>
              </div>
              <div className="p-2 space-y-1">
                {GROUPS.map((g) => {
                  const ks = [...ORDER].reverse().filter((k) => LAYERS[k].group === g);
                  const on = ks.filter((k) => isOn(k)).length;
                  return (
                    <div key={g}>
                      <button type="button" onClick={() => setOpenGroups((s) => ({ ...s, [g]: !s[g] }))} aria-expanded={!!openGroups[g]}
                        className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-600">
                        <span>{g}{on ? <span className="normal-case tracking-normal font-normal text-[#007248]"> · {on} on</span> : null}</span>
                        <ChevronDown size={14} className={`transition-transform ${openGroups[g] ? 'rotate-180' : ''}`} />
                      </button>
                      {openGroups[g] && (
                        <div className="space-y-1.5 pb-1.5">
                          {ks.map((k) => (
                            <div key={k} className={`rounded-xl border p-3 ${isOn(k) ? 'border-[#A9D9BF] bg-[#F1F9F4]' : 'border-gray-200'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">{LAYERS[k].name} <InfoTip text={LAYERS[k].info} side="bottom" /></p>
                                <Switch on={isOn(k)} onChange={(v) => set(k, { on: v })} label={LAYERS[k].name} />
                              </div>
                              {isOn(k) && (
                                <div className="mt-2.5 space-y-2">
                                  <Legend k={k} />
                                  <label className="block">
                                    <span className="flex justify-between text-[11px] text-gray-600"><span>Opacity</span><span>{layers[k].opacity}%</span></span>
                                    <input type="range" min="10" max="100" value={layers[k].opacity} onChange={(e) => set(k, { opacity: Number(e.target.value) })} className="w-full accent-[#007248]" />
                                  </label>
                                  <p className="text-[11px] text-gray-500">{shownAs(k)}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Headline figures */}
        {stats.length > 0 && !split && (
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

      {/* The strip under the map: play and speed, the time slider, step, year and calendar, compare */}
      <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap items-center gap-2">
        {anyTime ? (
          <>
            <button type="button" onClick={() => setPlaying((p) => !p)} className={`${ctl} bg-[#007248] border-[#007248] text-white`} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={15} /> : <Play size={15} />}<span className="hidden sm:inline">{playing ? 'Pause' : 'Play'}</span>
            </button>
            <select value={speed} onChange={(e) => setSpeed(e.target.value)} aria-label="Speed" className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm shrink-0">
              {SPEEDS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button type="button" onClick={() => act.set(act.tl[Math.max(0, actIdx - 1)])} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 shrink-0" aria-label="Picture before"><ChevronLeft size={16} /></button>
            <TimeSlider dates={act.tl} value={act.d} onChange={act.set} />
            <button type="button" onClick={() => act.set(act.tl[Math.min(act.tl.length - 1, actIdx + 1)])} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 shrink-0" aria-label="Picture after"><ChevronRight size={16} /></button>
            {periodMode && (
              <select value={act.year} onChange={(e) => act.setYear(Number(e.target.value))} className="px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm shrink-0" aria-label="Year">
                {years.map((y) => <option key={y}>{y}</option>)}
              </select>
            )}
            <div className="relative shrink-0">
              <button type="button" onClick={() => setCal((c) => !c)} aria-expanded={cal} className={`${ctl} ${cal ? 'border-[#007248] text-[#0E2D41] bg-[#E8F5EE]' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`} aria-label="Calendar"><CalendarDays size={16} /><span className="hidden xl:inline">{long(act.d)}</span></button>
              {cal && <Calendar dates={act.tl} value={act.d} onPick={act.set} onClose={() => setCal(false)} years={periodMode ? years : null} onYear={periodMode ? act.setYear : null} />}
            </div>
          </>
        ) : <p className="flex-1 text-xs text-gray-600 py-2">The layers on are fixed maps (no dates). Switch on vegetation, rain, soil moisture, heat, fires or floods for the timeline.</p>}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-xl shrink-0" role="group" aria-label="Compare two dates">
          {[[null, 'One map', null], ['side', 'Side by side', Columns2], ['swipe', 'Swipe', SplitSquareHorizontal]].map(([id, label, Icon]) => (
            <button key={label} type="button" onClick={() => { setSplit(id); setSide('B'); }} aria-pressed={split === id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${split === id ? 'bg-white border border-gray-200 text-[#0E2D41]' : 'text-gray-600'}`}>
              {Icon && <Icon size={14} />}{label}
            </button>
          ))}
        </div>
      </div>
      {split && <p className="px-4 pb-2.5 text-[11px] text-gray-600">Comparing two dates: <span className="font-semibold">Before</span> {long(dateA)} and <span className="font-semibold">After</span> {long(date)}. The timeline moves the one marked "timeline"; click a date card to switch. Both maps pan and zoom together.</p>}
    </div>
  );
}
