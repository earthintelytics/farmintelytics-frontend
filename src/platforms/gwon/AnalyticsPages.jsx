/**
 * GWON's analysis pages: drought indices (SPI, SPEI, percent of normal, deciles), climate futures (CMIP6 scenarios
 * and models), people and livelihoods (population, poverty, displacement), compare (any series across states and
 * years) and the scenario planner. Every figure comes from a saved file in public/gwon-data, made by the scripts in
 * scripts/gwon_*.py from named public sources; nothing is invented. Each chart can be downloaded as CSV.
 */
import { useEffect, useMemo, useState } from 'react';
import InfoTip from '../../components/page/InfoTip';
import SeriesChart from './SeriesChart';
import { PALETTE } from './palette';
import { CsvButton } from './csv';
import { StateBars } from './Charts';
import Choropleth from './Choropleth';

const fmt = (n, d = 0) => (n == null || !Number.isFinite(n) ? '—' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d }));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (m, long) => (long ? `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}` : m.slice(0, 4));
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

function useJson(url) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }).then((d) => { if (live) setData(d); }).catch((e) => { if (live) setErr(e.message); });
    return () => { live = false; };
  }, [url]);
  return [data, err];
}

function Card({ title, tip, children, right }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">{title} {tip && <InfoTip text={tip} />}</p>
        {right}
      </div>
      {children}
    </div>
  );
}

