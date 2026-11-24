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
  Activity, FileBarChart, MessageSquareText, Map as MapIcon, Layers, ClipboardList, Sprout, AlertTriangle, Compass, CloudRain,
  UploadCloud, Trash2, Printer, ListChecks,
} from 'lucide-react';
import InfoTip from '../../components/page/InfoTip';
import { useConfirm } from '../../components/ConfirmProvider';
import MapView from './MapView';
import { ndviDate } from './layers';
import { fetchClimate, monthly, rainToDate } from './climate';
import { RainBars, MonthLines, StateBars } from './Charts';
import Assistant from './Assistant';

const TABS = [
  { id: 'monitor', label: 'Monitor', icon: Activity },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'assistant', label: 'Assistant', icon: MessageSquareText },
];
const PAGES = {
  monitor: [
    { id: 'overview', label: 'Overview', icon: MapIcon },
    { id: 'atlas', label: 'Baseline atlas', icon: Layers },
    { id: 'registry', label: 'Project registry', icon: ClipboardList },
    { id: 'monitoring', label: 'Restoration monitoring', icon: Sprout },
    { id: 'warning', label: 'Early warning', icon: AlertTriangle },
    { id: 'planning', label: 'Planning', icon: Compass },
    { id: 'climate', label: 'Climate and rain', icon: CloudRain },
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
  const tones = { teal: 'bg-[#ECFDF8] border-[#A7E3D4]', amber: 'bg-[#FFF8EB] border-[#F6D9A0]', green: 'bg-[#F1F8EC] border-[#CFE6BF]', sky: 'bg-[#EEF6FD] border-[#BFDDF6]' };
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
  const [climateState, setClimateState] = useState('Borno');
  const [reportState, setReportState] = useState('all');
  const [period, setPeriod] = useState(() => ndviDate(new Date()));
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    document.title = 'GreenWall Observatory Nigeria (GWON)';
    fetch('/gwon-data/frontline_states.geojson').then((r) => r.json()).then(setStates).catch(() => setStates(null));
  }, []);
  useEffect(() => { if (states) fetchClimate(states).then(setClimate).catch((e) => setClimateErr(e.message)); }, [states]);
  useEffect(() => { window.history.replaceState(null, '', `#${tab}${tab === 'assistant' ? '' : `/${page}`}`); }, [tab, page]);
  useEffect(() => { try { localStorage.setItem(SITES_KEY, JSON.stringify(sites)); } catch { /* storage unavailable */ } }, [sites]);

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
  const rainBars = (rows) => [...rows].filter((r) => r.change != null).sort((a, b) => a.change - b.change).map((r) => ({ label: r.state, value: r.change, color: r.change < 0 ? '#D97706' : '#0F766E' }));

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-gray-900">
      <style>{'@media print { .gwon-noprint { display: none !important; } .gwon-print-full { grid-column: 1 / -1 !important; } }'}</style>
      {/* Header: as every FarmIntelytics service, with the three header tabs */}
      <header className="gwon-noprint bg-white border-b border-gray-200 sticky top-0 z-[1200]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 min-h-[68px] py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/favicon-192.png" alt="" className="w-10 h-10 shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold leading-tight truncate">GreenWall Observatory Nigeria</p>
              <p className="text-xs text-gray-500 truncate">National Agency for the Great Green Wall · prototype on FarmIntelytics</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl" aria-label="GWON">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => open(id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${tab === id ? 'bg-white text-[#0F5F57] border border-gray-200' : 'text-gray-600 hover:text-gray-900'}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </nav>
          <span className="text-xs text-gray-600 flex items-center gap-1.5">Public data only <InfoTip side="bottom" text="Only real public data: state boundaries, NASA satellite layers with NASA's legends, ERA5 climate and published programme figures with their source. The Agency's own sites appear once its files are loaded." /></span>
        </div>
      </header>

      <div className={`max-w-[1600px] mx-auto px-4 sm:px-6 py-5 grid gap-5 ${tab === 'assistant' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[224px_1fr]'}`}>
        {tab !== 'assistant' && (
          <nav className="gwon-noprint lg:sticky lg:top-[88px] self-start rounded-2xl border border-gray-200 bg-white p-2" aria-label="Pages">
            {PAGES[tab].map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => setPage(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left ${page === id ? 'bg-[#0F766E] text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        )}

        <main className="space-y-5 min-w-0 gwon-print-full">
          {tab === 'monitor' && page === 'overview' && (
            <>
              <Title title="The Great Green Wall in Nigeria" text="The eleven frontline states: the land, how green it is now, the rain this season, and every site the Agency registers." />
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <Kpi tone="teal" label="Frontline states" value="11" sub="Kebbi to Borno and Adamawa" tip="The eleven states of the Great Green Wall in Nigeria, outlined on every map." />
                <Kpi tone="green" label="Area of the frontline" value={areaStat.value} sub="From the state boundaries" tip={areaStat.tip} />
                <Kpi tone="amber" label="Driest against last year" value={driest ? driest.state : '—'} sub={driest ? `${Math.round(driest.change)}% rain to ${driest.until}` : 'Loading the climate'} tip="Rain so far this year against the same days last year, ERA5 at one point inside each state." />
                <Kpi tone="sky" label="ACReSAL land under restoration" value="922,700 ha" sub="April 2026, about 97% of target" tip="Published by the Federal Ministry of Environment (ACReSAL update, April 2026); not measured by GWON." />
              </div>
              <MapView initial={['ndvi']} states={states} sites={sites} date={period} onDate={setPeriod} height="560px" title="Vegetation now" stats={[siteStat]} />
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

          {tab === 'monitor' && page === 'atlas' && (
            <>
              <Title title="Baseline atlas" tip="The same layers for every state, so progress is measured against a fixed baseline. In the platform, 10 m Sentinel-2 and 30 m Landsat layers come from the pipeline." text="Switch layers on in the Layers panel; step through the year on the strip under the map." />
              <MapView initial={['ndvi']} states={states} sites={sites} date={period} onDate={setPeriod} stats={[areaStat, siteStat]} />
            </>
          )}

          {tab === 'monitor' && page === 'registry' && (
            <>
              <Title title="Project registry" tip="Every site in one place: shelterbelts, woodlots, orchards, water points. Load a GeoJSON of site boundaries; name, programme, partner and state are shown when present."
                text={siteRows.length ? `${fmt(siteRows.length)} sites, ${fmt(siteHa)} ha in all.` : 'No sites yet: load the Agency’s site boundaries.'}>
                <div>
                  <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" className="hidden" onChange={onFile} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0B5F58]"><UploadCloud size={16} /> Load site boundaries</button>
                </div>
              </Title>
              {msg && <p className="text-sm rounded-xl border border-[#A7E3D4] bg-[#ECFDF8] text-[#0F5F57] px-4 py-3">{msg}</p>}
              <MapView initial={['truecolor']} states={states} sites={sites} height="520px" title="Sites on the map" stats={[siteStat]} />
              {siteRows.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#0F766E] text-white text-left"><tr><th className="px-4 py-2.5">Site</th><th className="px-4 py-2.5">Programme</th><th className="px-4 py-2.5">State</th><th className="px-4 py-2.5 text-right">Area (ha)</th><th className="px-4 py-2.5" /></tr></thead>
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
                <MapView initial={['ndvi']} states={states} sites={sites} date={lastYear(period)} onDate={() => {}} height="480px" title={`A year before: ${lastYear(period)}`} compact />
                <MapView initial={['ndvi']} states={states} sites={sites} date={period} onDate={setPeriod} height="480px" title={`Now: ${period}`} compact />
              </div>
            </>
          )}

          {tab === 'monitor' && page === 'warning' && (
            <>
              <Title title="Early warning" tip="Signs that planted sites are at risk: dry soil where roots reach and rain that has not come. In the platform an alert goes to the state office when a site's vegetation falls well below the same season last year."
                text="Soil moisture and rainfall over the frontline, day by day." />
              <MapView initial={['soil']} states={states} sites={sites} stats={rainStat ? [rainStat] : []} title="Soil and rain" />
            </>
          )}

          {tab === 'monitor' && page === 'planning' && (
            <>
              <Title title="Planning" tip="Where restoration helps most and will succeed: land cover shows what is there now, population shows who it serves. In the platform, species suitability and degradation layers come from the pipeline."
                text="Land cover and where people live: switch between them, or lay one over the other with the opacity slider." />
              <MapView initial={['landcover']} states={states} sites={sites} stats={[areaStat]} title="Planning layers" />
            </>
          )}

          {tab === 'monitor' && page === 'climate' && (
            <>
              <Title title="Climate and rain" tip="ERA5 reanalysis (ECMWF), through the Open-Meteo archive, at one point inside each state: the climate of that point, not the state's average. In the platform, state averages come from CHIRPS and ERA5 grids."
                text="This year against last year, month by month.">
                <label className="text-sm">State <select value={climateState} onChange={(e) => setClimateState(e.target.value)} className="ml-2 px-3 py-2 rounded-xl border border-gray-300 bg-white">
                  {(states?.features || []).map((f) => <option key={f.properties.state}>{f.properties.state}</option>)}
                </select></label>
              </Title>
              {climateErr && <p className="text-sm text-amber-800">{climateErr}</p>}
              {!climate ? <p className="text-sm text-gray-500">Loading the climate figures…</p> : (
                <>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5">Rain each month, {climateState} <InfoTip text="Total rain of each month in millimetres; the current month counts the days so far." /></p>
                      <RainBars year={climateYear} thisYear={monthly(climate[climateState], climateYear)} lastYear={monthly(climate[climateState], climateYear - 1)} />
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-1.5">Daily highest temperature, {climateState} <InfoTip text="The month's average of each day's highest temperature (°C). Heat raises the water new trees need." /></p>
                      <MonthLines year={climateYear} thisYear={monthly(climate[climateState], climateYear)} lastYear={monthly(climate[climateState], climateYear - 1)} />
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
              <Title title="Report" tip="A one-page summary for the whole frontline or one state, from the figures on GWON. Print it, or save it as PDF from the print window.">
                <div className="flex flex-wrap gap-2 gwon-noprint">
                  <select value={reportState} onChange={(e) => setReportState(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm">
                    <option value="all">All eleven frontline states</option>
                    {(states?.features || []).map((f) => <option key={f.properties.state} value={f.properties.state}>{f.properties.state}</option>)}
                  </select>
                  <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F766E] text-white text-sm font-semibold"><Printer size={15} /> Print or save as PDF</button>
                </div>
              </Title>
              {(() => {
                const sel = reportState === 'all' ? (states?.features || []) : (states?.features || []).filter((f) => f.properties.state === reportState);
                const ha = sel.reduce((s, f) => s + f.properties.area_ha, 0);
                const rr = rainRows.filter((r) => r.year && (reportState === 'all' || r.state === reportState));
                const here = siteRows.filter((r) => reportState === 'all' || r.state === reportState);
                return (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
                    <div className="border-b-2 border-[#0F766E] pb-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-widest text-[#0F766E]">GREENWALL OBSERVATORY NIGERIA · REPORT</p>
                        <p className="font-display text-2xl font-semibold">{reportState === 'all' ? 'The eleven frontline states' : `${reportState} State`}</p>
                        <p className="text-xs text-gray-500">Made {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} from the figures on GWON</p>
                      </div>
                      <img src="/favicon-192.png" alt="" className="w-12 h-12" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {[['Area', `${fmt(ha)} ha`], ['Registered sites', fmt(here.length)], ['Registered hectares', fmt(here.reduce((s, r) => s + r.ha, 0))],
                        ['Rain so far', rr.length === 1 ? `${fmt(rr[0].now)} mm` : rr.length ? `${fmt(rr.reduce((s, r) => s + r.now, 0) / rr.length)} mm a state` : '—']].map(([k, v]) => (
                        <div key={k} className="rounded-xl border border-gray-200 px-3 py-2"><p className="text-xs text-gray-500">{k}</p><p className="font-semibold tabular-nums">{v}</p></div>
                      ))}
                    </div>
                    {reportState !== 'all' && climate?.[reportState] && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div><p className="text-sm font-semibold mb-2">Rain each month</p><RainBars year={climateYear} thisYear={monthly(climate[reportState], climateYear)} lastYear={monthly(climate[reportState], climateYear - 1)} /></div>
                        <div><p className="text-sm font-semibold mb-2">Daily highest temperature</p><MonthLines year={climateYear} thisYear={monthly(climate[reportState], climateYear)} lastYear={monthly(climate[reportState], climateYear - 1)} /></div>
                      </div>
                    )}
                    {rr.length > 0 && (
                      <table className="w-full text-sm">
                        <thead className="bg-[#0F766E] text-white text-left"><tr><th className="px-3 py-2">State</th><th className="px-3 py-2 text-right">Rain {rr[0].year} so far (mm)</th><th className="px-3 py-2 text-right">Same days last year (mm)</th><th className="px-3 py-2 text-right">Change</th></tr></thead>
                        <tbody>{rr.map((r) => <tr key={r.state} className="border-t border-gray-100"><td className="px-3 py-1.5">{r.state}</td><td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.now)}</td><td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.before)}</td><td className={`px-3 py-1.5 text-right tabular-nums ${r.change < 0 ? 'text-amber-700' : 'text-[#0F766E]'}`}>{r.change == null ? '—' : `${r.change > 0 ? '+' : ''}${Math.round(r.change)}%`}</td></tr>)}</tbody>
                      </table>
                    )}
                    <p className="text-xs text-gray-500">Sources: state boundaries and areas, geoBoundaries (CC BY 4.0); rain and temperature, ERA5 through the Open-Meteo archive at one point inside each state{rr[0] ? `, to ${rr[0].until}` : ''}; sites, the GWON project registry.</p>
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
                  <thead className="bg-[#0F766E] text-white text-left"><tr><th className="px-4 py-2.5">Measure</th><th className="px-4 py-2.5">From</th><th className="px-4 py-2.5">Now</th></tr></thead>
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
            Boundaries: geoBoundaries (CC BY 4.0). Imagery and legends: NASA GIBS (MODIS, SMAP, GPM IMERG, GPW; public domain). Climate: ERA5 (ECMWF) via the Open-Meteo archive. Programme figure: Federal Ministry of Environment, ACReSAL update, April 2026. Built by Earthintelytics on FarmIntelytics.
          </footer>
        </main>
      </div>
    </div>
  );
}
