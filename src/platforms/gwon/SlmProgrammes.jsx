/**
 * GWON: Sustainable Land Management (which practices fit each state's rain, soil and land, and how its cropland is
 * changing) and Programmes (the indicators the Agency publishes: baseline, target, achieved, source).
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import InfoTip from '../../components/page/InfoTip';
import SeriesChart from './SeriesChart';
import { LandBars } from './LandCharts';
import { CsvButton } from './csv';
import { gwonFetch } from './gwonApi';
import { API_BASE } from '../../services/apiBase';
import { useConfirm } from '../../components/ConfirmProvider';

const fmt = (n, d = 0) => (n == null || !Number.isFinite(Number(n)) ? '—' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d }));

// Common Sahelian sustainable land management practices (WOCAT and FAO descriptions), with the rain band each is
// usually used in. GWON matches them against the state's mean yearly rain (ERA5, 2015-2024) and its land.
const PRACTICES = [
  { name: 'Zaï pits', rain: [300, 800], land: 'Crusted, bare or degraded farmland', what: 'Small pits dug in the dry season, filled with manure or compost; seeds go in at the first rain. They catch runoff and bring crusted land back into crops.' },
  { name: 'Half-moons (demi-lunes)', rain: [200, 600], land: 'Bare, crusted land on gentle slopes', what: 'Crescent-shaped earth bunds that hold runoff for a tree or a few plants; used to restore bare plateaus and grazing land.' },
  { name: 'Stone bunds along the contour', rain: [300, 800], land: 'Gently sloping fields with runoff and gullies', what: 'Lines of stones laid along the contour slow runoff, trap soil and let water soak in.' },
  { name: 'Farmer-managed natural regeneration (FMNR)', rain: [200, 1200], land: 'Farms and fallows with living stumps and roots', what: 'Farmers select, prune and protect the shoots of trees already in their fields; the cheapest way to regreen large areas.' },
  { name: 'Shelterbelts and windbreaks', rain: [250, 1000], land: 'Open farmland exposed to wind and sand', what: 'Rows of trees along field edges that cut wind erosion and sand movement and give fodder, fruit or wood.' },
  { name: 'Agroforestry with Faidherbia albida', rain: [300, 1000], land: 'Cereal fields on deep soils', what: 'A tree that drops its leaves in the rainy season, feeding the soil and shading crops in the dry season.' },
  { name: 'Grazing management and fodder banks', rain: [150, 800], land: 'Rangelands and shrubland', what: 'Rotational grazing, rested areas and planted fodder to let grassland and shrubland recover.' },
  { name: 'Conservation agriculture (mulch, minimum tillage)', rain: [400, 1400], land: 'Cropland', what: 'Keeping crop residues on the soil and disturbing it little to hold water, cool the soil and build organic matter.' },
  { name: 'Gully plugs and check dams', rain: [300, 1400], land: 'Gullied land and drainage lines', what: 'Small barriers of stone, brush or earth across gullies to stop them growing and to trap soil.' },
];

function useFile(url) {
  const [d, setD] = useState(null);
  useEffect(() => { let live = true; fetch(url).then((r) => r.json()).then((x) => { if (live) setD(x); }).catch(() => {}); return () => { live = false; }; }, [url]);
  return d;
}

export function Slm({ scope, aState, series, land, inYears }) {
  const crop = useFile('/gwon-data/cropland_series.json');
  const names = scope === 'all' ? Object.keys(series?.states || {}) : [scope];
  const rain = names.length && series ? names.reduce((s, n) => s + (series.states[n]?.baseline_rain_mean || 0), 0) / names.length : null;
  const aridity = series && names.length ? (() => { const v = names.flatMap((n) => (series.states[n]?.annual || []).filter((r) => r.full && r.year <= 2024).map((r) => r.aridity)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; })() : null;
  const byYear = useMemo(() => {
    if (!crop) return null;
    if (scope !== 'all') return crop.states[scope] || null;
    const out = {};
    crop.years.forEach((y) => { const o = {}; Object.values(crop.states).forEach((s) => { if (!s[y]) return; crop.types.forEach((t) => { o[t] = (o[t] || 0) + (s[y][t] || 0); }); }); if (Object.keys(o).length) out[y] = o; });
    return out;
  }, [crop, scope]);
  const ys = crop && byYear ? crop.years.filter((y) => byYear[y] && inYears(y)) : [];
  const shareLand = (k) => { if (!land) return null; const lo = scope === 'all' ? null : land.states[scope]; if (!lo) return null; const yy = land.years.filter((y) => lo[y]); const o = lo[yy[yy.length - 1]]; const tot = land.types.reduce((a, t) => a + (o[t] || 0), 0); return tot ? ((o[k] || 0) / tot) * 100 : null; };
  const fits = PRACTICES.map((p) => ({ ...p, fit: rain == null ? null : rain >= p.rain[0] && rain <= p.rain[1] }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[['Mean rain in a year', rain == null ? '—' : `${fmt(rain)} mm`, 'ERA5, 2015-2024'], ['Aridity', aridity == null ? '—' : fmt(aridity, 2), aridity == null ? '' : aridity < 0.2 ? 'arid (UNEP)' : aridity < 0.5 ? 'semi-arid (UNEP)' : 'dry sub-humid or wetter (UNEP)'],
          ['Tree cover', scope === 'all' ? 'choose a state' : `${fmt(shareLand('Tree cover'), 1)}%`, 'ESA land cover, latest year'], ['Bare and sparse land', scope === 'all' ? 'choose a state' : `${fmt((shareLand('Bare land') || 0) + (shareLand('Sparse vegetation') || 0), 1)}%`, 'ESA land cover, latest year']].map(([l, v, s]) => (
          <div key={l} className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-xs font-semibold text-gray-600">{l}</p><p className="font-display text-2xl font-semibold text-gray-900 mt-1">{v}</p><p className="text-[11px] text-gray-500 mt-0.5">{s}</p></div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold flex items-center gap-1.5">Practices that fit {aState} <InfoTip text="Sustainable land management practices of the Sahel and the rain band each is usually used in (WOCAT and FAO descriptions), matched against the mean yearly rain here. Check on the ground: slope, soil depth and what farmers want decide in the end." /></p>
          <CsvButton name={`slm-practices-${scope}`} rows={fits.map((p) => ({ practice: p.name, rain_from_mm: p.rain[0], rain_to_mm: p.rain[1], fits_mean_rain_here: p.fit, land: p.land }))} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...fits].sort((a, b) => Number(b.fit) - Number(a.fit)).map((p) => (
            <div key={p.name} className={`rounded-xl border p-4 ${p.fit ? 'border-[#A9D9BF] bg-[#F1F9F4]' : 'border-gray-200'}`}>
              <p className="flex items-center justify-between gap-2"><span className="font-semibold text-gray-900">{p.name}</span>{p.fit != null && <span className={`text-[11px] font-semibold ${p.fit ? 'text-[#007248]' : 'text-gray-500'}`}>{p.fit ? 'Fits the rain here' : 'Outside the usual rain band'}</span>}</p>
              <p className="text-sm text-gray-700 mt-1">{p.what}</p>
              <p className="text-xs text-gray-500 mt-1.5">Usually {p.rain[0]}-{p.rain[1]} mm a year · {p.land}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">Kinds of cropland, {aState}, each year <InfoTip text={crop ? `${crop.source}: the cropland classes of the ESA land cover maps (rainfed herbaceous crops, tree and shrub crops, irrigated crops, and the two crop and natural vegetation mosaics). Crop species are not in these maps.` : 'ESA CCI land cover'} /></p>
          {!byYear ? <p className="text-sm text-gray-500">Loading the cropland series…</p> : ys.length ? (
            <SeriesChart series={crop.types.map((t) => ({ name: t, color: crop.colors[t], points: ys.map((y) => [y, (byYear[y]?.[t] || 0) / 1000]) }))} unit="thousand ha" digits={0} csvName={`cropland-kinds-${scope}`} xLabel="year" height={260} />
          ) : <p className="text-sm text-gray-600">No land-cover year in the years chosen (2000 to 2020).</p>}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">Change in each kind of cropland, {ys[0] || ''} against {ys[ys.length - 1] || ''} <InfoTip text="Hectares of each kind of cropland in the first and last year chosen. Irrigated and tree crops growing while rainfed crops shrink often marks a change in how the land is farmed." /></p>
          {byYear && ys.length > 1 ? <LandBars from={ys[0]} to={ys[ys.length - 1]} a={byYear[ys[0]]} b={byYear[ys[ys.length - 1]]} types={crop.types} colors={crop.colors} /> : <p className="text-sm text-gray-500">Choose at least two years.</p>}
        </div>
      </div>
      <p className="text-xs text-gray-500">Soil: switch on the Soil layers (organic carbon, pH, clay, sand, nitrogen; SoilGrids 2.0) on the Map page and click the map for a place. Rain: ERA5 at one point inside each state. Cropland: ESA CCI Land Cover, 300 m.</p>
    </div>
  );
}

const EMPTY = { programme: '', indicator: '', unit: '', state: '', year: '', baseline: '', target: '', achieved: '', source: '', notes: '', published: false };

export function Programmes({ signedIn, canEdit, onSignIn, stateNames }) {
  const confirm = useConfirm();
  const [pub, setPub] = useState(null);
  const [mine, setMine] = useState(null);
  const [edit, setEdit] = useState(null);   // {id?: number, ...fields}
  const [err, setErr] = useState('');
  const load = () => {
    fetch(`${API_BASE}/public/platforms/gwon/programmes`).then((r) => r.json()).then((j) => setPub(j.data || [])).catch(() => setPub([]));
    if (signedIn) gwonFetch('/platforms/gwon/programmes').then((j) => setMine(j.data || [])).catch(() => setMine(null));
  };
  useEffect(load, [signedIn]);
  const rows = signedIn && mine ? mine : pub || [];
  const groups = [...new Set(rows.map((r) => r.programme))].sort();
  const save = async () => {
    setErr('');
    const num = (v) => (v === '' || v == null ? null : Number(v));
    const body = { ...edit, year: num(edit.year), baseline: num(edit.baseline), target: num(edit.target), achieved: num(edit.achieved) };
    try {
      await gwonFetch(edit.id ? `/platforms/gwon/programmes/${edit.id}` : '/platforms/gwon/programmes', { method: edit.id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      setEdit(null); load();
    } catch (e) { setErr(e.message); }
  };
  const remove = async (r) => { if (await confirm(`Remove “${r.indicator}” from ${r.programme}?`, { action: 'Remove' })) { await gwonFetch(`/platforms/gwon/programmes/${r.id}`, { method: 'DELETE' }).catch((e) => setErr(e.message)); load(); } };
  const cls = 'w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#007248]';
  const f = (k, label, type = 'text', extra = {}) => (
    <label className="space-y-1"><span className="text-[11px] font-semibold text-gray-600">{label}</span><input type={type} value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} className={cls} {...extra} /></label>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-700">{signedIn ? 'Your organisation’s indicators, drafts too. Published ones are public.' : 'The indicators the Agency has published, each with its source.'}</p>
        <div className="flex gap-2">
          {pub && <CsvButton name="programme-indicators" rows={rows.map((r) => ({ programme: r.programme, indicator: r.indicator, unit: r.unit, state: r.state, year: r.year, baseline: r.baseline, target: r.target, achieved: r.achieved, source: r.source, published: r.published }))} />}
          {canEdit ? <button type="button" onClick={() => setEdit({ ...EMPTY })} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007248] text-white text-sm font-semibold"><Plus size={15} /> Add an indicator</button>
            : !signedIn && <button type="button" onClick={onSignIn} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Sign in to publish</button>}
        </div>
      </div>
      {edit && (
        <div className="rounded-2xl border border-[#A9D9BF] bg-white p-5 space-y-3">
          <p className="font-semibold text-gray-900">{edit.id ? 'Change the indicator' : 'A new indicator'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {f('programme', 'Programme (e.g. ACReSAL)')}{f('indicator', 'Indicator')}{f('unit', 'Unit (ha, trees, people)')}
            <label className="space-y-1"><span className="text-[11px] font-semibold text-gray-600">State (empty: the whole frontline)</span><select value={edit.state} onChange={(e) => setEdit({ ...edit, state: e.target.value })} className={cls}><option value="">The frontline</option>{stateNames.map((s) => <option key={s}>{s}</option>)}</select></label>
            {f('year', 'Year', 'number')}{f('baseline', 'Baseline', 'number')}{f('target', 'Target', 'number')}{f('achieved', 'Achieved', 'number')}
          </div>
          {f('source', 'Source (needed to publish)')}
          {f('notes', 'Notes')}
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700"><input type="checkbox" checked={!!edit.published} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} className="accent-[#007248]" /> Publish (shown to the public)</label>
          {err && <p className="text-sm text-red-700">{err}</p>}
          <div className="flex gap-2"><button type="button" onClick={save} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007248] text-white text-sm font-semibold"><Check size={15} /> Save</button><button type="button" onClick={() => { setEdit(null); setErr(''); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700"><X size={15} /> Cancel</button></div>
        </div>
      )}
      {pub == null ? <p className="text-sm text-gray-500">Loading…</p> : !rows.length ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">No programme indicators are published yet. {canEdit ? 'Add the first one above.' : 'The Agency publishes them here, each with its source.'}</div>
      ) : groups.map((g) => (
        <section key={g} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="font-display text-lg font-semibold text-gray-900">{g}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {rows.filter((r) => r.programme === g).map((r) => {
              const pct = r.target ? Math.max(0, Math.min(100, ((r.achieved || 0) - (r.baseline || 0)) / ((r.target - (r.baseline || 0)) || 1) * 100)) : null;
              return (
                <div key={r.id} className="rounded-xl border border-gray-200 p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900">{r.indicator}{r.state ? `, ${r.state}` : ''}{r.year ? ` (${r.year})` : ''}</p>
                    {canEdit && <span className="flex gap-1 shrink-0"><button type="button" onClick={() => setEdit({ ...r, year: r.year ?? '', baseline: r.baseline ?? '', target: r.target ?? '', achieved: r.achieved ?? '' })} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Change"><Pencil size={14} /></button><button type="button" onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-red-700" aria-label="Remove"><Trash2 size={14} /></button></span>}
                  </div>
                  <p className="text-sm text-gray-700">Achieved <span className="font-semibold">{fmt(r.achieved)} {r.unit}</span>{r.target != null && <> of a target of {fmt(r.target)} {r.unit}</>}{r.baseline != null && <>, from a baseline of {fmt(r.baseline)}</>}</p>
                  {pct != null && <div className="h-2.5 rounded bg-gray-100"><div className="h-full rounded bg-[#007248]" style={{ width: `${pct}%` }} /></div>}
                  <p className="text-xs text-gray-500">Source: {r.source || 'not given'}{signedIn && !r.published ? ' · draft, not public' : ''}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