function Seg({ value, onChange, options, label }) {
  return (
    <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id} type="button" onClick={() => onChange(id)} aria-pressed={value === id}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${value === id ? 'bg-white border border-gray-200 text-[#0E2D41]' : 'text-gray-600 hover:text-gray-900'}`}>{text}</button>
      ))}
    </div>
  );
}

function Field({ label, tip, children }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">{label} {tip && <InfoTip text={tip} side="bottom" />}</span>
      {children}
    </label>
  );
}
const inputCls = 'px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 outline-none focus:border-[#007248] w-full';

const Loading = ({ err, what }) => <p className="text-sm text-gray-500">{err ? `Could not load ${what} (${err}).` : `Loading ${what}…`}</p>;

/* ───────────────────────────── Drought indices ───────────────────────────── */

// WMO classes for SPI and SPEI.
const DCLASS = [
  { min: 2, label: 'Extremely wet', color: '#1D4ED8' }, { min: 1.5, label: 'Very wet', color: '#3B82F6' }, { min: 1, label: 'Moderately wet', color: '#93C5FD' },
  { min: -1, label: 'Near normal', color: '#D1D5DB' }, { min: -1.5, label: 'Moderately dry', color: '#FBBF24' }, { min: -2, label: 'Severely dry', color: '#EA580C' },
  { min: -Infinity, label: 'Extremely dry', color: '#991B1B' },
];
const classOf = (v) => (v == null ? null : DCLASS.find((c) => v >= c.min));
const INDICES = [
  ['spi1', 'SPI-1', 'Rain of one month against the same month in 1991-2020. Shows short dry spells.'],
  ['spi3', 'SPI-3', 'Three months of rain: the season. The usual index for crops and young trees.'],
  ['spi6', 'SPI-6', 'Six months of rain: the whole rainy season against normal.'],
  ['spi12', 'SPI-12', 'Twelve months of rain: long droughts that lower soil water and wells.'],
  ['spei3', 'SPEI-3', 'Like SPI-3 but rain minus the water the air takes (FAO-56 evaporation): heat makes it drier.'],
  ['spei6', 'SPEI-6', 'Six months of rain minus evaporation.'],
  ['spei12', 'SPEI-12', 'Twelve months of rain minus evaporation: the long-term water balance.'],
  ['pct_normal', '% of normal', "The month's rain as a percent of its 1991-2020 mean."],
  ['decile', 'Decile', "The month's rain decile against 1991-2020: 1 is among the driest tenth, 10 the wettest."],
];

function scopeSeries(data, scope, key) {
  const names = scope === 'all' ? Object.keys(data.states) : [scope];
  const first = data.states[names[0]];
  if (!first) return [];
  return first.month.map((m, i) => [m, mean(names.map((n) => data.states[n]?.[key]?.[i]))]);
}

export function DroughtIndices({ scope, inYears, aState, frontline, dark, onScope }) {
  const [data, err] = useJson('/gwon-data/drought_indices.json');
  const [idx, setIdx] = useState('spi3');
  const [view, setView] = useState('map');
  const [mk, setMk] = useState(null);
  const [pick, setPick] = useState(null);
  if (!data) return <Loading err={err} what="the drought indices" />;
  const meta = INDICES.find((x) => x[0] === idx);
  const z = idx.startsWith('sp');
  const pts = scopeSeries(data, scope, idx).filter(([m]) => inYears(Number(m.slice(0, 4))));
  const latest = [...pts].reverse().find((p) => p[1] != null);
  const months = Object.values(data.states)[0].month;
  const lastK = months.length - 1 - [...months].reverse().findIndex((_, j) => Object.values(data.states).some((s) => s.spi3[months.length - 1 - j] != null));
  const stateRows = Object.entries(data.states).map(([s, v]) => ({ state: s, ...Object.fromEntries(INDICES.map(([k]) => [k, v[k][lastK]])) }));
  // Months in drought (index of -1 or lower) each year, for the scope.
  const byYear = {};
  pts.forEach(([m, v]) => { if (v == null || !z) return; const y = m.slice(0, 4); byYear[y] = byYear[y] || { n: 0, dry: 0, severe: 0 }; byYear[y].n += 1; byYear[y].dry += v <= -1; byYear[y].severe += v <= -1.5; });
  const yearRows = Object.entries(byYear).map(([y, r]) => ({ year: Number(y), months_dry: r.dry, months_severe: r.severe }));
  // The drought calendar: every state, the last 36 months (or the chosen years).
  const calMonths = months.filter((m) => inYears(Number(m.slice(0, 4)))).slice(-36);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-4">
        <Field label="Index" tip="SPI uses rain only; SPEI also counts the water the air takes, so heat makes it drier. The number after the name is how many months are added up.">
          <select value={idx} onChange={(e) => setIdx(e.target.value)} className={`${inputCls} min-w-[180px]`}>
            {INDICES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="View"><Seg value={view} onChange={setView} label="View" options={[['map', 'Map'], ['timeline', 'Month by month'], ['calendar', 'Drought calendar'], ['years', 'Dry months each year'], ['table', 'All indices now']]} /></Field>
        <p className="text-xs text-gray-600 max-w-xl">{meta[2]}</p>
      </div>
      {z && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {DCLASS.map((c) => <span key={c.label} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: c.color }} />{c.label} ({c.min === -Infinity ? 'under -2' : c.min === 2 ? '2 and above' : c.min >= 1 ? `${c.min} to ${c.min === 1 ? 1.5 : 2}` : c.min === -1 ? '-1 to 1' : `${c.min} to ${c.min + 0.5}`})</span>)}
        </div>
      )}
      {view === 'timeline' && (
        <Card title={`${meta[1]}, ${aState}, month by month`} tip={`${data.source}. ${z ? `Baseline ${data.baseline}. Method: ${idx.startsWith('spi') ? data.methods.spi : data.methods.spei}.` : `Baseline ${data.baseline}.`}${scope === 'all' ? ' The frontline: the mean of the eleven states.' : ''}`}
          right={latest && <span className="text-xs text-gray-600 text-right">Latest, {monthLabel(latest[0], true)}: <span className="font-semibold text-gray-900">{fmt(latest[1], z ? 2 : 0)}</span>{z && <span> · {classOf(latest[1])?.label}</span>}</span>}>
          <SeriesChart series={[{ name: meta[1], color: '#007248', points: pts }]} bars colorOf={z ? (v) => classOf(v).color : (v) => (idx === 'decile' ? (v <= 3 ? '#EA580C' : v >= 8 ? '#3B82F6' : '#D1D5DB') : v < 80 ? '#EA580C' : v > 120 ? '#3B82F6' : '#9CA3AF')}
            refs={z ? [{ y: -1, label: 'Moderately dry', color: '#D97706' }, { y: -2, label: 'Extremely dry', color: '#991B1B' }] : idx === 'pct_normal' ? [{ y: 100, label: 'Normal' }] : []}
            xFmt={monthLabel} digits={z ? 2 : 0} unit={idx === 'pct_normal' ? '%' : ''} csvName={`${meta[1]}-${scope}`} xLabel="month" height={260} />
        </Card>
      )}
      {view === 'calendar' && (
        <Card title={`Drought calendar, ${meta[1]}, every frontline state`} tip="Each square is one month in one state, coloured by its class. Read across for a state's history, down for how widespread a drought was."
          right={<CsvButton name={`drought-calendar-${idx}`} rows={() => Object.entries(data.states).map(([s, v]) => ({ state: s, ...Object.fromEntries(calMonths.map((m) => [m, v[idx][v.month.indexOf(m)]])) }))} />}>
          <div className="overflow-x-auto">
            <table className="text-[11px] border-separate" style={{ borderSpacing: 2 }}>
              <thead><tr><th />{calMonths.map((m, i) => <th key={m} className="font-normal text-gray-500 px-0.5">{i % 3 === 0 ? monthLabel(m, true) : ''}</th>)}</tr></thead>
              <tbody>
                {Object.entries(data.states).map(([s, v]) => (
                  <tr key={s}><td className={`pr-2 whitespace-nowrap ${s === scope ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{s}</td>
                    {calMonths.map((m) => {
                      const val = v[idx][v.month.indexOf(m)];
                      const c = z ? classOf(val) : null;
                      const color = z ? c?.color : val == null ? '#F3F4F6' : idx === 'decile' ? (val <= 3 ? '#EA580C' : val >= 8 ? '#3B82F6' : '#E5E7EB') : val < 80 ? '#EA580C' : val > 120 ? '#3B82F6' : '#E5E7EB';
                      return <td key={m} title={`${s}, ${monthLabel(m, true)}: ${val == null ? 'no data' : fmt(val, z ? 2 : 0)}${c ? ` (${c.label})` : ''}`} style={{ background: color || '#F3F4F6', width: 16, height: 16, borderRadius: 3 }} />;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {view === 'years' && (
        z ? (
          <Card title={`Months in drought each year, ${meta[1]}, ${aState}`} tip="Months with the index at -1 or lower (moderately dry or worse), and at -1.5 or lower (severely dry or worse), in each year.">
            <SeriesChart series={[{ name: 'Months moderately dry or worse', color: '#D97706', points: yearRows.map((r) => [r.year, r.months_dry]) }, { name: 'Months severely dry or worse', color: '#991B1B', points: yearRows.map((r) => [r.year, r.months_severe]) }]}
              unit="months" digits={0} zero csvName={`dry-months-${idx}-${scope}`} xLabel="year" />
          </Card>
        ) : <p className="text-sm text-gray-600">Choose SPI or SPEI to count the months in drought.</p>
      )}
      {view === 'map' && (() => {
        const k = mk ?? lastK;
        const m = months[k];
        const colorOf = (s) => { const v = data.states[s]?.[idx]?.[k]; if (v == null) return '#E5E7EB'; if (z) return classOf(v).color; if (idx === 'decile') return v <= 3 ? '#EA580C' : v >= 8 ? '#3B82F6' : '#D1D5DB'; return v < 80 ? '#EA580C' : v > 120 ? '#3B82F6' : '#D1D5DB'; };
        const lbl = (s) => { const v = data.states[s]?.[idx]?.[k]; return `<b>${s}</b><br/>${meta[1]}, ${monthLabel(m, true)}: ${v == null ? 'no data' : fmt(v, z ? 2 : 0)}${z && v != null ? ` (${classOf(v).label})` : ''}`; };
        const ps = pick || (scope !== 'all' ? scope : null);
        const sv = ps ? data.states[ps] : null;
        const vals = sv ? sv[idx].filter((v) => v != null) : [];
        const dist = z ? DCLASS.map((c, i) => ({ c, n: vals.filter((v) => v >= c.min && (i === 0 || v < DCLASS[i - 1].min)).length })) : [];
        const nowV = sv ? sv[idx][k] : null;
        return (
          <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-4">
            <Card title={`${meta[1]}, every frontline state, ${monthLabel(m, true)}`} tip="Each state coloured by its class that month. Move the slider through the months since 1991; click a state for its own distribution.">
              <Choropleth states={frontline} colorOf={colorOf} label={lbl} picked={ps} onPick={setPick} dark={dark} height={400}
                legend={z ? DCLASS.map((c) => ({ color: c.color, label: c.label })) : [{ color: '#EA580C', label: idx === 'decile' ? 'Deciles 1-3 (dry)' : 'Under 80% of normal' }, { color: '#D1D5DB', label: 'Near normal' }, { color: '#3B82F6', label: idx === 'decile' ? 'Deciles 8-10 (wet)' : 'Over 120% of normal' }]} />
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={() => setMk(Math.max(0, k - 1))} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm">‹</button>
                <input type="range" min="0" max={lastK} value={k} onChange={(e) => setMk(Number(e.target.value))} className="flex-1 accent-[#007248]" aria-label="Month" />
                <button type="button" onClick={() => setMk(Math.min(lastK, k + 1))} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm">›</button>
                <span className="text-sm font-semibold tabular-nums w-24 text-right">{monthLabel(m, true)}</span>
              </div>
            </Card>
            <Card title={ps ? `${ps}: how often each class, since 1991` : 'Click a state on the map'} tip="The share of months since 1991 in each class, for the state you click; the current month is marked."
              right={ps && onScope && <button type="button" onClick={() => onScope(ps)} className="text-xs font-semibold text-[#007248]">Filter to {ps}</button>}>
              {!ps ? <p className="text-sm text-gray-600">Click any state to see the distribution of {meta[1]} there, and how this month compares.</p> : z ? (
                <div className="space-y-1.5">
                  {dist.map(({ c, n }) => (
                    <div key={c.label} className="flex items-center gap-2 text-xs">
                      <span className="w-32 text-gray-700">{c.label}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded"><div className="h-full rounded" style={{ width: `${(n / (vals.length || 1)) * 100}%`, background: c.color }} /></div>
                      <span className="w-20 text-right tabular-nums text-gray-700">{fmt((n / (vals.length || 1)) * 100, 0)}% · {n}</span>
                      <span className="w-4">{classOf(nowV)?.label === c.label ? '◀' : ''}</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-600 pt-1">{monthLabel(m, true)}: <span className="font-semibold text-gray-900">{fmt(nowV, 2)}</span>{nowV != null && ` · ${classOf(nowV).label}`} · {vals.length} months since 1991.</p>
                  <SeriesChart series={[{ name: meta[1], color: '#007248', points: sv.month.map((mm, i) => [mm, sv[idx][i]]).slice(-60) }]} bars colorOf={(v) => classOf(v).color} xFmt={monthLabel} digits={2} csvName={`${meta[1]}-${ps}-last-5-years`} xLabel="month" height={170} />
                </div>
              ) : (
                <SeriesChart series={[{ name: meta[1], color: '#007248', points: sv.month.map((mm, i) => [mm, sv[idx][i]]).slice(-60) }]} bars xFmt={monthLabel} digits={0} csvName={`${meta[1]}-${ps}`} xLabel="month" height={220} />
              )}
            </Card>
          </div>
        );
      })()}
      {view === 'table' && (
        <Card title={`All indices, ${monthLabel(months[lastK], true)}, every state`} tip="The latest month with data for every index. Amber and red: drier than normal."
          right={<CsvButton name={`drought-indices-${months[lastK]}`} rows={stateRows} />}>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-[#007248] text-white text-left"><tr><th className="px-3 py-2">State</th>{INDICES.map(([k, l]) => <th key={k} className="px-3 py-2 text-right whitespace-nowrap">{l}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {stateRows.map((r) => (
                  <tr key={r.state} className={r.state === scope ? 'bg-[#F1F9F4]' : ''}><td className="px-3 py-1.5 font-semibold">{r.state}</td>
                    {INDICES.map(([k]) => {
                      const v = r[k]; const c = k.startsWith('sp') ? classOf(v) : null;
                      return <td key={k} className="px-3 py-1.5 text-right tabular-nums" title={c?.label}>
                        <span className={c && v <= -1 ? 'text-amber-700 font-semibold' : c && v >= 1 ? 'text-blue-700' : ''}>{fmt(v, k.startsWith('sp') ? 2 : 0)}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="text-xs text-gray-500">{data.source}, {data.from} to {months[lastK]}. SPI: {data.methods.spi}. SPEI: {data.methods.spei}. Deciles: {data.methods.decile}. One point inside each state: read it as that point, not the whole state.</p>
    </div>
  );
}

/* ───────────────────────────── Climate futures ───────────────────────────── */

const SCN_COLORS = { historical: '#475569', ssp126: '#15803D', ssp245: '#2563EB', ssp370: '#D97706', ssp585: '#B42318' };

export function ClimateFutures({ scope, aState }) {
  const [data, err] = useJson('/gwon-data/climate_projections.json');
  const [v, setV] = useState('tasmax');
  const [scns, setScns] = useState(['ssp126', 'ssp245', 'ssp585']);
  const [band, setBand] = useState(true);
  const [mv, setMv] = useState(1);  // 0 rain, 1 mean highest temperature, 2 days over 40 C
  const [models, setModels] = useState(null);
  const [smooth, setSmooth] = useState(true);
  if (!data) return <Loading err={err} what="the climate projections" />;
  const nat = data.national[v];
  const ref = mean(Object.entries(nat.historical).filter(([y]) => y >= 1995 && y <= 2014).map(([, x]) => x));
  const toPts = (o) => Object.entries(o || {}).map(([y, x]) => [Number(y), x]).sort((a, b) => a[0] - b[0]);
  const series = [{ name: 'Historical (models)', color: SCN_COLORS.historical, points: toPts(nat.historical).filter(([y]) => y >= 1980) },
    ...scns.map((s) => ({ name: data.scenarios[s], color: SCN_COLORS[s], points: toPts(nat[s].median),
      band: band ? toPts(nat[s].median).map(([y]) => [y, nat[s].p10[y], nat[s].p90[y]]) : null }))];
  const change = (s, a, b) => { const m = mean(toPts(nat[s].median).filter(([y]) => y >= a && y <= b).map((p) => p[1])); return m == null || ref == null ? null : m - ref; };
  // State, model by model
  const names = scope === 'all' ? Object.keys(data.states) : [scope];
  const allModels = data.models.filter((m) => names.some((n) => data.states[n]?.[m]));
  const chosen = models || allModels;
  const field = ['Rain (mm a year)', 'Mean highest temperature (°C)', 'Days of 40 °C or more'][mv];
  const run = (m) => {
    const years = Object.keys(data.states[names[0]]?.[m] || {}).map(Number).sort((a, b) => a - b);
    const raw = years.map((y) => [y, mean(names.map((n) => data.states[n]?.[m]?.[String(y)]?.[mv]))]);
    if (!smooth) return raw;
    return raw.map(([y], i) => [y, mean(raw.slice(Math.max(0, i - 4), i + 6).map((p) => p[1]))]);   // 10-year running mean
  };
  const modelSeries = chosen.map((m, i) => ({ name: m.replace(/_/g, '-'), color: PALETTE[i % PALETTE.length], points: run(m), width: 1.5 }));
  const ens = modelSeries.length ? modelSeries[0].points.map(([y], i) => [y, mean(modelSeries.map((s) => s.points[i]?.[1]))]) : [];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#A9D9BF] bg-[#F1F9F4] p-4 text-sm text-gray-700 space-y-1.5">
        <p className="font-semibold text-gray-900">How to read the futures</p>
        <p><span className="font-semibold">Scenarios (SSPs)</span> are paths of world emissions: SSP1-2.6 low, SSP2-4.5 middle, SSP3-7.0 high, SSP5-8.5 very high. They are not forecasts; plan for a range of them.</p>
        <p><span className="font-semibold">Models</span> are different climate models (CMIP6). The line is the middle of the models; the shaded range is the 10th to 90th percentile across them. Compare a scenario's line with the <span className="font-semibold">1995-2014 reference</span> (dashed).</p>
        <p><span className="font-semibold">For one state</span>, the high-resolution models below run 1950-2050 under SSP5-8.5 at one point in the state: use them to see the spread between models, with the 10-year running mean on.</p>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-4">
        <Field label="What to show">
          <select value={v} onChange={(e) => setV(e.target.value)} className={`${inputCls} min-w-[240px]`}>{Object.entries(data.vars).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        <Field label="Scenarios" tip="Tick the scenarios to draw.">
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.scenarios).map(([k, l]) => (
              <label key={k} className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${scns.includes(k) ? 'border-gray-300 bg-white' : 'border-gray-200 text-gray-500'}`}>
                <input type="checkbox" checked={scns.includes(k)} onChange={() => setScns((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))} className="accent-[#007248]" />
                <span className="w-3 h-[3px] rounded" style={{ background: SCN_COLORS[k] }} />{l}
              </label>
            ))}
          </div>
        </Field>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 pb-2.5"><input type="checkbox" checked={band} onChange={(e) => setBand(e.target.checked)} className="accent-[#007248]" /> Show the range across models</label>
      </div>
      <Card title={`${data.vars[v]}, Nigeria, 1980-2100`} tip={`${data.national_source}. The 1995-2014 reference is the mean of the historical model runs.`}>
        <SeriesChart series={series} refs={ref != null ? [{ y: ref, label: `1995-2014 reference: ${fmt(ref, 1)}` }] : []} digits={v === 'spei12' ? 2 : 1} csvName={`cmip6-${v}-nigeria`} xLabel="year" height={280} />
      </Card>
      <Card title={`Change from 1995-2014, ${data.vars[v]}`} tip="The scenario's median, averaged over the period, minus the 1995-2014 reference."
        right={<CsvButton name={`cmip6-change-${v}`} rows={() => Object.keys(data.scenarios).map((s) => ({ scenario: data.scenarios[s], '2021-2040': change(s, 2021, 2040), '2041-2060': change(s, 2041, 2060), '2081-2100': change(s, 2081, 2100) }))} />}>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-[#007248] text-white text-left"><tr><th className="px-3 py-2">Scenario</th><th className="px-3 py-2 text-right">2021-2040</th><th className="px-3 py-2 text-right">2041-2060</th><th className="px-3 py-2 text-right">2081-2100</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {Object.keys(data.scenarios).map((s) => (
                <tr key={s}><td className="px-3 py-1.5"><span className="inline-flex items-center gap-2"><span className="w-3 h-[3px] rounded" style={{ background: SCN_COLORS[s] }} />{data.scenarios[s]}</span></td>
                  {[[2021, 2040], [2041, 2060], [2081, 2100]].map(([a, b]) => { const c = change(s, a, b); return <td key={a} className="px-3 py-1.5 text-right tabular-nums">{c == null ? '—' : `${c > 0 ? '+' : ''}${fmt(c, v === 'spei12' ? 2 : 1)}`}</td>; })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {!allModels.length ? <p className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">{data.states_note || 'The state model runs are not loaded yet.'}</p> : <>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-4">
        <Field label={`For ${aState}`}><Seg value={mv} onChange={setMv} label="Measure" options={[[1, 'Highest temperature'], [2, 'Days of 40 °C or more'], [0, 'Rain']]} /></Field>
        <Field label="Models" tip="Tick the models to draw; the black line is the mean of the ticked models.">
          <div className="flex flex-wrap gap-1.5">
            {allModels.map((m, i) => (
              <label key={m} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold cursor-pointer">
                <input type="checkbox" checked={chosen.includes(m)} onChange={() => setModels(chosen.includes(m) ? chosen.filter((x) => x !== m) : [...chosen, m])} className="accent-[#007248]" />
                <span className="w-2.5 h-[3px] rounded" style={{ background: PALETTE[i % PALETTE.length] }} />{m.replace(/_/g, '-')}
              </label>
            ))}
          </div>
        </Field>
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 pb-2"><input type="checkbox" checked={smooth} onChange={(e) => setSmooth(e.target.checked)} className="accent-[#007248]" /> 10-year running mean</label>
      </div>
      <Card title={`${field}, ${aState}, model by model, 1950-2050`} tip={`${data.state_source}.${scope === 'all' ? ' The frontline: the mean of the eleven state points.' : ''}`}>
        <SeriesChart series={[...modelSeries, { name: 'Mean of the ticked models', color: '#111827', points: ens, width: 2.5 }]} digits={mv === 1 ? 1 : 0} unit={['mm', '°C', 'days'][mv]} csvName={`cmip6-models-${scope}-${['rain', 'tmax', 'hot-days'][mv]}`} xLabel="year" height={280} />
      </Card>
      </>}
      <p className="text-xs text-gray-500">National: {data.national_source}. States: {data.state_source}. Made {data.made}.</p>
    </div>
  );
}

/* ───────────────────────────── People and livelihoods ───────────────────────────── */

export function People({ scope, aState, frontline, dark, onScope }) {
  const [data, err] = useJson('/gwon-data/socioeconomic.json');
  const [metric, setMetric] = useState('poor');
  if (!data) return <Loading err={err} what="the socio-economic figures" />;
  const st = data.states;
  const names = scope === 'all' ? Object.keys(st) : [scope];
  const sum = (f) => names.reduce((s, n) => s + (f(st[n]) || 0), 0);
  const pop = sum((x) => x.population?.total);
  const area = sum((x) => x.area_km2);
  const wpoor = names.reduce((s, n) => s + (st[n].poverty?.poor_pct || 0) * (st[n].population?.total || 0), 0) / (pop || 1);
  const wsev = names.reduce((s, n) => s + (st[n].poverty?.severe_pct || 0) * (st[n].population?.total || 0), 0) / (pop || 1);
  const idps = names.filter((n) => st[n].displacement).reduce((s, n) => s + st[n].displacement.idps, 0);
  const noDtm = names.filter((n) => !st[n].displacement);
  const METRICS = {
    poor: ['Share of people poor (MPI headcount, %)', (x) => x.poverty?.poor_pct, '%', 1],
    severe: ['Share in severe poverty (%)', (x) => x.poverty?.severe_pct, '%', 1],
    pop: ['Population, 2022', (x) => x.population?.total, 'people', 0],
    density: ['People per km²', (x) => x.density_km2, 'per km²', 0],
    idps: ['People displaced (IDPs)', (x) => x.displacement?.idps, 'people', 0],
    kids: ['Children under 15 (%)', (x) => (x.population ? (x.population.under_15 / x.population.total) * 100 : null), '%', 1],
  };
  const [ml, mf, mu, md] = METRICS[metric];
  const rows = Object.entries(st).map(([s, x]) => ({ label: s, value: mf(x), color: s === scope ? '#0E2D41' : '#007248' })).filter((r) => r.value != null).sort((a, b) => b.value - a.value);
  const ages = names.length ? Object.keys(st[names[0]].population.ages) : [];
  const ageRows = ages.map((a) => ({ age: a.replace('_', ' to ').replace('80Plus', '80 and over'), people: sum((x) => x.population.ages[a]) }));
  const maxAge = Math.max(1, ...ageRows.map((r) => r.people));
  const tableRows = Object.entries(st).map(([s, x]) => ({ state: s, population_2022: x.population?.total, people_per_km2: x.density_km2, poor_pct: x.poverty?.poor_pct, severe_poverty_pct: x.poverty?.severe_pct, mpi: x.poverty?.mpi, idps: x.displacement?.idps ?? null, idp_round: x.displacement?.round ?? 'not covered by IOM DTM' }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[['People, 2022', fmt(pop), `${fmt(pop / (area || 1))} per km²`, data.sources.population, 'bg-[#E8F5EE] border-[#A9D9BF]'],
          ['Poor (multidimensional)', `${fmt(wpoor, 1)}%`, data.national ? `Nigeria: ${fmt(data.national.poor_pct, 1)}%` : '', data.sources.poverty, 'bg-[#FFF8EB] border-[#F6D9A0]'],
          ['In severe poverty', `${fmt(wsev, 1)}%`, 'deprived in half or more of the indicators', data.sources.poverty, 'bg-[#FDF2F2] border-[#F5C8C8]'],
          ['People displaced', fmt(idps), noDtm.length ? `not covered: ${noDtm.join(', ')}` : 'IOM DTM site counts', data.sources.displacement, 'bg-[#EEF6FD] border-[#BFDDF6]'],
          ['Children under 15', `${fmt((sum((x) => x.population?.under_15) / (pop || 1)) * 100, 1)}%`, `${fmt(sum((x) => x.population?.age_15_34))} aged 15 to 34`, data.sources.population, 'bg-white border-gray-200'],
        ].map(([l, v, s, tip, tone]) => (
          <div key={l} className={`rounded-2xl border p-4 ${tone}`}>
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">{l} <InfoTip text={tip} side="bottom" /></p>
            <p className="font-display text-2xl font-semibold text-gray-900 tabular-nums mt-1">{v}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{s}</p>
          </div>
        ))}
      </div>
      {(() => {
        const vals = rows.map((r) => r.value).sort((a, b) => a - b);
        const q = (f) => vals[Math.min(vals.length - 1, Math.floor(f * vals.length))];
        const cuts = [q(0.2), q(0.4), q(0.6), q(0.8)];
        const RAMP = ['#E8F5EE', '#A9D9BF', '#5DB487', '#1F8A57', '#0E5A38'];
        const bin = (v) => (v == null ? null : RAMP[cuts.filter((c) => v > c).length]);
        const legend = RAMP.map((c, i) => ({ color: c, label: i === 0 ? `up to ${fmt(cuts[0], md)}` : i === 4 ? `over ${fmt(cuts[3], md)}` : `${fmt(cuts[i - 1], md)} to ${fmt(cuts[i], md)}` }));
        return (
          <Card title={`${ml}: map of the frontline`} tip="Five classes, each with about a fifth of the states. Click a state to filter every page to it." right={<select value={metric} onChange={(e) => setMetric(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold">{Object.entries(METRICS).map(([k, m]) => <option key={k} value={k}>{m[0]}</option>)}</select>}>
            <Choropleth states={frontline} dark={dark} picked={scope !== 'all' ? scope : null} onPick={onScope} colorOf={(s) => bin(mf(st[s] || {}))} legend={legend}
              label={(s) => { const v = st[s] ? mf(st[s]) : null; return `<b>${s}</b><br/>${ml}: ${v == null ? 'no data' : fmt(v, md)}${mu && mu !== 'people' ? ` ${mu}` : ''}`; }} height={380} />
          </Card>
        );
      })()}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={`${ml}, every frontline state`} tip="Pick the measure. The chosen state is darker." right={<select value={metric} onChange={(e) => setMetric(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold">{Object.entries(METRICS).map(([k, m]) => <option key={k} value={k}>{m[0]}</option>)}</select>}>
          <StateBars rows={rows} unit={mu} digits={md} />
        </Card>
        <Card title={`People by age, ${aState}, 2022`} tip={data.sources.population} right={<CsvButton name={`ages-${scope}`} rows={ageRows} />}>
          <div className="space-y-1">
            {[...ageRows].reverse().map((r) => (
              <div key={r.age} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-right text-gray-600 tabular-nums">{r.age}</span>
                <div className="flex-1 h-3.5 bg-gray-100 rounded"><div className="h-full rounded bg-[#007248]" style={{ width: `${(r.people / maxAge) * 100}%` }} /></div>
                <span className="w-20 tabular-nums text-gray-700">{fmt(r.people)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card title="Every frontline state" tip="Population: OCHA COD-PS 2022. Poverty: Global MPI (DHS 2024). Displaced: IOM DTM (rounds named in the table)." right={<CsvButton name="people-and-livelihoods" rows={tableRows} />}>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-[#007248] text-white text-left"><tr>{['State', 'People 2022', 'Per km²', 'Poor %', 'Severe %', 'MPI', 'Displaced', 'Displacement source'].map((h) => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {tableRows.map((r) => (
                <tr key={r.state} className={r.state === scope ? 'bg-[#F1F9F4]' : ''}>
                  <td className="px-3 py-1.5 font-semibold">{r.state}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.population_2022)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.people_per_km2)}</td>
                  <td className="px-3 py-1.5 tabular-nums">{fmt(r.poor_pct, 1)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.severe_poverty_pct, 1)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.mpi, 3)}</td>
                  <td className="px-3 py-1.5 tabular-nums">{r.idps == null ? '—' : fmt(r.idps)}</td><td className="px-3 py-1.5 text-xs text-gray-600">{r.idp_round}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs text-gray-500">{Object.values(data.sources).join(' · ')}. Night lights, population density and drought loss risk are also map layers (Monitor, Map, People).</p>
    </div>
  );
}

/* ───────────────────────────── Compare ───────────────────────────── */

const COMPARE = {
  rain: ['Rain each year (mm)', 'climate', (s) => s.annual.map((r) => [r.year, r.full ? r.rain : null])],
  hot_days: ['Hot days each year (40 °C or more)', 'climate', (s) => s.annual.map((r) => [r.year, r.full ? r.hot_days : null])],
  dry_spell: ['Longest dry spell in the rainy season (days)', 'climate', (s) => s.annual.map((r) => [r.year, r.dry_spell])],
  aridity: ['Aridity (rain / evaporation)', 'climate', (s) => s.annual.map((r) => [r.year, r.full ? r.aridity : null])],
  spei12: ['SPEI-12 in December (drought index)', 'indices', (s) => s.month.map((m, i) => [m, s.spei12[i]]).filter(([m]) => m.endsWith('-12')).map(([m, v]) => [Number(m.slice(0, 4)), v])],
  spi12: ['SPI-12 in December (drought index)', 'indices', (s) => s.month.map((m, i) => [m, s.spi12[i]]).filter(([m]) => m.endsWith('-12')).map(([m, v]) => [Number(m.slice(0, 4)), v])],
  tree: ['Tree cover (% of the land)', 'land', (s, land) => land.years.map((y) => { const o = s[y]; const t = o ? land.types.reduce((a, k) => a + (o[k] || 0), 0) : 0; return [y, t ? (o['Tree cover'] / t) * 100 : null]; })],
  bare: ['Bare and sparse land (%)', 'land', (s, land) => land.years.map((y) => { const o = s[y]; const t = o ? land.types.reduce((a, k) => a + (o[k] || 0), 0) : 0; return [y, t ? (((o['Bare land'] || 0) + (o['Sparse vegetation'] || 0)) / t) * 100 : null]; })],
  crop: ['Cropland (%)', 'land', (s, land) => land.years.map((y) => { const o = s[y]; const t = o ? land.types.reduce((a, k) => a + (o[k] || 0), 0) : 0; return [y, t ? (o.Cropland / t) * 100 : null]; })],
};

export function Compare({ series, land, inYears, states: frontline }) {
  const [indices] = useJson('/gwon-data/drought_indices.json');
  const [metric, setMetric] = useState('rain');
  const [picked, setPicked] = useState(['Borno', 'Sokoto', 'Kano']);
  const [mode, setMode] = useState('values');
  const [yearMode, setYearMode] = useState('states');
  const [yState, setYState] = useState('Borno');
  const [yIdx, setYIdx] = useState('rain');
  const [yYears, setYYears] = useState(() => { const y = new Date().getUTCFullYear(); return [y, y - 1, y - 2]; });
  const names = (frontline?.features || []).map((f) => f.properties.state).sort();
  const [label, src, get] = COMPARE[metric];
  const source = src === 'climate' ? series?.states : src === 'indices' ? indices?.states : land?.states;
  const out = useMemo(() => {
    if (!source) return [];
    return picked.filter((n) => source[n]).map((n) => {
      let pts = get(source[n], land).filter(([y]) => inYears(y));
      if (mode === 'change') { const b = pts.find((p) => p[1] != null)?.[1]; pts = pts.map(([y, v]) => [y, v == null || b == null ? null : v - b]); }
      return { name: n, color: PALETTE[names.indexOf(n) % PALETTE.length], points: pts };
    });
  }, [source, picked, mode, land, get, inYears, names]);
  // Years against each other: one line per year, January to December.
  const yearSeries = useMemo(() => {
    const s = indices?.states?.[yState];
    if (!s) return [];
    return yYears.map((y, i) => ({ name: String(y), color: PALETTE[i % PALETTE.length], points: MONTHS.map((m, k) => { const j = s.month.indexOf(`${y}-${String(k + 1).padStart(2, '0')}`); return [k + 1, j < 0 ? null : s[yIdx][j]]; }) }));
  }, [indices, yState, yYears, yIdx]);
  const allYears = indices ? [...new Set(Object.values(indices.states)[0].month.map((m) => Number(m.slice(0, 4))))].reverse() : [];
  return (
    <div className="space-y-4">
      <Seg value={yearMode} onChange={setYearMode} label="Compare" options={[['states', 'States against each other'], ['years', 'Years against each other']]} />
      {yearMode === 'states' ? (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-4">
            <Field label="Series"><select value={metric} onChange={(e) => setMetric(e.target.value)} className={`${inputCls} min-w-[260px]`}>{Object.entries(COMPARE).map(([k, m]) => <option key={k} value={k}>{m[0]}</option>)}</select></Field>
            <Field label="Show as" tip="Change: each state's value minus its own first year in the chosen years, so different states start at zero."><Seg value={mode} onChange={setMode} label="Show as" options={[['values', 'Values'], ['change', 'Change from the first year']]} /></Field>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {names.map((n) => (
              <label key={n} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${picked.includes(n) ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-200 text-gray-500'}`}>
                <input type="checkbox" checked={picked.includes(n)} onChange={() => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]))} className="accent-[#007248]" />
                <span className="w-2.5 h-[3px] rounded" style={{ background: PALETTE[names.indexOf(n) % PALETTE.length] }} />{n}
              </label>
            ))}
            <button type="button" onClick={() => setPicked(names)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#007248]">All</button>
            <button type="button" onClick={() => setPicked([])} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600">None</button>
          </div>
          <Card title={`${label}${mode === 'change' ? ', change from the first year' : ''}`} tip="One line per state, on one axis. The years follow the filter above. Download the figures as CSV.">
            {!source ? <Loading what="the series" /> : out.length ? <SeriesChart series={out} digits={metric === 'aridity' || metric.startsWith('sp') ? 2 : 1} csvName={`compare-${metric}`} xLabel="year" height={300} /> : <p className="text-sm text-gray-500">Tick one or more states.</p>}
          </Card>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-wrap items-end gap-4">
            <Field label="State"><select value={yState} onChange={(e) => setYState(e.target.value)} className={inputCls}>{names.map((n) => <option key={n}>{n}</option>)}</select></Field>
            <Field label="Series"><select value={yIdx} onChange={(e) => setYIdx(e.target.value)} className={`${inputCls} min-w-[200px]`}>
              {[['rain', 'Rain each month (mm)'], ['hot_days', 'Hot days each month'], ['dry_days', 'Dry days each month'], ['spi3', 'SPI-3'], ['spei3', 'SPEI-3'], ['pct_normal', 'Rain, % of normal']].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></Field>
            <Field label="Years" tip="Tick up to eight years to draw over each other.">
              <div className="flex flex-wrap gap-1 max-w-3xl">
                {allYears.map((y) => (
                  <label key={y} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${yYears.includes(y) ? 'border-gray-300 text-gray-900' : 'border-gray-200 text-gray-500'}`}>
                    <input type="checkbox" checked={yYears.includes(y)} onChange={() => setYYears((s) => (s.includes(y) ? s.filter((x) => x !== y) : s.length >= 8 ? s : [...s, y].sort((a, b) => b - a)))} className="accent-[#007248]" />{y}
                  </label>
                ))}
              </div>
            </Field>
          </div>
          <Card title={`${yState}: years against each other`} tip="One line per year, January to December, from the monthly ERA5 series (1991 to now).">
            {!indices ? <Loading what="the monthly series" /> : <SeriesChart series={yearSeries} xFmt={(k) => MONTHS[k - 1]} digits={yIdx.startsWith('sp') ? 2 : 0} csvName={`years-${yState}-${yIdx}`} xLabel="month" height={300} />}
          </Card>
        </>
      )}
    </div>
  );
}

/* ───────────────────────────── Scenario planner ───────────────────────────── */

const EMPTY = { name: 'Scenario A', ha: '', trees: '', survival: '', droughtSurvival: '', years: '10', carbon: '', costHa: '', costSeedling: '', extraDrought: '0' };
const SAVED = 'gwon_scenarios';

export function Scenarios({ scope, aState, frontline }) {
  const [indices] = useJson('/gwon-data/drought_indices.json');
  const [socio] = useJson('/gwon-data/socioeconomic.json');
  const [proj] = useJson('/gwon-data/climate_projections.json');
  const [list, setList] = useState(() => { try { return JSON.parse(localStorage.getItem(SAVED) || 'null') || [{ ...EMPTY }]; } catch { return [{ ...EMPTY }]; } });
  const [k, setK] = useState(0);
  const [scn, setScn] = useState('ssp245');
  useEffect(() => { try { localStorage.setItem(SAVED, JSON.stringify(list)); } catch { /* storage unavailable */ } }, [list]);
  const cur = list[Math.min(k, list.length - 1)];
  const set = (patch) => setList((l) => l.map((x, i) => (i === Math.min(k, l.length - 1) ? { ...x, ...patch } : x)));
  const num = (v) => (v === '' || v == null ? null : Number(v));
  // From the data: how often a year was a drought year here (December SPI-12 of -1 or lower), 1991 to last year.
  const names = scope === 'all' ? Object.keys(indices?.states || {}) : [scope];
  const dec = indices ? names.flatMap((n) => { const s = indices.states[n]; return s ? s.month.map((m, i) => [m, s.spi12[i]]).filter(([m, v]) => m.endsWith('-12') && v != null) : []; }) : [];
  const droughtFreq = dec.length ? dec.filter(([, v]) => v <= -1).length / dec.length : null;
  const cddNow = proj ? mean(Object.entries(proj.national.cdd.historical).filter(([y]) => y >= 1995 && y <= 2014).map(([, v]) => v)) : null;
  const cddFut = proj ? mean(Object.entries(proj.national.cdd[scn].median).filter(([y]) => y >= 2041 && y <= 2060).map(([, v]) => v)) : null;
  const sum = socio ? names.reduce((s, n) => s + (socio.states[n]?.population?.total || 0), 0) : 0;
  const area = socio ? names.reduce((s, n) => s + (socio.states[n]?.area_km2 || 0), 0) : 0;
  const stateHa = (frontline?.features || []).filter((f) => scope === 'all' || f.properties.state === scope).reduce((s, f) => s + f.properties.area_ha, 0);

  const result = (sc) => {
    const ha = num(sc.ha), tpha = num(sc.trees), s = num(sc.survival), sd = num(sc.droughtSurvival), years = num(sc.years) || 10;
    if (!ha || !tpha || s == null || sd == null || droughtFreq == null) return null;
    const p = Math.min(1, droughtFreq * (1 + (num(sc.extraDrought) || 0) / 100));
    const yearly = (1 - p) * (s / 100) + p * (sd / 100);    // expected share of trees that live through a year
    const planted = ha * tpha;
    const rows = Array.from({ length: years + 1 }, (_, y) => {
      const exp = planted * yearly ** y, best = planted * (s / 100) ** y, worst = planted * (sd / 100) ** y;
      return { year: y, expected: exp, no_drought: best, drought_every_year: worst };
    });
    const alive = rows[years].expected;
    const carbon = num(sc.carbon) != null ? rows.slice(1).reduce((a, r) => a + (r.expected / planted) * ha * num(sc.carbon), 0) : null;
    const cost = num(sc.costHa) != null ? ha * num(sc.costHa) : null;
    const replant = num(sc.costSeedling) != null ? (planted - alive) * num(sc.costSeedling) : null;
    const people = area ? (ha / 100) * (sum / area) : null;
    return { p, yearly, planted, alive, rows, carbon, cost, replant, people, ha, years };
  };
  const r = result(cur);
  const inp = (key, label, tip, unit, extra = {}) => (
    <Field label={`${label}${unit ? ` (${unit})` : ''}`} tip={tip}>
      <input type="number" min="0" inputMode="decimal" value={cur[key]} onChange={(e) => set({ [key]: e.target.value })} className={inputCls} placeholder="enter a value" {...extra} />
    </Field>
  );
  const allRes = list.map((x) => ({ x, r: result(x) }));
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#A9D9BF] bg-[#F1F9F4] p-4 text-sm text-gray-700 space-y-1">
        <p className="font-semibold text-gray-900">Plan a restoration scenario and see what it could look like</p>
        <p>Enter the plan and your own assumptions (survival, carbon, cost). GWON adds what the data say about {aState}: how often a year has been a drought year since 1991 (SPI-12), how far dry spells are projected to lengthen (CMIP6), and how many people live around the land. Nothing is filled in for you: an empty box means the result needs it.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {list.map((x, i) => (
          <button key={i} type="button" onClick={() => setK(i)} className={`px-3 py-2 rounded-xl border text-sm font-semibold ${i === k ? 'border-[#007248] bg-[#E8F5EE] text-[#0E2D41]' : 'border-gray-200 bg-white text-gray-700'}`}>{x.name || `Scenario ${i + 1}`}</button>
        ))}
        {list.length < 4 && <button type="button" onClick={() => { setList((l) => [...l, { ...cur, name: `Scenario ${String.fromCharCode(65 + l.length)}` }]); setK(list.length); }} className="px-3 py-2 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-600">Copy into a new scenario</button>}
        {list.length > 1 && <button type="button" onClick={() => { setList((l) => l.filter((_, i) => i !== k)); setK(0); }} className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-500">Remove this scenario</button>}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 self-start">
          <Field label="Name"><input value={cur.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} /></Field>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 pt-1">The plan, in {aState}</p>
          {inp('ha', 'Land to restore', `How many hectares. ${aState} covers ${fmt(stateHa)} ha.`, 'ha')}
          {inp('trees', 'Trees planted per hectare', 'Seedlings planted on each hectare.', 'trees')}
          {inp('years', 'Years to look ahead', 'How many years after planting to show.', 'years', { max: 40 })}
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 pt-1">Your assumptions</p>
          {inp('survival', 'Trees that live through a normal year', 'Share of the trees alive at the start of a normal year that are still alive at its end, from your own survival counts.', '%', { max: 100 })}
          {inp('droughtSurvival', 'Trees that live through a drought year', 'The same, in a drought year (December SPI-12 of -1 or lower).', '%', { max: 100 })}
          {inp('extraDrought', 'Drought years more often than before', `Extra drought years against 1991 to now, in percent (0: as often as before). Context: CMIP6 shows the longest dry spell in Nigeria ${cddNow && cddFut ? `${cddFut >= cddNow ? 'lengthening' : 'shortening'} by ${fmt(Math.abs(((cddFut - cddNow) / cddNow) * 100), 0)}% by 2041-2060` : 'changing'} under ${proj?.scenarios?.[scn] || scn}.`, '%')}
          <Field label="Climate scenario for that context">
            <select value={scn} onChange={(e) => setScn(e.target.value)} className={inputCls}>{Object.entries(proj?.scenarios || {}).map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select>
          </Field>
          {inp('carbon', 'Carbon taken up', 'Tonnes of CO2 a hectare of living planting takes up each year, from your species and site data. Left empty, no carbon figure is shown.', 't CO2/ha/yr')}
          {inp('costHa', 'Cost of planting', 'Naira per hectare: seedlings, labour, protection.', '₦/ha')}
          {inp('costSeedling', 'Cost of replacing a dead tree', 'Naira per seedling replanted.', '₦')}
        </div>
        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-2 2xl:grid-cols-4 gap-3">
            {[['Drought years since 1991', droughtFreq == null ? '—' : `${fmt(droughtFreq * 100, 0)}%`, `of years in ${aState} (SPI-12, December)`],
              ['Trees planted', r ? fmt(r.planted) : '—', r ? `${fmt(r.ha)} ha` : 'enter the plan'],
              [`Trees alive after ${r?.years || cur.years || 10} years`, r ? fmt(r.alive) : '—', r ? `${fmt((r.alive / r.planted) * 100, 0)}% of those planted` : 'enter the survival rates'],
              ['People living on that much land', r?.people ? fmt(r.people) : '—', `at ${aState}'s 2022 density`],
              ['Carbon taken up', r?.carbon != null ? `${fmt(r.carbon)} t CO2` : '—', r?.carbon != null ? `over ${r.years} years` : 'enter a carbon rate'],
              ['Planting cost', r?.cost != null ? `₦${fmt(r.cost)}` : '—', 'at your cost per hectare'],
              ['Replacing dead trees', r?.replant != null ? `₦${fmt(r.replant)}` : '—', 'at your cost per seedling'],
              ['Chance a year is a drought year', r ? `${fmt(r.p * 100, 0)}%` : '—', 'with your extra drought years'],
            ].map(([l, v, s]) => (
              <div key={l} className="rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-xs font-semibold text-gray-600">{l}</p>
                <p className="font-display text-xl font-semibold text-gray-900 tabular-nums mt-1">{v}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{s}</p>
              </div>
            ))}
          </div>
          <Card title={`${cur.name}: trees alive, year by year`} tip="Expected: each year is a drought year with the chance shown, else a normal year. The other lines: no drought at all, and a drought every year.">
            {r ? <SeriesChart series={[{ name: 'Expected', color: '#007248', points: r.rows.map((x) => [x.year, x.expected]), width: 2.5 }, { name: 'No drought years', color: '#2563EB', points: r.rows.map((x) => [x.year, x.no_drought]), dashed: true }, { name: 'A drought every year', color: '#B42318', points: r.rows.map((x) => [x.year, x.drought_every_year]), dashed: true }]}
              xFmt={(y) => `Year ${y}`} digits={0} unit="trees" zero csvName={`scenario-${cur.name}`} xLabel="year" height={260} />
              : <p className="text-sm text-gray-600">Enter the land, trees per hectare and the two survival rates to see the curve.</p>}
          </Card>
          {allRes.length > 1 && (
            <Card title="Scenarios side by side" tip="Every scenario with its own inputs; the drought record is the chosen state's."
              right={<CsvButton name="scenarios" rows={() => allRes.map(({ x, r: y }) => ({ scenario: x.name, hectares: num(x.ha), trees_per_ha: num(x.trees), years: num(x.years), trees_planted: y?.planted, trees_alive_at_end: y?.alive, carbon_t_co2: y?.carbon, planting_cost_ngn: y?.cost, replanting_cost_ngn: y?.replant }))} />}>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-[#007248] text-white text-left"><tr>{['Scenario', 'Hectares', 'Planted', 'Alive at the end', 'Carbon (t CO2)', 'Planting (₦)', 'Replanting (₦)'].map((h) => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {allRes.map(({ x, r: y }, i) => (
                      <tr key={i} className={i === k ? 'bg-[#F1F9F4]' : ''}><td className="px-3 py-1.5 font-semibold">{x.name}</td><td className="px-3 py-1.5 tabular-nums">{fmt(num(x.ha))}</td><td className="px-3 py-1.5 tabular-nums">{y ? fmt(y.planted) : '—'}</td>
                        <td className="px-3 py-1.5 tabular-nums">{y ? fmt(y.alive) : '—'}</td><td className="px-3 py-1.5 tabular-nums">{y?.carbon != null ? fmt(y.carbon) : '—'}</td><td className="px-3 py-1.5 tabular-nums">{y?.cost != null ? fmt(y.cost) : '—'}</td><td className="px-3 py-1.5 tabular-nums">{y?.replant != null ? fmt(y.replant) : '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <p className="text-xs text-gray-500">Scenarios are kept in this browser. Drought record: ERA5 SPI-12 (December) per state, 1991 to now. Dry spells: World Bank CCKP CMIP6 ensemble median, longest dry spell, 2041-2060 against 1995-2014. Population: OCHA COD-PS 2022. Survival, carbon and costs are your assumptions.</p>
        </div>
      </div>
    </div>
  );
}
