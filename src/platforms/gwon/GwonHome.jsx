/**
 * The GWON home page, in the style of the FarmIntelytics front page: a photo hero with a live reading, a strip of
 * photographs from the frontline, the people it serves, how it works, the frontline in figures, every part of the
 * platform as a picture card, what staff can do, what comes next and the photo credits. Photos: Wikimedia Commons,
 * credited (public/gwon-data/photos/credits.json); figures: GWON's own data.
 */
import { useEffect, useState } from 'react';
import { ArrowRight, Satellite, Database, LineChart, MessageSquareText, LogIn, ClipboardList, Target, Bell, Cpu, Map as MapIcon, Sun, Users, Leaf } from 'lucide-react';

const fmt = (n, d = 0) => (n == null || !Number.isFinite(Number(n)) ? '—' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d }));
const P = (k) => `/gwon-data/photos/${k}.webp`;

const STRIP = [['farmland', 'Farmland in Hawul, Borno'], ['herder', 'A Fulani herder and his herd'], ['gum', 'The gum arabic tree, Senegalia senegal'], ['lakechad', 'A fisherman on Lake Chad'], ['erosion', 'Soil erosion in Bade, Yobe'], ['settlement', 'A nomadic settlement in Zamfara'], ['cattle', 'Cattle at Gubi Dam, Bauchi'], ['sandstorm', 'A sandstorm in Gombe']];

const PARTS = [
  ['monitor/map', '/crops/hero/gwon.webp', 'Maps', 'Vegetation, rain, soil moisture, heat, fires, floods, forest loss, soil and protected areas, day by day, with before-and-after compare.'],
  ['monitor/advisor', P('gum'), 'Advisor', 'What to do now, this season and for the future, for any state, LGA or ward, with the reason for each piece of advice.'],
  ['monitor/indices', P('sandstorm'), 'Drought and climate', 'Drought indices since 1991, the season so far, and climate scenarios to 2100.'],
  ['monitor/people', P('settlement'), 'People and livelihoods', 'Population, poverty and displacement, down to LGA and ward, with gender and youth.'],
  ['monitor/slm', P('farmland'), 'Land management', 'Practices that fit each state’s rain and land, and how its cropland is changing.'],
  ['monitor/resilience', P('erosion'), 'Climate resilience', 'Which states are least able to cope with drought and heat, and why.'],
  ['reports/programmes', P('hero'), 'Programmes and results', 'The indicators the Agency publishes, and the Great Green Wall Results Framework.'],
  ['reports/research', P('lakechad'), 'Reports and stories', 'Research reports, printable summaries and story maps to share.'],
];

const STEPS = [
  [Satellite, 'Satellites and stations watch', 'NASA, ESA and ECMWF data on vegetation, rain, heat, fire and soil arrive every day.'],
  [Database, 'GWON gathers the data', 'Climate since 1991, land cover since 2000, people, and climate projections, for every state, LGA and ward.'],
  [LineChart, 'We analyse it', 'Drought indices, land change, resilience and scenarios, each with its method written out.'],
  [MessageSquareText, 'The Agency acts', 'Clear advice, alerts and reports for officers in the field and decision makers in Abuja.'],
];

