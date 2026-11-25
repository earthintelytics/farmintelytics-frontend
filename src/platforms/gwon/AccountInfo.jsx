/**
 * GWON: the account panel (who you are, your organisation, your alert subscriptions by email or phone for a state,
 * LGA or ward), the About page, and the Models page (what GWON runs now, and what is planned).
 */
import { useEffect, useState } from 'react';
import { X, Bell, Trash2, LogOut, Info, Cpu } from 'lucide-react';
import { gwonFetch, shortName } from './gwonApi';


const ALERTS = [['drought', 'Drought (SPI-3 moderately dry or worse)'], ['heat', 'Heat (days of 40 °C or more ahead)'], ['fire', 'Fires and hot spots nearby'], ['planting', 'A planting window opens'], ['flood', 'Floods']];

export function AccountPanel({ open, me, onClose, onSignOut, adminIndex, stateNames }) {
  const [subs, setSubs] = useState(null);
  const [form, setForm] = useState({ state: '', lga: '', ward: '', alerts: ['drought', 'fire'], email: me?.email || '', phone: '' });
  const [places, setPlaces] = useState({ file: null, lgas: [], wards: [] });
  const [msg, setMsg] = useState('');
  const load = () => gwonFetch('/platforms/gwon/alerts').then((j) => setSubs(j.data || [])).catch(() => setSubs([]));
  useEffect(() => { if (open) load(); }, [open]);
  const file = adminIndex?.[form.state]?.file || null;
  useEffect(() => {
    if (!file) return;
    Promise.all([fetch(`/gwon-data/admin/lgas_${file}.geojson`).then((r) => r.json()), fetch(`/gwon-data/admin/wards_${file}.geojson`).then((r) => r.json())])
      .then(([l, w]) => setPlaces({ file, lgas: l.features.map((x) => x.properties.name).sort(), wards: w.features.map((x) => [x.properties.lga, x.properties.name]) }))
      .catch(() => {});
  }, [file]);
  const lgas = places.file === file ? places.lgas : [];
  const wards = places.file === file ? places.wards : [];
  if (!open) return null;
  const save = async () => {
    setMsg('');
    try { await gwonFetch('/platforms/gwon/alerts', { method: 'POST', body: JSON.stringify(form) }); setMsg('Subscribed.'); load(); } catch (e) { setMsg(e.message); }
  };
  const cls = 'w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#007248]';
  return (
    <div className="fixed inset-0 z-[3100] flex justify-end" role="dialog" aria-modal="true" aria-label="Your account">
      <div className="absolute inset-0 bg-[#0E2D41]/40" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full overflow-y-auto bg-white border-l border-gray-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#007248]">Your account</p>
            <p className="font-display text-xl font-semibold text-gray-900">{shortName(me)}</p>
            <p className="text-sm text-gray-600">{me?.email}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close"><X size={17} /></button>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-gray-500">Organisation</dt><dd className="font-semibold">{me?.organisation}</dd></div>
          <div><dt className="text-xs text-gray-500">Role</dt><dd className="font-semibold capitalize">{me?.team ? `Earthintelytics team (${me.role})` : me?.role}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-gray-500">What you can do</dt><dd>{me?.can_edit ? 'See and change the registry, publish programme figures, ask the Assistant.' : 'See everything, ask the Assistant; changes need an editor account.'}</dd></div>
        </dl>
        <p className="text-xs text-gray-500">To change your password, use “Forgot password” on the FarmIntelytics sign-in page.</p>

        <section className="space-y-3 border-t border-gray-100 pt-5">
          <p className="font-semibold flex items-center gap-2"><Bell size={16} className="text-[#007248]" /> Alerts for your area</p>
          <p className="text-xs text-gray-600">Choose a place and the alerts you want, by email or text message. In this prototype subscriptions are saved; sending starts when the alert service is switched on.</p>
          <div className="grid grid-cols-1 gap-2">
            <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value, lga: '', ward: '' })} className={cls} aria-label="State"><option value="">Choose a state</option>{stateNames.map((s) => <option key={s}>{s}</option>)}</select>
            <select value={form.lga} disabled={!lgas.length} onChange={(e) => setForm({ ...form, lga: e.target.value, ward: '' })} className={`${cls} disabled:opacity-50`} aria-label="LGA"><option value="">The whole state</option>{lgas.map((s) => <option key={s}>{s}</option>)}</select>
            <select value={form.ward} disabled={!form.lga} onChange={(e) => setForm({ ...form, ward: e.target.value })} className={`${cls} disabled:opacity-50`} aria-label="Ward"><option value="">The whole LGA</option>{wards.filter(([l]) => l === form.lga).map(([, w]) => <option key={w}>{w}</option>)}</select>
          </div>
          <div className="space-y-1.5">
            {ALERTS.map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.alerts.includes(k)} onChange={() => setForm({ ...form, alerts: form.alerts.includes(k) ? form.alerts.filter((x) => x !== k) : [...form.alerts, k] })} className="accent-[#007248]" />{l}</label>
            ))}
          </div>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" className={cls} aria-label="Email" />
          <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone with country code, e.g. +2348012345678 (optional)" className={cls} aria-label="Phone" />
          <button type="button" onClick={save} className="w-full px-4 py-2.5 rounded-xl bg-[#007248] text-white text-sm font-semibold">Subscribe</button>
          {msg && <p className={`text-sm ${msg === 'Subscribed.' ? 'text-[#007248]' : 'text-red-700'}`}>{msg}</p>}
          <div className="space-y-2">
            {(subs || []).map((s) => (
              <div key={s.id} className="flex items-start justify-between gap-2 rounded-xl border border-gray-200 p-3 text-sm">
                <div><p className="font-semibold">{[s.ward, s.lga, s.state].filter(Boolean).join(', ')}</p><p className="text-xs text-gray-600">{s.alerts.join(', ')} · {[s.email, s.phone].filter(Boolean).join(' and ')}</p></div>
                <button type="button" onClick={() => gwonFetch(`/platforms/gwon/alerts/${s.id}`, { method: 'DELETE' }).then(load)} className="p-1.5 rounded-lg hover:bg-gray-100 text-red-700" aria-label="Unsubscribe"><Trash2 size={14} /></button>
              </div>
            ))}
            {subs && !subs.length && <p className="text-xs text-gray-500">No subscriptions yet.</p>}
          </div>
        </section>
        <button type="button" onClick={onSignOut} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700"><LogOut size={15} /> Sign out</button>
      </aside>
    </div>
  );
}

