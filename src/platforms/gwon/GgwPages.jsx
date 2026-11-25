/**
 * GWON: Gender (women and men in each state, and the gender figures the Agency publishes), Climate resilience
 * (a transparent score per state from exposure, sensitivity and the land, with weights the reader can change) and
 * the Data catalogue (GWON's datasets as a STAC catalogue, and the public API).
 */
import { useEffect, useMemo, useState } from 'react';
import { Database, Download, Link2 } from 'lucide-react';
import InfoTip from '../../components/page/InfoTip';
import Choropleth from './Choropleth';
import { StateBars } from './Charts';
import { CsvButton } from './csv';
import { API_BASE } from '../../services/apiBase';

const fmt = (n, d = 0) => (n == null || !Number.isFinite(Number(n)) ? '—' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d }));
function useFile(url) {
  const [d, setD] = useState(null);
  useEffect(() => { let live = true; fetch(url).then((r) => r.json()).then((x) => { if (live) setD(x); }).catch(() => {}); return () => { live = false; }; }, [url]);
  return d;
}
const Card = ({ title, tip, right, children }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2 min-w-0">
    <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold flex items-center gap-1.5">{title} {tip && <InfoTip text={tip} />}</p>{right}</div>
    {children}
  </div>
);

/* ───────────── Gender ───────────── */
export function Gender({ scope, aState }) {
  const socio = useFile('/gwon-data/socioeconomic.json');
  const [prog, setProg] = useState(null);
  useEffect(() => { fetch(`${API_BASE}/public/platforms/gwon/programmes`).then((r) => r.json()).then((j) => setProg(j.data || [])).catch(() => setProg([])); }, []);
  if (!socio) return <p className="text-sm text-gray-500">Loading…</p>;
  const st = socio.states;
  const names = scope === 'all' ? Object.keys(st) : [scope];
  const sum = (f) => names.reduce((s, n) => s + (f(st[n]) || 0), 0);
  const women = sum((x) => x.population?.female), men = sum((x) => x.population?.male);
  const ages = Object.keys(st[names[0]]?.population?.women_by_age || {});
  const pyramid = ages.map((a) => ({ age: a.replace('_', ' to ').replace('80Plus', '80+'), women: sum((x) => x.population.women_by_age[a]), men: sum((x) => x.population.men_by_age[a]) }));
  const maxA = Math.max(1, ...pyramid.flatMap((r) => [r.women, r.men]));
  const w1549 = sum((x) => ['15_19', '20_24', '25_29', '30_34', '35_39', '40_44', '45_49'].reduce((s, a) => s + (x.population.women_by_age[a] || 0), 0));
  const youth = sum((x) => x.population?.age_15_34);
  const total = women + men;
  const genderInd = (prog || []).filter((r) => /women|woman|female|girl|gender|youth/i.test(`${r.indicator} ${r.notes}`));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[['Women', fmt(women), `${fmt((women / (women + men || 1)) * 100, 1)}% of the people`], ['Men', fmt(men), `${fmt((men / (women + men || 1)) * 100, 1)}%`],
          ['Men for every 100 women', fmt((men / (women || 1)) * 100, 1), 'sex ratio, 2022'], ['Young people, 15 to 34', fmt(youth), `${fmt((youth / (total || 1)) * 100, 1)}% of the people`]].map(([l, v, s]) => (
          <div key={l} className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-xs font-semibold text-gray-600">{l}</p><p className="font-display text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{v}</p><p className="text-[11px] text-gray-500 mt-0.5">{s}</p></div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={`Women and men by age, ${aState}, 2022`} tip={socio.sources.population} right={<CsvButton name={`women-men-by-age-${scope}`} rows={pyramid} />}>
          <div className="flex justify-between text-xs font-semibold text-gray-600 px-1"><span>Men</span><span>Women</span></div>
          <div className="space-y-1">
            {[...pyramid].reverse().map((r) => (
              <div key={r.age} className="grid grid-cols-[1fr_64px_1fr] items-center gap-2 text-xs">
                <div className="flex justify-end"><div className="h-3.5 rounded-l bg-[#2563EB]" style={{ width: `${(r.men / maxA) * 100}%` }} title={`${fmt(r.men)} men`} /></div>
                <span className="text-center text-gray-600 tabular-nums">{r.age}</span>
                <div><div className="h-3.5 rounded-r bg-[#BE185D]" style={{ width: `${(r.women / maxA) * 100}%` }} title={`${fmt(r.women)} women`} /></div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Women in every frontline state" tip={socio.sources.population}>
          <StateBars unit="women" rows={Object.entries(st).map(([s, x]) => ({ label: s, value: x.population?.female || 0, color: s === scope ? '#0E2D41' : '#BE185D' })).sort((a, b) => b.value - a.value)} />
        </Card>
      </div>
      <Card title="Gender and youth in the programmes" tip="The indicators the Agency publishes about women, girls, youth or gender (Reports, Programmes). The Great Green Wall Accelerator asks for results counted by sex where they can be.">
        {prog == null ? <p className="text-sm text-gray-500">Loading…</p> : genderInd.length ? (
          <ul className="divide-y divide-gray-100">{genderInd.map((r) => <li key={r.id} className="py-2 text-sm"><span className="font-semibold">{r.programme}: {r.indicator}</span> · {fmt(r.achieved)} {r.unit}{r.target != null ? ` of ${fmt(r.target)}` : ''}{r.year ? ` (${r.year})` : ''} <span className="text-xs text-gray-500">· {r.source}</span></li>)}</ul>
        ) : <p className="text-sm text-gray-600">No gender figures are published yet. When the Agency publishes an indicator about women, girls, youth or gender in Programmes (for example "women in nursery groups"), it shows here.</p>}
      </Card>
      <p className="text-xs text-gray-500">Women aged 15 to 49: {fmt(w1549)}. Population by sex and age: OCHA COD-PS Nigeria 2022. Sex-disaggregated poverty and displacement are not in the sources GWON reads yet.</p>
    </div>
  );
}

/* ───────────── Climate resilience ───────────── */
const PARTS = [
  ['drought', 'Drought (share of months with SPEI-12 of -1 or lower since 2015)', 'Exposure'],
  ['heat', 'Heat (hot days of 40 °C or more, mean of 2015-2024)', 'Exposure'],
  ['poverty', 'Poverty (MPI headcount)', 'Sensitivity'],
  ['children', 'Children under 15 (share of the people)', 'Sensitivity'],
  ['bare', 'Bare and sparse land (share, latest year)', 'Land'],
  ['trees', 'Little tree cover (share under trees, lower is worse)', 'Land'],
];
export function Resilience({ scope, frontline, dark, series, land, onScope }) {
  const idx = useFile('/gwon-data/drought_indices.json');
  const socio = useFile('/gwon-data/socioeconomic.json');
  const [w, setW] = useState(() => Object.fromEntries(PARTS.map(([k]) => [k, 1])));
  const rows = useMemo(() => {
    if (!idx || !socio || !series || !land) return [];
    return Object.keys(idx.states).map((s) => {
      const x = idx.states[s];
      const sp = x.month.map((m, i) => [m, x.spei12[i]]).filter(([m, v]) => m >= '2015-01' && v != null);
      const yrs = (series.states[s]?.annual || []).filter((r) => r.full && r.year <= 2024);
      const lo = land.states[s]; const yy = land.years.filter((y) => lo?.[y]); const o = lo?.[yy[yy.length - 1]] || {};
      const tot = land.types.reduce((a, t) => a + (o[t] || 0), 0) || 1;
      const p = socio.states[s]?.population;
      return { state: s, drought: sp.length ? (sp.filter(([, v]) => v <= -1).length / sp.length) * 100 : null, heat: yrs.length ? yrs.reduce((a, r) => a + r.hot_days, 0) / yrs.length : null,
        poverty: socio.states[s]?.poverty?.poor_pct ?? null, children: p ? (p.under_15 / p.total) * 100 : null,
        bare: (((o['Bare land'] || 0) + (o['Sparse vegetation'] || 0)) / tot) * 100, trees: ((o['Tree cover'] || 0) / tot) * 100 };
    });
  }, [idx, socio, series, land]);
  const scored = useMemo(() => {
    const scale = (k) => { const v = rows.map((r) => r[k]).filter((x) => x != null); const lo = Math.min(...v), hi = Math.max(...v); return (x) => (x == null || hi === lo ? 0.5 : k === 'trees' ? (hi - x) / (hi - lo) : (x - lo) / (hi - lo)); };
    const sc = Object.fromEntries(PARTS.map(([k]) => [k, scale(k)]));
    const wt = PARTS.reduce((a, [k]) => a + Number(w[k]), 0) || 1;
    return rows.map((r) => { const risk = PARTS.reduce((a, [k]) => a + sc[k](r[k]) * Number(w[k]), 0) / wt; return { ...r, risk: Math.round(risk * 100), resilience: Math.round((1 - risk) * 100) }; }).sort((a, b) => a.resilience - b.resilience);
  }, [rows, w]);
  if (!scored.length) return <p className="text-sm text-gray-500">Loading the figures…</p>;
  const RAMP = ['#B42318', '#EA580C', '#FBBF24', '#A9D9BF', '#1F8A57'];
  const col = (s) => { const r = scored.find((x) => x.state === s); return r ? RAMP[Math.min(4, Math.floor(r.resilience / 20))] : '#E5E7EB'; };
  const pick = scope !== 'all' ? scored.find((r) => r.state === scope) : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <Card title="Climate resilience score, every frontline state" tip="0 is the least resilient of the eleven states on these figures, 100 the most. It compares the states with each other; it is not an absolute measure. Click a state to filter every page to it.">
          <Choropleth states={frontline} dark={dark} picked={scope !== 'all' ? scope : null} onPick={onScope} colorOf={col} height={380}
            label={(s) => { const r = scored.find((x) => x.state === s); return `<b>${s}</b><br/>Resilience score ${r?.resilience ?? '—'} of 100`; }}
            legend={RAMP.map((c, i) => ({ color: c, label: `${i * 20} to ${i * 20 + 20}` }))} />
        </Card>
        <Card title="How the score is made: change the weights" tip="Each figure is scaled from the best to the worst of the eleven states, weighted, and averaged into a risk; resilience is 100 minus the risk. Set a weight to 0 to leave a figure out.">
          <div className="space-y-2.5">
            {PARTS.map(([k, l, g]) => (
              <label key={k} className="block">
                <span className="flex justify-between text-xs text-gray-700"><span><span className="text-gray-500">{g} · </span>{l}</span><span className="tabular-nums font-semibold">{w[k]}</span></span>
                <input type="range" min="0" max="3" step="1" value={w[k]} onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })} className="w-full accent-[#007248]" />
              </label>
            ))}
          </div>
          {pick && <p className="text-sm text-gray-700 pt-1"><span className="font-semibold">{pick.state}</span>: resilience {pick.resilience} of 100, {scored.indexOf(pick) + 1} of 11 from the least resilient.</p>}
        </Card>
      </div>
      <Card title="The figures behind the score" tip="Sources: ERA5 (SPEI-12, hot days), Global MPI (DHS 2024), OCHA COD-PS 2022, ESA CCI land cover." right={<CsvButton name="climate-resilience" rows={scored.map((r) => ({ state: r.state, resilience_score: r.resilience, drought_months_pct: Math.round(r.drought), hot_days_a_year: Math.round(r.heat), poor_pct: r.poverty, children_pct: Math.round(r.children * 10) / 10, bare_sparse_pct: Math.round(r.bare * 10) / 10, tree_cover_pct: Math.round(r.trees * 10) / 10 }))} />}>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-[#007248] text-white text-left"><tr>{['State', 'Resilience', 'Drought months %', 'Hot days', 'Poor %', 'Under 15 %', 'Bare/sparse %', 'Tree cover %'].map((h) => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {scored.map((r) => (
                <tr key={r.state} className={r.state === scope ? 'bg-[#F1F9F4]' : ''}><td className="px-3 py-1.5 font-semibold">{r.state}</td>
                  <td className="px-3 py-1.5"><div className="flex items-center gap-2"><div className="w-20 h-2.5 rounded bg-gray-100"><div className="h-full rounded" style={{ width: `${r.resilience}%`, background: RAMP[Math.min(4, Math.floor(r.resilience / 20))] }} /></div><span className="tabular-nums">{r.resilience}</span></div></td>
                  <td className="px-3 py-1.5 tabular-nums">{fmt(r.drought)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.heat)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.poverty, 1)}</td>
                  <td className="px-3 py-1.5 tabular-nums">{fmt(r.children, 1)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.bare, 1)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.trees, 1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ───────────── Data catalogue and API ───────────── */
export function DataCatalogue() {
  const cat = useFile('/gwon-data/stac/catalog.json');
  const [cols, setCols] = useState([]);
  useEffect(() => {
    if (!cat) return;
    Promise.all(cat.links.filter((l) => l.rel === 'child').map((l) => fetch(`/gwon-data/stac/${l.href.replace('./', '')}`).then((r) => r.json()).catch(() => null))).then((x) => setCols(x.filter(Boolean)));
  }, [cat]);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const api = `${origin}${API_BASE}`;
  const code = 'rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre';
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#A9D9BF] bg-[#F1F9F4] p-4 text-sm text-gray-700 flex flex-wrap items-center justify-between gap-3">
        <span>Every dataset behind GWON, free to download, as a <b>STAC catalogue</b> (the open standard for geospatial data) that other systems can read.</span>
        <a href="/gwon-data/stac/catalog.json" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"><Link2 size={15} /> catalog.json</a>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {cols.map((c) => {
          const a = c.assets.data; const [t0, t1] = c.extent.temporal.interval[0];
          return (
            <article key={c.id} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
              <p className="flex items-center gap-2 font-semibold text-gray-900"><Database size={16} className="text-[#007248]" /> {c.title}</p>
              <p className="text-sm text-gray-700">{c.description}</p>
              <p className="text-xs text-gray-500">{c.providers[0].name} · licence {c.license} · {t0?.slice(0, 4)} to {t1 ? t1.slice(0, 4) : 'now'}{a.updated ? ` · updated ${a.updated.slice(0, 10)}` : ''}{a['file:size'] ? ` · ${fmt(a['file:size'] / 1024)} KB` : ''}</p>
              <div className="flex gap-2 pt-1">
                <a href={`/gwon-data/stac/${a.href.replace('../../', '../').replace('../', '')}`.replace('/stac/', '/')} download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#007248] text-white text-xs font-semibold"><Download size={13} /> Download</a>
                <a href={`/gwon-data/stac/${c.id}.json`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700">STAC record</a>
              </div>
            </article>
          );
        })}
      </div>
      <Card title="Public API" tip="No key needed for these; please cache what you use. The organisation's own data (sites, drafts) needs a GWON sign-in.">
        <div className="space-y-3 text-sm text-gray-700">
          <div><p className="font-semibold">The catalogue and every dataset</p><p className={code}>{`curl ${origin}/gwon-data/stac/catalog.json\ncurl ${origin}/gwon-data/drought_indices.json`}</p></div>
          <div><p className="font-semibold">Published programme indicators</p><p className={code}>{`curl ${api}/public/platforms/gwon/programmes`}</p></div>
          <div><p className="font-semibold">Fires over the frontline, the last 1 to 10 days (NASA FIRMS, GeoJSON)</p><p className={code}>{`curl "${api}/public/platforms/gwon/fires?days=2"`}</p></div>
        </div>
      </Card>
    </div>
  );
}
