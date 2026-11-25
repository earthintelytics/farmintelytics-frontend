/**
 * GWON's general time-series chart: one axis, thin 2 px lines, an optional shaded range per series (e.g. the 10th to
 * 90th percentile of the models), dashed reference lines, a crosshair with every series' value, a legend, CSV.
 * Bars mode draws one bar per point, coloured by colorOf (e.g. drought classes).
 */
import { useLayoutEffect, useState } from 'react';
import { WithCsv } from './csv';


// Round tick values (1, 2 or 5 times a power of ten) between lo and hi.
function niceTicks(lo, hi, n = 4) {
  const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw || 1)), f = raw / p;
  const step = (f >= 5 ? 10 : f >= 2 ? 5 : f >= 1 ? 2 : 1) * p;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

export default function SeriesChart({ series, unit = '', height = 240, xFmt = (x) => x, digits = 1, refs = [], bars = false, colorOf, csvName = 'gwon-series', xLabel = 'x', zero = false }) {
  const [hover, setHover] = useState(null);
  // Drawn at the box's own width, so text and lines keep their size on any screen.
  const [el, setEl] = useState(null);
  const [bw0, setBw0] = useState(720);
  useLayoutEffect(() => {
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setBw0(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  const all = series.flatMap((s) => [...s.points.map((p) => p[1]), ...(s.band || []).flatMap((b) => [b[1], b[2]])]).filter((v) => v != null && Number.isFinite(v));
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p[0])))].sort((a, b) => (a < b ? -1 : 1));
  if (!all.length || !xs.length) return <p className="text-sm text-gray-500">No figures for this choice.</p>;
  const W = bw0, H = height, pad = { l: 48, r: 12, t: 16, b: 28 };
  let lo = Math.min(...all, ...refs.map((r) => r.y)), hi = Math.max(...all, ...refs.map((r) => r.y));
  if (zero || bars) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
  const span = hi - lo || 1; lo -= span * 0.06; hi += span * 0.06;
  const xi = new Map(xs.map((x, i) => [x, i]));
  const X = (x) => pad.l + (xs.length === 1 ? 0.5 : xi.get(x) / (xs.length - 1)) * (W - pad.l - pad.r);
  const Y = (v) => H - pad.b - ((v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const path = (pts) => {
    let d = '', pen = false;
    pts.forEach(([x, v]) => { if (v == null || !Number.isFinite(v)) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(x).toFixed(1)},${Y(v).toFixed(1)}`; pen = true; });
    return d;
  };
  const area = (band) => {
    const b = band.filter((p) => p[1] != null && p[2] != null);
    if (b.length < 2) return '';
    return `${b.map(([x, l], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(l).toFixed(1)}`).join('')}${[...b].reverse().map(([x, , h]) => `L${X(x).toFixed(1)},${Y(h).toFixed(1)}`).join('')}Z`;
  };
  const ticks = niceTicks(lo, hi);
  const every = Math.max(1, Math.ceil(xs.length / Math.max(4, Math.floor(W / 80))));
  const hx = hover != null ? xs[hover] : null;
  const bw = Math.max(1, (W - pad.l - pad.r) / xs.length - 1);
  const csvRows = () => xs.map((x) => ({ [xLabel]: x, ...Object.fromEntries(series.flatMap((s) => {
    const p = s.points.find((q) => q[0] === x); const b = (s.band || []).find((q) => q[0] === x);
    return [[`${s.name}${unit ? ` (${unit})` : ''}`, p ? p[1] : null], ...(s.band ? [[`${s.name} low`, b ? b[1] : null], [`${s.name} high`, b ? b[2] : null]] : [])];
  })) }));
  return (
    <WithCsv name={csvName} rows={csvRows}>
      {series.length > 1 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              {s.dashed ? <span className="w-4 border-t-2 border-dashed" style={{ borderColor: s.color }} /> : <span className="w-4 h-[3px] rounded" style={{ background: s.color }} />}
              {s.name}{s.band ? ' (range shaded)' : ''}
            </span>
          ))}
        </div>
      )}
      <div className="relative" ref={setEl}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={series.map((s) => s.name).join(', ')} onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const f = (((e.clientX - r.left) / r.width) * W - pad.l) / (W - pad.l - pad.r); setHover(Math.max(0, Math.min(xs.length - 1, Math.round(f * (xs.length - 1))))); }}>
          {ticks.map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={Y(t)} y2={Y(t)} stroke="#EEF1F3" /><text x={pad.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{Number(t.toFixed(3)).toLocaleString('en-GB', { maximumFractionDigits: Math.abs(t) < 10 ? digits : 0 })}</text></g>)}
          {lo < 0 && hi > 0 && <line x1={pad.l} x2={W - pad.r} y1={Y(0)} y2={Y(0)} stroke="#CBD5E1" />}
          {refs.map((r) => <g key={r.label}><line x1={pad.l} x2={W - pad.r} y1={Y(r.y)} y2={Y(r.y)} stroke={r.color || '#94A3B8'} strokeDasharray="4 3" /><text x={W - pad.r} y={Y(r.y) - 3} textAnchor="end" fontSize="10" fill={r.color || '#64748B'}>{r.label}</text></g>)}
          {series.map((s) => s.band && <path key={`b-${s.name}`} d={area(s.band)} fill={s.color} opacity="0.14" />)}
          {bars ? series[0].points.map(([x, v]) => (v == null ? null : <rect key={x} x={X(x) - bw / 2} y={Math.min(Y(v), Y(0))} width={bw} height={Math.max(1, Math.abs(Y(v) - Y(0)))} fill={colorOf ? colorOf(v) : series[0].color} />))
            : series.map((s) => <path key={s.name} d={path(s.points)} fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />)}
          {hx != null && <line x1={X(hx)} x2={X(hx)} y1={pad.t} y2={H - pad.b} stroke="#94A3B8" />}
          {xs.map((x, i) => (i % every === 0 ? <text key={x} x={X(x)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#6B7280">{xFmt(x)}</text> : null))}
          <text x={4} y={11} fontSize="11" fill="#6B7280">{unit}</text>
        </svg>
        {hx != null && (
          <div className="absolute top-0 right-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 pointer-events-none max-w-[60%]">
            <p className="font-semibold text-gray-900">{xFmt(hx, true)}</p>
            {series.map((s) => {
              const p = s.points.find((q) => q[0] === hx); const b = (s.band || []).find((q) => q[0] === hx);
              return p && p[1] != null ? <p key={s.name} className="flex justify-between gap-3"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-[3px] rounded" style={{ background: s.color }} />{s.name}</span><span className="tabular-nums">{Number(p[1]).toFixed(digits)}{unit ? ` ${unit}` : ''}{b && b[1] != null ? ` (${Number(b[1]).toFixed(digits)} to ${Number(b[2]).toFixed(digits)})` : ''}</span></p> : null;
            })}
          </div>
        )}
      </div>
    </WithCsv>
  );
}