const Sec = ({ title, children }) => <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2"><h2 className="font-display text-lg font-semibold text-gray-900">{title}</h2><div className="text-sm text-gray-700 space-y-2">{children}</div></section>;

export function About() {
  const [credits, setCredits] = useState(null);
  useEffect(() => { fetch('/gwon-data/photos/credits.json').then((r) => r.json()).then(setCredits).catch(() => {}); }, []);
  return (
    <div className="space-y-4 max-w-4xl">
      <Sec title="What GWON is">
        <p>GreenWall Observatory Nigeria is the monitoring and results platform for the National Agency for the Great Green Wall. It brings satellite imagery, climate records, climate projections and public statistics for the eleven frontline states into one place, with the Agency’s own restoration sites, programme figures and advice for each state, LGA and ward.</p>
        <p>This is a prototype built by Earthintelytics to show what the full platform would do. Everything it shows is real public data, each figure with its source; nothing is invented.</p>
      </Sec>
      <Sec title="What it covers">
        <p>Adamawa, Bauchi, Borno, Gombe, Jigawa, Kano, Katsina, Kebbi, Sokoto, Yobe and Zamfara: their LGAs and wards, from 1991 for the climate record and to 2100 for the projections.</p>
      </Sec>
      <Sec title="Where the data comes from">
        <p>NASA (MODIS, VIIRS, SMAP, GPM, FIRMS, SEDAC), ECMWF ERA5 and SEAS5, the World Bank Climate Change Knowledge Portal (CMIP6), ESA Climate Change Initiative land cover, the University of Maryland Global Forest Change, UNEP-WCMC protected areas, ISRIC SoilGrids, OCHA, GRID3, WorldPop, the Global Multidimensional Poverty Index and the IOM Displacement Tracking Matrix. Each page’s (i) names its source; Reports, Data and API lists every dataset.</p>
      </Sec>
      <Sec title="Who can do what">
        <p>Anyone can see the dashboard, maps and analysis. The Agency’s staff and partners sign in to manage the project registry, publish programme figures, ask the Assistant, have advisory notes written and subscribe to alerts.</p>
      </Sec>
      <Sec title="Contact">
        <p>For the platform: Earthintelytics, through the FarmIntelytics contact page. For the Great Green Wall programme in Nigeria: the National Agency for the Great Green Wall (ggwnigeria.gov.ng).</p>
      </Sec>
      {credits && (
        <Sec title="Photographs">
          <ul className="space-y-1 text-xs">{Object.values(credits).map((c) => <li key={c.title}><a href={c.source} target="_blank" rel="noreferrer" className="underline">{c.title}</a> · {c.author || 'Wikimedia Commons'} · {c.licence}</li>)}</ul>
        </Sec>
      )}
      <p className="flex items-center gap-1.5 text-xs text-gray-500"><Info size={13} /> GreenWall Observatory Nigeria · Powered by Earthintelytics</p>
    </div>
  );
}

