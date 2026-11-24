/**
 * A small trend line for a headline card: the real daily values already loaded for the page (never invented),
 * one colour, a 2 px line over a light fill, the last day marked. Hover a day to read it. Nothing is drawn with
 * fewer than two days.
 */
import { useState } from 'react';

export default function Sparkline({ values = [], dates = [], color = '#3F8432', unit = '', height = 34, label = 'Daily values' }) {
  const [hover, setHover] = useState(null);
  const pts = values.slice(-30);
  const days = dates.slice(-30);
  if (pts.length < 2) return null;
  const W = 160, H = height, pad = 3;
  const max = Math.max(...pts, 1), min = Math.min(...pts, 0);
  const x = (i) => pad + (i * (W - 2 * pad)) / (pts.length - 1);
  const y = (v) => H - pad - ((v - min) * (H - 2 * pad)) / (max - min || 1);
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = `${line}L${x(pts.length - 1).toFixed(1)},${H - pad}L${x(0).toFixed(1)},${H - pad}Z`;
  const fmt = (v) => `${Math.round(v).toLocaleString()}${unit ? ` ${unit}` : ''}`;
  const shown = hover ?? pts.length - 1;
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${label}: last ${pts.length} days`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const i = Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1));
          setHover(Math.max(0, Math.min(pts.length - 1, i)));
        }}>
        <path d={area} fill={color} opacity="0.12" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={x(shown)} x2={x(shown)} y1={pad} y2={H - pad} stroke="#CBD5E1" strokeWidth="1" opacity={hover == null ? 0 : 1} />
        <circle cx={x(shown)} cy={y(pts[shown])} r="3.5" fill={color} stroke="#FFFFFF" strokeWidth="2" />
      </svg>
      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
        {days[shown] ? `${days[shown]}: ` : ''}{fmt(pts[shown])}{hover == null ? ` · last ${pts.length} days` : ''}
      </div>
    </div>
  );
}
