import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Clock,
  Map,
  CheckSquare,
  ShieldCheck,
  Truck,
  Scale,
  Zap,
  Grid3x3,
  Trees as TreePalm
} from 'lucide-react';

// Palette — only the colours this page already used.
const C = {
  ink: '#0F172A',
  body: '#334155',
  muted: '#475569',
  faint: '#64748B',
  line: '#E2E8F0',
  lineStrong: '#CBD5E1',
  panel: '#FFFFFF', // page is white throughout; borders separate blocks
  white: '#FFFFFF',
  green: '#3F8432',
  greenDark: '#3F8432',
  greenSoft: '#F3F8EF',
  greenTint: '#F3F8EF',
  greenLine: '#86EFAC',
  red: '#DC2626',
  amber: '#D97706'
};

const SECTIONS = [
  { id: 'section-1', title: 'Plot Boundaries & 5-Tier Flow', icon: Building2 },
  { id: 'section-2', title: 'Worker Roles & Compatibility', icon: Users },
  { id: 'section-3', title: 'Fraud & Duplicate Suppression', icon: Clock },
  { id: 'section-4', title: 'PostGIS Plot Platforms', icon: Map },
  { id: 'section-5', title: 'Three-Record Reconciliation & Scoring', icon: CheckSquare },
  { id: 'section-6', title: 'Approval: Score & Decisions', icon: ShieldCheck },
  { id: 'section-7', title: 'Field App Sync & Data Rules', icon: Zap },
  { id: 'section-8', title: 'Governance', icon: ShieldCheck }
];

const PAGE_CSS = `
.mth-layout { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 28px; align-items: start; }
.mth-aside { position: sticky; top: 24px; }
.mth-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.mth-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.mth-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.mth-table th { padding: 12px 16px; color: ${C.ink}; font-weight: 500; text-align: left; background: ${C.panel}; border-bottom: 2px solid ${C.line}; white-space: nowrap; }
.mth-table td { padding: 12px 16px; border-bottom: 1px solid ${C.line}; color: ${C.body}; vertical-align: top; }
.mth-table tr:last-child td { border-bottom: none; }
.mth-table tbody tr:hover td { background: ${C.greenTint}; }
.mth-nav-btn:hover { background: ${C.greenTint}; }
#main-content { background: ${C.white}; overflow: visible; }
.mth-card { transition: border-color .15s ease, box-shadow .15s ease; }
@media (max-width: 960px) {
  .mth-layout { grid-template-columns: 1fr; }
  .mth-aside { position: static; }
  .mth-page { padding: 16px !important; }
  .mth-section { padding: 20px !important; }
}
`;

/* ---------- small building blocks ---------- */