export default function GwonHome({ go, states, adminIndex, signedIn, onSignIn }) {
  const [socio, setSocio] = useState(null);
  const [idx, setIdx] = useState(null);
  const [credits, setCredits] = useState(null);
  useEffect(() => {
    fetch('/gwon-data/socioeconomic.json').then((r) => r.json()).then(setSocio).catch(() => {});
    fetch('/gwon-data/drought_indices.json').then((r) => r.json()).then(setIdx).catch(() => {});
    fetch('/gwon-data/photos/credits.json').then((r) => r.json()).then(setCredits).catch(() => {});
  }, []);
  const ha = (states?.features || []).reduce((a, f) => a + f.properties.area_ha, 0);
  const lgas = adminIndex ? Object.values(adminIndex).reduce((a, s) => a + s.lgas.length, 0) : null;
  const wards = adminIndex ? Object.values(adminIndex).reduce((a, s) => a + s.wards, 0) : null;
  const pop = socio ? Object.values(socio.states).reduce((a, s) => a + (s.population?.total || 0), 0) : null;
  const latest = (s, k) => { const i = s.month.length - 1 - [...s[k]].reverse().findIndex((v) => v != null); return [s.month[i], s[k][i]]; };
  const driest = idx ? Object.entries(idx.states).map(([n, s]) => [n, ...latest(s, 'spi3')]).sort((a, b) => a[2] - b[2])[0] : null;
  const dry = idx ? Object.values(idx.states).filter((s) => latest(s, 'spi3')[1] <= -1).length : null;
  const monthName = (m) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="-mx-4 sm:-mx-6 -mt-5">
      {/* Hero: a photograph from the frontline, the promise, and a live reading */}
      <section className="relative min-h-[560px] flex items-end">
        <img src={P('hero')} alt="Trees planted around Ajiwa Dam, Katsina State" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0E2D41]/95 via-[#0E2D41]/70 to-[#0E2D41]/10" />
        <div className="relative w-full max-w-[1400px] mx-auto px-6 sm:px-10 py-14 grid lg:grid-cols-[1fr_340px] gap-10 items-end">
          <div className="text-white max-w-2xl">
            <div className="flex items-center gap-3"><img src="/gwon-data/naggw-seal.png" alt="" className="w-14 h-14 rounded-full bg-white p-0.5" /><p className="text-sm font-semibold tracking-wider">NATIONAL AGENCY FOR THE GREAT GREEN WALL</p></div>
            <h1 className="font-display text-4xl sm:text-6xl font-semibold leading-[1.05] mt-6">Watch the land.<br /><span className="text-[#7FD3A6]">Grow the Great Green Wall.</span></h1>
            <p className="text-lg text-white/90 mt-5 leading-relaxed">GreenWall Observatory Nigeria follows the land, the rain and the people of the eleven frontline states, so that every tree the Agency plants has the best chance to grow.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => go('monitor/overview')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#007248] text-white text-sm font-semibold hover:bg-[#00603c]">Open the dashboard <ArrowRight size={16} /></button>
              <button type="button" onClick={() => go('monitor/map')} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#0E2D41] text-sm font-semibold">Explore the maps</button>
              {!signedIn && <button type="button" onClick={onSignIn} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/60 text-white text-sm font-semibold hover:bg-white/10"><LogIn size={16} /> Staff sign-in</button>}
            </div>
          </div>
          {driest && (
            <div className="rounded-2xl bg-white p-5 text-gray-900">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Reading</p>
              <div className="flex items-center justify-between mt-1"><p className="font-display text-lg font-semibold">{driest[0]} State</p><span className={`text-xs font-semibold ${driest[2] <= -1 ? 'text-amber-700' : 'text-[#007248]'}`}>{driest[2] <= -1 ? 'Drier than normal' : 'Near normal'}</span></div>
              <p className="text-sm text-gray-700 mt-2">The driest of the eleven states over the last three months (SPI-3 {fmt(driest[2], 2)}, {monthName(driest[1])}).</p>
              <button type="button" onClick={() => go('monitor/advisor')} className="mt-3 text-sm font-semibold text-[#007248]">See the advice →</button>
            </div>
          )}
        </div>
      </section>

      {/* Four quick doors */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[[MapIcon, 'Maps of the frontline', 'Vegetation, rain, fires and floods, day by day.', 'monitor/map'], [Sun, 'Drought, now and since 1991', 'SPI and SPEI for every state, every month.', 'monitor/indices'], [Users, 'People and livelihoods', 'Who lives on the land, down to the ward.', 'monitor/people'], [Leaf, 'Advice for every ward', 'What to do now, this season and for the future.', 'monitor/advisor']].map(([Icon, t, d, to]) => (
            <button key={t} type="button" onClick={() => go(to)} className="text-left group">
              <span className="w-11 h-11 rounded-xl bg-[#E8F5EE] text-[#007248] flex items-center justify-center"><Icon size={20} /></span>
              <p className="font-display text-lg font-semibold text-gray-900 mt-3 group-hover:text-[#007248]">{t}</p>
              <p className="text-sm text-gray-600 mt-1">{d}</p>
            </button>
          ))}
        </div>
      </section>

      {/* A strip of photographs from the frontline */}
      <section className="bg-white py-6 overflow-hidden">
        <div className="flex gap-4 px-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STRIP.map(([k, cap]) => (
            <figure key={k} className="relative shrink-0 w-[260px] h-[170px] rounded-2xl overflow-hidden">
              <img src={P(k)} alt={cap} loading="lazy" className="w-full h-full object-cover" />
              <figcaption className="absolute left-2 bottom-2 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-gray-800">{cap}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* The people it is for */}
      <section className="bg-[#FBF8F1] border-y border-[#F0E9DA]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-16 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <div>
            <p className="text-sm font-semibold text-[#9A6A00]">For the people of the frontline</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 mt-2">Restoration that works for farmers, herders and families</h2>
            <p className="text-gray-700 mt-4 leading-relaxed">Seventy-eight million people live in the eleven frontline states. Most farm or keep animals, and most depend on rain that is becoming harder to predict. GWON helps the Agency choose where to restore land first, when to plant, and which practices and trees will give people food, fodder and income as the land recovers.</p>
            <button type="button" onClick={() => go('monitor/people')} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0E2D41] text-white text-sm font-semibold">See the people and livelihoods <ArrowRight size={16} /></button>
          </div>
          <div className="grid grid-cols-2 grid-rows-2 gap-3 h-[420px]">
            <figure className="row-span-2 relative rounded-3xl overflow-hidden"><img src={P('herder')} alt="A Fulani herder and his herd" loading="lazy" className="w-full h-full object-cover" /><figcaption className="absolute left-3 bottom-3 rounded-lg bg-white/95 px-3 py-1 text-xs font-semibold">Herders</figcaption></figure>
            <figure className="relative rounded-3xl overflow-hidden"><img src={P('farmland')} alt="Farmland in Hawul, Borno State" loading="lazy" className="w-full h-full object-cover" /><figcaption className="absolute left-3 bottom-3 rounded-lg bg-white/95 px-3 py-1 text-xs font-semibold">Farmers</figcaption></figure>
            <figure className="relative rounded-3xl overflow-hidden"><img src={P('lakechad')} alt="A fisherman on Lake Chad" loading="lazy" className="w-full h-full object-cover" /><figcaption className="absolute left-3 bottom-3 rounded-lg bg-white/95 px-3 py-1 text-xs font-semibold">Fishing communities</figcaption></figure>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-16">
          <p className="text-sm font-semibold text-[#007248] text-center">How GWON works</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 mt-2 text-center">From satellite to decision, every day</h2>
          <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden="true" className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-[#A9D9BF]" />
            {STEPS.map(([Icon, t, d], i) => (
              <li key={t} className="relative text-center">
                <span className="relative mx-auto w-14 h-14 rounded-2xl bg-[#E8F5EE] border border-[#A9D9BF] text-[#007248] flex items-center justify-center"><Icon size={24} /></span>
                <p className="mt-4 text-xs font-semibold text-[#9A6A00]">Step {i + 1}</p>
                <h3 className="font-display text-lg font-semibold text-gray-900 mt-1">{t}</h3>
                <p className="text-sm text-gray-600 mt-2 max-w-[16rem] mx-auto">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The frontline in figures */}
      <section className="bg-[#F1F9F4] border-y border-[#DCEFE3]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-14">
          <p className="text-sm font-semibold text-[#007248]">The frontline in figures</p>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-6 gap-3">
            {[['11', 'frontline states', '#E8F5EE'], [fmt(lgas), 'local government areas', '#EEF6FD'], [fmt(wards), 'wards', '#FFF8EB'], [`${fmt(ha / 1e6, 1)} m ha`, 'of land', '#F1F8EC'], [pop ? `${fmt(pop / 1e6, 1)} m` : '—', 'people (2022)', '#FDF2F2'], [dry == null ? '—' : `${dry} of 11`, 'states drier than normal now', '#FFF5DD']].map(([v, l, bg]) => (
              <div key={l} className="rounded-2xl border border-white p-5" style={{ background: bg }}><p className="font-display text-3xl font-semibold text-[#0E2D41]">{v}</p><p className="text-sm text-gray-700 mt-1">{l}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything in GWON, as picture cards */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-16">
          <p className="text-sm font-semibold text-[#007248]">One platform</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 mt-2">Everything the Great Green Wall needs, in one place</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {PARTS.map(([to, img, t, d]) => (
              <button key={to} type="button" onClick={() => go(to)} className="group text-left rounded-3xl bg-white border border-[#E3EFDF] overflow-hidden hover:border-[#007248]">
                <div className="h-40 overflow-hidden"><img src={img} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" /></div>
                <div className="p-5"><h3 className="font-display text-lg font-semibold text-gray-900">{t}</h3><p className="text-sm text-gray-600 mt-1.5">{d}</p><span className="inline-flex items-center gap-1 text-sm font-semibold text-[#007248] mt-3">Open <ArrowRight size={14} /></span></div>
              </button>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
            <button type="button" onClick={() => go('reports/catalogue')} className="text-[#007248]">The data catalogue and API →</button>
            <button type="button" onClick={() => go('monitor/scenarios')} className="text-[#007248]">The scenario planner →</button>
            <button type="button" onClick={() => go('monitor/gender')} className="text-[#007248]">Gender and youth →</button>
          </div>
        </div>
      </section>

      {/* For the Agency's staff */}
      <section className="bg-white pb-16">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
          <div className="rounded-3xl bg-[#0E2D41] text-white p-8 sm:p-10 grid lg:grid-cols-[1fr_1.4fr] gap-8">
            <div>
              <p className="text-sm font-semibold text-[#7FD3A6]">For the Agency’s staff and partners</p>
              <h2 className="font-display text-3xl font-semibold mt-1">Sign in to manage the programme</h2>
              <p className="text-white/80 mt-3">Anyone can see the maps and analysis. Staff sign in to manage restoration sites, publish results, ask the Assistant and receive alerts for their area.</p>
              {!signedIn ? <button type="button" onClick={onSignIn} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#0E2D41] text-sm font-semibold"><LogIn size={16} /> Sign in</button>
                : <button type="button" onClick={() => go('monitor/registry')} className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-[#0E2D41] text-sm font-semibold">Open the registry <ArrowRight size={16} /></button>}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[[ClipboardList, 'Project registry', 'Every restoration site, shared with the state offices.'], [Target, 'Publish results', 'Programme indicators, each with its source.'], [MessageSquareText, 'Assistant and advisory notes', 'Questions answered from GWON’s figures.'], [Bell, 'Alerts for your ward', 'Drought, heat, fire and planting alerts by email or phone.']].map(([Icon, t, d]) => (
                <div key={t} className="rounded-2xl bg-white/10 p-4"><Icon size={18} className="text-[#7FD3A6]" /><p className="font-semibold mt-2">{t}</p><p className="text-sm text-white/80 mt-1">{d}</p></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Coming next and the data partners */}
      <section className="bg-[#FBF8F1] border-t border-[#F0E9DA]">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-10 py-14 grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-[#F0E9DA] p-6">
            <p className="text-sm font-semibold text-[#9A6A00] flex items-center gap-2"><Cpu size={16} /> Coming in the full platform</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {['Restoration success measured from space, site by site', 'Trees and shelterbelts counted from high-resolution imagery', 'Alerts sent by SMS and email to state and LGA officers', 'The Agency’s own datasets managed in the catalogue', 'Hausa and the other languages of the frontline'].map((x) => <li key={x} className="flex gap-2"><span className="text-[#9A6A00]">→</span>{x}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl bg-white border border-[#F0E9DA] p-6">
            <p className="text-sm font-semibold text-[#007248]">Built on open data</p>
            <p className="mt-3 text-sm text-gray-700">NASA, ECMWF, the World Bank, the European Space Agency, the University of Maryland, ISRIC, UNEP-WCMC, OCHA, GRID3, WorldPop, OPHI and UNDP, and IOM. Every figure on GWON names its source.</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold"><button type="button" onClick={() => go('reports/catalogue')} className="text-[#007248]">Browse the data →</button><button type="button" onClick={() => go('reports/about')} className="text-[#007248]">About GWON →</button></div>
          </div>
        </div>
        {credits && (
          <details className="max-w-[1400px] mx-auto px-6 sm:px-10 pb-10 text-xs text-gray-500">
            <summary className="cursor-pointer font-semibold">Photo credits</summary>
            <ul className="mt-2 space-y-1">{Object.values(credits).map((c) => <li key={c.title}><a href={c.source} target="_blank" rel="noreferrer" className="underline">{c.title}</a> · {c.author || 'Wikimedia Commons'} · {c.licence}</li>)}</ul>
          </details>
        )}
      </section>
    </div>
  );
}
