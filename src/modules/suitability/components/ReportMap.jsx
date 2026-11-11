import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A map of the suitability report on the web page, drawn like the PDF's: a faint street map (when the run has
 * one), the analysis picture at its place inside it, the farm boundary, a light latitude/longitude grid with
 * labels on the left and bottom edges, a north arrow and a scale bar; the legend below, in the same frame.
 * Extents are [west, south, east, north] in degrees; pictures are north up on a lon/lat grid.
 */

// ── Settings ─────────────────────────────────────────────────────────────────────────────────────
const GRID_STEPS = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2];
const GRID_TARGET_LINES = 4;
const SCALE_BAR_SHARE = 0.25;
const PADDING_PX = 16;
const HEIGHTS = { tall: [340, 520], normal: [300, 400] };   // [phone, wider screens]

const groundAspect = ([w, s, e, n]) => ((e - w) * Math.cos(((s + n) / 2) * (Math.PI / 180))) / (n - s || 1);

function niceKm(x) {
  if (!(x > 0)) return 0;
  const e = 10 ** Math.floor(Math.log10(x));
  return [5, 2, 1, 0.5].map((m) => m * e).find((v) => v <= x) || e;
}

const gridStep = (span) => GRID_STEPS.reduce((best, st) => (Math.abs(span / st - GRID_TARGET_LINES) < Math.abs(span / best - GRID_TARGET_LINES) ? st : best));

function degreeLabel(v, step, pos, neg) {
  const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
  return `${Math.abs(v).toFixed(decimals)}°${v >= 0 ? pos : neg}`;
}

/** The frame's size in pixels: the largest box of the map's shape that fits the panel. */
function useFrame(aspect) {
  const holder = useRef(null);
  const [size, setSize] = useState(null);
  const measure = useCallback(() => {
    const el = holder.current;
    if (!el || !aspect) return;
    const cw = el.clientWidth - 2 * PADDING_PX;
    const ch = el.clientHeight - 2 * PADDING_PX;
    const w = Math.min(cw, ch * aspect);
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

function Overlay({ view, rings, size }) {
  const [w0, s0, e0, n0] = view;
  const x = (lon) => ((lon - w0) / (e0 - w0)) * size.w;
  const y = (lat) => ((n0 - lat) / (n0 - s0)) * size.h;
  const lonStep = gridStep(e0 - w0);
  const latStep = gridStep(n0 - s0);
  const lons = [];
  for (let v = Math.ceil(w0 / lonStep) * lonStep; v < e0; v += lonStep) lons.push(v);
  const lats = [];
  for (let v = Math.ceil(s0 / latStep) * latStep; v < n0; v += latStep) lats.push(v);
  const boundary = (rings || []).map((r) => r.map(([lon, lat], i) => `${i ? 'L' : 'M'}${x(lon).toFixed(1)},${y(lat).toFixed(1)}`).join(' ') + ' Z').join(' ');
  return (
    <svg className="pointer-events-none absolute inset-0" width={size.w} height={size.h} aria-hidden="true">
      <g stroke="#6B7280" strokeOpacity="0.45" strokeWidth="0.6">
        {lons.map((v) => <line key={`x${v}`} x1={x(v)} y1="0" x2={x(v)} y2={size.h} />)}
        {lats.map((v) => <line key={`y${v}`} x1="0" y1={y(v)} x2={size.w} y2={y(v)} />)}
      </g>
      {boundary && <path d={boundary} fill="none" stroke="#111827" strokeWidth="1.6" strokeLinejoin="round" />}
      <g fontFamily="Inter, sans-serif" fontSize="11" fill="#111827">
        {lons.map((v) => {
          const t = degreeLabel(v, lonStep, 'E', 'W');
          return (
            <g key={`lx${v}`}>
              <rect x={x(v) - t.length * 3.3} y={size.h - 16} width={t.length * 6.6} height="15" fill="#fff" opacity="0.85" />
              <text x={x(v)} y={size.h - 5} textAnchor="middle">{t}</text>
            </g>
          );
        })}
        {lats.map((v) => {
          const t = degreeLabel(v, latStep, 'N', 'S');
          return (
            <g key={`ly${v}`}>
              <rect x="0" y={y(v) - 8} width={t.length * 6.6 + 6} height="15" fill="#fff" opacity="0.85" />
              <text x="3" y={y(v) + 4}>{t}</text>
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
    <div className="absolute bottom-3 left-4 flex items-center gap-2 rounded bg-white/85 px-1.5 py-1 text-[11px] text-gray-900">
      <span className="flex h-1.5 border border-gray-900" style={{ width: km / kmPerPx }}>
        <span className="h-full w-1/2 bg-gray-900" /><span className="h-full w-1/2 bg-white" />
      </span>
      {km >= 1 ? `${km} km` : `${Math.round(km * 1000)} m`}
    </div>
  );
}

export default function ReportMap({ map, extent, outline, basemap, tall = false, children }) {
  const view = basemap?.extent || extent;
  const [holder, size] = useFrame(view ? groundAspect(view) : null);
  const [phone, wide] = tall ? HEIGHTS.tall : HEIGHTS.normal;
  // The analysis picture's place inside the street map's wider view, as shares of the frame.
  const place = basemap && extent ? {
    left: `${((extent[0] - view[0]) / (view[2] - view[0])) * 100}%`, top: `${((view[3] - extent[3]) / (view[3] - view[1])) * 100}%`,
    width: `${((extent[2] - extent[0]) / (view[2] - view[0])) * 100}%`, height: `${((extent[3] - extent[1]) / (view[3] - view[1])) * 100}%`,
  } : { left: 0, top: 0, width: '100%', height: '100%' };
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-2.5 text-sm font-semibold">
        {map.letter && <span className="mr-2 text-green-700">{map.letter}</span>}{map.title}
      </div>
      <div ref={holder} className="relative flex items-center justify-center" style={{ height: `clamp(${phone}px, 50vw, ${wide}px)` }}>
        {size && view ? (
          <div className="relative" style={{ width: size.w, height: size.h }}>
            {basemap && <img src={basemap.image} alt="" className="absolute inset-0 h-full w-full" />}
            <img src={map.image} alt={map.title} className="absolute" style={place} />
            <Overlay view={view} rings={outline} size={size} />
          </div>
        ) : <img src={map.image} alt={map.title} className="max-h-full max-w-full p-4" />}
        <svg className="absolute right-4 top-3" width="20" height="30" viewBox="0 0 20 30" aria-label="North">
          <path d="M10,1 L16,17 L10,13 L4,17 Z" fill="#111827" />
          <text x="10" y="28" fontSize="9" fontWeight="600" fill="#111827" textAnchor="middle" fontFamily="Inter, sans-serif">N</text>
        </svg>
        {size && view && <ScaleBar view={view} width={size.w} />}
      </div>
      {children && <div className="border-t border-gray-200 px-4 py-3">{children}</div>}
    </div>
  );
}
