import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A map of the suitability report on the web page, laid out like the PDF and a printed map: the analysis
 * picture and the farm boundary in a thin frame, latitude/longitude ticks pointing out of the frame with the
 * coordinates outside it on all four sides (degrees, minutes, seconds: 4°24′0″E), and the scale bar and north
 * arrow in a strip under the map; white space inside the frame so the farm never touches it; the legend below, in the same panel. Nothing is drawn on the map itself.
 * Extents are [west, south, east, north] in degrees; pictures are north up on a lon/lat grid.
 */

// ── Settings ─────────────────────────────────────────────────────────────────────────────────────
// Round steps in degrees, written as degrees, minutes and seconds (1", 5", 10", 30", 1', 2', 3', 5', 6', 10', 15', 30', 1°, 2°).
const GRID_STEPS = [1 / 3600, 5 / 3600, 10 / 3600, 30 / 3600, 1 / 60, 2 / 60, 3 / 60, 5 / 60, 6 / 60, 10 / 60, 15 / 60, 0.5, 1, 2];
const GRID_TARGET_LINES = 4;   // about this many ticks along each edge
const TICK_PX = 5;
const LABEL_PX = 11;
const MARGIN_PX = 22;          // room outside the frame for the coordinates, each side
const FOOTER_PX = 30;          // strip under the map for the scale bar and north arrow
const SCALE_BAR_SHARE = 0.25;
const FRAME_PAD_SHARE = 0.05;  // white space inside the frame round the map: this share of its longer side
const HEIGHTS = { tall: [420, 680], normal: [380, 540] };   // [phone, wider screens]
const INK = '#111827';

const groundAspect = ([w, s, e, n]) => ((e - w) * Math.cos(((s + n) / 2) * (Math.PI / 180))) / (n - s || 1);

/** The extent with white space round it inside the frame: the same ground distance on every side. */
function padded([w, s, e, n]) {
  const cos = Math.max(Math.cos(((s + n) / 2) * (Math.PI / 180)), 1e-6);
  const padKm = FRAME_PAD_SHARE * Math.max((e - w) * 111.32 * cos, (n - s) * 111.32);
  const dLon = padKm / (111.32 * cos);
  const dLat = padKm / 111.32;
  return [w - dLon, s - dLat, e + dLon, n + dLat];
}

function niceKm(x) {
  if (!(x > 0)) return 0;
  const e = 10 ** Math.floor(Math.log10(x));
  return [5, 2, 1, 0.5].map((m) => m * e).find((v) => v <= x) || e;
}

const gridStep = (span) => GRID_STEPS.reduce((best, st) => (Math.abs(span / st - GRID_TARGET_LINES) < Math.abs(span / best - GRID_TARGET_LINES) ? st : best));

/** Round values along a span, leaving out one exactly on the edge (it would sit on the frame's corner). */
function ticksAlong(start, end, step) {
  let v = Math.ceil(start / step - 1e-9) * step;
  if (v - start < step * 0.05) v += step;
  const out = [];
  for (; v < end - step * 0.05; v += step) out.push(v);
  return out;
}

