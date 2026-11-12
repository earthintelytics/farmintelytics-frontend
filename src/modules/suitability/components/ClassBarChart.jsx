import { useState } from 'react';
import { CLASSES } from '../suitabilityLabels';

/**
 * Hectares in each suitability class as a bar chart: one bar per class in its map colour, the bar's height
 * its hectares, the share and hectares written above it and the class name under it (text in ink, never in
 * the bar colour). Hovering or tapping a bar shows its figures. The figures list under the chart is the
 * plain-text view.
 */

// ── Settings ─────────────────────────────────────────────────────────────────────────────────────
const PLOT_PX = 160;          // height of the tallest bar
const MIN_BAR_PX = 2;         // a class with a little land still shows

const fmtHa = (v) => `${Math.round(v).toLocaleString()} ha`;

export default function ClassBarChart({ areas = {}, total = 0 }) {
  const [hover, setHover] = useState(null);
  const rows = CLASSES.map((c) => {
    const v = Number(areas?.[c.key] || 0);
    return { ...c, v, share: total > 0 ? (v / total) * 100 : 0 };
  });
  const max = Math.max(...rows.map((r) => r.v), 1);
  return (
    <div role="img" aria-label={rows.map((r) => `${r.label}: ${fmtHa(r.v)} (${Math.round(r.share)}%)`).join('; ')}>
      <div className="relative grid grid-cols-4 gap-3 items-end border-b border-gray-300" style={{ height: PLOT_PX + 40 }}>
        {rows.map((r, i) => {
          const h = r.v > 0 ? Math.max(MIN_BAR_PX, (r.v / max) * PLOT_PX) : 0;
          const on = hover === r.key;
          return (
            <button key={r.key} type="button" className="relative h-full flex flex-col items-center justify-end min-w-0 focus:outline-none"
              onMouseEnter={() => setHover(r.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(r.key)} onBlur={() => setHover(null)}
              aria-label={`${r.label}: ${fmtHa(r.v)}, ${Math.round(r.share)}%`}>
              <span className="text-sm font-semibold text-gray-900 font-mono">{Math.round(r.share)}%</span>
              <span className="text-[11px] text-gray-500 font-mono mb-1 truncate max-w-full">{fmtHa(r.v)}</span>
              <span className="w-full max-w-[56px] rounded-t-[4px] transition-opacity"
                style={{ height: h, background: r.hex, opacity: hover && !on ? 0.55 : 1 }} />
              {on && (
                <span className={`absolute top-0 z-10 whitespace-nowrap ${i === 0 ? 'left-0' : i === rows.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}><span className="block whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-800">
                  <b className="font-semibold">{r.label}</b> · {fmtHa(r.v)} · {r.share.toFixed(1)}%
                </span></span>
              )}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-3 mt-2">
        {rows.map((r) => (
          <span key={r.key} className="text-center text-[11px] font-semibold text-gray-700 leading-tight break-words">{r.label}</span>
        ))}
      </div>
    </div>
  );
}
