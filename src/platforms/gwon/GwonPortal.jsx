/**
 * GreenWall Observatory Nigeria (GWON): the Great Green Wall platform proposed to NAGGW, hosted on the FarmIntelytics
 * hub as a managed platform (its own name, menu and pages), at /platforms/gwon. Built on the FarmIntelytics monitoring
 * design: the three header tabs of every service (Monitor, Reports, Assistant), the pages down the side, the map on
 * the screen with its Layers panel, headline figures and the timeline strip (MapView.jsx).
 *
 * Real data only (owner's rule): frontline-state boundaries (geoBoundaries, CC BY 4.0) with areas worked out from them;
 * NASA GIBS layers with NASA's own legends; ERA5 climate (Open-Meteo archive) at one point inside each state; programme
 * figures only with their published source. The project registry fills from the Agency's own GeoJSON files (kept in
 * this browser in the prototype; stored per organisation and checked by the pipeline in the platform).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SlidersHorizontal,
  Activity, FileBarChart, MessageSquareText, Map as MapIcon, Layers, ClipboardList, Sprout, AlertTriangle, Compass, CloudRain,
  UploadCloud, Trash2, Printer, ListChecks, Sun, Moon, Droplets, Trees, FileText, MapPin,
} from 'lucide-react';
import InfoTip from '../../components/page/InfoTip';
import { useConfirm } from '../../components/ConfirmProvider';
import MapView from './MapView';
import { ndviDate } from './layers';
import { fetchClimate, monthly, rainToDate } from './climate';
import { RainBars, MonthLines, StateBars } from './Charts';
import { SeasonCurve, YearBars, MonthVsMean } from './AnalysisCharts';
import { LandDonut, LandBars } from './LandCharts';
import Indicator from './Indicators';
import { averageSeries, averageDaily, sumLand } from './scope';
import Assistant from './Assistant';
import './gwon-theme.css';

const TABS = [
  { id: 'monitor', label: 'Monitor', icon: Activity },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'assistant', label: 'Assistant', icon: MessageSquareText },
];
const PAGES = {
  monitor: [
    { id: 'overview', label: 'Overview', icon: Activity, group: 'Dashboard' },
    { id: 'map', label: 'Map', icon: MapIcon, group: 'Maps' },
    { id: 'atlas', label: 'Baseline atlas', icon: Layers, group: 'Maps' },
    { id: 'registry', label: 'Project registry', icon: ClipboardList, group: 'Maps' },
    { id: 'monitoring', label: 'Restoration monitoring', icon: Sprout, group: 'Maps' },
    { id: 'warning', label: 'Early warning', icon: AlertTriangle, group: 'Maps' },
    { id: 'planning', label: 'Planning', icon: Compass, group: 'Maps' },
    { id: 'drought', label: 'Drought', icon: Sun, group: 'Analysis' },
    { id: 'water', label: 'Water stress', icon: Droplets, group: 'Analysis' },
    { id: 'landuse', label: 'Land use change', icon: Trees, group: 'Analysis' },
    { id: 'climate', label: 'Climate and rain', icon: CloudRain, group: 'Analysis' },
  ],
  reports: [
    { id: 'report', label: 'Report', icon: Printer },
    { id: 'results', label: 'Results Framework', icon: ListChecks },
  ],
};

// Area of a GeoJSON polygon in hectares (spherical excess; well under 1% off at site and estate size).
function ringArea(ring) {
  const R = 6378137, rad = Math.PI / 180;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
    a += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
  }
  return Math.abs(a * R * R / 2);
}
const geomHa = (g) => {
  if (!g) return 0;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.reduce((s, p) => s + ringArea(p[0]) - p.slice(1).reduce((h, r) => h + ringArea(r), 0), 0) / 1e4;
};
const fmt = (n) => Math.round(n).toLocaleString('en-GB');
const lastYear = (s) => `${Number(s.slice(0, 4)) - 1}${s.slice(4)}`;

const REPORT_KINDS = [
  { id: 'summary', label: 'Summary', icon: FileText, desc: 'Area, sites, rain this year and the month charts.' },
  { id: 'drought', label: 'Drought', icon: CloudRain, desc: 'The season against normal, rain and dry spells each year.' },
  { id: 'water', label: 'Water stress', icon: Droplets, desc: 'Rain minus evaporation, soil moisture, aridity and heat.' },
  { id: 'land', label: 'Land cover change', icon: Trees, desc: 'Share of each land type and the change between years.' },
  { id: 'sites', label: 'Restoration sites', icon: MapPin, desc: 'Every registered site with its state and hectares.' },
];

const SITES_KEY = 'gwon_prototype_sites';
const readSites = () => { try { return JSON.parse(localStorage.getItem(SITES_KEY) || 'null') || { type: 'FeatureCollection', features: [] }; } catch { return { type: 'FeatureCollection', features: [] }; } };

function Title({ title, tip, text, children }) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-gray-900 flex items-center gap-2">{title} {tip && <InfoTip text={tip} side="bottom" />}</h1>
        {text && <p className="text-sm text-gray-600 mt-1 max-w-3xl">{text}</p>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, sub, tip, tone }) {
  const tones = { teal: 'bg-[#E8F5EE] border-[#A9D9BF]', amber: 'bg-[#FFF8EB] border-[#F6D9A0]', green: 'bg-[#F1F8EC] border-[#CFE6BF]', sky: 'bg-[#EEF6FD] border-[#BFDDF6]' };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || 'bg-white border-gray-200'}`}>
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">{label} {tip && <InfoTip text={tip} side="bottom" />}</p>
      <p className="font-display text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function GwonPortal() {
  const confirm = useConfirm();
  const initial = (window.location.hash.slice(1) || 'monitor/overview').split('/');
  const [tab, setTab] = useState(TABS.some((t) => t.id === initial[0]) ? initial[0] : 'monitor');
  const [page, setPage] = useState(initial[1] || (initial[0] === 'reports' ? 'report' : 'overview'));
  const [states, setStates] = useState(null);
  const [sites, setSites] = useState(readSites);
  const [climate, setClimate] = useState(null);
  const [climateErr, setClimateErr] = useState('');
  // One state filter for every page: 'all' (the eleven frontline states) or one state.
  const [scope, setScope] = useState(() => { try { return localStorage.getItem('gwon_scope') || 'all'; } catch { return 'all'; } });
  const all = scope === 'all';
  // Light or dark, kept between visits.
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('gwon_theme') === 'dark'; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem('gwon_theme', dark ? 'dark' : 'light'); } catch { /* storage unavailable */ } }, [dark]);
  // Years shown on the yearly charts (dashboard filter). null = from the first / to the last year there is.
  const [reportKind, setReportKind] = useState('summary');
  const [yFrom, setYFrom] = useState(null);
  const [yTo, setYTo] = useState(null);
  const inYears = (y) => (yFrom == null || y >= yFrom) && (yTo == null || y <= yTo);
  const aState = all ? 'the frontline' : scope;
  const [period, setPeriod] = useState(() => ndviDate(new Date()));
  // LGA and ward filters inside the chosen state (OCHA COD-AB LGAs, GRID3 operational wards), loaded per state.
  const [lga, setLga] = useState('');
  const [ward, setWard] = useState('');
  const [adminIndex, setAdminIndex] = useState(null);
  const [lgaShapes, setLgaShapes] = useState(null);
  const [wardShapes, setWardShapes] = useState(null);
  const [allStates, setAllStates] = useState(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);
  const [series, setSeries] = useState(null);       // drought and water-stress series (scripts/gwon_climate_series.py)
  const [land, setLand] = useState(null);           // land types each year (scripts/gwon_landcover_series.py)

  useEffect(() => {
    document.title = 'GreenWall Observatory Nigeria (GWON)';
    const icon = document.querySelector("link[rel~='icon']");
    const before = icon?.getAttribute('href');
    if (icon) icon.setAttribute('href', '/gwon-data/naggw-seal.png');
    fetch('/gwon-data/frontline_states.geojson').then((r) => r.json()).then(setStates).catch(() => setStates(null));
    fetch('/gwon-data/climate_series.json').then((r) => r.json()).then(setSeries).catch(() => setSeries(null));
    fetch('/gwon-data/landuse_series.json').then((r) => r.json()).then(setLand).catch(() => setLand(null));
    fetch('/gwon-data/admin/index.json').then((r) => r.json()).then(setAdminIndex).catch(() => setAdminIndex(null));
    fetch('/gwon-data/nigeria_states.geojson').then((r) => r.json()).then(setAllStates).catch(() => setAllStates(null));
    return () => { if (icon && before) icon.setAttribute('href', before); };
  }, []);
  useEffect(() => { if (states) fetchClimate(states).then(setClimate).catch((e) => setClimateErr(e.message)); }, [states]);
  useEffect(() => { window.history.replaceState(null, '', `#${tab}${tab === 'assistant' ? '' : `/${page}`}`); }, [tab, page]);
  useEffect(() => { try { localStorage.setItem(SITES_KEY, JSON.stringify(sites)); } catch { /* storage unavailable */ } }, [sites]);
  useEffect(() => { try { localStorage.setItem('gwon_scope', scope); } catch { /* storage unavailable */ } }, [scope]);
  const adminFile = scope !== 'all' ? adminIndex?.[scope]?.file : null;
  useEffect(() => {
    if (!adminFile) return undefined;
    let live = true;
    fetch(`/gwon-data/admin/lgas_${adminFile}.geojson`).then((r) => r.json()).then((g) => { if (live) setLgaShapes({ file: adminFile, g }); }).catch(() => {});
    fetch(`/gwon-data/admin/wards_${adminFile}.geojson`).then((r) => r.json()).then((g) => { if (live) setWardShapes({ file: adminFile, g }); }).catch(() => {});
    return () => { live = false; };
  }, [adminFile]);

  const open = (t) => { setTab(t); if (PAGES[t] && !PAGES[t].some((p) => p.id === page)) setPage(PAGES[t][0].id); };
  const totalHa = useMemo(() => (states?.features || []).reduce((s, f) => s + (f.properties.area_ha || 0), 0), [states]);
  const siteRows = useMemo(() => (sites.features || []).map((f, i) => ({ i, name: f.properties?.name || f.properties?.ref || `Site ${i + 1}`,
    programme: f.properties?.programme || f.properties?.partner || '', state: f.properties?.state || '', ha: geomHa(f.geometry) })), [sites]);
  const siteHa = siteRows.reduce((s, r) => s + r.ha, 0);
  const rainRows = useMemo(() => (states?.features || []).map((f) => ({ state: f.properties.state, ...(rainToDate(climate?.[f.properties.state]) || {}) })), [states, climate]);
  const climateYear = rainRows.find((r) => r.year)?.year || new Date().getUTCFullYear();
  const driest = [...rainRows].filter((r) => r.change != null).sort((a, b) => a.change - b.change)[0];
  const facts = useMemo(() => ({
    frontline_states: (states?.features || []).map((f) => ({ state: f.properties.state, area_ha: f.properties.area_ha })),
    frontline_area_ha: totalHa,
    climate_source: 'ERA5 reanalysis (Open-Meteo archive) at one point inside each state',
    rain_to_date: rainRows.filter((r) => r.year).map((r) => ({ state: r.state, year: r.year, until: r.until, rain_mm: Math.round(r.now),
      same_days_last_year_mm: Math.round(r.before), change_percent: r.change == null ? null : Math.round(r.change) })),
    registry: { sites: siteRows.length, hectares: Math.round(siteHa), sites_by_state: siteRows.reduce((m, r) => ({ ...m, [r.state || 'not given']: (m[r.state || 'not given'] || 0) + 1 }), {}) },
    vegetation_picture_on_map: period,
    published: { acresal_land_under_restoration_ha: 922700, acresal_source: 'Federal Ministry of Environment, ACReSAL update, April 2026' },
  }), [states, totalHa, rainRows, siteRows, siteHa, period]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const g = JSON.parse(reader.result);
        const feats = (g.type === 'FeatureCollection' ? g.features : g.type === 'Feature' ? [g] : []).filter((f) => ['Polygon', 'MultiPolygon'].includes(f?.geometry?.type));
        if (!feats.length) { setMsg('No site boundaries (polygons) found in that file.'); return; }
        setSites((s) => ({ type: 'FeatureCollection', features: [...s.features, ...feats] }));
        setMsg(`${feats.length} site${feats.length > 1 ? 's' : ''} added from ${file.name}.`);
      } catch { setMsg('That file is not GeoJSON.'); }
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsText(file);
  };
  const removeSite = async (i) => {
    if (!(await confirm(`Remove ${siteRows[i].name} from the registry?`, { action: 'Remove' }))) return;
    setSites((s) => ({ ...s, features: s.features.filter((_, k) => k !== i) }));
  };

  const areaStat = { label: 'Frontline area', value: totalHa ? `${(totalHa / 1e6).toFixed(2)} m ha` : '—', sub: '11 states', tip: 'Worked out from the geoBoundaries state boundaries on an equal-area projection.' };
  const siteStat = { label: 'Registered sites', value: fmt(siteRows.length), sub: siteRows.length ? `${fmt(siteHa)} ha` : 'Load them in the registry', tip: 'Restoration sites in the Project registry, with their area from their boundaries.' };
  const rainStat = driest ? { label: 'Driest against last year', value: `${driest.state} ${Math.round(driest.change)}%`, sub: `Rain to ${driest.until}`, tip: 'Rain so far this year against the same days last year, ERA5 at one point inside each state.' } : null;
  // Season so far against a normal season (the 2015-2024 mean to the same day), every state.
  const vsNormal = useMemo(() => Object.entries(series?.states || {}).map(([state, s]) => {
    const k = s.cumulative.now.length - 1;
    const mean = s.cumulative.mean[Math.min(k, 364)];
    return { state, now: s.cumulative.now[k], mean, pct: mean ? ((s.cumulative.now[k] - mean) / mean) * 100 : null };
  }), [series]);
  const allYears = useMemo(() => [...new Set([...(land?.years || []), ...((Object.values(series?.states || {})[0]?.annual || []).map((r) => r.year))])].sort((a, b) => a - b), [land, series]);
  const filtered = !all || yFrom != null || yTo != null || period !== ndviDate(new Date());
  const resetFilters = () => { setScope('all'); setLga(''); setWard(''); setYFrom(null); setYTo(null); setPeriod(ndviDate(new Date())); };
  const sa = useMemo(() => (!series ? null : all ? averageSeries(series.states) : series.states[scope]), [series, all, scope]);
  const annualF = useMemo(() => (sa ? sa.annual.filter((r) => inYears(r.year)) : []), [sa, yFrom, yTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const landOf = useMemo(() => (!land ? null : all ? sumLand(land) : land.states[scope]), [land, all, scope]);
  const dailyOf = useMemo(() => (!climate ? null : all ? averageDaily(climate) : climate[scope]), [climate, all, scope]);
  const stateFeature = useMemo(() => (all ? null : (states?.features || []).find((f) => f.properties.state === scope) || null), [all, scope, states]);
  const lgaList = useMemo(() => (lgaShapes && lgaShapes.file === adminFile ? lgaShapes.g : null), [lgaShapes, adminFile]);
  const wardList = useMemo(() => (wardShapes && wardShapes.file === adminFile ? wardShapes.g : null), [wardShapes, adminFile]);
  const lgaFeature = useMemo(() => (lga && lgaList ? lgaList.features.find((f) => f.properties.name === lga) || null : null), [lga, lgaList]);
  const wardsOfLga = useMemo(() => (lga && wardList ? { type: 'FeatureCollection', features: wardList.features.filter((f) => f.properties.lga === lga) } : null), [lga, wardList]);
  const wardFeature = useMemo(() => (ward && wardsOfLga ? wardsOfLga.features.find((f) => f.properties.name === ward) || null : null), [ward, wardsOfLga]);
  // The map's focus: the ward, else the LGA, else the state; the inner lines: the wards of the LGA, or the LGAs of the state.
  const scopeFeature = wardFeature || lgaFeature || stateFeature;
  const mapOutlines = lga ? wardsOfLga : lgaList;
  const placeName = ward ? `${ward} ward, ${lga}` : lga ? `${lga} LGA, ${scope}` : null;
  const scopeHa = all ? totalHa : (scopeFeature?.properties.area_ha || 0);
  const scopeSites = siteRows.filter((r) => all || r.state === scope);
  const zColor = (r) => (r.z == null ? '#A3AEB8' : r.z <= -0.5 ? '#D97706' : r.z >= 0.5 ? '#007248' : '#94A3B8');
  const stateSelect = null;   // the header's state filter replaces the per-page pickers
  const card = (title, tip, body) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
      <p className="text-sm font-semibold flex items-center gap-1.5">{title} <InfoTip text={tip} /></p>
      {body}
    </div>
  );
  const srcNote = series ? `${series.source}. Baseline ${series.baseline}; data to ${Object.values(series.states)[0].until}.` : '';
  const rainBars = (rows) => [...rows].filter((r) => r.change != null).sort((a, b) => a.change - b.change).map((r) => ({ label: r.state, value: r.change, color: r.change < 0 ? '#D97706' : '#007248' }));

  return (
    <div className={`min-h-screen bg-[#F7F9F8] text-gray-900 overflow-x-clip ${dark ? 'gwon-dark' : ''}`}>
      <style>{'@media print { .gwon-noprint { display: none !important; } .gwon-print-full { grid-column: 1 / -1 !important; } }'}</style>
      {/* Header: as every FarmIntelytics service, with the three header tabs */}
      <header className="gwon-noprint bg-white border-b border-gray-200 sticky top-0 z-[1200]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 min-h-[68px] py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/gwon-data/naggw-seal.png" alt="National Agency for the Great Green Wall" className="w-11 h-11 shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold leading-tight truncate">GreenWall Observatory Nigeria</p>
              <p className="text-xs text-gray-500 truncate">National Agency for the Great Green Wall · Powered by <span className="font-semibold text-gray-700">Earthintelytics</span></p>
            </div>
          </div>
          <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl" aria-label="GWON">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => open(id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${tab === id ? 'bg-white text-[#0E2D41] border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => setDark((d) => !d)} aria-pressed={dark} aria-label={dark ? 'Light mode' : 'Dark mode'} title={dark ? 'Light mode' : 'Dark mode'}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          <span className="text-xs text-gray-600 flex items-center gap-1.5">Public data only <InfoTip side="bottom" text="Only real public data: state boundaries, NASA satellite layers with NASA's legends, ERA5 climate and published programme figures with their source. The Agency's own sites appear once its files are loaded." /></span>
        </div>
        {/* Dashboard filters: one row, every page follows them */}
        {tab !== 'assistant' && (
          <div className="border-t border-gray-100 bg-white">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-end gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2.5"><SlidersHorizontal size={14} /> Filters</span>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-600">State</span>
                <select value={scope} onChange={(e) => { setScope(e.target.value); setLga(''); setWard(''); }} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-[#007248] min-w-[200px]">
                  <option value="all">All frontline states (11)</option>
                  {(states?.features || []).map((f) => f.properties.state).sort().map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">LGA <InfoTip side="bottom" text="Local government areas of the chosen state (OCHA common boundaries). Maps zoom to the LGA and show its wards; the climate and land charts stay the state's, measured for the state." /></span>
                <select value={lga} disabled={all || !lgaList} onChange={(e) => { setLga(e.target.value); setWard(''); }} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-[#007248] min-w-[170px] disabled:opacity-50">
                  <option value="">{all ? 'Choose a state first' : 'All LGAs'}</option>
                  {(lgaList?.features || []).map((f) => f.properties.name).sort().map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">Ward <InfoTip side="bottom" text="Wards of the chosen LGA (GRID3 Nigeria operational wards). Maps zoom to the ward." /></span>
                <select value={ward} disabled={!lga || !wardsOfLga?.features.length} onChange={(e) => setWard(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-[#007248] min-w-[160px] disabled:opacity-50">
                  <option value="">{!lga ? 'Choose an LGA first' : wardsOfLga?.features.length ? 'All wards' : 'No ward boundaries yet'}</option>
                  {(wardsOfLga?.features || []).map((f) => f.properties.name).sort().map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">Map date <InfoTip side="bottom" text="The day the maps show. The vegetation maps use the 16-day picture that day falls in; daily layers show that day. Since 2015." /></span>
                <input type="date" value={period} min="2015-01-01" max={new Date().toISOString().slice(0, 10)} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-[#007248]" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">From year <InfoTip side="bottom" text="The years on the yearly charts and the land-use comparison. Climate runs from 2015; ESA land cover from 2000 to 2020. Maps keep their own timeline." /></span>
                <select value={yFrom ?? ''} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setYFrom(v); if (v != null && yTo != null && yTo < v) setYTo(v); }} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-[#007248]">
                  <option value="">First year</option>
                  {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-gray-600">To year</span>
                <select value={yTo ?? ''} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setYTo(v); if (v != null && yFrom != null && yFrom > v) setYFrom(v); }} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none hover:border-gray-300 focus:border-[#007248]">
                  <option value="">Latest year</option>
                  {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <button type="button" onClick={resetFilters} disabled={!filtered} className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white">Reset</button>
              <p className="text-xs text-gray-600 pb-2.5 ml-auto">Showing <span className="font-semibold text-gray-900">{placeName || (all ? 'all eleven frontline states' : `${scope} State`)}</span>, <span className="font-semibold text-gray-900">{yFrom ?? 'first year'} to {yTo ?? 'latest'}</span></p>
            </div>
          </div>
        )}
      </header>

      <div className={`max-w-[1600px] mx-auto px-4 sm:px-6 py-5 grid gap-5 ${tab === 'assistant' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[224px_1fr]'}`}>
        {tab !== 'assistant' && (
          <nav className="gwon-noprint lg:sticky lg:top-[88px] self-start rounded-2xl border border-gray-200 bg-white p-2" aria-label="Pages">
            {PAGES[tab].map(({ id, label, icon: Icon, group }, i) => (
              <div key={id}>
              {group && group !== PAGES[tab][i - 1]?.group && <p className={`px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${i ? 'pt-3' : 'pt-1'}`}>{group}</p>}
              <button type="button" onClick={() => setPage(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left ${page === id ? 'bg-[#007248] text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Icon size={16} /> {label}
              </button>
              </div>
            ))}
          </nav>
        )}

        <main className="space-y-5 min-w-0 gwon-print-full">
          {tab === 'monitor' && page === 'overview' && (
            <>
              <Title title={all ? "The Great Green Wall in Nigeria" : `${scope} State`} text={all ? "The eleven frontline states: the land, how green it is now, the rain this season, and every site the Agency registers." : `One of the eleven frontline states: its land, its vegetation now, this season\u2019s rain and its registered sites.`} />
              <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
                {(() => {
                  const k = sa ? sa.cumulative.now.length - 1 : 0;
                  const pct = sa ? ((sa.cumulative.now[k] - sa.cumulative.mean[k]) / (sa.cumulative.mean[k] || 1)) * 100 : null;
                  const yrs = annualF;
                  const cur = yrs[yrs.length - 1];
                  const meanHot = yrs.filter((r) => r.full && r.year <= 2024).reduce((s, r, _, arr) => s + r.hot_days / arr.length, 0);
                  const ly = land ? land.years.filter((y) => landOf?.[y] && inYears(y)) : [];
                  const share = (y, key) => { const o = landOf?.[y]; const tot = o ? land.types.reduce((s, x) => s + (o[x] || 0), 0) : 0; return tot ? (o[key] / tot) * 100 : null; };
                  const treeNow = ly.length ? share(ly[ly.length - 1], 'Tree cover') : null, treeFirst = ly.length ? share(ly[0], 'Tree cover') : null;
                  const bare = (y) => (share(y, 'Bare land') ?? 0) + (share(y, 'Sparse vegetation') ?? 0);
                  return (
                    <>
                      <Indicator tone="teal" label={all ? 'Area of the frontline' : `Area of ${scope}`} value={scopeHa ? `${(scopeHa / 1e6).toFixed(2)} m ha` : '\u2014'}
                        sub={all ? '11 states' : `${((scopeHa / (totalHa || 1)) * 100).toFixed(1)}% of the frontline`} tip="From the geoBoundaries state boundaries, on an equal-area projection." />
                      <Indicator tone="sky" label={`Rain so far in ${sa?.year || ''}`} value={sa ? `${fmt(sa.cumulative.now[k])} mm` : '\u2014'}
                        delta={pct == null ? null : { text: `${pct > 0 ? '+' : ''}${Math.round(pct)}% against a normal season by now`, good: pct >= 0 }}
                        trend={yrs.map((r) => r.rain)} trendLabel="rain each year since 2015" tip={`ERA5 at one point inside ${all ? 'each state (frontline average)' : 'the state'}; normal: the 2015-2024 mean to the same day.`} />
                      <Indicator tone="amber" label="Hot days this year" value={cur ? `${cur.hot_days} days` : '\u2014'}
                        delta={cur ? { text: `${Math.round(meanHot)} in a normal year`, good: cur.hot_days <= meanHot } : null}
                        trend={yrs.map((r) => r.hot_days)} trendLabel="each year" tip="Days with a highest temperature of 40 °C or more." />
                      <Indicator tone="rose" label="Longest dry spell, rainy season" value={cur?.dry_spell != null ? `${Math.round(cur.dry_spell)} days` : '\u2014'}
                        trend={yrs.map((r) => r.dry_spell)} trendLabel="each year" tip="The longest run of days under 1 mm of rain between May and September." />
                      <Indicator tone="green" label={`Tree cover, ${ly[ly.length - 1] || ''}`} value={treeNow == null ? '\u2014' : `${treeNow.toFixed(1)}%`}
                        delta={treeNow == null ? null : { text: `${treeNow - treeFirst >= 0 ? '+' : ''}${(treeNow - treeFirst).toFixed(1)} points since ${ly[0]}`, good: treeNow >= treeFirst }}
                        trend={ly.map((y) => share(y, 'Tree cover'))} trendLabel="ESA land cover" tip="Share of the land under tree cover, ESA CCI land cover (300 m)." />
                      <Indicator tone="white" label="Bare and sparse land" value={ly.length ? `${bare(ly[ly.length - 1]).toFixed(1)}%` : '\u2014'}
                        delta={ly.length ? { text: `${bare(ly[ly.length - 1]) - bare(ly[0]) >= 0 ? '+' : ''}${(bare(ly[ly.length - 1]) - bare(ly[0])).toFixed(1)} points since ${ly[0]}`, good: bare(ly[ly.length - 1]) <= bare(ly[0]) } : null}
                        trend={ly.map((y) => bare(y))} trendLabel="ESA land cover" tip="Share that is bare land or sparse vegetation: the land the Great Green Wall works to restore." />
                    </>
                  );
                })()}
              </div>
              {sa && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {card('Every state: the season against normal', 'Rain so far this year against the 2015-2024 mean to the same day. Below zero: behind a normal season (Analysis, Drought).',
                    <StateBars unit="%" rows={[...vsNormal].filter((r) => r.pct != null).sort((a, b) => a.pct - b.pct).map((r) => ({ label: r.state, value: r.pct, color: r.pct < 0 ? '#D97706' : '#007248' }))} />)}
                  {card(`The season so far, ${aState}`, 'Rain adding up from 1 January against the 2015-2024 range. Choose the state in Analysis, Drought.', <SeasonCurve cum={sa.cumulative} year={sa.year} />)}
                  {card(`Rain minus evaporation, ${aState}`, 'Below zero: the air takes more water than the rain gives (Analysis, Water stress).', <MonthVsMean rows={sa.monthly} value="balance" unit="mm" year={sa.year} />)}
                  {card(`Hot days each year, ${aState}`, 'Days of 40 °C or more, 2015 to this year (Analysis, Water stress).', <YearBars rows={annualF} value="hot_days" unit="days" colorOf={() => '#D97706'} />)}
                </div>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5">The states by size <InfoTip text="Each state's area, from its boundary." /></p>
                  <StateBars unit="ha" rows={[...(states?.features || [])].sort((a, b) => b.properties.area_ha - a.properties.area_ha).map((f) => ({ label: f.properties.state, value: f.properties.area_ha }))} />
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5">Rain so far in {climateYear} against last year <InfoTip text="ERA5 at one point inside each state: rain from 1 January to the latest day, against the same days last year." /></p>
                  {climate ? <StateBars unit="%" rows={rainBars(rainRows)} /> : <p className="text-sm text-gray-500">{climateErr || 'Loading the climate…'}</p>}
                </div>
              </div>
            </>
          )}

          {tab === 'monitor' && page === 'map' && (
            <>
              <Title title={all ? 'Map of the frontline' : `Map of ${scope}`} tip="The vegetation now over the frontline states, with every registered site. Switch other layers on in the Layers panel; step through the year on the strip under the map." text="How green the land is now, and where the registered sites are." />
              <MapView dark={dark} focus={scopeFeature} allStates={allStates} outlines={mapOutlines} initial={['ndvi']} states={states} sites={sites} date={period} onDate={setPeriod} title="Vegetation now" stats={[siteStat]} />
            </>
          )}

          {tab === 'monitor' && page === 'atlas' && (
            <>
              <Title title="Baseline atlas" tip="The same layers for every state, so progress is measured against a fixed baseline. In the platform, 10 m Sentinel-2 and 30 m Landsat layers come from the pipeline." text="Switch layers on in the Layers panel; step through the year on the strip under the map." />
              <MapView dark={dark} focus={scopeFeature} allStates={allStates} outlines={mapOutlines} initial={['ndvi']} states={states} sites={sites} date={period} onDate={setPeriod} stats={[areaStat, siteStat]} />
            </>
          )}

          {tab === 'monitor' && page === 'registry' && (
            <>
              <Title title="Project registry" tip="Every site in one place: shelterbelts, woodlots, orchards, water points. Load a GeoJSON of site boundaries; name, programme, partner and state are shown when present."
                text={siteRows.length ? `${fmt(siteRows.length)} sites, ${fmt(siteHa)} ha in all.` : 'No sites yet: load the Agency’s site boundaries.'}>
                <div>
                  <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" className="hidden" onChange={onFile} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#007248] text-white text-sm font-semibold hover:bg-[#0B5F58]"><UploadCloud size={16} /> Load site boundaries</button>
                </div>
              </Title>
              {msg && <p className="text-sm rounded-xl border border-[#A9D9BF] bg-[#E8F5EE] text-[#0E2D41] px-4 py-3">{msg}</p>}
              <MapView dark={dark} focus={scopeFeature} allStates={allStates} outlines={mapOutlines} initial={['truecolor']} states={states} sites={sites} height="520px" title="Sites on the map" stats={[siteStat]} />
              {siteRows.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#007248] text-white text-left"><tr><th className="px-4 py-2.5">Site</th><th className="px-4 py-2.5">Programme</th><th className="px-4 py-2.5">State</th><th className="px-4 py-2.5 text-right">Area (ha)</th><th className="px-4 py-2.5" /></tr></thead>
                    <tbody>
                      {siteRows.map((r) => (
                        <tr key={r.i} className="border-t border-gray-100">
                          <td className="px-4 py-2 font-medium">{r.name}</td><td className="px-4 py-2">{r.programme || '—'}</td><td className="px-4 py-2">{r.state || '—'}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{r.ha.toLocaleString('en-GB', { maximumFractionDigits: 1 })}</td>
                          <td className="px-4 py-2 text-right"><button type="button" onClick={() => removeSite(r.i)} className="text-red-700 hover:underline inline-flex items-center gap-1"><Trash2 size={14} /> Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-gray-500">In the prototype the sites stay in this browser. In the platform they are stored for the Agency, shared with its state offices and checked by the pipeline every season.</p>
            </>
          )}

          {tab === 'monitor' && page === 'monitoring' && (
            <>
              <Title title="Restoration monitoring" tip="Each registered site compared with itself: the same 16-day picture this year and a year before. In the platform each site gets a seasonal reading (growing, holding or lost) and a flag when it needs a visit."
                text="The same picture a year apart. Move the timeline under the right-hand map; the left follows a year earlier." />
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                <MapView dark={dark} focus={scopeFeature} allStates={allStates} outlines={mapOutlines} initial={['ndvi']} states={states} sites={sites} date={lastYear(period)} onDate={() => {}} height="480px" title={`A year before: ${lastYear(period)}`} compact />
                <MapView dark={dark} focus={scopeFeature} allStates={allStates} outlines={mapOutlines} initial={['ndvi']} states={states} sites={sites} date={period} onDate={setPeriod} height="480px" title={`Now: ${period}`} compact />
              </div>
            </>
          )}

          {tab === 'monitor' && page === 'warning' && (
            <>
              <Title title="Early warning" tip="Signs that planted sites are at risk: dry soil where roots reach and rain that has not come. In the platform an alert goes to the state office when a site's vegetation falls well below the same season last year."
                text="Soil moisture and rainfall over the frontline, day by day." />
              <MapView dark={dark} focus={scopeFeature} allStates={allStates} outlines={mapOutlines} initial={['soil']} states={states} sites={sites} stats={rainStat ? [rainStat] : []} title="Soil and rain" />
            </>
          )}

          {tab === 'monitor' && page === 'planning' && (
            <>
              <Title title="Planning" tip="Where restoration helps most and will succeed: land cover shows what is there now, population shows who it serves. In the platform, species suitability and degradation layers come from the pipeline."
                text="Land cover and where people live: switch between them, or lay one over the other with the opacity slider." />
              <MapView dark={dark} focus={scopeFeature} allStates={allStates} outlines={mapOutlines} initial={['landcover']} states={states} sites={sites} stats={[areaStat]} title="Planning layers" />
            </>
          )}

          {tab === 'monitor' && page === 'drought' && (
            <>
              <Title title="Drought" tip="How this season's rain compares with a normal season (the 2015-2024 mean), and how long the dry spells were. ERA5 at one point inside each state, so read it as that point's rain, not the whole state's." text="This year against ten years, for each frontline state.">{stateSelect}</Title>
              {!sa ? <p className="text-sm text-gray-500">Loading the series…</p> : (
                <>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <Kpi tone="teal" label={`Rain so far in ${sa.year}`} value={`${fmt(sa.cumulative.now[sa.cumulative.now.length - 1])} mm`} sub={`to ${sa.until}`} tip="Rain from 1 January to the latest day of data." />
                    <Kpi tone="amber" label="A normal season by now" value={`${fmt(sa.cumulative.mean[sa.cumulative.now.length - 1])} mm`} sub="2015–2024 mean, same day" tip="The mean of 2015-2024 to the same day of the year." />
                    <Kpi tone="green" label="A normal year" value={`${fmt(sa.baseline_rain_mean)} mm`} sub="2015–2024 mean" tip="The mean rain of a whole year, 2015-2024." />
                    <Kpi tone="sky" label="Longest dry spell this season" value={sa.annual[sa.annual.length - 1].dry_spell == null ? '—' : `${sa.annual[sa.annual.length - 1].dry_spell} days`} sub="May–September, under 1 mm a day" tip="The longest run of days with under 1 mm of rain between May and September." />
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {card(`The season so far, ${aState}`, 'Rain adding up from 1 January. The grey band is the driest to the wettest of 2015-2024; the dashed line their mean.', <SeasonCurve cum={sa.cumulative} year={sa.year} />)}
                    {card(`Rain each year, ${aState}`, 'Amber: a dry year (at least half a standard deviation below the 2015-2024 mean). Teal: a wet year. The last bar is this year so far.', <YearBars rows={annualF} value="rain" unit="mm" mean={sa.baseline_rain_mean} colorOf={zColor} />)}
                    {card('Every state: the season against normal', 'Rain so far this year against the 2015-2024 mean to the same day, in percent. Below zero: behind a normal season.', <StateBars unit="%" rows={[...vsNormal].filter((r) => r.pct != null).sort((a, b) => a.pct - b.pct).map((r) => ({ label: r.state, value: r.pct, color: r.pct < 0 ? '#D97706' : '#007248' }))} />)}
                    {card(`Longest dry spell each rainy season, ${aState}`, 'The longest run of days under 1 mm between May and September, each year. Long spells after planting kill seedlings.', <YearBars rows={annualF} value="dry_spell" unit="days" colorOf={(r) => (r.dry_spell >= 21 ? '#D97706' : '#007248')} />)}
                  </div>
                  <p className="text-xs text-gray-500">{srcNote}</p>
                </>
              )}
            </>
          )}

          {tab === 'monitor' && page === 'water' && (
            <>
              <Title title="Water stress" tip="Whether plants get the water the air takes from them: rain minus reference evaporation (FAO-56 ET0), the year's aridity (rain / ET0), hot days and topsoil moisture. ERA5 at one point inside each state." text="Where and when new plantings run short of water.">{stateSelect}</Title>
              {!sa ? <p className="text-sm text-gray-500">Loading the series…</p> : (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {card(`Rain minus evaporation each month, ${aState}`, 'Below zero: the air takes more water than the rain gives; plants live on what is in the soil. The dry months of the frontline are deeply negative.', <MonthVsMean rows={sa.monthly} value="balance" unit="mm" year={sa.year} />)}
                    {card(`Topsoil moisture each month, ${aState}`, 'Water in the top 7 cm of soil (m³ of water per m³ of soil), the month’s mean, against 2015-2024.', <MonthVsMean rows={sa.monthly} value="soil" unit="m³/m³" year={sa.year} digits={2} />)}
                    {card(`Aridity each year, ${aState}`, 'Rain divided by reference evaporation over the year. Under 0.2 is arid, 0.2 to 0.5 semi-arid (UNEP classes).', <YearBars rows={annualF} value="aridity" unit="" digits={2} colorOf={(r) => (r.aridity < 0.2 ? '#D97706' : '#007248')} />)}
                    {card(`Hot days each year, ${aState}`, 'Days with a highest temperature of 40 °C or more. Heat raises the water new trees need. The last bar is this year so far.', <YearBars rows={annualF} value="hot_days" unit="days" colorOf={() => '#D97706'} />)}
                  </div>
                  {card(`Hot days in ${sa.year} so far, every state`, 'Days of 40 °C or more this year.', <StateBars unit="days" rows={Object.entries(series.states).map(([s, v]) => ({ label: s, value: v.annual[v.annual.length - 1].hot_days, color: '#D97706' })).sort((a, b) => b.value - a.value)} />)}
                  <p className="text-xs text-gray-500">{srcNote}</p>
                </>
              )}
            </>
          )}

          {tab === 'monitor' && page === 'landuse' && (
            <>
              <Title title="Land use change" tip="Hectares of each land type every year, from ESA's Climate Change Initiative land cover (300 m, annual), the land-cover input of the Great Green Wall's first core indicator. Each pixel counts its true area." text="What covers the land in each frontline state, year by year since 2000.">{stateSelect}</Title>
              {!landOf ? <p className="text-sm text-gray-500">Loading the land-use series…</p> : (() => {
                const ys = land.years.filter((y) => landOf[y] && inYears(y));
                if (ys.length < 1) return <p className="text-sm text-gray-600">No land-cover year in the years chosen in the filter: ESA land cover runs {land.years[0]} to {land.years[land.years.length - 1]}.</p>;
                const first = ys[0], last = ys[ys.length - 1];
                const a0 = landOf[first], a1 = landOf[last];
                const tot = (o) => land.types.reduce((s, k) => s + (o?.[k] || 0), 0);
                const share = (o, k) => (tot(o) ? (o[k] / tot(o)) * 100 : 0);
                const diffRows = (k) => Object.entries(land.states).map(([s, v]) => {
                  const ya = ys.find((y) => v[y]), yb = [...ys].reverse().find((y) => v[y]);
                  return { label: s, value: (v[yb]?.[k] || 0) - (v[ya]?.[k] || 0) };
                }).sort((p, q) => q.value - p.value);
                return (
                  <>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                      <Kpi tone="amber" label={`Cropland, ${last}`} value={`${share(a1, 'Cropland').toFixed(1)}%`} sub={`${share(a0, 'Cropland').toFixed(1)}% in ${first}`} tip="Share of the state that is cropland (rainfed or irrigated)." />
                      <Kpi tone="green" label={`Tree cover, ${last}`} value={`${share(a1, 'Tree cover').toFixed(1)}%`} sub={`${share(a0, 'Tree cover').toFixed(1)}% in ${first}`} tip="Share of the state under tree cover (any forest or woodland class)." />
                      <Kpi tone="sky" label={`Shrub and grass, ${last}`} value={`${(share(a1, 'Shrubland') + share(a1, 'Grassland')).toFixed(1)}%`} sub={`${(share(a0, 'Shrubland') + share(a0, 'Grassland')).toFixed(1)}% in ${first}`} tip="Share under shrubland and grassland together." />
                      <Kpi tone="teal" label={`Bare and sparse, ${last}`} value={`${(share(a1, 'Bare land') + share(a1, 'Sparse vegetation')).toFixed(1)}%`} sub={`${(share(a0, 'Bare land') + share(a0, 'Sparse vegetation')).toFixed(1)}% in ${first}`} tip="Share that is bare land or sparse vegetation: the land the Great Green Wall works to restore." />
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {card(`Share of each land type, ${aState}`, 'Percent of the land under each type in the chosen year. Hover a slice or a row.', <LandDonut years={ys} byYear={landOf} types={land.types} colors={land.colors} />)}
                      {card(`${first} against ${last}, ${aState}`, 'Hectares of each land type in the first year (grey) and the last year, with the change. Amber: less than before.', <LandBars from={first} to={last} a={a0} b={a1} types={land.types} colors={land.colors} />)}
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                      {card(`Cropland change, ${first}–${last}`, 'Hectares of cropland gained or lost in each state.', <StateBars unit="ha" rows={diffRows('Cropland').map((r) => ({ ...r, color: r.value < 0 ? '#D97706' : '#007248' }))} />)}
                      {card(`Tree cover change, ${first}–${last}`, 'Hectares of tree cover gained or lost in each state.', <StateBars unit="ha" rows={diffRows('Tree cover').map((r) => ({ ...r, color: r.value < 0 ? '#D97706' : '#007248' }))} />)}
                      {card(`Bare land change, ${first}–${last}`, 'Hectares of bare land gained or lost in each state. Gained bare land is land lost to degradation.', <StateBars unit="ha" rows={diffRows('Bare land').map((r) => ({ ...r, color: r.value > 0 ? '#D97706' : '#007248' }))} />)}
                    </div>
                    <p className="text-xs text-gray-500">{land.source}. Boundaries: {land.boundaries}. In the platform, the 10 m Esri and Sentinel-2 land cover and the Agency's own baseline year are added.</p>
                  </>
                );
              })()}
            </>
          )}

          {tab === 'monitor' && page === 'climate' && (
            <>
              <Title title="Climate and rain" tip="ERA5 reanalysis (ECMWF), through the Open-Meteo archive, at one point inside each state: the climate of that point, not the state's average. In the platform, state averages come from CHIRPS and ERA5 grids."
                text="This year against last year, month by month.">
              </Title>
              {climateErr && <p className="text-sm text-amber-800">{climateErr}</p>}
              {!climate ? <p className="text-sm text-gray-500">Loading the climate figures…</p> : (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5">Rain each month, {aState} <InfoTip text="Total rain of each month in millimetres; the current month counts the days so far." /></p>
                      <RainBars year={climateYear} thisYear={monthly(dailyOf, climateYear)} lastYear={monthly(dailyOf, climateYear - 1)} />
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5">Daily highest temperature, {aState} <InfoTip text="The month's average of each day's highest temperature (°C). Heat raises the water new trees need." /></p>
                      <MonthLines year={climateYear} thisYear={monthly(dailyOf, climateYear)} lastYear={monthly(dailyOf, climateYear - 1)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-1.5">Rain so far in {climateYear} <InfoTip text="From 1 January to the latest day of data, every frontline state." /></p>
                      <StateBars unit="mm" rows={[...rainRows].filter((r) => r.year).sort((a, b) => b.now - a.now).map((r) => ({ label: r.state, value: r.now }))} />
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-1.5">Against the same days last year <InfoTip text="Below zero: drier than last year so far, so new plantings there need watching." /></p>
                      <StateBars unit="%" rows={rainBars(rainRows)} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'reports' && page === 'report' && (
            <>
              <Title title="Report" tip="Choose the kind of report, then the state and years in the filters above. Every figure comes from GWON's own data, with its source. Print it, or save it as PDF from the print window." text="Choose what the report is about; it follows the filters above.">
                <div className="flex flex-wrap gap-2 gwon-noprint">
                  <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007248] text-white text-sm font-semibold"><Printer size={15} /> Print or save as PDF</button>
                </div>
              </Title>
              <div className="gwon-noprint rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5">What kind of report? <InfoTip text="Each kind uses the charts of its page under Monitor, for the state and years in the filters." /></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                  {REPORT_KINDS.map((k) => (
                    <button key={k.id} type="button" onClick={() => setReportKind(k.id)} aria-pressed={reportKind === k.id}
                      className={`text-left rounded-xl border px-3 py-2.5 ${reportKind === k.id ? 'border-[#007248] bg-[#E8F5EE]' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className={`flex items-center gap-2 text-sm font-semibold ${reportKind === k.id ? 'text-[#0E2D41]' : 'text-gray-800'}`}><k.icon size={15} /> {k.label}</span>
                      <span className="block text-xs text-gray-600 mt-0.5">{k.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {(() => {
                const kindLabel = REPORT_KINDS.find((k) => k.id === reportKind)?.label || 'Report';
                const yearsText = `${yFrom ?? 'first year'} to ${yTo ?? 'latest'}`;
                const sel = all ? (states?.features || []) : (states?.features || []).filter((f) => f.properties.state === scope);
                const ha = sel.reduce((s, f) => s + f.properties.area_ha, 0);
                const rr = rainRows.filter((r) => r.year && (all || r.state === scope));
                const here = scopeSites;
                return (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
                    <div className="border-b-2 border-[#007248] pb-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-widest text-[#007248]">GREENWALL OBSERVATORY NIGERIA · {kindLabel.toUpperCase()}</p>
                        <p className="font-display text-2xl font-semibold">{all ? 'The eleven frontline states' : `${scope} State`}</p>
                        <p className="text-xs text-gray-500">Made {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} from the figures on GWON · years {yearsText} · Powered by Earthintelytics</p>
                      </div>
                      <img src="/gwon-data/naggw-seal.png" alt="National Agency for the Great Green Wall" className="w-14 h-14" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {[['Area', `${fmt(ha)} ha`], ['Registered sites', fmt(here.length)], ['Registered hectares', fmt(here.reduce((s, r) => s + r.ha, 0))],
                        ['Rain so far', rr.length === 1 ? `${fmt(rr[0].now)} mm` : rr.length ? `${fmt(rr.reduce((s, r) => s + r.now, 0) / rr.length)} mm a state` : '—']].map(([k, v]) => (
                        <div key={k} className="rounded-xl border border-gray-200 px-3 py-2"><p className="text-xs text-gray-500">{k}</p><p className="font-semibold tabular-nums">{v}</p></div>
                      ))}
                    </div>
                    {reportKind === 'drought' && sa && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div><p className="text-sm font-semibold mb-2">The season so far</p><SeasonCurve cum={sa.cumulative} year={sa.year} /></div>
                        <div><p className="text-sm font-semibold mb-2">Rain each year</p><YearBars rows={annualF} value="rain" unit="mm" mean={sa.baseline_rain_mean} colorOf={zColor} /></div>
                        <div><p className="text-sm font-semibold mb-2">Every state: the season against normal (%)</p><StateBars unit="%" rows={[...vsNormal].filter((r) => r.pct != null).sort((x, y) => x.pct - y.pct).map((r) => ({ label: r.state, value: r.pct, color: r.pct < 0 ? '#D97706' : '#007248' }))} /></div>
                        <div><p className="text-sm font-semibold mb-2">Longest dry spell each rainy season</p><YearBars rows={annualF} value="dry_spell" unit="days" colorOf={(r) => (r.dry_spell >= 21 ? '#D97706' : '#007248')} /></div>
                      </div>
                    )}
                    {reportKind === 'water' && sa && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div><p className="text-sm font-semibold mb-2">Rain minus evaporation each month</p><MonthVsMean rows={sa.monthly} value="balance" unit="mm" year={sa.year} /></div>
                        <div><p className="text-sm font-semibold mb-2">Topsoil moisture each month</p><MonthVsMean rows={sa.monthly} value="soil" unit="m³/m³" year={sa.year} digits={2} /></div>
                        <div><p className="text-sm font-semibold mb-2">Aridity each year</p><YearBars rows={annualF} value="aridity" unit="" digits={2} colorOf={(r) => (r.aridity < 0.2 ? '#D97706' : '#007248')} /></div>
                        <div><p className="text-sm font-semibold mb-2">Hot days each year</p><YearBars rows={annualF} value="hot_days" unit="days" colorOf={() => '#D97706'} /></div>
                      </div>
                    )}
                    {reportKind === 'land' && landOf && (() => {
                      const ys = land.years.filter((y) => landOf[y] && inYears(y));
                      if (!ys.length) return <p className="text-sm text-gray-600">No land-cover year in the years chosen: ESA land cover runs {land.years[0]} to {land.years[land.years.length - 1]}.</p>;
                      const f0 = ys[0], f1 = ys[ys.length - 1];
                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div><p className="text-sm font-semibold mb-2">Share of each land type</p><LandDonut years={ys} byYear={landOf} types={land.types} colors={land.colors} /></div>
                          <div><p className="text-sm font-semibold mb-2">{f0} against {f1}</p><LandBars from={f0} to={f1} a={landOf[f0]} b={landOf[f1]} types={land.types} colors={land.colors} /></div>
                        </div>
                      );
                    })()}
                    {reportKind === 'sites' && (here.length ? (
                      <table className="w-full text-sm">
                        <thead className="bg-[#007248] text-white text-left"><tr><th className="px-3 py-2">Site</th><th className="px-3 py-2">State</th><th className="px-3 py-2">Programme</th><th className="px-3 py-2 text-right">Hectares</th></tr></thead>
                        <tbody>{here.map((r) => <tr key={r.i} className="border-t border-gray-100"><td className="px-3 py-1.5">{r.name}</td><td className="px-3 py-1.5">{r.state || '—'}</td><td className="px-3 py-1.5">{r.programme || '—'}</td><td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.ha)}</td></tr>)}</tbody>
                      </table>
                    ) : <p className="text-sm text-gray-600">No registered sites{all ? '' : ` in ${scope}`} yet. Load them in Monitor, Project registry.</p>)}
                    {reportKind === 'summary' && dailyOf && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div><p className="text-sm font-semibold mb-2">Rain each month</p><RainBars year={climateYear} thisYear={monthly(dailyOf, climateYear)} lastYear={monthly(dailyOf, climateYear - 1)} /></div>
                        <div><p className="text-sm font-semibold mb-2">Daily highest temperature</p><MonthLines year={climateYear} thisYear={monthly(dailyOf, climateYear)} lastYear={monthly(dailyOf, climateYear - 1)} /></div>
                      </div>
                    )}
                    {['summary', 'drought'].includes(reportKind) && rr.length > 0 && (
                      <table className="w-full text-sm">
                        <thead className="bg-[#007248] text-white text-left"><tr><th className="px-3 py-2">State</th><th className="px-3 py-2 text-right">Rain {rr[0].year} so far (mm)</th><th className="px-3 py-2 text-right">Same days last year (mm)</th><th className="px-3 py-2 text-right">Change</th></tr></thead>
                        <tbody>{rr.map((r) => <tr key={r.state} className="border-t border-gray-100"><td className="px-3 py-1.5">{r.state}</td><td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.now)}</td><td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.before)}</td><td className={`px-3 py-1.5 text-right tabular-nums ${r.change < 0 ? 'text-amber-700' : 'text-[#007248]'}`}>{r.change == null ? '—' : `${r.change > 0 ? '+' : ''}${Math.round(r.change)}%`}</td></tr>)}</tbody>
                      </table>
                    )}
                    <p className="text-xs text-gray-500">Sources: state boundaries and areas, geoBoundaries (CC BY 4.0); rain and temperature, ERA5 through the Open-Meteo archive at one point inside each state{rr[0] ? `, to ${rr[0].until}` : ''}; sites, the GWON project registry; land cover, ESA CCI (300 m). Powered by Earthintelytics.</p>
                  </div>
                );
              })()}
            </>
          )}

          {tab === 'reports' && page === 'results' && (
            <>
              <Title title="Results Framework" tip="The Great Green Wall Accelerator Harmonized Results Framework has five core indicators reported each year to the UNCCD. GWON calculates the satellite-based ones the same way every year." text="What GWON measures for the yearly report." />
              <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#007248] text-white text-left"><tr><th className="px-4 py-2.5">Measure</th><th className="px-4 py-2.5">From</th><th className="px-4 py-2.5">Now</th></tr></thead>
                  <tbody>
                    {[
                      ['Land cover change (hectares), the first core indicator', 'Land cover of the baseline year and of each year', 'The 2024 land cover layer is on the map; the yearly comparison runs in the platform'],
                      ['Land under restoration (hectares)', 'Project registry boundaries', siteRows.length ? `${fmt(siteHa)} ha registered` : 'No sites registered yet'],
                      ['Vegetation trend of registered sites', 'The 16-day vegetation picture inside each site', 'Seasonal readings run in the platform'],
                      ['Jobs, income and households reached', 'Field records through the registry and the field app', 'Collected with the state offices'],
                    ].map(([a, b, c]) => <tr key={a} className="border-t border-gray-100"><td className="px-4 py-2.5 font-medium">{a}</td><td className="px-4 py-2.5 text-gray-700">{b}</td><td className="px-4 py-2.5 text-gray-700">{c}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">The other core indicators and the report layout are agreed with the Agency at the discovery workshop.</p>
            </>
          )}

          {tab === 'assistant' && (
            <div className="max-w-5xl mx-auto w-full space-y-4">
              <Title title="Assistant" tip="Ask in plain words. The Assistant reads the figures GWON shows now (states, areas, climate, registered sites) and answers from them only, saying where each figure comes from." text="Questions and advice about the frontline states, from GWON's own figures." />
              <Assistant facts={facts} module="assistant" />
            </div>
          )}

          <footer className="gwon-noprint pt-3 border-t border-gray-200 text-xs text-gray-500">
            Boundaries: geoBoundaries (CC BY 4.0). Imagery and legends: NASA GIBS (MODIS, SMAP, GPM IMERG, GPW; public domain). Climate: ERA5 (ECMWF) via the Open-Meteo archive. Programme figure: Federal Ministry of Environment, ACReSAL update, April 2026. Powered by Earthintelytics.
          </footer>
        </main>
      </div>
    </div>
  );
}
