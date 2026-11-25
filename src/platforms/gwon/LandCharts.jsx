/**
 * Land-use change charts for GWON: every year split into its land types (stacked bars, a 2 px gap between segments,
 * each type in its own colour, a legend, a hover readout), from landuse_series.json (ESA CCI Land Cover, 300 m).
 */
import { useState } from 'react';

export function LandStack({ years, byYear, types, colors }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 260, pad = { l: 52, r: 10, t: 14, b: 26 };
  const totals = years.map((y) => types.reduce((s, t) => s + (byYear[y]?.[t] || 0), 0));
  const max = Math.max(1, ...totals);
  const bw = (W - pad.l - pad.r) / years.length;
  const yv = (v) => (v / max) * (H - pad.t - pad.b);
  const fmtHa = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)} m` : `${Math.round(v / 1000)} k`);
  const hy = hover != null ? years[hover] : null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {types.map((t) => <span key={t} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-gray-200" style={{ background: colors[t] }} />{t}</span>)}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Land types each year" onMouseLeave={() => setHover(null)}>
          {[0, max / 2, max].map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={H - pad.b - yv(t)} y2={H - pad.b - yv(t)} stroke="#EEF1F3" /><text x={pad.l - 6} y={H - pad.b - yv(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{fmtHa(t)}</text></g>)}
          {years.map((y, i) => {
            let acc = 0;
            return (
              <g key={y} onMouseEnter={() => setHover(i)}>
                <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                {types.map((t) => {
                  const v = byYear[y]?.[t] || 0;
                  const h = yv(v);
                  const yy = H - pad.b - yv(acc) - h;
                  acc += v;
                  return h > 0 ? <rect key={t} x={pad.l + i * bw + 2} y={yy} width={Math.max(2, bw - 4)} height={Math.max(0, h - 1)} fill={colors[t]} stroke="#FFFFFF" strokeWidth="1" /> : null;
                })}
                {(i % 2 === 0 || years.length < 12) && <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#6B7280">{`'${String(y).slice(2)}`}</text>}
              </g>
            );
          })}
          <text x={4} y={12} fontSize="11" fill="#6B7280">ha</text>
        </svg>
        {hy && (
          <div className="absolute top-0 right-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 pointer-events-none w-56">
            <p className="font-semibold text-gray-900 mb-1">{hy}</p>
            {[...types].sort((a, b) => (byYear[hy]?.[b] || 0) - (byYear[hy]?.[a] || 0)).filter((t) => (byYear[hy]?.[t] || 0) > 0).map((t) => (
              <p key={t} className="flex justify-between gap-2"><span>{t}</span><span className="tabular-nums">{Math.round(byYear[hy][t]).toLocaleString('en-GB')} ha</span></p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** First year against last year, each land type: hectares and change. */
export function LandChange({ from, to, a, b, types, colors }) {
  const rows = types.map((t) => {
    const x = a?.[t] || 0, y = b?.[t] || 0;
    return { t, x, y, d: y - x, pct: x ? ((y - x) / x) * 100 : null };
  }).filter((r) => r.x || r.y).sort((p, q) => Math.abs(q.d) - Math.abs(p.d));
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-[#007248] text-white text-left"><tr>
          <th className="px-3 py-2">Land type</th><th className="px-3 py-2 text-right">{from} (ha)</th><th className="px-3 py-2 text-right">{to} (ha)</th>
          <th className="px-3 py-2 text-right">Change (ha)</th><th className="px-3 py-2 text-right">Change</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.t}>
              <td className="px-3 py-1.5"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm border border-gray-200" style={{ background: colors[r.t] }} />{r.t}</span></td>
              <td className="px-3 py-1.5 text-right tabular-nums">{Math.round(r.x).toLocaleString('en-GB')}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{Math.round(r.y).toLocaleString('en-GB')}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${r.d < 0 ? 'text-amber-700' : 'text-[#007248]'}`}>{r.d > 0 ? '+' : ''}{Math.round(r.d).toLocaleString('en-GB')}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${r.d < 0 ? 'text-amber-700' : 'text-[#007248]'}`}>{r.pct == null ? 'new' : `${r.pct > 0 ? '+' : ''}${r.pct.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Share of each land type in one year as a donut (percent), with a year picker and the legend beside it. */
export function LandDonut({ years, byYear, types, colors }) {
  const [year, setYear] = useState(years[years.length - 1]);
  const [hover, setHover] = useState(null);
  const o = byYear[year] || {};
  const total = types.reduce((s, t) => s + (o[t] || 0), 0) || 1;
  const rows = types.map((t) => ({ t, v: o[t] || 0, p: ((o[t] || 0) / total) * 100 })).filter((r) => r.v > 0).sort((a, b) => b.v - a.v);
  const R = 92, r = 58, C = 110;
  const starts = rows.reduce((acc, row) => [...acc, acc[acc.length - 1] + (row.p / 100) * Math.PI * 2], [-Math.PI / 2]);
  const arcs = rows.map((row, i) => {
    const gap = rows.length > 1 ? 0.012 : 0;
    const a0 = starts[i] + gap, a1 = starts[i + 1] - gap;
    const big = a1 - a0 > Math.PI ? 1 : 0, P = (rad, ang) => `${(C + rad * Math.cos(ang)).toFixed(2)},${(C + rad * Math.sin(ang)).toFixed(2)}`;
    return { ...row, d: `M${P(R, a0)}A${R},${R} 0 ${big} 1 ${P(R, a1)}L${P(r, a1)}A${r},${r} 0 ${big} 0 ${P(r, a0)}Z` };
  });
  const h = hover ? rows.find((x) => x.t === hover) : rows[0];
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">Year
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <svg viewBox="0 0 220 220" width="220" height="220" role="img" aria-label={`Land types in ${year}, percent`} onMouseLeave={() => setHover(null)} className="shrink-0">
          {arcs.map((x) => <path key={x.t} d={x.d} fill={colors[x.t]} stroke="#FFFFFF" strokeWidth="2" opacity={hover && hover !== x.t ? 0.45 : 1} onMouseEnter={() => setHover(x.t)} />)}
          {h && <>
            <text x={C} y={C - 4} textAnchor="middle" fontSize="24" fontWeight="600" fill="#111827" fontFamily="Sora, Inter, sans-serif">{h.p.toFixed(1)}%</text>
            <text x={C} y={C + 16} textAnchor="middle" fontSize="11" fill="#4B5563">{h.t}</text>
          </>}
        </svg>
        <ul className="w-full space-y-1.5 text-sm">
          {rows.map((x) => (
            <li key={x.t} onMouseEnter={() => setHover(x.t)} onMouseLeave={() => setHover(null)} className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-gray-700"><span className="w-3 h-3 rounded-sm border border-gray-200" style={{ background: colors[x.t] }} />{x.t}</span>
              <span className="tabular-nums text-gray-900 font-semibold">{x.p.toFixed(1)}%<span className="text-gray-500 font-normal"> · {Math.round(x.v).toLocaleString('en-GB')} ha</span></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Each land type, first year against last year: two bars side by side (hectares) and the change. */
export function LandBars({ from, to, a, b, types, colors }) {
  const [hover, setHover] = useState(null);
  const rows = types.map((t) => ({ t, x: a?.[t] || 0, y: b?.[t] || 0 })).filter((r) => r.x || r.y).sort((p, q) => q.y - p.y);
  const W = 640, rowH = 34, pad = { l: 132, r: 96, t: 22, b: 6 }, H = pad.t + rows.length * rowH + pad.b;
  const max = Math.max(1, ...rows.flatMap((r) => [r.x, r.y]));
  const xw = (v) => (v / max) * (W - pad.l - pad.r);
  const fmtHa = (v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(2)} m` : `${Math.round(v / 1000).toLocaleString('en-GB')} k`);
  return (
    <div className="space-y-2">
      <div className="flex gap-4 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-300" />{from}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-700" />{to} (in the land type's colour)</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Land types, ${from} against ${to}`} onMouseLeave={() => setHover(null)}>
        {rows.map((r, i) => {
          const y0 = pad.t + i * rowH, d = r.y - r.x, pct = r.x ? (d / r.x) * 100 : null;
          return (
            <g key={r.t} onMouseEnter={() => setHover(r.t)} opacity={hover && hover !== r.t ? 0.5 : 1}>
              <rect x={0} y={y0} width={W} height={rowH} fill="transparent" />
              <text x={pad.l - 8} y={y0 + 19} textAnchor="end" fontSize="12" fill="#374151">{r.t}</text>
              <rect x={pad.l} y={y0 + 5} width={Math.max(2, xw(r.x))} height={10} rx="3" fill="#D1D5DB" />
              <rect x={pad.l} y={y0 + 17} width={Math.max(2, xw(r.y))} height={10} rx="3" fill={colors[r.t]} stroke="#9CA3AF" strokeWidth="0.5" />
              <text x={W - pad.r + 8} y={y0 + 14} fontSize="11" fill="#6B7280">{fmtHa(r.y)} ha</text>
              <text x={W - pad.r + 8} y={y0 + 27} fontSize="11" fontWeight="600" fill={d < 0 ? '#B45309' : '#007248'}>{pct == null ? 'new' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`}</text>
            </g>
          );
        })}
      </svg>
      {hover && (() => { const r = rows.find((x) => x.t === hover); return (
        <p className="text-xs text-gray-700"><span className="font-semibold text-gray-900">{r.t}:</span> {Math.round(r.x).toLocaleString('en-GB')} ha in {from}, {Math.round(r.y).toLocaleString('en-GB')} ha in {to} ({r.y - r.x >= 0 ? '+' : ''}{Math.round(r.y - r.x).toLocaleString('en-GB')} ha)</p>
      ); })()}
    </div>
  );
}