/** A coordinate as degrees, minutes and seconds, like a printed map: 4°24′0″E. */
function dms(v, pos, neg) {
  const total = Math.round(Math.abs(v) * 3600);
  const d = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${d}°${m}′${s}″${v >= 0 ? pos : neg}`;
}

/** The frame's size in pixels: the largest box of the map's shape that fits the panel, with room round it. */
function useFrame(aspect) {
  const holder = useRef(null);
  const [size, setSize] = useState(null);
  const measure = useCallback(() => {
    const el = holder.current;
    if (!el || !aspect) return;
    const cw = el.clientWidth - 2 * MARGIN_PX - 8;
    const ch = el.clientHeight - 2 * MARGIN_PX - FOOTER_PX;
    const w = Math.max(40, Math.min(cw, ch * aspect));
    setSize({ w, h: w / aspect });
  }, [aspect]);
  useEffect(() => {
    measure();
    const el = holder.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);
  return [holder, size];
}

/** The farm boundary over the map, and the frame with its ticks and coordinates outside it. */
function Overlay({ view, rings, size }) {
  const [w0, s0, e0, n0] = view;
  const M = MARGIN_PX;
  const x = (lon) => M + ((lon - w0) / (e0 - w0)) * size.w;
  const y = (lat) => M + ((n0 - lat) / (n0 - s0)) * size.h;
  const lonStep = gridStep(e0 - w0);
  const latStep = gridStep(n0 - s0);
  const lons = ticksAlong(w0, e0, lonStep);
  const lats = ticksAlong(s0, n0, latStep);
  const boundary = (rings || []).map((r) => r.map(([lon, lat], i) => `${i ? 'L' : 'M'}${x(lon).toFixed(1)},${y(lat).toFixed(1)}`).join(' ') + ' Z').join(' ');
  const gap = TICK_PX + 3;
  return (
    <svg className="pointer-events-none absolute overflow-visible" style={{ left: -M, top: -M }}
      width={size.w + 2 * M} height={size.h + 2 * M} aria-hidden="true">
      {boundary && <path d={boundary} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />}
      <rect x={M} y={M} width={size.w} height={size.h} fill="none" stroke={INK} strokeWidth="1" />
      <g stroke={INK} strokeWidth="0.8">
        {lons.map((v) => <g key={`x${v}`}><line x1={x(v)} y1={M - TICK_PX} x2={x(v)} y2={M} /><line x1={x(v)} y1={M + size.h} x2={x(v)} y2={M + size.h + TICK_PX} /></g>)}
        {lats.map((v) => <g key={`y${v}`}><line x1={M - TICK_PX} y1={y(v)} x2={M} y2={y(v)} /><line x1={M + size.w} y1={y(v)} x2={M + size.w + TICK_PX} y2={y(v)} /></g>)}
      </g>
      <g fontFamily="Inter, sans-serif" fontSize={LABEL_PX} fill={INK} textAnchor="middle">
        {lons.map((v) => {
          const t = dms(v, 'E', 'W');
          return (
            <g key={`lx${v}`}>
              <text x={x(v)} y={M - gap}>{t}</text>
              <text x={x(v)} y={M + size.h + gap + LABEL_PX * 0.8}>{t}</text>
            </g>
          );
        })}
        {lats.map((v) => {
          const t = dms(v, 'N', 'S');
          return (
            <g key={`ly${v}`}>
              <text transform={`translate(${M - gap},${y(v)}) rotate(-90)`}>{t}</text>
              <text transform={`translate(${M + size.w + gap},${y(v)}) rotate(90)`}>{t}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function ScaleBar({ view, width }) {
  const [w0, s0, e0, n0] = view;
  const groundKm = (e0 - w0) * 111.32 * Math.cos(((s0 + n0) / 2) * (Math.PI / 180));
  const kmPerPx = groundKm / width;
  const km = niceKm(kmPerPx * width * SCALE_BAR_SHARE);
  if (!km) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-900">
      <span className="flex h-1.5 border border-gray-900" style={{ width: km / kmPerPx }}>
        <span className="h-full w-1/2 bg-gray-900" /><span className="h-full w-1/2 bg-white" />
      </span>
      {km >= 1 ? `${km} km` : `${Math.round(km * 1000)} m`}
    </div>
  );
}

export default function ReportMap({ map, extent, outline, tall = false, children }) {
  const view = extent ? padded(extent) : null;           // the frame's extent: the map with white space round it
  const [holder, size] = useFrame(view ? groundAspect(view) : null);
  // The picture covers the extent, placed inside the frame's wider view (as shares of the frame).
  const place = view ? {
    left: `${((extent[0] - view[0]) / (view[2] - view[0])) * 100}%`, top: `${((view[3] - extent[3]) / (view[3] - view[1])) * 100}%`,
    width: `${((extent[2] - extent[0]) / (view[2] - view[0])) * 100}%`, height: `${((extent[3] - extent[1]) / (view[3] - view[1])) * 100}%`,
  } : null;
  const [phone, wide] = tall ? HEIGHTS.tall : HEIGHTS.normal;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-2.5 text-sm font-semibold">
        {map.letter && <span className="mr-2 text-green-700">{map.letter}</span>}{map.title}
      </div>
      <div ref={holder} className="relative flex flex-col items-center" style={{ height: `clamp(${phone}px, 60vw, ${wide}px)` }}>
        <div className="flex-1 w-full flex items-center justify-center">
          {size && extent ? (
            <div className="relative" style={{ width: size.w, height: size.h }}>
              <img src={map.image} alt={map.title} className="absolute" style={place} />
              <Overlay view={view} rings={outline} size={size} />
            </div>
          ) : <img src={map.image} alt={map.title} className="max-h-full max-w-full p-4" />}
        </div>
        {/* Under the map: the scale bar and the north arrow. */}
        <div className="w-full shrink-0 flex items-center justify-between px-4" style={{ height: FOOTER_PX }}>
          {size && view ? <ScaleBar view={view} width={size.w} /> : <span />}
          <svg width="16" height="24" viewBox="0 0 20 30" aria-label="North">
            <path d="M10,1 L16,17 L10,13 L4,17 Z" fill={INK} />
            <text x="10" y="28" fontSize="9" fontWeight="600" fill={INK} textAnchor="middle" fontFamily="Inter, sans-serif">N</text>
          </svg>
        </div>
      </div>
      {children && <div className="border-t border-gray-200 px-4 py-3">{children}</div>}
    </div>
  );
}
