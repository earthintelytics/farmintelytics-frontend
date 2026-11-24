/**
 * GreenWall Observatory Nigeria (GWON): the prototype of the Great Green Wall platform proposed to NAGGW, hosted on
 * the FarmIntelytics hub as an organisation platform of its own (its name, its menu, its pages), at /platforms/gwon.
 *
 * Real data only (owner's rule): the frontline-state boundaries (geoBoundaries, CC BY 4.0) with areas computed from
 * them; NASA GIBS imagery layers (MODIS true colour and vegetation index, MODIS land cover, SMAP soil moisture, IMERG
 * rainfall, GPW population density), all public domain; programme figures only with their published source. The
 * project registry starts empty and fills from the Agency's own GeoJSON files (kept in this browser in the prototype;
 * in the platform they are stored per organisation and checked by the pipeline). Nothing is invented.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Info, Map as MapIcon, Layers, ClipboardList, Sprout, AlertTriangle, Compass, FileBarChart, UploadCloud, Trash2,
} from 'lucide-react';
import { useConfirm } from '../../components/ConfirmProvider';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const LAYERS = {
  truecolor: { name: 'True colour (MODIS Terra)', id: 'MODIS_Terra_CorrectedReflectance_TrueColor', level: 9, ext: 'jpg', dated: true,
    info: 'Daily satellite picture of the land as the eye sees it. Clouds and dust show as they were that day.' },
  ndvi: { name: 'Vegetation index (NDVI, 16 days)', id: 'MODIS_Terra_L3_NDVI_16Day', level: 9, ext: 'png', dated: true, ndvi: true,
    info: 'How green the land is, from brown (bare) to dark green (dense), as a 16-day picture without clouds. 250 m.' },
  landcover: { name: 'Land cover 2024 (MODIS)', id: 'MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual', level: 8, ext: 'png', fixedDate: '2024-01-01',
    info: 'What covers the land in 2024 (cropland, grassland, savanna, shrubland, bare land, built-up), at 500 m.' },
  soil: { name: 'Root-zone soil moisture (SMAP)', id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', level: 6, ext: 'png', dated: true, lag: 4,
    info: 'Water held in the soil where roots reach, from NASA SMAP. Dry soil near planted sites warns of drought stress.' },
  rain: { name: 'Rainfall rate (IMERG)', id: 'IMERG_Precipitation_Rate', level: 6, ext: 'png', dated: true, lag: 2,
    info: 'Where it is raining, from NASA GPM IMERG. Shows whether the rains have started in each frontline state.' },
  population: { name: 'Population density 2020 (GPW)', id: 'GPW_Population_Density_2020', level: 7, ext: 'png', fixedDate: '2020-01-01',
    info: 'People per square kilometre (Gridded Population of the World, 2020), to place restoration where it helps most people.' },
};

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };
// The 16-day vegetation composites start on day 1, 17, 33, ... of each year; take the last complete one.
function ndviDate(ref = new Date()) {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = Math.floor((d - start) / 86400000);
  const k = Math.floor(doy / 16) - 2;            // two periods back: the newest one is published a few days late
  if (k < 0) return ndviDate(new Date(Date.UTC(d.getUTCFullYear() - 1, 11, 31)));
  return iso(new Date(start + k * 16 * 86400000));
}
const lastYear = (s) => `${Number(s.slice(0, 4)) - 1}${s.slice(4)}`;
const layerDate = (key, chosen) => {
  const l = LAYERS[key];
  if (l.fixedDate) return l.fixedDate;
  if (l.ndvi) return ndviDate(new Date(`${chosen}T00:00:00Z`));
  return chosen || iso(daysAgo(l.lag || 1));
};
const tileUrl = (key, date) => `${GIBS}/${LAYERS[key].id}/default/${date}/GoogleMapsCompatible_Level${LAYERS[key].level}/{z}/{y}/{x}.${LAYERS[key].ext}`;

// Area of a GeoJSON polygon in hectares (spherical excess; good to well under 1% at plot and estate size).
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

// A small (i): hover or focus it to read what something means.
function Tip({ text }) {
  return (
    <span className="relative inline-flex align-middle group" tabIndex={0} aria-label={text}>
      <Info size={14} className="text-gray-400 group-hover:text-[#0F766E] group-focus:text-[#0F766E]" />
      <span role="tooltip" className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-normal leading-relaxed text-gray-700 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-[1200]">
        {text}
      </span>
    </span>
  );
}

function FitTo({ data }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    try { map.fitBounds(L.geoJSON(data).getBounds(), { padding: [12, 12] }); } catch { /* empty */ }
  }, [data, map]);
  return null;
}

