import { CLASSES } from '../suitabilityLabels';

/**
 * Hectares in each suitability class as a bar chart: one bar per class in its map colour, the bar's height
 * its hectares, the share and hectares written above it and the class name under it (text in ink, never in
 * the bar colour). Every figure is on the chart, so there is no separate list or pop-up; screen readers get
 * the figures from its label.
 */

// ── Settings ─────────────────────────────────────────────────────────────────────────────────────
const PLOT_PX = 160;          // height of the tallest bar
const MIN_BAR_PX = 2;         // a class with a little land still shows

const fmtHa = (v) => `${Math.round(v).toLocaleString()} ha`;

export default function ClassBarChart({ areas = {}, total = 0 }) {
  const rows = CLASSES.map((c) => {
    const v = Number(areas?.[c.key] || 0);
    return { ...c, v, share: total > 0 ? (v / total) * 100 : 0 };
  });
  const max = Math.max(...rows.map((r) => r.v), 1);
  return (
    <div role="img" aria-label={rows.map((r) => `${r.label}: ${fmtHa(r.v)} (${Math.round(r.share)}%)`).join('; ')}>
      <div className="relative grid grid-cols-4 gap-3 items-end border-b border-gray-300" style={{ height: PLOT_PX + 40 }}>
        {rows.map((r) => {
          const h = r.v > 0 ? Math.max(MIN_BAR_PX, (r.v / max) * PLOT_PX) : 0;
          return (
            <div key={r.key} className="relative h-full flex flex-col items-center justify-end min-w-0">
              <span className="text-sm font-semibold text-gray-900 font-mono">{Math.round(r.share)}%</span>
              <span className="text-[11px] text-gray-500 font-mono mb-1 truncate max-w-full">{fmtHa(r.v)}</span>
              <span className="w-full max-w-[56px] rounded-t-[4px] transition-opacity"
                style={{ height: h, background: r.hex }} />
            </div>
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
