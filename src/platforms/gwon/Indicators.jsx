/**
 * GWON indicator cards: a figure, how it compares (with normal, or with the first year), and a small trend line of
 * the real yearly values behind it. Tinted by what the figure is about; flat colour, no glow.
 */
import InfoTip from '../../components/page/InfoTip';

const TONES = {
  teal: 'bg-[#E8F5EE] border-[#A9D9BF]', amber: 'bg-[#FFF8EB] border-[#F6D9A0]', green: 'bg-[#F1F8EC] border-[#CFE6BF]',
  sky: 'bg-[#EEF6FD] border-[#BFDDF6]', rose: 'bg-[#FDF2F2] border-[#F5C8C8]', white: 'bg-white border-gray-200',
};
const LINE = { teal: '#007248', amber: '#D97706', green: '#3F8432', sky: '#2563EB', rose: '#B42318', white: '#007248' };

function Spark({ values, color }) {
  const v = values.filter((x) => x != null);
  if (v.length < 2) return null;
  const W = 120, H = 30, lo = Math.min(...v), hi = Math.max(...v);
  const pts = values.map((x, i) => (x == null ? null : [2 + (i * (W - 4)) / (values.length - 1), H - 3 - ((x - lo) / (hi - lo || 1)) * (H - 6)])).filter(Boolean);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

/** delta: {text, good} shown under the figure, coloured by whether the change is good for the land. */
export default function Indicator({ label, value, sub, tip, tone = 'white', delta, trend, trendLabel }) {
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1.5 ${TONES[tone]}`}>
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">{label} {tip && <InfoTip text={tip} side="bottom" />}</p>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <p className="font-display text-2xl font-semibold text-gray-900 tabular-nums leading-tight">{value}</p>
        {trend && <Spark values={trend} color={LINE[tone]} />}
      </div>
      {delta && <p className={`text-xs font-semibold ${delta.good == null ? 'text-gray-600' : delta.good ? 'text-[#007248]' : 'text-amber-700'}`}>{delta.text}</p>}
      {(sub || trendLabel) && <p className="text-[11px] text-gray-500">{sub}{sub && trendLabel ? ' · ' : ''}{trendLabel}</p>}
    </div>
  );
}