function GwonMap({ layer, date, states, sites, height = 440, label }) {
  const d = layerDate(layer, date);
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 text-sm">
        <span className="font-semibold text-gray-900 flex items-center gap-1.5">{label || LAYERS[layer].name} <Tip text={LAYERS[layer].info} /></span>
        <span className="text-xs text-gray-500">{LAYERS[layer].fixedDate ? LAYERS[layer].fixedDate.slice(0, 4) : d} · NASA GIBS</span>
      </div>
      <MapContainer center={[11.5, 8.5]} zoom={6} style={{ height }} scrollWheelZoom={false} zoomControl>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap, &copy; CARTO" />
        <TileLayer key={`${layer}-${d}`} url={tileUrl(layer, d)} maxNativeZoom={LAYERS[layer].level} maxZoom={12} opacity={0.92}
          attribution="NASA GIBS (public domain)" className="gwon-smooth" />
        {states && <GeoJSON key="states" data={states} style={{ color: '#FFFFFF', weight: 2.2, fill: false }} />}
        {states && <GeoJSON key="states-line" data={states} style={{ color: '#0F766E', weight: 1.2, fill: false }}
          onEachFeature={(f, lyr) => lyr.bindTooltip(`${f.properties.state}: ${fmt(f.properties.area_ha)} ha`, { sticky: true })} />}
        {sites?.features?.length > 0 && <GeoJSON key={`sites-${sites.features.length}`} data={sites} style={{ color: '#B45309', weight: 2, fillColor: '#F59E0B', fillOpacity: 0.35 }}
          onEachFeature={(f, lyr) => lyr.bindTooltip(f.properties?.name || f.properties?.ref || 'Site', { sticky: true })} />}
        <FitTo data={states} />
      </MapContainer>
    </div>
  );
}