function SectionShell({ id, number, icon: Icon, title, lead, children }) {
  return (
    <section id={id} style={{ scrollMarginTop: '24px' }}>
      <div className="mth-section" style={{ background: C.white, borderRadius: '16px', padding: '32px', border: `1px solid ${C.line}`, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: lead ? '10px' : '20px' }}>
          <div style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '12px', background: C.greenSoft, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: C.green, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Section {number}</div>
            <h2 style={{ fontSize: '21px', fontWeight: 500, color: C.ink, margin: '2px 0 0 0', lineHeight: 1.25 }}>{title}</h2>
          </div>
        </div>
        {lead && <p style={{ fontSize: '14px', color: C.body, lineHeight: 1.7, margin: '0 0 22px 0', maxWidth: '900px' }}>{lead}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>{children}</div>
      </div>
    </section>
  );
}

function Card({ title, eyebrow, icon: Icon, children }) {
  return (
    <div className="mth-card" style={{ background: C.panel, padding: '18px 20px', borderRadius: '12px', border: `1px solid ${C.lineStrong}` }}>
      {eyebrow && <div style={{ fontSize: '11px', fontWeight: 500, color: C.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{eyebrow}</div>}
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          {Icon && <Icon size={20} color={C.green} style={{ flexShrink: 0 }} />}
          <div style={{ fontSize: '15px', fontWeight: 500, color: C.ink, lineHeight: 1.35 }}>{title}</div>
        </div>
      )}
      <div style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function Formula({ children }) {
  return (
    <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500, color: C.green, background: C.white, padding: '12px 14px', borderRadius: '8px', border: `1px solid ${C.line}`, overflowX: 'auto', lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

function Figure({ caption, children }) {
  return (
    <figure style={{ margin: 0, background: C.panel, border: `1px solid ${C.line}`, borderRadius: '14px', padding: '20px 20px 14px' }}>
      <div style={{ overflowX: 'auto' }}>{children}</div>
      {caption && (
        <figcaption style={{ fontSize: '12px', color: C.faint, fontWeight: 400, marginTop: '10px', textAlign: 'center', lineHeight: 1.5 }}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function ArrowDefs({ id, color = C.faint }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill={color} />
      </marker>
    </defs>
  );
}

const svgText = { fontFamily: "'Inter', sans-serif" };

/* ---------- diagrams ---------- */

function TierFlowDiagram() {
  const tiers = [
    { n: 1, label: 'Plot Boundary', sub: 'MA · EX1 · EX2' },
    { n: 2, label: 'Platforms', sub: '8m band · 8m platforms' },
    { n: 3, label: 'Tree Rows', sub: 'Cut & pick' },
    { n: 4, label: 'Platform', sub: 'AI count · loading' },
    { n: 5, label: 'Weighbridge', sub: 'Net = Gross − Tare' }
  ];
  const w = 164, gap = 26, x0 = 10, y = 34, h = 86;
  const total = x0 * 2 + tiers.length * w + (tiers.length - 1) * gap;
  return (
    <svg viewBox={`0 0 ${total} 196`} style={{ width: '100%', minWidth: '540px', display: 'block', ...svgText }} role="img" aria-label="Five-tier operational flow from plot boundary to weighbridge, with weighbridge results reconciling back to the plot">
      <ArrowDefs id="tf-arrow" />
      <ArrowDefs id="tf-arrow-g" color={C.green} />
      {tiers.map((t, i) => {
        const x = x0 + i * (w + gap);
        const last = i === tiers.length - 1;
        return (
          <g key={t.n}>
            <rect x={x} y={y} width={w} height={h} rx="12" fill={last || i === 0 ? C.greenSoft : C.white} stroke={last || i === 0 ? C.green : C.lineStrong} strokeWidth="1.5" />
            <circle cx={x + 24} cy={y + 24} r="13" fill={C.green} />
            <text x={x + 24} y={y + 28.5} textAnchor="middle" fontSize="12.5" fontWeight="900" fill={C.white}>{t.n}</text>
            <text x={x + 12} y={y + 60} fontSize="13.5" fontWeight="900" fill={C.ink}>{t.label}</text>
            <text x={x + 12} y={y + 76} fontSize="11" fontWeight="600" fill={C.muted}>{t.sub}</text>
            {!last && (
              <line x1={x + w + 4} y1={y + h / 2} x2={x + w + gap - 4} y2={y + h / 2} stroke={C.faint} strokeWidth="1.8" markerEnd="url(#tf-arrow)" />
            )}
          </g>
        );
      })}
      {/* feedback loop */}
      <path
        d={`M ${x0 + 4 * (w + gap) + w / 2} ${y + h + 4} V ${y + h + 44} H ${x0 + w / 2} V ${y + h + 6}`}
        fill="none" stroke={C.green} strokeWidth="1.8" strokeDasharray="6 5" markerEnd="url(#tf-arrow-g)"
      />
      <text x={total / 2} y={y + h + 38} textAnchor="middle" fontSize="12" fontWeight="800" fill={C.green}>
        Net FFB tonnage reconciles back to plot quotas
      </text>
      <text x={total / 2} y="22" textAnchor="middle" fontSize="11" fontWeight="800" fill={C.faint} letterSpacing="1.2">FIELD → MILL</text>
    </svg>
  );
}

function RoleGroupDiagram() {
  const groups = [
    { name: 'Cutter', raw: ['CUTTER', 'HARVESTING', 'AGRIC WORKER'] },
    { name: 'Carrier', raw: ['CARRIER'] },
    { name: 'Picker', raw: ['LOOSE FRUIT PICKER', 'PICKER'] },
    { name: 'Loading Role', raw: ['COUNTER'] },
    { name: 'Harvester Role', raw: ['RECORDER'] }
  ];
  const unknown = ['FFB LOADER', 'Headman', 'Headperson', 'Headwoman', 'FIELD HAND', 'PRUNNING', 'Tapping'];
  const rowH = 26, top = 36;
  let cursor = top;
  const placed = groups.map(g => {
    const startY = cursor;
    cursor += g.raw.length * rowH + 12;
    return { ...g, startY, midY: startY + (g.raw.length * rowH) / 2 - 4 };
  });
  const unknownY = cursor + 14;
  const height = unknownY + unknown.length * 0 + 64;
  return (
    <svg viewBox={`0 0 760 ${height}`} style={{ width: '100%', minWidth: '540px', display: 'block', ...svgText }} role="img" aria-label="Raw function values from uploaded spreadsheets are converted to five role groups; unknown roles are skipped">
      <ArrowDefs id="rg-arrow" color={C.green} />
      <ArrowDefs id="rg-arrow-r" color={C.red} />
      <text x="10" y="18" fontSize="11" fontWeight="900" fill={C.faint} letterSpacing="1">VALUE IN UPLOADED FILE</text>
      <text x="470" y="18" fontSize="11" fontWeight="900" fill={C.faint} letterSpacing="1">STORED ROLE GROUP</text>
      {placed.map(g => (
        <g key={g.name}>
          {g.raw.map((r, i) => {
            const ry = g.startY + i * rowH;
            return (
              <g key={r}>
                <rect x="10" y={ry} width="210" height="20" rx="6" fill={C.white} stroke={C.lineStrong} />
                <text x="20" y={ry + 14} fontSize="11.5" fontWeight="700" fill={C.body} fontFamily="monospace">{r}</text>
                <path d={`M 224 ${ry + 10} C 330 ${ry + 10}, 360 ${g.midY + 12}, 462 ${g.midY + 12}`} fill="none" stroke={C.greenLine} strokeWidth="1.6" markerEnd="url(#rg-arrow)" />
              </g>
            );
          })}
          <rect x="470" y={g.midY - 4} width="200" height="32" rx="8" fill={C.greenSoft} stroke={C.green} strokeWidth="1.5" />
          <text x="570" y={g.midY + 16} textAnchor="middle" fontSize="13" fontWeight="900" fill={C.greenDark}>{g.name}</text>
        </g>
      ))}
      <rect x="10" y={unknownY} width="740" height="44" rx="8" fill={C.white} stroke={C.red} strokeDasharray="5 4" />
      <text x="22" y={unknownY + 18} fontSize="11.5" fontWeight="900" fill={C.red}>UNKNOWN → SKIPPED AT UPLOAD (never stored)</text>
      <text x="22" y={unknownY + 35} fontSize="11.5" fontWeight="700" fill={C.muted} fontFamily="monospace">{unknown.join(' · ')} · any other value</text>
    </svg>
  );
}

function CompatibilityDiagram() {
  // who may fill which field slot
  const workers = ['Cutter', 'Carrier', 'Picker', 'Clerk'];
  const slots = ['Cutter slot', 'Carrier slot', 'Picker slot'];
  const allowed = {
    'Cutter': [true, true, false],
    'Carrier': [false, true, true],
    'Picker': [false, true, true],
    'Clerk': [false, false, false]
  };
  const cellW = 150, cellH = 40, left = 140, top = 44;
  return (
    <svg viewBox={`0 0 ${left + slots.length * cellW + 10} ${top + workers.length * cellH + 10}`} style={{ width: '100%', minWidth: '540px', display: 'block', ...svgText }} role="img" aria-label="Assignment matrix: cutters may fill cutter and carrier slots; carriers and pickers may fill carrier and picker slots; operators may not fill field slots">
      {slots.map((s, j) => (
        <text key={s} x={left + j * cellW + cellW / 2} y={top - 14} textAnchor="middle" fontSize="12" fontWeight="900" fill={C.ink}>{s}</text>
      ))}
      {workers.map((w, i) => (
        <g key={w}>
          <text x={left - 14} y={top + i * cellH + cellH / 2 + 4} textAnchor="end" fontSize="12.5" fontWeight="900" fill={C.ink}>{w}</text>
          {slots.map((s, j) => {
            const ok = allowed[w][j];
            const x = left + j * cellW + 6, y = top + i * cellH + 4;
            return (
              <g key={s}>
                <rect x={x} y={y} width={cellW - 12} height={cellH - 8} rx="8" fill={ok ? C.greenSoft : C.white} stroke={ok ? C.green : C.lineStrong} />
                <text x={x + (cellW - 12) / 2} y={y + 21} textAnchor="middle" fontSize="12" fontWeight="900" fill={ok ? C.greenDark : C.red}>
                  {ok ? 'Allowed' : 'Blocked'}
                </text>
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

function DuplicateWindowDiagram() {
  const x0 = 40, x1 = 720, y = 70;
  const scale = (x1 - x0) / 600; // 0..600 seconds shown
  const ax = x0 + 120 * scale;
  const events = [
    { t: 120, label: 'Record A', sub: 'Worker 600573 · 42 bunches', kind: 'origin' },
    { t: 260, label: 'Record B', sub: 'same worker & count · +140s', kind: 'dup' },
    { t: 520, label: 'Record C', sub: 'same worker & count · +400s', kind: 'ok' }
  ];
  return (
    <svg viewBox="0 0 760 170" style={{ width: '100%', minWidth: '540px', display: 'block', ...svgText }} role="img" aria-label="Timeline: a second identical record within 300 seconds is flagged as duplicate; one after 300 seconds is not">
      <rect x={ax} y={y - 34} width={300 * scale} height="68" rx="8" fill={C.greenTint} stroke={C.greenLine} strokeDasharray="5 4" />
      <text x={ax + (300 * scale) / 2} y={y - 40} textAnchor="middle" fontSize="11.5" fontWeight="900" fill={C.green}>300-second duplicate window</text>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={C.lineStrong} strokeWidth="2" />
      {[0, 120, 240, 360, 480, 600].map(s => (
        <g key={s}>
          <line x1={x0 + s * scale} y1={y - 4} x2={x0 + s * scale} y2={y + 4} stroke={C.faint} />
          <text x={x0 + s * scale} y={y + 50} textAnchor="middle" fontSize="10.5" fill={C.faint} fontWeight="700">{s}s</text>
        </g>
      ))}
      {events.map(e => {
        const x = x0 + e.t * scale;
        const color = e.kind === 'dup' ? C.red : e.kind === 'origin' ? C.ink : C.green;
        return (
          <g key={e.label}>
            <circle cx={x} cy={y} r="8" fill={C.white} stroke={color} strokeWidth="3" />
            <text x={x} y={y + 22} textAnchor="middle" fontSize="12" fontWeight="900" fill={color}>{e.label}</text>
            <text x={x} y={y + 36} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={C.muted}>{e.sub}</text>
          </g>
        );
      })}
      <text x={x0 + 260 * scale} y={y - 14} textAnchor="middle" fontSize="11" fontWeight="900" fill={C.red}>DUPLICATE</text>
      <text x={x0 + 520 * scale} y={y - 14} textAnchor="middle" fontSize="11" fontWeight="900" fill={C.green}>ACCEPTED</text>
    </svg>
  );
}

function FishnetDiagram() {
  // Plot boundary (outer), the line 8m inside it (inner) and the band between them cut every 8m.
  const X = 40, Y = 22, W = 300, H = 170, band = 22, step = 38;
  const ticksH = Array.from({ length: Math.floor(W / step) - 1 }, (_, i) => X + (i + 1) * step);
  const ticksV = Array.from({ length: Math.floor(H / step) - 1 }, (_, i) => Y + (i + 1) * step);
  const cellX = X + 2 * step, cellY = Y + H - band;       // highlighted cell on the bottom edge
  const px = cellX + step / 2, py = cellY + band / 2;      // GPS fix inside that cell
  const ix = X + W / 2 + 20, iy = Y + H / 2;               // GPS fix in the plot interior
  return (
    <svg viewBox="0 0 760 236" style={{ width: '100%', minWidth: '540px', display: 'block', ...svgText }} role="img" aria-label="A plot with an 8 metre band inside its boundary, cut into 8 metre platforms; the plot interior has no platforms">
      <rect x={X} y={Y} width={W} height={H} fill={C.greenTint} stroke={C.green} strokeWidth="2.5" />
      <rect x={X + band} y={Y + band} width={W - 2 * band} height={H - 2 * band} fill={C.white} stroke={C.green} strokeWidth="1.5" />
      {ticksH.map(x => (
        <g key={`h${x}`}>
          <line x1={x} y1={Y} x2={x} y2={Y + band} stroke={C.green} strokeWidth="1.2" />
          <line x1={x} y1={Y + H - band} x2={x} y2={Y + H} stroke={C.green} strokeWidth="1.2" />
        </g>
      ))}
      {ticksV.map(y => (
        <g key={`v${y}`}>
          <line x1={X} y1={y} x2={X + band} y2={y} stroke={C.green} strokeWidth="1.2" />
          <line x1={X + W - band} y1={y} x2={X + W} y2={y} stroke={C.green} strokeWidth="1.2" />
        </g>
      ))}
      <rect x={cellX} y={cellY} width={step} height={band} fill={C.greenSoft} stroke={C.green} strokeWidth="2" />
      <text x={cellX + step / 2} y={Y + H + 16} textAnchor="middle" fontSize="10.5" fontWeight="800" fill={C.greenDark}>8m</text>
      <text x={X + W + 8} y={Y + H - band / 2 + 4} fontSize="10.5" fontWeight="800" fill={C.greenDark}>8m</text>
      <text x={X + W / 2} y={Y + H / 2 - 18} textAnchor="middle" fontSize="11" fontWeight="800" fill={C.faint}>Plot interior (no platforms)</text>
      <circle cx={px} cy={py} r="5" fill={C.red} stroke={C.white} strokeWidth="2" />
      <circle cx={ix} cy={iy} r="5" fill={C.red} stroke={C.white} strokeWidth="2" />
      <line x1={px + 8} y1={py - 2} x2="400" y2="132" stroke={C.faint} strokeDasharray="4 3" />
      <line x1={ix + 8} y1={iy - 2} x2="400" y2="62" stroke={C.faint} strokeDasharray="4 3" />

      <rect x="400" y="40" width="340" height="46" rx="8" fill={C.white} stroke={C.lineStrong} />
      <text x="414" y="59" fontSize="12" fontWeight="900" fill={C.ink}>GPS fix deep in the interior</text>
      <text x="414" y="76" fontSize="11" fontWeight="700" fill={C.muted}>More than 12 m inside the field: flagged for a supervisor</text>

      <rect x="400" y="110" width="340" height="46" rx="8" fill={C.greenSoft} stroke={C.green} />
      <text x="414" y="129" fontSize="12" fontWeight="900" fill={C.greenDark}>GPS fix in the edge band</text>
      <text x="414" y="146" fontSize="11" fontWeight="700" fill={C.greenDark}>Within 12 m of the line: matched to the nearest platform</text>

      <rect x="400" y="176" width="340" height="34" rx="8" fill={C.white} stroke={C.lineStrong} />
      <text x="414" y="197" fontSize="11.5" fontWeight="800" fill={C.body}>→ verified plot and platform used for scoring</text>
    </svg>
  );
}

function ReconciliationDiagram() {
  const layers = [
    { n: 'Record 1', t: 'Worker field log', s: 'owner_records' },
    { n: 'Record 2', t: 'Harvester Role AI count', s: 'approval_status' },
    { n: 'Record 3', t: 'Loading Role verification', s: 'loading_clerk_records' }
  ];
  const outcomes = [
    { t: 'CLEAN', s: 'counts or weight match', c: C.green },
    { t: 'INCOMPLETE', s: 'a record is missing', c: C.amber },
    { t: 'DISCREPANCY', s: 'mismatch beyond tolerance', c: C.red }
  ];
  return (
    <svg viewBox="0 0 760 220" style={{ width: '100%', minWidth: '540px', display: 'block', ...svgText }} role="img" aria-label="Three records feed a reconciliation engine, which classifies each plot-day as clean, incomplete or discrepancy">
      <ArrowDefs id="rc-arrow" />
      {layers.map((l, i) => {
        const y = 14 + i * 68;
        return (
          <g key={l.n}>
            <rect x="10" y={y} width="220" height="54" rx="10" fill={C.white} stroke={C.lineStrong} />
            <text x="24" y={y + 19} fontSize="10.5" fontWeight="900" fill={C.green} letterSpacing="0.8">{l.n.toUpperCase()}</text>
            <text x="24" y={y + 35} fontSize="12.5" fontWeight="900" fill={C.ink}>{l.t}</text>
            <text x="24" y={y + 48} fontSize="10.5" fontWeight="700" fill={C.faint} fontFamily="monospace">{l.s}</text>
            <path d={`M 234 ${y + 27} C 270 ${y + 27}, 270 110, 300 110`} fill="none" stroke={C.faint} strokeWidth="1.6" markerEnd="url(#rc-arrow)" />
          </g>
        );
      })}
      <rect x="304" y="70" width="170" height="80" rx="12" fill={C.greenSoft} stroke={C.green} strokeWidth="1.8" />
      <text x="389" y="100" textAnchor="middle" fontSize="13" fontWeight="900" fill={C.greenDark}>Reconciliation</text>
      <text x="389" y="117" textAnchor="middle" fontSize="11" fontWeight="700" fill={C.greenDark}>per plot · date · work mode</text>
      <text x="389" y="134" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.greenDark}>tolerance max(50kg, 5%)</text>
      {outcomes.map((o, i) => {
        const y = 24 + i * 62;
        return (
          <g key={o.t}>
            <path d={`M 478 110 C 510 110, 510 ${y + 22}, 540 ${y + 22}`} fill="none" stroke={C.faint} strokeWidth="1.6" markerEnd="url(#rc-arrow)" />
            <rect x="544" y={y} width="206" height="44" rx="10" fill={C.white} stroke={o.c} strokeWidth="1.8" />
            <text x="558" y={y + 19} fontSize="12.5" fontWeight="900" fill={o.c}>{o.t}</text>
            <text x="558" y={y + 34} fontSize="11" fontWeight="600" fill={C.muted}>{o.s}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ScoreBarDiagram() {
  const bands = [
    { from: 0, to: 50, fill: '#FEE2E2', text: C.red, t: 'Automatic REJECT', s: 'score under 50' },
    { from: 50, to: 80, fill: '#FEF3C7', text: C.amber, t: 'SUPERVISOR decides', s: 'investigate + note' },
    { from: 80, to: 100, fill: C.greenSoft, text: C.greenDark, t: 'Automatic APPROVE', s: '80+, loading CLEAN, GPS on edge' }
  ];
  const x0 = 20, w = 720;
  return (
    <svg viewBox="0 0 760 110" style={{ width: '100%', minWidth: '540px', display: 'block', ...svgText }} role="img" aria-label="Score 0 to 49 automatic reject, 50 to 79 supervisor decides, 80 to 100 automatic approve when the loading match is clean">
      {bands.map(b => {
        const x = x0 + (b.from / 100) * w;
        const bw = ((b.to - b.from) / 100) * w;
        return (
          <g key={b.t}>
            <rect x={x} y="20" width={bw} height="52" fill={b.fill} stroke={C.white} strokeWidth="2" />
            <text x={x + bw / 2} y="42" textAnchor="middle" fontSize="12.5" fontWeight="900" fill={b.text}>{b.t}</text>
            <text x={x + bw / 2} y="60" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={b.text}>{b.s}</text>
          </g>
        );
      })}
      {[0, 50, 80, 100].map(v => (
        <text key={v} x={x0 + (v / 100) * w} y="92" textAnchor="middle" fontSize="11" fontWeight="800" fill={C.ink}>{v}</text>
      ))}
    </svg>
  );
}

// The nine checks, exactly as the server scores them (backend/api/utils/validation_engine).
const SCORE_CHECKS = [
  ['GPS on the plot edge', '1.0', 'Scan on a platform: within 12 m of the boundary line (8 m band + road margin and GPS error)', '7 within 20 m outside · 5 inside another plot · 3 deeper than 12 m inside the field or far away · 0 plot has no boundary. Below 7 is never approved automatically'],
  ['Duplicates', '1.5', 'No copy of this record', '5 same worker on the same platform in another job that day · 0 identical GPS to a record outside this job'],
  ['Timing', '1.0', 'Realistic time and movement', '3 two jobs of the worker under 60 s apart · 0 moved faster than 15 km/h over more than 30 m'],
  ['Device', '1.0', 'Normal phone use', '5 more than 100 worker jobs on one phone in a day · 0 phone "jumped" faster than 60 km/h over more than 500 m'],
  ['Worker pattern', '1.0', 'Job totals vary naturally', '5 almost the same total every job · 0 exactly the same total in 5 jobs'],
  ['Plot today', '1.0', 'Job total normal for the plot (30 days)', '5 more than 2× the plot average (and 2 standard deviations) · 0 more than 3× (and 3 standard deviations)'],
  ['Same platform', '1.0', 'No other worker on this platform (8m × 8m spot)', '3 another worker recorded on the same platform that day'],
  ['Plot history', '1.0', 'Job total normal for the plot (all time)', '5 more than 1.5× the history · 0 more than 2.5×'],
  ['Loading match', '1.5', 'Harvested = loaded + rotten for the plot (day, mode). If the plot is off, the record still passes when its own platform balances', '0 plot off AND the record’s platform is off or had nothing loaded (bunches exact; picker weight within 50 kg or 5%, 10% per platform)']
];

const SCORE_EXAMPLES = [
  ['A · Everything right', 'GPS inside B3.3, no duplicates, normal count, loading role count matches.', '100', 'Automatic APPROVE', C.green],
  ['B · Big job, 5 scans', 'Worker has 100 bunches, arranged in lots of 20 and scanned 5 times (Same Worker). The 5 scans are one job of 100; loading role records 100.', '100 each scan', 'Automatic APPROVE', C.green],
  ['C · Small issues', 'GPS 15 m outside the boundary (7 pts: −3) and job 2× the plot history (5 pts: −5); loading role count matches.', '100 − 3 − 5 = 92', 'Automatic APPROVE', C.green],
  ['D · Loading mismatch', 'All checks fine but harvested 100 while loaded + rotten = 90 (Loading match 0: −15).', '85, not CLEAN', 'SUPERVISOR decides (recount)', C.amber],
  ['H · Plot off, platform balances', 'Plot B3.3: harvested 70, loaded 60. Worker 1 scanned 40 on platform 134 where 40 were loaded; worker 2 scanned 30 on platform 135 where 20 were loaded.', 'W1: 100 · W2: 85', 'W1 Automatic APPROVE · W2 SUPERVISOR (platform 135 is 10 short)', C.amber],
  ['E · Loading Role not synced yet', 'Harvest synced, loading role has not.', 'up to 100, waiting', 'Stays Pending until the loading role syncs, then re-scored', C.amber],
  ['F · Several red flags', 'Same GPS as another worker (−15), two jobs 30 s apart (−7), same total 5 jobs running (−10), 3× plot history (−10).', '100 − 42 = 58', 'SUPERVISOR decides', C.amber],
  ['G · Fraud pattern', 'Case F plus the phone "jumped" 2 km in a minute (−10).', '48', 'Automatic REJECT', C.red]
];

/* ---------- page ---------- */

export default function MethodologyView() {
  const [activeSection, setActiveSection] = useState('section-1');

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 24;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
      setActiveSection(id);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="view-fade-in mth-page" style={{ padding: '28px', maxWidth: '1440px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      <style>{PAGE_CSS}</style>

      {/* Header */}
      <div style={{ background: C.white, borderRadius: '16px', padding: '28px 32px', border: `1px solid ${C.line}`, marginBottom: '28px', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: C.green, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>Rules & Methodology</div>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 500, color: C.ink, lineHeight: 1.2 }}>
          FarmIntelytics Operational Domain, Business Rules & AI Reconciliation
        </h1>
        <p style={{ margin: '10px 0 0 0', color: C.faint, fontSize: '14px', lineHeight: 1.6, fontWeight: 500, maxWidth: '960px' }}>
          How a bunch moves from the plot to the mill, which workers may do what, how duplicates and location fraud are caught, and how the three records are reconciled and scored.
        </p>
      </div>

      <div className="mth-layout">
        {/* Sidebar */}
        <aside className="mth-aside" style={{ background: C.white, borderRadius: '14px', border: `1px solid ${C.line}`, padding: '16px', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', paddingLeft: '8px' }}>
            Contents
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {SECTIONS.map((sec, i) => {
              const isActive = activeSection === sec.id;
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  className={isActive ? undefined : 'mth-nav-btn'}
                  onClick={() => scrollToSection(sec.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px',
                    border: isActive ? `1px solid ${C.greenLine}` : '1px solid transparent',
                    background: isActive ? C.greenTint : 'transparent',
                    color: isActive ? C.green : C.body,
                    fontWeight: isActive ? 800 : 600, fontSize: '13px', textAlign: 'left', cursor: 'pointer',
                    transition: 'all 0.15s ease', lineHeight: 1.35
                  }}
                >
                  <span style={{
                    width: '26px', height: '26px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isActive ? C.green : C.panel, color: isActive ? C.white : C.faint, border: isActive ? 'none' : `1px solid ${C.line}`
                  }}>
                    <Icon size={14} />
                  </span>
                  <span style={{ flex: 1 }}>{i + 1}. {sec.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* SECTION 1 */}
          <SectionShell
            id="section-1" number={1} icon={Building2}
            title="Physical Domain Architecture & 5-Tier Operational Flow"
            lead="Work across the organisation follows a five-tier hierarchy, from the plot boundary down to row harvesting, platform staging and mill weighing. The weighbridge result then flows back up to the plot."
          >
            <Figure caption="Figure 1 · Every bunch passes through all five tiers; mill tonnage closes the loop against plot quotas.">
              <TierFlowDiagram />
            </Figure>

            <div className="mth-grid-2">
              <Card eyebrow="Tier 1" title="Estate Plot Boundaries" icon={Building2}>
                Top-level production boundaries uploaded per organisation as a shared GeoJSON layer. Each plot carries its target quota, digitised polygon, soil class, Year of Planting (YOP), stand density and hectare area across every division/estate in your tenant.
              </Card>
              <Card eyebrow="Tier 2" title="PostGIS Plot Platforms" icon={Grid3x3}>
                Around every polygon in <code>plot_boundaries</code>, a band 8m wide just inside the boundary is cut into 8m platforms in <code>grid_cells</code> (indexed with GIST, <code>idx_grid_cells_geom</code>). The plot interior has no platforms. Each plot numbers its own platforms from 1 around its boundary, so a platform is always named with its plot: <strong>B3.2 · Platform 1</strong>, <strong>B3.3 · Platform 1</strong>. The band is 8m deep because half of the first recorded scans lay 5–7.6m inside the boundary, beyond the earlier 4m band.
              </Card>
              <Card eyebrow="Tier 3" title="In-Field Tree Rows" icon={TreePalm}>
                Cutters sever ripe Fresh Fruit Bunches (FFB) from palm crowns with poles or chisels. Loose Fruit Pickers gather individual fruits that fall around the tree base.
              </Card>
              <Card eyebrow="Tier 4" title="Collection Platform" icon={Truck}>
                The roadside staging area at the plot edge. Carriers bring bunches here; Harvester Roles photograph them for <strong>YOLOv11 AI counting</strong> (every bunch in the photo) and Loading Roles log truck loading.
              </Card>
              <Card eyebrow="Tier 5" title="Weighbridge (Mill Scale)" icon={Scale}>
                Trucks are weighed full (Gross) and empty (Tare) at the mill. <strong>Net FFB Tonnage = Gross − Tare</strong> is the physical ground truth that reconciles back to plot quotas.
              </Card>
            </div>
          </SectionShell>

          {/* SECTION 2 */}
          <SectionShell
            id="section-2" number={2} icon={Users}
            title="Worker Roles & Compatibility Rules"
            lead="Spreadsheets arrive with many spellings of the same job. On upload, the backend converts every function to one of five role groups; anything it doesn't recognise is skipped and never stored. The APK and backend then enforce which group may fill which slot."
          >
            <Figure caption="Figure 2 · Role conversion on upload. Only these five groups exist in the worker directory, the admin role filter and ID cards.">
              <RoleGroupDiagram />
            </Figure>

            <div style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: '12px' }}>
              <table className="mth-table">
                <thead>
                  <tr>
                    <th>Role group</th>
                    <th>Converted from</th>
                    <th>Primary duty</th>
                    <th>May also act as</th>
                    <th>Never</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 500, color: C.ink }}>Cutter</td>
                    <td style={{ fontFamily: 'monospace' }}>CUTTER, HARVESTING, AGRIC WORKER</td>
                    <td>Sever bunches from palms.</td>
                    <td style={{ color: C.green, fontWeight: 500 }}>Carrier</td>
                    <td style={{ color: C.red, fontWeight: 500 }}>Picker</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, color: C.ink }}>Carrier</td>
                    <td style={{ fontFamily: 'monospace' }}>CARRIER</td>
                    <td>Haul bunches from rows to the Platform.</td>
                    <td style={{ color: C.green, fontWeight: 500 }}>Picker</td>
                    <td style={{ color: C.red, fontWeight: 500 }}>Cutter</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, color: C.ink }}>Picker</td>
                    <td style={{ fontFamily: 'monospace' }}>LOOSE FRUIT PICKER, PICKER</td>
                    <td>Gather loose fruit, weighed in kg.</td>
                    <td style={{ color: C.green, fontWeight: 500 }}>Carrier</td>
                    <td style={{ color: C.red, fontWeight: 500 }}>Cutter</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, color: C.ink }}>Loading Role</td>
                    <td style={{ fontFamily: 'monospace' }}>COUNTER</td>
                    <td>Sign in to the APK; verify truck loading.</td>
                    <td>—</td>
                    <td style={{ color: C.red, fontWeight: 500 }}>Any field slot</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, color: C.ink }}>Harvester Role</td>
                    <td style={{ fontFamily: 'monospace' }}>RECORDER</td>
                    <td>Sign in to the APK; record harvests and AI counts.</td>
                    <td>—</td>
                    <td style={{ color: C.red, fontWeight: 500 }}>Any field slot</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500, color: C.red }}>Unknown</td>
                    <td style={{ fontFamily: 'monospace' }}>FFB LOADER, Headman, Headperson, Headwoman, FIELD HAND, PRUNNING, Tapping</td>
                    <td colSpan={3} style={{ color: C.red, fontWeight: 500 }}>Skipped at upload. Not stored, no badge, cannot sign in.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Figure caption="Figure 3 · Slot assignment matrix enforced by WorkerSelectionCubit in the APK.">
              <CompatibilityDiagram />
            </Figure>

            <div className="mth-grid-2">
              <Card title="Rule 1 · Cutters are never Pickers">
                Cutters are paid per bunch by quality (ripe, unripe, rotten). Mixing their counts with loose-fruit weight would contaminate both pay bases.
                <div style={{ marginTop: '8px', fontSize: '12px', color: C.red, fontWeight: 500 }}>Enforced by validateAndSetPicker()</div>
              </Card>
              <Card title="Rule 2 · Pickers are never Cutters">
                Picking is weighed in kg; cutting needs climbing and cutting qualifications and equipment.
                <div style={{ marginTop: '8px', fontSize: '12px', color: C.red, fontWeight: 500 }}>Enforced by validateAndSetCutter()</div>
              </Card>
              <Card title="Rule 3 · Anyone in the field can carry">
                On small plots or short-staffed days a Cutter may carry their own bunches, and Pickers may help carry.
                <div style={{ marginTop: '8px', fontSize: '12px', color: C.green, fontWeight: 500 }}>validateAndSetCarrier() accepts Cutter, Carrier and Picker</div>
              </Card>
              <Card title="Rule 4 · Active status & ID format">
                Every worker is downloaded to the APK, but only <code>worker_status = 'Active'</code> workers can be recorded: an inactive worker's card shows <strong>INACTIVE / BLOCKED</strong> and cannot be confirmed. IDs keep their letters (<code>HAC30071</code>) when typed or scanned from a badge QR; only records from old phones that sent the digits (<code>30071</code>) are matched to the full ID.
              </Card>
              <Card title="Rule 5 · Loose fruit picked together is shared 40 / 60">
                After saving a bunch record the clerk can tap <strong>Record Loose Fruit</strong>: the cutter and carrier who worked together weigh the loose fruit they picked up. The weight is shared by kg, <strong>40% to the cutter and 60% to the carrier</strong>. If the cutter and carrier are the same person, that person keeps 100%. Monthly Settlement, the worker leaderboard and the payout figures all use this one rule; plot and estate totals still show the full weight.
                <div style={{ marginTop: '8px', fontSize: '12px', color: C.green, fontWeight: 500 }}>fi_ffb_loose_fruit_shares() in the database</div>
              </Card>
            </div>
          </SectionShell>

          {/* SECTION 3 */}
          <SectionShell
            id="section-3" number={3} icon={Clock}
            title="Fraud Protection & Duplicate Suppression"
            lead="Weak signal and double-taps can submit the same record twice. Identical submissions inside a five-minute window are flagged, and GPS overrides typed plot IDs."
          >
            <Figure caption="Figure 4 · Record B repeats Record A inside 300 seconds and is flagged; Record C falls outside the window and is accepted.">
              <DuplicateWindowDiagram />
            </Figure>

            <Card title="Rule 5 · 5-minute harvester duplicate suppression">
              A harvest record is flagged <code>is_duplicate = TRUE</code> when another record has the <strong>same worker ID</strong>, the <strong>same total bunch count</strong>, a <strong>different record ID</strong>, and was submitted within 300 seconds:
              <div style={{ marginTop: '10px' }}>
                <Formula>|EXTRACT(EPOCH FROM (a.created_at − a2.created_at))| ≤ 300</Formula>
              </div>
            </Card>

            <div className="mth-grid-2">
              <Card title="Rule 6 · Loading Role platform duplicates">
                Loading Role submissions for the same plot and date with identical counts within five minutes are flagged during enrichment (<code>enrich_paginated_records</code>).
              </Card>
              <Card title="Rules 7 & 8 · Spatial auto-correction">
                If the GPS point falls inside a registered polygon (<code>ST_Contains()</code>), reports, reconciliation and the Approval Center use that verified plot instead of the typed <code>h_plot_id</code>, so a clerk cannot misreport where a harvest happened. The typed plot is kept on the record for audit.
              </Card>
            </div>
          </SectionShell>

          {/* SECTION 4 */}
          <SectionShell
            id="section-4" number={4} icon={Map}
            title="PostGIS Plot Platforms"
            lead="An 8m band just inside each plot boundary is cut into 8m platforms along the edge, numbered from 1 in each plot (B3.2 · Platform 1). Scans belong on these platforms at the field edge. A fix within 12 m of the boundary line (the 8m band plus the road margin and phone GPS error) counts on the nearest platform; a fix deeper inside the field is flagged and goes to a supervisor."
          >
            <Figure caption="Figure 5 · The outer line is the plot boundary, the inner line is 8m inside it, and the band between is cut every 8m. A fix within 12m of the line gets its nearest platform; a fix deeper in the interior is flagged.">
              <FishnetDiagram />
            </Figure>
            <div className="mth-grid-2">
              <Card eyebrow="Step 1" title="Spatial partitioning">
                The inner line is the boundary shrunk by 8m (<code>ST_Buffer(plot, -8)</code>); the band between them is cut every 8m along the boundary and stored in <code>grid_cells</code>, indexed <code>USING GIST</code>.
              </Card>
              <Card eyebrow="Step 2" title="Point-in-polygon resolution">
                Each submitted lat/lng is tested with:
                <div style={{ marginTop: '8px' }}>
                  <Formula>ST_Contains(grid_cells.geom, point)  →  else  ST_Contains(plot_boundaries.geom, point)</Formula>
                </div>
              </Card>
              <Card eyebrow="Plot IDs" title="One ID per plot, the same everywhere">
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li><strong>Multi-part fields:</strong> a field in several parts (e.g. <code>EST1-CS</code>) is one plot. Every part gets its own edge platforms, and the phone checks every part.</li>
                  <li><strong>Blocks sharing an ID</strong> in the GIS file are never merged: each stays its own plot. The first keeps the ID; the others get the ID plus what tells them apart (planting year, then plot number): <code>EST2-E6.1-2013</code>, <code>EST3-X2B11-12</code>.</li>
                  <li>Shapes with no site or plot number are left out: nothing can be recorded against them.</li>
                  <li>The database, the portal map and the APK plot file all use this rule, from the one file <code>plots.geojson</code>. After changing it, regenerate the APK plot file (<code>scripts/export_apk_plots.py</code>) and rebuild the APK; the server updates itself on the next deploy.</li>
                </ul>
              </Card>
            </div>
          </SectionShell>

          {/* SECTION 5 */}
          <SectionShell
            id="section-5" number={5} icon={CheckSquare}
            title="Three-Record Reconciliation & Validation Scoring"
            lead="Three independent records of the same work are compared per plot, date and work mode. The outcome decides whether a plot-day passes automatically or needs a recount."
          >
            <Figure caption="Figure 6 · The three records meet in the reconciliation engine, which labels each plot-day.">
              <ReconciliationDiagram />
            </Figure>

            <div className="mth-grid-3">
              <Card eyebrow="Record 1" title="Worker field log">Harvesters and pickers log work at plot GPS coordinates (<code>owner_records</code>).</Card>
              <Card eyebrow="Record 2" title="Harvester Role QA">Platform photo → YOLOv11 counts every bunch in the photo (the record's count); the clerk also types good, unripe and rotten bunches, or the loose-fruit weight (<code>approval_status</code>).</Card>
              <Card eyebrow="Record 3" title="Loading Role verification">Stacked platform counts and truck weights checked before the weighbridge (<code>loading_clerk_records</code>).</Card>
            </div>

            <Card title="Work mode">
              <Formula>Work Mode = 'Picker' if LOWER(worker_role) IN ('loose fruit picker', 'picker') else 'Harvester'</Formula>
            </Card>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 500, color: C.ink, margin: '0 0 10px 0' }}>Plot status decision rules (<code>plot_validation_summary</code>)</h3>
              <div style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: '12px' }}>
                <table className="mth-table">
                  <thead>
                    <tr><th>Status</th><th>Trigger</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 500, color: C.green }}>CLEAN</td>
                      <td style={{ fontFamily: 'monospace' }}>Harvested count = Loaded count + Rotten<br />OR pending_count = 0</td>
                      <td>Auto-passed; eligible for fast-track approval.</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500, color: C.green }}>CLEAN (weight fallback)</td>
                      <td style={{ fontFamily: 'monospace' }}>Loaded count = 0 AND loaded weight &gt; 0 AND<br />|H_weight − L_weight| ≤ max(50kg, 5% × H_weight)</td>
                      <td>Reconciled by weight tolerance; auto-passed.</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500, color: C.amber }}>INCOMPLETE</td>
                      <td style={{ fontFamily: 'monospace' }}>Harvester Role OR loading role records missing for plot/date</td>
                      <td>Waiting on the loading or harvester role.</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 500, color: C.red }}>DISCREPANCY</td>
                      <td style={{ fontFamily: 'monospace' }}>Count mismatch OR weight delta &gt; max(50kg, 5%)</td>
                      <td>Team Leader platform recount and supervisor review.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <Card title="From reconciliation to approval">
              The plot status above feeds the <strong>Loading match</strong> check of every harvest record. How each record is scored,
              approved automatically, rejected automatically or sent to a supervisor is explained in <strong>Section 6</strong>.
            </Card>
          </SectionShell>

          {/* SECTION 6 */}
          <SectionShell
            id="section-6" number={6} icon={ShieldCheck}
            title="Approval: Score & Decisions"
            lead="Every harvest record gets a trust score from 0 to 100 as soon as it syncs, and again whenever loading role records for its plot arrive. The score decides whether the record is approved automatically, rejected automatically, or sent to a supervisor who must investigate it and write a note."
          >
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 500, color: C.ink, margin: '0 0 10px 0' }}>The formula</h3>
              <Formula>Score = Σ (check points × weight)&nbsp;&nbsp;·&nbsp;&nbsp;each check gives 0, 3, 5, 7 or 10 points&nbsp;&nbsp;·&nbsp;&nbsp;weights add up to 10, so the best score is 10 × 10 = 100</Formula>
            </div>

            <div style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: '12px' }}>
              <table className="mth-table">
                <thead>
                  <tr><th>#</th><th>Check</th><th>Weight</th><th>10 points when</th><th>Fewer points when</th></tr>
                </thead>
                <tbody>
                  {SCORE_CHECKS.map(([name, weight, good, bad], i) => (
                    <tr key={name}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 500, color: C.ink, whiteSpace: 'nowrap' }}>{name}</td>
                      <td style={{ fontWeight: 500 }}>{weight}</td>
                      <td>{good}</td>
                      <td>{bad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Figure caption="Figure 7 · What the score decides. 80 or more is approved automatically only when the loading match is CLEAN and the GPS check gives at least 7.">
              <ScoreBarDiagram />
            </Figure>

            <div className="mth-grid-3">
              <Card title="Automatic approve" icon={CheckSquare}>
                Score <strong>80 or more</strong>, the loading match is <strong>CLEAN</strong> (loading role records exist and agree) and the GPS check gives <strong>at least 7</strong> (on the plot edge, or within 20 m outside it).
                No supervisor needed. The record is signed <code>System</code> with the note "Automatic approval: score N/100".
              </Card>
              <Card title="Automatic reject" icon={Clock}>
                Score <strong>under 50</strong>. Signed <code>System</code>; the note lists every check that lost points, so anyone can see why.
              </Card>
              <Card title="Supervisor decides" icon={Users}>
                Everything else (50–79, or 80+ while the loading role record is missing or mismatched, or the scan was deep inside the field, far away or on another plot). The supervisor opens the record in
                <strong> Individual Records</strong>, checks the photo, counts, plot and loading role records, and must <strong>write a note</strong> before Approve or Reject is enabled.
              </Card>
            </div>

            <Card title="Platform balance: finding where a plot doesn't balance" icon={Map}>
              Bunches are scanned and loaded on a <strong>platform</strong>: one 8m × 8m spot along the plot edge (Section 4). When a plot's harvested total does not equal
              loaded + rotten, each record is judged by <strong>its own platform</strong>: if harvested = loaded + rotten there, the record passes the Loading match and
              the gap is on other platforms; if the platform is off, or nothing was loaded from it, the record goes to a supervisor with the platform named in its note.
              In <strong>Individual Records</strong> the plot summary has a small <strong>Platform balance</strong> hint; clicking it shows harvested, rotten, loaded and the
              difference for every platform of that plot-day.
            </Card>

            <Card title="Multi-scan jobs (100+ bunches)" icon={TreePalm}>
              A worker with many bunches arranges them in lots (for example 5 × 20) and the clerk scans each lot with
              <strong> Record Another Set of Bunches</strong>. Scans of the <strong>same worker, by the same clerk, on the same plot, each within 30 minutes</strong> of the
              previous one are <strong>one job</strong>: they are never compared with each other as duplicates, repeated counts or rushed entries, and the
              "Worker pattern", "Plot today" and "Plot history" checks use the <strong>job total</strong> (5 × 20 = 100). The loading match adds up all scans anyway.
              In the worker tables and the CSV each scan stays its own row, so the job total is the sum of its rows.
            </Card>

            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 500, color: C.ink, margin: '0 0 10px 0' }}>Worked examples</h3>
              <div style={{ overflowX: 'auto', border: `1px solid ${C.line}`, borderRadius: '12px' }}>
                <table className="mth-table">
                  <thead>
                    <tr><th>Case</th><th>What happened</th><th>Score</th><th>Decision</th></tr>
                  </thead>
                  <tbody>
                    {SCORE_EXAMPLES.map(([name, what, score, decision, color]) => (
                      <tr key={name}>
                        <td style={{ fontWeight: 500, color: C.ink, whiteSpace: 'nowrap' }}>{name}</td>
                        <td>{what}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 500, whiteSpace: 'nowrap' }}>{score}</td>
                        <td style={{ fontWeight: 500, color }}>{decision}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mth-grid-2">
              <Card title="Re-scoring" icon={Zap}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Each record is scored when it syncs, and the whole plot-day is re-scored after every harvest or loading upload.</li>
                  <li>Pending records and automatic decisions follow the new score (an automatic approval can become a supervisor case if a later loading role record disagrees).</li>
                  <li><strong>A supervisor's approve or reject is never changed</strong> by re-scoring.</li>
                </ul>
              </Card>
              <Card title="Counts, pairs and times (one rule everywhere)" icon={CheckSquare}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li><strong>A record's count is the AI count</strong> from the photo (every bunch in it); the clerk's typed total (good + unripe + rotten) is used only when the AI found none. Cards and the map show <strong>9 bunches (typed 16)</strong>: the typed total in brackets only when both are above 0. All totals, the loading match and the scoring use this count.</li>
                  <li><strong>Typed total ≠ AI count</strong> (higher or lower): the record is flagged in red, <strong>held for a supervisor</strong> and never approved automatically, and it must still reconcile with the loading role.</li>
                  <li><strong>Each harvest record is paired with one load</strong>: same plot, same day, same work type, closest in time (at most 3 hours apart), each load used once. The plot view shows each harvest beside its own load with both dates and times; the map popup and the Individual Records CSV show the paired load.</li>
                  <li><strong>Matched</strong> is still decided on the plot-day total (harvested = loaded + rotten). When the plot balances, platform differences only mean bunches were loaded from a nearby platform (shown under <strong>Platform detail</strong>); <strong>Investigate</strong> appears only on a mismatch.</li>
                  <li><strong>Average Duration</strong> (Worker Analytics) = how long each plot took that day, from its first work start to its last scan, averaged over plots. Operators working side by side are not added up.</li>
                </ul>
              </Card>
              <Card title="Where to see it" icon={Map}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Every record card in <strong>Individual Records</strong> has a small <strong>“Why this needs review”</strong> box: the score, the (at most) three checks that lost the most points in plain words with what to check, and a folded list of all 9 checks.</li>
                  <li>Approved records appear in <strong>Approved Workers</strong> and its Export CSV.</li>
                  <li>The reviewer column shows <code>System</code> for automatic decisions and the supervisor's login for their decisions.</li>
                  <li>A record that passes every check and matches the loads is <strong>approved automatically and needs no action</strong>. It still shows, read-only with its photo, carrier and operators, under <strong>Approved harvester role records</strong> in the plot's view.</li>
                </ul>
              </Card>
              <Card title="Which pages count what" icon={CheckSquare}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li><strong>Dashboard, Approved Workers, Plot Analytics, Yield and Personnel Board</strong>: approved records only, so every total on these pages is the same verified number.</li>
                  <li><strong>Worker Analytics</strong>: every record with its approval status (Approved, Pending, Rejected). This is where work still waiting is followed up.</li>
                  <li><strong>Approval Center</strong>: records waiting for a decision, plus the approved records of an open plot for reference.</li>
                </ul>
              </Card>
            </div>
          </SectionShell>

          {/* SECTION 7 */}
          <SectionShell
            id="section-7" number={7} icon={Zap}
            title="Field App Sync & Data Rules"
            lead="How records travel from the phone to the portal, how IDs and roles are kept clean, and who is recorded for each bunch."
          >
            <div className="mth-grid-2">
              <Card title="Sign-in" icon={ShieldCheck}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Only <strong>Harvester Roles</strong> and <strong>Loading Roles</strong> can sign in; inactive accounts are blocked.</li>
                  <li><strong>Scanning the ID badge</strong> signs the clerk in directly with the role on their record.</li>
                  <li><strong>Typing the ID</strong> also needs the role picked in the dropdown, and it must match the record.</li>
                  <li><strong>Portal:</strong> every change needs a signed-in session. Approvals need Edit or Super Admin rights; uploads, users and settings need Super Admin. An expired session goes back to the login page.</li>
                </ul>
              </Card>
              <Card title="Employee IDs & role groups" icon={Users}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>IDs are <strong>text everywhere</strong> (e.g. <code>HAC30148</code>), in every table and view; they are never turned into numbers.</li>
                  <li>Old phones that send only the digits (<code>30148</code>) are matched to the full ID. Uploads with two IDs sharing the same digits are refused.</li>
                  <li>On upload, functions become one of five groups: Cutter, Carrier, Picker, Loading Role (<code>COUNTER</code> only), Harvester Role (<code>RECORDER</code>).</li>
                  <li><strong>FFB LOADER</strong>, Headman, Headperson, Headwoman, Field Hand, Prunning and Tapping are <strong>unknown</strong>: skipped at upload, never stored, no QR badge.</li>
                </ul>
              </Card>
              <Card title="Sync rules" icon={Zap}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Records are saved on the phone first and uploaded in groups of <strong>at most 10 records and about 1 MB of photos</strong>, two groups in parallel, with a live percentage. A group that times out is retried one record at a time.</li>
                  <li>A record can only be saved with a GPS fix and a plot. Counts must be whole numbers from 0 to 2,000 and weights above 0 up to 5,000 kg, so the server never refuses a record the phone cannot edit.</li>
                  <li>Sync starts <strong>by itself when the phone comes back online</strong>; it can also be started from the Sync tab.</li>
                  <li>The server checks <strong>each record on its own</strong>: good records are saved, refused ones stay on the phone with the reason and are retried next sync.</li>
                  <li>Every record gets a <strong>unique ID (UUID)</strong> on the phone when it is saved (<code>HR-…</code> harvest, <code>LR-…</code> loading); it is sent as <code>client_record_id</code> and is in the phone's CSV export next to the photo link.</li>
                  <li>A record already on the server is <strong>never saved twice</strong> (same unique ID, or same clerk, time, plot and worker), so retries are safe.</li>
                  <li>Background sync runs <strong>every 4 hours</strong> with <strong>network-first opportunistic sync</strong>: whenever the app detects network connectivity, it immediately checks and syncs pending records, then resets the 4-hour countdown so intermittent network windows are never missed; the Sync tab uploads at any time.</li>
                  <li>A record's photo is deleted from the phone only after the server confirms the record. If the server's copy is later removed, re-sending cannot bring the photo back, so records are never cleared on the server to force a re-sync.</li>
                  <li><strong>Shared phones:</strong> whoever is signed in uploads every unsynced record on the phone; each record keeps the ID of the clerk who made it, and the server logs who pressed sync.</li>
                </ul>
              </Card>
              <Card title="Photos & CSV export" icon={Truck}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Photos are compressed when taken (longest side 1080 px, JPEG quality 75, about 100–400 KB) and kept in a hidden app folder; the phone gallery is never touched.</li>
                  <li>A photo is deleted from the phone only after the server confirms its record.</li>
                  <li><strong>Export CSV</strong> works offline for every record on the phone. When online it first uploads pending photos to storage and adds each photo link to the CSV; sync then reuses that photo instead of sending it again.</li>
                </ul>
              </Card>
              <Card title="Who did the work" icon={TreePalm}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Every harvest record stores the <strong>cutter</strong>, the <strong>carrier</strong> and the <strong>recorder</strong> (harvester role).</li>
                  <li><strong>Carried by = Self</strong> when the cutter carried their own bunches; otherwise the carrier's name and ID are shown.</li>
                  <li>Pickers record themselves; carrier fields may be empty for picker records.</li>
                  <li>Worker Analytics and Approved Workers also show the <strong>loading role</strong> who loaded that plot that day.</li>
                </ul>
              </Card>
              <Card title="Loading & reconciliation" icon={Scale}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Loading records are stored by mode: <code>harvester</code> (bunches) or <code>picker</code> (sacks), whatever role the phone sends.</li>
                  <li>The <strong>Reconciliation</strong> view of Geospatial Intel compares harvested bunches with bunch loads, and picker weight with sack loads, per plot and day; <strong>Open in Approval Center</strong> opens that plot-day's records.</li>
                  <li>A plot with loads but no harvest yet shows <strong>Awaiting Recorders</strong>; Individual Records still lists the loading role records and photos for investigation.</li>
                  <li>Reconciliation is re-run in the background after every harvest or loading upload (each plot-day at most once every few seconds, so many phones syncing at once do not repeat the work).</li>
                </ul>
              </Card>
              <Card title="Geospatial Intel" icon={Map}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li><strong>Harvest interval</strong> colours each plot by days since its last harvest. It uses <strong>approved harvester role records only</strong>; loading records do not change it.</li>
                  <li>Clicking a plot shows its <strong>approved harvest</strong> over a chosen range (default 30 days): bunches per day split into ripe, unripe and rotten, picker kg, and the approved workers.</li>
                  <li><strong>Reconciliation</strong> colours each plot by its most serious status: Mismatch, Awaiting Loading Role, Awaiting Recorders, Matched.</li>
                </ul>
              </Card>
              <Card title="Errors reach the admin" icon={Clock}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Sync failures, error messages, app crashes and <strong>Settings → Report a Bug</strong> are sent to <strong>System Logs &amp; Alerts</strong> with the signed-in clerk's ID and name.</li>
                  <li>Reports made offline are kept and sent when the phone is back online; the phone only says "reported" once the server has it.</li>
                  <li>Server errors and refused records are logged too; errors also trigger the email alert.</li>
                </ul>
              </Card>
              <Card title="Keeping every server consistent" icon={CheckSquare}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>At every start the server converts ID columns to text, adds missing columns, normalises roles and loading modes, and fills the carrier on approval records.</li>
                  <li>Views are rebuilt automatically whenever <code>sql/create_views.sql</code> changes; plot platforms are rebuilt automatically (resuming after restarts) if band or platform size changes.</li>
                  <li>Plot boundaries are reloaded whenever <code>plots.geojson</code> changes, and only the plots whose shape changed get new platforms. Blocks sharing an ID stay separate plots (Section 4). Phones reload their plots whenever a new APK brings a changed plot file.</li>
                  <li>The deploy script creates the private sign-in key (<code>JWT_SECRET_KEY</code>) if the server has none.</li>
                  <li>A moved or restored database therefore needs no manual fixes.</li>
                </ul>
              </Card>
            </div>
          </SectionShell>

          {/* SECTION 8 */}
          <SectionShell
            id="section-8" number={8} icon={ShieldCheck}
            title="Governance"
          >
            <div className="mth-grid-2">
              <Card title="Field supervision (Team Leaders)" icon={Users}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li><strong>Teams & contractors:</strong> daily teams mapped to contractor units (e.g. <code>ANTOSAS</code>, <code>GODWIN ODUKHON</code>).</li>
                  <li><strong>Platform recounts:</strong> a <code>DISCREPANCY</code> plot is physically recounted before approval.</li>
                  <li><strong>Roster control:</strong> field workers must be active and in a valid role group.</li>
                </ul>
              </Card>
              <Card title="Portal access levels" icon={ShieldCheck}>
                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                  <li><strong>View:</strong> read-only maps, dashboards and yield tables.</li>
                  <li><strong>Edit (supervisor):</strong> Approval Center — investigate each record (photo, counts, plot, loading role record), then approve or reject it with a written note. The note is required; there is no bulk or force approval.</li>
                  <li><strong>Super Admin:</strong> everything Edit can do, plus user management, worker directory and uploads, pay rates, alert settings, system logs and view refreshes.</li>
                  <li>The server checks the role on every change, not only the portal menus; a signed-out or expired session cannot change anything.</li>
                </ul>
              </Card>
            </div>

          </SectionShell>

        </div>
      </div>
    </div>
  );
}
