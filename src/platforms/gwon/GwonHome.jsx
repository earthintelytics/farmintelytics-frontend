/**
 * The GWON home page: a proper website front for the platform. What GWON is, the frontline in figures (from the
 * data), every part of the platform one click away (dashboard, maps, advisory, analysis, reports, data catalogue,
 * Assistant), what the Agency's staff can do once signed in, the data partners, and what comes in the full
 * platform (marked as such). Prototype: every idea is shown; parts not yet active say so.
 */
import { useEffect, useState } from 'react';
import { ArrowRight, Activity, Map as MapIcon, Lightbulb, Sun, TrendingUp, Users, Shovel, Target, BookOpenText, Database, FileText, MessageSquareText, ShieldCheck, Bell, ClipboardList, Cpu, LogIn } from 'lucide-react';

const fmt = (n, d = 0) => (n == null || !Number.isFinite(Number(n)) ? '—' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d }));

const PARTS = [
  ['monitor/overview', Activity, 'Dashboard', 'The frontline in indicator cards and charts: rain, heat, dry spells, tree cover and bare land.'],
  ['monitor/map', MapIcon, 'Maps', 'Vegetation, rain, soil moisture, heat, fires, floods, forest loss, soil and protected areas, day by day, with compare.'],
  ['monitor/advisor', Lightbulb, 'Advisor', 'What to do now, this season and for the future, for any state, LGA or ward.'],
  ['monitor/indices', Sun, 'Drought', 'SPI and SPEI at 1 to 12 months since 1991, a drought calendar and maps by month.'],
  ['monitor/futures', TrendingUp, 'Climate futures', 'CMIP6 scenarios and models to 2100: heat, rain and dry spells.'],
  ['monitor/people', Users, 'People and livelihoods', 'Population, poverty and displacement, drilled down to LGA and ward.'],
  ['monitor/resilience', ShieldCheck, 'Climate resilience', 'Which states are least able to cope, and why, with weights you can change.'],
  ['monitor/slm', Shovel, 'Land management', 'Practices that fit each state’s rain and land, and how its cropland is changing.'],
  ['reports/programmes', Target, 'Programmes', 'The indicators the Agency publishes: baseline, target, achieved and source.'],
  ['reports/research', FileText, 'Research report', 'A full study of the frontline or a state, with figures, methods and references.'],
  ['reports/stories', BookOpenText, 'Story maps', 'Tell the Great Green Wall’s story in chapters of maps and charts, and share it.'],
  ['reports/catalogue', Database, 'Data catalogue and API', 'Every dataset as an open STAC catalogue, free to download, and the public API.'],
];

const STAFF = [
  [ClipboardList, 'Project registry', 'Upload and manage every restoration site, shared with the state offices.'],
  [Target, 'Publish programme figures', 'Add indicators and publish them with their source.'],
  [MessageSquareText, 'Assistant and advisory notes', 'Ask questions and have advisory notes written from the figures.'],
  [Bell, 'Alerts for your ward', 'Subscribe to drought, heat, fire and planting alerts by email or phone.'],
];

const NEXT = [
  'Restoration success from space, site by site, with the Agency’s field visits',
  'Tree and shelterbelt counting from high-resolution imagery',
  'Alerts sent by SMS and email to state and LGA officers',
  'The Agency’s own datasets managed in the catalogue, with versions',
  'Hausa, and the other languages of the frontline',
];