function Kpi({ label, value, sub, tip, tone }) {
  const tones = { teal: 'bg-[#ECFDF8] border-[#A7E3D4]', amber: 'bg-[#FFF8EB] border-[#F6D9A0]', green: 'bg-[#F1F8EC] border-[#CFE6BF]', sky: 'bg-[#EEF6FD] border-[#BFDDF6]' };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || 'bg-white border-gray-200'}`}>
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">{label} {tip && <Tip text={tip} />}</p>
      <p className="font-display text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

const MODULES = [
  { id: 'overview', label: 'Overview', icon: MapIcon },
  { id: 'atlas', label: 'Baseline atlas', icon: Layers },
  { id: 'registry', label: 'Project registry', icon: ClipboardList },
  { id: 'monitoring', label: 'Restoration monitoring', icon: Sprout },
  { id: 'warning', label: 'Early warning', icon: AlertTriangle },
  { id: 'planning', label: 'Planning', icon: Compass },
  { id: 'results', label: 'Results and reports', icon: FileBarChart },
];

const SITES_KEY = 'gwon_prototype_sites';
const readSites = () => { try { return JSON.parse(localStorage.getItem(SITES_KEY) || 'null') || { type: 'FeatureCollection', features: [] }; } catch { return { type: 'FeatureCollection', features: [] }; } };

export default function GwonPortal() {
  const confirm = useConfirm();
  const [mod, setMod] = useState(() => (window.location.hash.slice(1) || 'overview'));
  const [states, setStates] = useState(null);
  const [sites, setSites] = useState(readSites);
  const [atlasLayer, setAtlasLayer] = useState('ndvi');
  const [date, setDate] = useState(iso(daysAgo(2)));
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    fetch('/platforms/gwon/frontline_states.geojson').then((r) => r.json()).then(setStates).catch(() => setStates(null));
    document.title = 'GreenWall Observatory Nigeria (GWON)';
  }, []);
  useEffect(() => { window.history.replaceState(null, '', `#${mod}`); }, [mod]);
  useEffect(() => { try { localStorage.setItem(SITES_KEY, JSON.stringify(sites)); } catch { /* storage unavailable */ } }, [sites]);

  const totalHa = useMemo(() => (states?.features || []).reduce((s, f) => s + (f.properties.area_ha || 0), 0), [states]);
  const maxHa = useMemo(() => Math.max(1, ...(states?.features || []).map((f) => f.properties.area_ha || 0)), [states]);
  const siteRows = useMemo(() => (sites.features || []).map((f, i) => ({ i, name: f.properties?.name || f.properties?.ref || `Site ${i + 1}`,
    programme: f.properties?.programme || f.properties?.partner || '', state: f.properties?.state || '', ha: geomHa(f.geometry) })), [sites]);
  const siteHa = siteRows.reduce((s, r) => s + r.ha, 0);
  const now = ndviDate(new Date(`${date}T00:00:00Z`));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const g = JSON.parse(reader.result);
        const feats = (g.type === 'FeatureCollection' ? g.features : g.type === 'Feature' ? [g] : [])
          .filter((f) => ['Polygon', 'MultiPolygon'].includes(f?.geometry?.type));
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

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-gray-900">
      <style>{'.gwon-smooth img{image-rendering:auto}'}</style>
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/favicon-192.png" alt="" className="w-10 h-10" />
            <div>
              <p className="font-display text-lg font-semibold leading-tight">GreenWall Observatory Nigeria</p>
              <p className="text-xs text-gray-500">GWON · for the National Agency for the Great Green Wall · prototype on FarmIntelytics</p>
            </div>
          </div>
          <span className="text-xs text-gray-600 flex items-center gap-1.5">Public data only <Tip text="This prototype shows only real public data: state boundaries, NASA satellite layers and published programme figures with their source. The Agency's own sites appear once its files are loaded in the Project registry." /></span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6">
        <nav className="lg:sticky lg:top-4 self-start rounded-2xl border border-gray-200 bg-white p-2" aria-label="GWON modules">
          {MODULES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setMod(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left ${mod === id ? 'bg-[#0F766E] text-white font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <main className="space-y-6 min-w-0">
          {mod === 'overview' && (
            <>
              <section>
                <h1 className="font-display text-2xl font-semibold">The Great Green Wall in Nigeria</h1>
                <p className="text-sm text-gray-600 mt-1 max-w-3xl">One picture of the eleven frontline states: the land, its vegetation now, and every restoration site the Agency registers.</p>
              </section>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <Kpi tone="teal" label="Frontline states" value="11" sub="Adamawa to Zamfara" tip="The eleven states of the Great Green Wall in Nigeria, outlined on every map." />
                <Kpi tone="green" label="Area of the frontline states" value={totalHa ? `${(totalHa / 1e6).toFixed(2)} m ha` : '—'} sub="From the state boundaries" tip="Worked out from the geoBoundaries state boundaries on an equal-area projection (Africa Albers)." />
                <Kpi tone="amber" label="Sites in the registry" value={fmt(siteRows.length)} sub={siteRows.length ? `${fmt(siteHa)} ha` : 'Load the Agency’s site files'} tip="Restoration sites loaded in the Project registry, with their area worked out from their boundaries." />
                <Kpi tone="sky" label="ACReSAL land under restoration" value="922,700 ha" sub="April 2026, about 97% of target" tip="Published by the Federal Ministry of Environment (ACReSAL project update, April 2026); not measured by this prototype." />
              </div>
              <GwonMap layer="ndvi" date={date} states={states} sites={sites} label="Vegetation now (NDVI)" />
              <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0F766E] text-white text-left"><tr><th className="px-4 py-2.5 font-semibold">State</th><th className="px-4 py-2.5 font-semibold text-right">Area (ha)</th><th className="px-4 py-2.5 font-semibold text-right">Share of the frontline</th></tr></thead>
                  <tbody>
                    {(states?.features || []).slice().sort((a, b) => b.properties.area_ha - a.properties.area_ha).map((f) => (
                      <tr key={f.properties.state} className="border-t border-gray-100">
                        <td className="px-4 py-2">{f.properties.state}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{fmt(f.properties.area_ha)}</td>
                        <td className="px-4 py-2 text-right">
                          <span className="inline-flex items-center gap-2 justify-end w-full">
                            <span className="h-2.5 rounded-sm bg-[#5EB8A8]" style={{ width: `${Math.max(6, (f.properties.area_ha / maxHa) * 140)}px` }} />
                            <span className="tabular-nums w-12 text-right">{((f.properties.area_ha / totalHa) * 100).toFixed(1)}%</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {mod === 'atlas' && (
            <>
              <section className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-semibold flex items-center gap-2">Baseline atlas <Tip text="The same maps for every state, so progress can be measured against a fixed baseline year. In the platform, 10 m Sentinel-2 and 30 m Landsat layers are added from the pipeline." /></h1>
                  <p className="text-sm text-gray-600 mt-1">Choose a layer and a date.</p>
                </div>
                <label className="text-sm">Date <input type="date" value={date} max={iso(new Date())} min="2015-06-23" onChange={(e) => setDate(e.target.value)} className="ml-2 px-3 py-2 rounded-xl border border-gray-300" /></label>
              </section>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(LAYERS).map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setAtlasLayer(k)}
                    className={`text-left rounded-xl border px-3 py-2.5 text-sm ${atlasLayer === k ? 'border-[#0F766E] bg-[#ECFDF8] font-semibold text-[#0F766E]' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>{l.name}</button>
                ))}
              </div>
              <GwonMap layer={atlasLayer} date={date} states={states} sites={sites} height={520} />
            </>
          )}

          {mod === 'registry' && (
            <>
              <section className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-semibold flex items-center gap-2">Project registry <Tip text="Every site in one place: shelterbelts, woodlots, orchards, water points. Load a GeoJSON file of site boundaries; properties name, programme, partner and state are shown when present." /></h1>
                  <p className="text-sm text-gray-600 mt-1">{siteRows.length ? `${fmt(siteRows.length)} sites, ${fmt(siteHa)} ha in all.` : 'No sites yet: load the Agency’s site boundaries.'}</p>
                </div>
                <div>
                  <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" className="hidden" onChange={onFile} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold hover:bg-[#0B5F58]"><UploadCloud size={16} /> Load site boundaries</button>
                </div>
              </section>
              {msg && <p className="text-sm rounded-xl border border-[#A7E3D4] bg-[#ECFDF8] text-[#0F5F57] px-4 py-3">{msg}</p>}
              <GwonMap layer="truecolor" date={date} states={states} sites={sites} label="Sites on the satellite picture" />
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
              <p className="text-xs text-gray-500">In this prototype the sites stay in this browser. In the platform they are stored for the Agency, shared with its state offices, and checked by the pipeline every season.</p>
            </>
          )}

          {mod === 'monitoring' && (
            <>
              <section>
                <h1 className="font-display text-2xl font-semibold flex items-center gap-2">Restoration monitoring <Tip text="Each registered site is compared with itself season after season: growing, holding or lost. The pipeline measures the vegetation index inside each boundary; here you see the same layer it reads." /></h1>
                <p className="text-sm text-gray-600 mt-1">The same season this year and last year, for every site in the registry.</p>
              </section>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <GwonMap layer="ndvi" date={lastYear(now)} states={states} sites={sites} height={380} label={`Vegetation, ${lastYear(now)}`} />
                <GwonMap layer="ndvi" date={now} states={states} sites={sites} height={380} label={`Vegetation, ${now}`} />
              </div>
              <p className="text-sm text-gray-600">{siteRows.length ? `${fmt(siteRows.length)} sites are drawn on both maps. In the platform each gets a seasonal reading (growing, holding or lost) and a flag when it needs a visit.` : 'Load sites in the Project registry to see them on both maps.'}</p>
            </>
          )}

          {mod === 'warning' && (
            <>
              <section>
                <h1 className="font-display text-2xl font-semibold flex items-center gap-2">Early warning <Tip text="Signs that planted sites are at risk: dry soil where roots reach, and rain that has not come. In the platform an alert goes to the state office when a site's vegetation falls well below the same season last year." /></h1>
                <p className="text-sm text-gray-600 mt-1">Soil moisture and rainfall across the frontline states, from the latest NASA data.</p>
              </section>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <GwonMap layer="soil" date={iso(daysAgo(4))} states={states} sites={sites} height={380} />
                <GwonMap layer="rain" date={iso(daysAgo(2))} states={states} sites={sites} height={380} />
              </div>
            </>
          )}

          {mod === 'planning' && (
            <>
              <section>
                <h1 className="font-display text-2xl font-semibold flex items-center gap-2">Planning <Tip text="Where restoration helps most and will succeed: land cover shows what is there now, population shows who it serves. In the platform, species suitability and degradation layers are added from the pipeline." /></h1>
                <p className="text-sm text-gray-600 mt-1">Land cover and where people live, side by side.</p>
              </section>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <GwonMap layer="landcover" date={date} states={states} sites={sites} height={380} />
                <GwonMap layer="population" date={date} states={states} sites={sites} height={380} />
              </div>
            </>
          )}

          {mod === 'results' && (
            <>
              <section>
                <h1 className="font-display text-2xl font-semibold flex items-center gap-2">Results and reports <Tip text="The Great Green Wall Accelerator Harmonized Results Framework has five core indicators reported each year to the UNCCD. GWON calculates the satellite-based ones the same way every year." /></h1>
                <p className="text-sm text-gray-600 mt-1">What GWON measures for the yearly Results Framework report.</p>
              </section>
              <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0F766E] text-white text-left"><tr><th className="px-4 py-2.5">Measure</th><th className="px-4 py-2.5">From</th><th className="px-4 py-2.5">Now</th></tr></thead>
                  <tbody>
                    {[
                      ['Land cover change (hectares), the first core indicator', 'Land cover maps of the baseline year and of each year', 'The 2024 land cover layer is in the atlas; the yearly comparison runs in the platform'],
                      ['Land under restoration (hectares)', 'Project registry boundaries', siteRows.length ? `${fmt(siteHa)} ha registered` : 'No sites registered yet'],
                      ['Vegetation trend of registered sites', 'Seasonal vegetation index inside each site', 'Seasonal readings run in the platform'],
                      ['Jobs, income and households reached', 'Field records through the registry and the field app', 'Collected with the state offices'],
                    ].map(([a, b, c]) => <tr key={a} className="border-t border-gray-100"><td className="px-4 py-2.5 font-medium">{a}</td><td className="px-4 py-2.5 text-gray-700">{b}</td><td className="px-4 py-2.5 text-gray-700">{c}</td></tr>)}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">The other core indicators and the report layout are agreed with the Agency at the discovery workshop.</p>
            </>
          )}

          <footer className="pt-4 border-t border-gray-200 text-xs text-gray-500">
            Boundaries: geoBoundaries (CC BY 4.0). Imagery: NASA GIBS, MODIS, SMAP, GPM IMERG, GPW (public domain). Programme figure: Federal Ministry of Environment, ACReSAL update, April 2026. Built by Earthintelytics on FarmIntelytics.
          </footer>
        </main>
      </div>
    </div>
  );
}
