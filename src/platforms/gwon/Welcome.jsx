/**
 * The GWON welcome: a first-visit screen saying what the platform is and what it holds, then a short guided tour
 * that points at the filters, the tabs, the menu, the map and the Assistant. Seen once per browser; "Take the tour"
 * in the header starts it again.
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { X, ArrowRight, ArrowLeft, Map as MapIcon, Sun, LineChart, Users, FlaskConical, MessageSquareText } from 'lucide-react';

export const TOUR_KEY = 'gwon_welcome_seen';

const STEPS = [
  { target: 'filters', title: 'Filters for every page', text: 'Choose a state, then an LGA and a ward; the map date; and the years for the yearly charts. Every page follows them. Reset clears them.' },
  { target: 'tabs', title: 'Monitor, Reports, Assistant', text: 'Monitor holds the dashboard, the maps and the analysis. Reports makes a printable report of the kind you choose. The Assistant answers questions from the figures on GWON.' },
  { target: 'menu', title: 'The pages', text: 'Dashboard, Maps, Analysis (drought, drought indices, water stress, land use, climate futures, people) and Planning (the scenario planner, compare).' },
  { target: 'theme', title: 'Light or dark', text: 'Switch the whole platform to dark mode, for a control room or the evening.' },
  { target: 'main', title: 'Charts you can take away', text: 'Hover any chart for its figures. The CSV button above a chart downloads exactly what it draws. Maps have layers, a time slider, a calendar, and side-by-side or swipe compare.' },
];

function Spot({ step, i, n, onNext, onBack, onClose }) {
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    const place = () => { if (el) { const r = el.getBoundingClientRect(); setBox({ x: r.left, y: r.top, w: r.width, h: r.height }); } else setBox(null); };
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    place();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [step]);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = box ? box.y + box.h + 12 : vh / 2 - 90;
  const top = box && below + 190 > vh ? Math.max(12, box.y - 202) : below;
  const left = box ? Math.min(Math.max(12, box.x), vw - 372) : vw / 2 - 180;
  return (
    <div className="fixed inset-0 z-[3000]" role="dialog" aria-modal="true" aria-label={step.title}>
      <div className="absolute inset-0" onClick={onClose} />
      {box && <div className="absolute rounded-xl border-2 border-[#007248] pointer-events-none" style={{ left: box.x - 6, top: box.y - 6, width: box.w + 12, height: box.h + 12, boxShadow: '0 0 0 9999px rgba(14,45,65,0.45)' }} />}
      <div className="absolute w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-gray-200 bg-white p-4 space-y-2" style={{ left, top }}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#007248]">Tour · {i + 1} of {n}</p>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100" aria-label="End the tour"><X size={15} /></button>
        </div>
        <p className="font-display text-base font-semibold text-gray-900">{step.title}</p>
        <p className="text-sm text-gray-700">{step.text}</p>
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={onBack} disabled={i === 0} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-600 disabled:opacity-40"><ArrowLeft size={15} /> Back</button>
          <button type="button" onClick={onNext} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007248] text-white text-sm font-semibold">{i === n - 1 ? 'Done' : 'Next'} {i < n - 1 && <ArrowRight size={15} />}</button>
        </div>
      </div>
    </div>
  );
}

export default function Welcome({ open, onClose, startTour = false }) {
  const [tour, setTour] = useState(startTour ? 0 : null);
  useEffect(() => {
    if (!open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  const done = () => { try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* storage unavailable */ } onClose(); };
  if (tour != null) {
    return <Spot step={STEPS[tour]} i={tour} n={STEPS.length} onClose={done} onBack={() => setTour((t) => Math.max(0, t - 1))} onNext={() => (tour === STEPS.length - 1 ? done() : setTour(tour + 1))} />;
  }
  const items = [
    [MapIcon, 'Maps of the frontline', 'Vegetation, rain, soil moisture, heat, fires, floods, forest loss and protected areas, day by day, with compare.'],
    [Sun, 'Drought, now and since 1991', 'SPI and SPEI at 1 to 12 months, percent of normal and deciles, for every state.'],
    [LineChart, 'Climate futures', 'CMIP6 scenarios and models to 2100: heat, rain, dry spells.'],
    [Users, 'People and livelihoods', 'Population, poverty and displacement in each state.'],
    [FlaskConical, 'Scenario planner', 'Plan a restoration and see how many trees survive the droughts the record shows.'],
    [MessageSquareText, 'Assistant', 'Ask in plain words; it answers from the figures on GWON.'],
  ];
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome to GWON">
      <div className="absolute inset-0 bg-[#0E2D41]/50" onClick={done} />
      <div className="relative w-full max-w-3xl max-h-[calc(100vh-32px)] overflow-y-auto rounded-3xl border border-gray-200 bg-white">
        <div className="p-6 sm:p-8 border-b border-gray-100 flex items-start gap-4">
          <img src="/gwon-data/naggw-seal.png" alt="National Agency for the Great Green Wall" className="w-16 h-16 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#007248]">Welcome</p>
            <h2 className="font-display text-2xl font-semibold text-gray-900">GreenWall Observatory Nigeria</h2>
            <p className="text-sm text-gray-600 mt-1">The monitoring and results platform for the National Agency for the Great Green Wall: the eleven frontline states, from satellites, climate records and public statistics, with the Agency's own sites. Powered by Earthintelytics.</p>
          </div>
          <button type="button" onClick={done} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 shrink-0" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(([Icon, t, d]) => (
            <div key={t} className="flex gap-3 rounded-2xl border border-gray-200 p-3.5">
              <span className="w-9 h-9 rounded-xl bg-[#E8F5EE] text-[#007248] flex items-center justify-center shrink-0"><Icon size={18} /></span>
              <div><p className="text-sm font-semibold text-gray-900">{t}</p><p className="text-xs text-gray-600 mt-0.5">{d}</p></div>
            </div>
          ))}
        </div>
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">Only real data, each with its source in an (i). Nothing here is a forecast unless it says so.</p>
          <div className="flex gap-2">
            <button type="button" onClick={done} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Start exploring</button>
            <button type="button" onClick={() => setTour(0)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#007248] text-white text-sm font-semibold">Take the tour <ArrowRight size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
