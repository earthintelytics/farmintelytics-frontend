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
        <thead className="bg-[#0F766E] text-white text-left"><tr>
          <th className="px-3 py-2">Land type</th><th className="px-3 py-2 text-right">{from} (ha)</th><th className="px-3 py-2 text-right">{to} (ha)</th>
          <th className="px-3 py-2 text-right">Change (ha)</th><th className="px-3 py-2 text-right">Change</th>
        </tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.t}>
              <td className="px-3 py-1.5"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-sm border border-gray-200" style={{ background: colors[r.t] }} />{r.t}</span></td>
              <td className="px-3 py-1.5 text-right tabular-nums">{Math.round(r.x).toLocaleString('en-GB')}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{Math.round(r.y).toLocaleString('en-GB')}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${r.d < 0 ? 'text-amber-700' : 'text-[#0F766E]'}`}>{r.d > 0 ? '+' : ''}{Math.round(r.d).toLocaleString('en-GB')}</td>
              <td className={`px-3 py-1.5 text-right tabular-nums ${r.d < 0 ? 'text-amber-700' : 'text-[#0F766E]'}`}>{r.pct == null ? 'new' : `${r.pct > 0 ? '+' : ''}${r.pct.toFixed(1)}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
