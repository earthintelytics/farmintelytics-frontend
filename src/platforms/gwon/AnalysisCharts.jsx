/**
 * The analysis charts of GWON (drought, water stress): one axis, thin marks, a legend, a hover readout, the
 * 2015-2024 baseline drawn as a dashed line or a grey band. Values come straight from climate_series.json.
 */
import { useState } from 'react';

const TEAL = '#007248', GREY = '#A3AEB8', INK = '#334155', BAND = '#DDE6EA';
const MON = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
      {items.map(([label, color, dashed]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          {dashed ? <span className="w-4 border-t-2 border-dashed" style={{ borderColor: color }} /> : <span className="w-3 h-3 rounded-sm" style={{ background: color }} />}
          {label}
        </span>
      ))}
    </div>
  );
}

function Readout({ children }) {
  return <div className="absolute top-0 right-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 pointer-events-none">{children}</div>;
}

/** This year's rain adding up day by day, against the 2015-2024 mean and the range of those years. */
export function SeasonCurve({ cum, year, unit = 'mm' }) {
  const [hover, setHover] = useState(null);
  if (!cum?.mean?.length) return null;
  const W = 640, H = 230, pad = { l: 44, r: 10, t: 22, b: 26 };
  const max = Math.max(10, ...cum.high, ...cum.now) * 1.05;
  const x = (k) => pad.l + (k / 364) * (W - pad.l - pad.r);
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const line = (arr) => arr.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const band = `${line(cum.high)}${[...cum.low].reverse().map((v, i) => `L${x(cum.low.length - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join('')}Z`;
  const k = hover ?? cum.now.length - 1;
  const day = new Date(Date.UTC(year, 0, 1 + k)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return (
    <div className="space-y-2">
      <Legend items={[[`${year}`, TEAL], ['2015–2024 mean', INK, true], ['2015–2024 driest to wettest', BAND]]} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Rain so far this year against 2015 to 2024" onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const kk = Math.round((((e.clientX - r.left) / r.width) * W - pad.l) / (W - pad.l - pad.r) * 364); setHover(Math.max(0, Math.min(364, kk))); }}>
          {[0, max / 2, max].map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#EEF1F3" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{Math.round(t)}</text></g>)}
          <path d={band} fill={BAND} />
          <path d={line(cum.mean)} fill="none" stroke={INK} strokeWidth="1.5" strokeDasharray="4 3" />
          <path d={line(cum.now)} fill="none" stroke={TEAL} strokeWidth="2.5" />
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#CBD5E1" />}
          {MON.map((m, i) => <text key={i} x={x(MONTH_STARTS[i] + 15)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7280">{m}</text>)}
          <text x={4} y={12} fontSize="11" fill="#6B7280">{unit}</text>
        </svg>
        <Readout>
          <p className="font-semibold text-gray-900">{day}</p>
          <p>{year}: {cum.now[k] != null ? `${cum.now[k]} ${unit}` : 'not yet'}</p>
          <p>Mean {cum.mean[k]} {unit} · range {cum.low[k]}–{cum.high[k]}</p>
        </Readout>
      </div>
    </div>
  );
}

/** One bar per year, with the 2015-2024 mean as a dashed line; colorOf colours a year (e.g. drier or wetter). */
export function YearBars({ rows, value, unit, mean, colorOf, digits = 0 }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 210, pad = { l: 44, r: 10, t: 22, b: 26 };
  const vals = rows.map((r) => r[value]).filter((v) => v != null);
  if (!vals.length) return null;
  const lo = Math.min(0, ...vals) * 1.1, hi = (Math.max(0, ...vals, mean ?? 0) * 1.1) || 1;
  const bw = (W - pad.l - pad.r) / rows.length;
  const y = (v) => H - pad.b - ((v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const h = hover != null ? rows[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${value} by year`} onMouseLeave={() => setHover(null)}>
        {[lo, (lo + hi) / 2, hi].map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#EEF1F3" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{t.toFixed(digits)}</text></g>)}
        {lo < 0 && <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#CBD5E1" />}
        {rows.map((r, i) => (
          <g key={r.year} onMouseEnter={() => setHover(i)}>
            <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
            {r[value] != null && <rect x={pad.l + i * bw + 4} y={Math.min(y(r[value]), y(0))} width={Math.max(2, bw - 8)} height={Math.abs(y(r[value]) - y(0))} rx="2"
              fill={colorOf ? colorOf(r) : TEAL} opacity={r.full === false ? 0.45 : 1} />}
            <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#6B7280">{`'${String(r.year).slice(2)}`}</text>
          </g>
        ))}
        {mean != null && <><line x1={pad.l} x2={W - pad.r} y1={y(mean)} y2={y(mean)} stroke={INK} strokeDasharray="4 3" /><text x={W - pad.r} y={y(mean) - 4} textAnchor="end" fontSize="10.5" fill={INK}>2015–2024 mean</text></>}
        <text x={4} y={12} fontSize="11" fill="#6B7280">{unit}</text>
      </svg>
      {h && <Readout><p className="font-semibold text-gray-900">{h.year}{h.full === false ? ' (so far)' : ''}</p><p>{h[value] == null ? 'not yet' : `${Number(h[value]).toFixed(digits)} ${unit}`}</p></Readout>}
    </div>
  );
}

/** Month bars: this year against the 2015-2024 mean (values may be negative, e.g. rain minus evaporation). */
export function MonthVsMean({ rows, value, unit, year, digits = 0 }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 220, pad = { l: 44, r: 10, t: 22, b: 26 };
  const vals = rows.flatMap((r) => [r.now?.[value], r.mean?.[value]]).filter((v) => v != null);
  if (!vals.length) return null;
  const lo = Math.min(0, ...vals) * 1.1, hi = (Math.max(0, ...vals) * 1.1) || 1;
  const bw = (W - pad.l - pad.r) / 12, w = (bw - 10) / 2;
  const y = (v) => H - pad.b - ((v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const bar = (v, x0, color) => (v == null ? null : <rect x={x0} y={Math.min(y(v), y(0))} width={w} height={Math.max(1, Math.abs(y(v) - y(0)))} rx="2" fill={color} />);
  const h = hover != null ? rows[hover] : null;
  return (
    <div className="space-y-2">
      <Legend items={[['2015–2024 mean', GREY], [`${year}`, TEAL]]} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${value} each month against the mean`} onMouseLeave={() => setHover(null)}>
          {[lo, 0, hi].map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#CBD5E1' : '#EEF1F3'} /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{t.toFixed(digits)}</text></g>)}
          {rows.map((r, i) => (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {bar(r.mean?.[value], pad.l + i * bw + 4, GREY)}
              {bar(r.now?.[value], pad.l + i * bw + 6 + w, TEAL)}
              <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7280">{MON[i]}</text>
            </g>
          ))}
          <text x={4} y={12} fontSize="11" fill="#6B7280">{unit}</text>
        </svg>
        {h && (
          <Readout>
            <p className="font-semibold text-gray-900">{MONTH_NAMES[hover]}</p>
            <p>Mean: {h.mean?.[value] == null ? '—' : `${Number(h.mean[value]).toFixed(digits)} ${unit}`}</p>
            <p>{year}: {h.now?.[value] == null ? 'not yet' : `${Number(h.now[value]).toFixed(digits)} ${unit}`}</p>
          </Readout>
        )}
      </div>
    </div>
  );
}