export default function GwonHome({ go, states, series, adminIndex, signedIn, onSignIn }) {
  const [socio, setSocio] = useState(null);
  const [idx, setIdx] = useState(null);
  useEffect(() => {
    fetch('/gwon-data/socioeconomic.json').then((r) => r.json()).then(setSocio).catch(() => {});
    fetch('/gwon-data/drought_indices.json').then((r) => r.json()).then(setIdx).catch(() => {});
  }, []);
  const ha = (states?.features || []).reduce((a, f) => a + f.properties.area_ha, 0);
  const lgas = adminIndex ? Object.values(adminIndex).reduce((a, s) => a + s.lgas.length, 0) : null;
  const wards = adminIndex ? Object.values(adminIndex).reduce((a, s) => a + s.wards, 0) : null;
  const pop = socio ? Object.values(socio.states).reduce((a, s) => a + (s.population?.total || 0), 0) : null;
  const dry = idx ? Object.values(idx.states).filter((s) => { const v = [...s.spi3].reverse().find((x) => x != null); return v != null && v <= -1; }).length : null;
  const first = series ? Object.values(series.states)[0] : null;
  return (
    <div className="space-y-0 -mx-4 sm:-mx-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl mx-4 sm:mx-6">
        <img src="/crops/hero/gwon.webp" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E2D41]/90 via-[#0E2D41]/70 to-[#0E2D41]/20" />
        <div className="relative px-6 sm:px-12 py-16 sm:py-24 max-w-3xl text-white">
          <div className="flex items-center gap-3"><img src="/gwon-data/naggw-seal.png" alt="" className="w-14 h-14 rounded-full bg-white/90 p-0.5" /><p className="text-sm font-semibold tracking-wider">NATIONAL AGENCY FOR THE GREAT GREEN WALL</p></div>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.05] mt-6">GreenWall Observatory Nigeria</h1>
          <p className="text-lg sm:text-xl text-white/90 mt-5 leading-relaxed">Watching the land, the rain and the people of the eleven frontline states, so that every tree planted for the Great Green Wall has the best chance to grow.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => go('monitor/overview')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#0E2D41] text-sm font-semibold">Open the dashboard <ArrowRight size={16} /></button>
            <button type="button" onClick={() => go('monitor/map')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/60 text-white text-sm font-semibold hover:bg-white/10">Explore the maps</button>
            {!signedIn && <button type="button" onClick={onSignIn} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/60 text-white text-sm font-semibold hover:bg-white/10"><LogIn size={16} /> Staff sign-in</button>}
          </div>
        </div>
      </section>

      {/* The frontline in figures */}
      <section className="px-4 sm:px-6 pt-12">
        <p className="text-sm font-semibold text-[#007248]">The frontline in figures</p>
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[['11', 'frontline states'], [fmt(lgas), 'LGAs'], [fmt(wards), 'wards'], [`${fmt(ha / 1e6, 1)} m ha`, 'of land'], [pop ? `${fmt(pop / 1e6, 1)} m` : '—', 'people (2022)'], [dry == null ? '—' : `${dry} of 11`, 'states dry now (SPI-3)']].map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-[#A9D9BF] bg-[#F1F9F4] p-4"><p className="font-display text-3xl font-semibold text-[#0E2D41]">{v}</p><p className="text-sm text-gray-700 mt-1">{l}</p></div>
          ))}
        </div>
        {first && <p className="text-xs text-gray-500 mt-2">Climate to {first.until} (ERA5); boundaries OCHA and GRID3; people OCHA COD-PS.</p>}
      </section>

      {/* Everything in GWON */}
      <section className="px-4 sm:px-6 pt-14">
        <p className="text-sm font-semibold text-[#007248]">What GWON does</p>
        <h2 className="font-display text-3xl font-semibold text-gray-900 mt-1">One place for the whole Great Green Wall in Nigeria</h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PARTS.map(([to, Icon, t, d]) => (
            <button key={to} type="button" onClick={() => go(to)} className="text-left rounded-2xl border border-gray-200 bg-white p-5 hover:border-[#007248] transition-colors">
              <span className="w-10 h-10 rounded-xl bg-[#E8F5EE] text-[#007248] flex items-center justify-center"><Icon size={19} /></span>
              <p className="font-semibold text-gray-900 mt-3">{t}</p>
              <p className="text-sm text-gray-600 mt-1">{d}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#007248] mt-3">Open <ArrowRight size={14} /></span>
            </button>
          ))}
        </div>
      </section>

      {/* For the Agency's staff */}
      <section className="px-4 sm:px-6 pt-14">
        <div className="rounded-3xl bg-[#0E2D41] text-white p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
          <div>
            <p className="text-sm font-semibold text-[#7FD3A6]">For the Agency’s staff and partners</p>
            <h2 className="font-display text-3xl font-semibold mt-1">Sign in to manage the programme</h2>
            <p className="text-white/80 mt-3">The public sees the maps and analysis. Staff sign in to manage sites, publish figures, ask the Assistant and get alerts.</p>
            {!signedIn ? <button type="button" onClick={onSignIn} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#0E2D41] text-sm font-semibold"><LogIn size={16} /> Sign in</button>
              : <button type="button" onClick={() => go('monitor/registry')} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#0E2D41] text-sm font-semibold">Open the registry <ArrowRight size={16} /></button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STAFF.map(([Icon, t, d]) => <div key={t} className="rounded-2xl bg-white/10 p-4"><Icon size={18} className="text-[#7FD3A6]" /><p className="font-semibold mt-2">{t}</p><p className="text-sm text-white/80 mt-1">{d}</p></div>)}
          </div>
        </div>
      </section>

      {/* Coming in the full platform */}
      <section className="px-4 sm:px-6 pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-semibold text-[#9A6A00] flex items-center gap-2"><Cpu size={16} /> Coming in the full platform</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">{NEXT.map((x) => <li key={x} className="flex gap-2"><span className="text-[#9A6A00]">→</span>{x}</li>)}</ul>
            <button type="button" onClick={() => go('reports/models')} className="mt-4 text-sm font-semibold text-[#007248]">How GWON’s models work →</button>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-semibold text-[#007248]">Built on open data</p>
            <p className="mt-3 text-sm text-gray-700">NASA, ECMWF, the World Bank, the European Space Agency, the University of Maryland, ISRIC, UNEP-WCMC, OCHA, GRID3, WorldPop, OPHI and UNDP, and IOM. Every figure on GWON names its source.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => go('reports/catalogue')} className="text-sm font-semibold text-[#007248]">Browse the data catalogue →</button>
              <button type="button" onClick={() => go('reports/about')} className="text-sm font-semibold text-[#007248]">About GWON →</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
