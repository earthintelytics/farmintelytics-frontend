/**
 * People, drilled down: the LGAs of the chosen state, then the wards of the chosen LGA, coloured by population,
 * people per km² or people displaced. Click an area to go one level down; the breadcrumb goes back up.
 * Figures from public/gwon-data/admin/people_<state>.json (scripts/gwon_people_drilldown.py): WorldPop 2020
 * (1 km, UN-adjusted) summed over each boundary, and IOM DTM displacement by LGA and ward.
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import InfoTip from '../../components/page/InfoTip';
import Choropleth from './Choropleth';
import { CsvButton } from './csv';

const fmt = (n, d = 0) => (n == null || !Number.isFinite(n) ? '—' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d }));
const RAMP = ['#E8F5EE', '#A9D9BF', '#5DB487', '#1F8A57', '#0E5A38'];

// Area of a boundary in km² (spherical, well under 1% off at LGA and ward size).
function km2(g) {
  const R = 6378137, rad = Math.PI / 180;
  const ring = (r) => { let a = 0; for (let i = 0; i < r.length - 1; i++) { const [x1, y1] = r[i], [x2, y2] = r[i + 1]; a += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad)); } return Math.abs((a * R * R) / 2); };
  const polys = g?.type === 'Polygon' ? [g.coordinates] : g?.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.reduce((s, p) => s + ring(p[0]) - p.slice(1).reduce((h, r) => h + ring(r), 0), 0) / 1e6;
}

export default function PeopleDrill({ scope, adminFile, lga, ward, lgaList, wardList, onLga, onWard, onScope, dark }) {
  const [data, setData] = useState(null);
  const [metric, setMetric] = useState('population');
  useEffect(() => {
    if (!adminFile) return undefined;
    let live = true;
    fetch(`/gwon-data/admin/people_${adminFile}.json`).then((r) => r.json()).then((d) => { if (live) setData({ file: adminFile, d }); }).catch(() => {});
    return () => { live = false; };
  }, [adminFile]);
  const d = data && data.file === adminFile ? data.d : null;
  const level = lga ? 'ward' : 'lga';
  const shapes = useMemo(() => (level === 'ward' ? (wardList ? { type: 'FeatureCollection', features: wardList.features.filter((f) => f.properties.lga === lga) } : null) : lgaList), [level, wardList, lgaList, lga]);
  const nameOf = level === 'ward' ? (f) => f.properties.name : (f) => f.properties.name;
  const rows = useMemo(() => (shapes && d ? shapes.features.map((f) => {
    const n = f.properties.name;
    const v = level === 'ward' ? d.wards[`${lga}|${n}`] : d.lgas[n];
    const area = km2(f.geometry);
    return { name: n, population_2020: v?.population_2020 ?? null, area_km2: area, density: v?.population_2020 != null && area ? v.population_2020 / area : null, idps: v?.idps ?? null };
  }) : []), [shapes, d, level, lga]);
  const M = { population: ['People, 2020', 'population_2020', 0], density: ['People per km²', 'density', 0], idps: ['People displaced', 'idps', 0] };
  const [ml, mk, md] = M[metric];
  const vals = rows.map((r) => r[mk]).filter((v) => v != null).sort((a, b) => a - b);
  const q = (f) => vals[Math.min(vals.length - 1, Math.floor(f * vals.length))];
  const cuts = vals.length ? [q(0.2), q(0.4), q(0.6), q(0.8)] : [];
  const color = (name) => { const r = rows.find((x) => x.name === name); const v = r?.[mk]; return v == null ? '#E5E7EB' : RAMP[cuts.filter((c) => v > c).length]; };
  const total = rows.reduce((s, r) => s + (r.population_2020 || 0), 0);
  const idpTotal = rows.some((r) => r.idps != null) ? rows.reduce((s, r) => s + (r.idps || 0), 0) : null;
  const crumb = 'text-sm font-semibold text-[#007248] hover:underline';
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Drill down">
          <button type="button" onClick={() => onScope('all')} className={crumb}>Frontline</button><ChevronRight size={14} className="text-gray-400" />
          {lga ? <button type="button" onClick={() => onLga('')} className={crumb}>{scope}</button> : <span className="font-semibold text-gray-900">{scope}</span>}
          {lga && <><ChevronRight size={14} className="text-gray-400" />{ward ? <button type="button" onClick={() => onWard('')} className={crumb}>{lga}</button> : <span className="font-semibold text-gray-900">{lga}</span>}</>}
          {ward && <><ChevronRight size={14} className="text-gray-400" /><span className="font-semibold text-gray-900">{ward}</span></>}
          <InfoTip text="Click an area on the map to go one level down: state, LGA, ward. WorldPop 2020 population (1 km, UN-adjusted) summed over each boundary; people displaced from IOM DTM site lists. Poverty is published by state only." />
        </nav>
        <div className="flex items-center gap-2">
          <select value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Measure" className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold">{Object.entries(M).map(([k, m]) => <option key={k} value={k}>{m[0]}</option>)}</select>
          <CsvButton name={`people-${scope}-${lga || 'lgas'}`} rows={rows.map((r) => ({ [level === 'ward' ? 'ward' : 'lga']: r.name, population_2020: r.population_2020, area_km2: Math.round(r.area_km2 * 10) / 10, people_per_km2: r.density == null ? null : Math.round(r.density), people_displaced: r.idps }))} />
        </div>
      </div>
      {!d || !shapes ? <p className="text-sm text-gray-500">Loading the {level === 'ward' ? 'wards' : 'LGAs'}…</p> : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-4">
          <div>
            <Choropleth states={shapes} nameOf={nameOf} dark={dark} picked={level === 'ward' ? ward : lga} height={420}
              onPick={(n) => (level === 'ward' ? onWard(n) : onLga(n))} colorOf={color}
              label={(n) => { const r = rows.find((x) => x.name === n); return `<b>${n}</b><br/>${ml}: ${fmt(r?.[mk], md)}${level === 'lga' ? '<br/><i>Click for its wards</i>' : ''}`; }}
              legend={cuts.length ? RAMP.map((c, i) => ({ color: c, label: i === 0 ? `up to ${fmt(cuts[0])}` : i === 4 ? `over ${fmt(cuts[3])}` : `${fmt(cuts[i - 1])} to ${fmt(cuts[i])}` })).concat(metric === 'idps' ? [{ color: '#E5E7EB', label: 'not covered by IOM DTM' }] : []) : null} />
            <p className="text-xs text-gray-600 mt-2">{rows.length} {level === 'ward' ? 'wards' : 'LGAs'} · {fmt(total)} people (WorldPop 2020){idpTotal != null ? ` · ${fmt(idpTotal)} displaced (IOM DTM)` : ''}</p>
          </div>
          <div className="overflow-auto max-h-[470px] rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-[#007248] text-white text-left sticky top-0"><tr><th className="px-3 py-2">{level === 'ward' ? 'Ward' : 'LGA'}</th><th className="px-3 py-2 text-right">People</th><th className="px-3 py-2 text-right">Per km²</th><th className="px-3 py-2 text-right">Displaced</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {[...rows].sort((a, b) => (b[mk] ?? -1) - (a[mk] ?? -1)).map((r) => (
                  <tr key={r.name} onClick={() => (level === 'ward' ? onWard(r.name) : onLga(r.name))} className={`cursor-pointer hover:bg-gray-50 ${(level === 'ward' ? ward : lga) === r.name ? 'bg-[#F1F9F4]' : ''}`}>
                    <td className="px-3 py-1.5 font-semibold">{r.name}</td><td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.population_2020)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmt(r.density)}</td><td className="px-3 py-1.5 text-right tabular-nums">{r.idps == null ? '—' : fmt(r.idps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
