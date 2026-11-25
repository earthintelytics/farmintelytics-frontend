/**
 * Small charts for GWON, drawn as SVG: one axis, thin marks, a legend, this year in teal and last year in grey,
 * a hover readout on every bar or point. Values come straight from the data passed in.
 */
import { useState } from 'react';

const TEAL = '#007248', GREY = '#A3AEB8', AMBER = '#D97706';

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: color }} />{label}</span>
      ))}
    </div>
  );
}

/** Monthly rain: two bars a month (last year, this year). */
export function RainBars({ thisYear, lastYear, year, unit = 'mm' }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 230, pad = { l: 40, r: 8, t: 22, b: 26 };
  const vals = [...thisYear, ...lastYear].filter(Boolean).map((r) => r.rain);
  const max = Math.max(10, ...vals) * 1.1;
  const bw = (W - pad.l - pad.r) / 12;
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);
  const ticks = [0, max / 2, max].map((v) => Math.round(v));
  return (
    <div className="space-y-2">
      <Legend items={[[`${year - 1}`, GREY], [`${year}`, TEAL]]} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Monthly rainfall, ${year - 1} and ${year}`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#EEF1F3" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{t}</text></g>
          ))}
          {thisYear.map((r, i) => {
            const x0 = pad.l + i * bw + 4, w = (bw - 10) / 2;
            const a = lastYear[i], b = r;
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                {a && <rect x={x0} y={y(a.rain)} width={w} height={H - pad.b - y(a.rain)} rx="2" fill={GREY} />}
                {b && <rect x={x0 + w + 2} y={y(b.rain)} width={w} height={H - pad.b - y(b.rain)} rx="2" fill={TEAL} />}
                <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7280">{(a || b)?.month || ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</text>
              </g>
            );
          })}
          <text x={4} y={12} fontSize="11" fill="#6B7280">{unit}</text>
        </svg>
        {hover != null && (
          <div className="absolute top-0 right-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
            <p className="font-semibold text-gray-900">{(thisYear[hover] || lastYear[hover])?.month}</p>
            <p>{year - 1}: {lastYear[hover] ? `${Math.round(lastYear[hover].rain)} ${unit}` : 'no data'}</p>
            <p>{year}: {thisYear[hover] ? `${Math.round(thisYear[hover].rain)} ${unit}` : 'no data yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Monthly lines: average daily highest temperature, or any monthly value, this year against last year. */
export function MonthLines({ thisYear, lastYear, year, value = 'tmax', unit = '°C', color = AMBER }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 210, pad = { l: 40, r: 8, t: 22, b: 26 };
  const vals = [...thisYear, ...lastYear].filter(Boolean).map((r) => r[value]);
  if (!vals.length) return null;
  const min = Math.floor(Math.min(...vals) - 1), max = Math.ceil(Math.max(...vals) + 1);
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / 11;
  const y = (v) => H - pad.b - ((v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const path = (rows) => rows.map((r, i) => (r ? `${x(i)},${y(r[value])}` : null)).filter(Boolean).map((p, k) => `${k ? 'L' : 'M'}${p}`).join('');
  return (
    <div className="space-y-2">
      <Legend items={[[`${year - 1}`, GREY], [`${year}`, color]]} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Monthly ${value}, ${year - 1} and ${year}`} onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(11, Math.round((((e.clientX - r.left) / r.width) * W - pad.l) / ((W - pad.l - pad.r) / 11))))); }}>
          {[min, (min + max) / 2, max].map((t) => (
            <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#EEF1F3" /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6B7280">{Math.round(t)}</text></g>
          ))}
          <path d={path(lastYear)} fill="none" stroke={GREY} strokeWidth="2" />
          <path d={path(thisYear)} fill="none" stroke={color} strokeWidth="2" />
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#CBD5E1" />}
          {thisYear.map((r, i) => r && <circle key={i} cx={x(i)} cy={y(r[value])} r={hover === i ? 4.5 : 3} fill={color} stroke="#fff" strokeWidth="1.5" />)}
          {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#6B7280">{m}</text>)}
          <text x={4} y={12} fontSize="11" fill="#6B7280">{unit}</text>
        </svg>
        {hover != null && (
          <div className="absolute top-0 right-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
            <p className="font-semibold text-gray-900">{(thisYear[hover] || lastYear[hover])?.month}</p>
            <p>{year - 1}: {lastYear[hover] ? `${lastYear[hover][value].toFixed(1)} ${unit}` : 'no data'}</p>
            <p>{year}: {thisYear[hover] ? `${thisYear[hover][value].toFixed(1)} ${unit}` : 'no data yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** One bar per state, for comparing the states on one figure (sorted, labelled). */
export function StateBars({ rows, unit, color = TEAL, digits = 0 }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value || 0)));
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[90px_1fr_80px] items-center gap-3 text-sm">
          <span className="text-gray-700 truncate">{r.label}</span>
          <span className="h-3 bg-gray-100 rounded-sm overflow-hidden"><span className="block h-full rounded-sm" style={{ width: `${(Math.abs(r.value || 0) / max) * 100}%`, background: r.color || color }} /></span>
          <span className="text-right tabular-nums text-gray-900">{r.value == null ? '—' : `${r.value.toLocaleString('en-GB', { maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`}</span>
        </div>
      ))}
    </div>
  );
}