export function Models() {
  const NOW = [
    ['Drought indices', 'SPI (a gamma distribution per calendar month) and SPEI (a log-logistic one), fitted on 1991-2020 for every state, then applied to each month since 1991.', 'Statistical model, run by GWON'],
    ['Seasonal outlook', 'ECMWF SEAS5: 51 runs of a global forecast model for the next months; GWON counts how many fall below, near or above the 1991-2020 thirds.', 'Global ensemble, read by GWON'],
    ['Climate futures', 'CMIP6: the world’s climate models under four emissions scenarios (World Bank CCKP ensemble), and seven high-resolution models per state to 2050.', 'Global ensembles'],
    ['16-day forecast', 'Open-Meteo’s best-match weather models, read at the chosen place for planting windows and heat.', 'Global weather models'],
    ['The Advisor', 'Written-out rules (WMO drought classes, the Sivakumar planting onset, heat and fire thresholds) applied to the figures above; the AI only writes them up.', 'Rules, open to check'],
    ['Scenario planner and resilience score', 'Your own assumptions with the drought record; a weighted score you can re-weight.', 'Transparent calculations'],
  ];
  const PLANNED = [
    ['Restoration success from space', 'A deep-learning model trained on the Agency’s site visits and satellite time series to tell, site by site, whether planting has taken (survival, canopy, greening).'],
    ['Tree and shelterbelt detection', 'Object detection on high-resolution imagery to count trees and map shelterbelts, as Earthintelytics already does for oil palm.'],
    ['Seasonal yield and fodder forecasts', 'Machine-learning models combining SEAS5, soil moisture and vegetation to forecast the season ahead per LGA.'],
    ['Land degradation early warning', 'Models trained on ESA and Hansen change maps to flag wards where land is turning bare before it shows in the yearly maps.'],
    ['Downscaled climate scenarios', 'Statistical downscaling of CMIP6 to ward level, bias-corrected against ERA5, for local planning to 2050.'],
  ];
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-900 flex items-center gap-2"><Cpu size={18} className="text-[#007248]" /> Running in GWON now</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {NOW.map(([t, d, k]) => <div key={t} className="rounded-xl border border-[#A9D9BF] bg-[#F1F9F4] p-4"><p className="font-semibold text-gray-900">{t}</p><p className="text-sm text-gray-700 mt-1">{d}</p><p className="text-xs text-[#007248] font-semibold mt-1.5">{k}</p></div>)}
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold text-gray-900">Planned for the full platform</h2>
        <p className="text-sm text-gray-600">Earthintelytics trains and runs its own machine-learning and deep-learning models on its processing pipeline (its oil palm work already counts fruit bunches with a deep-learning model). For GWON these would be trained on the Agency’s field data with global satellite and climate data. They are not in this prototype.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {PLANNED.map(([t, d]) => <div key={t} className="rounded-xl border border-gray-200 p-4"><p className="font-semibold text-gray-900">{t}</p><p className="text-sm text-gray-700 mt-1">{d}</p><p className="text-xs text-gray-500 font-semibold mt-1.5">Planned</p></div>)}
        </div>
      </section>
    </div>
  );
}
