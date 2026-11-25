import { useCallback, useState } from 'react';
import { useLoader } from '../../components/page/useLoader';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calculator, Check, Coins, KeyRound, Layers, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import LandingNav from '../landing/components/LandingNav';
import LandingFooter from '../landing/components/LandingFooter';
import { creditFor } from '../landing/components/photoCredits';

/**
 * /pricing: what FarmIntelytics costs, every price from the admin (nothing priced in the code):
 *  - crop monitoring: a monthly subscription by size (mapped hectares x the price per hectare a month), from
 *    Admin, Subscriptions, read from GET /public/subscription-prices;
 *  - the API: the EUDR check and crop suitability (with its PDF report), per hectare from a prepaid wallet
 *    (api_platform/pricing.py), from the plans marked "Show on the pricing page" in Admin, API clients, read from
 *    GET /public-api/v1/pricing. A product without a published plan shows "on request".
 */
import { API_BASE } from '../../services/apiBase';

const naira = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;
const ha = (n) => `${Number(n.toFixed(4)).toLocaleString('en-NG')} ha`;

const rulesFor = (PRICE_PER_HA) => [
  { icon: Layers, title: 'Charged on the total area', text: `A request costs the total area of its valid plots × ${PRICE_PER_HA ? naira(PRICE_PER_HA) : 'the price per hectare'}. Fifty small plots cost exactly the same as one plot covering the same land.` },
  { icon: Coins, title: 'Smaller than a hectare? You pay the fraction', text: PRICE_PER_HA ? `A 0.4 ha plot costs 0.4 × ${naira(PRICE_PER_HA)} = ${naira(0.4 * PRICE_PER_HA)}. Nothing is rounded up to a whole hectare.` : 'A 0.4 ha plot costs 0.4 of the price per hectare. Nothing is rounded up to a whole hectare.' },
  { icon: MapPin, title: 'Every plot is a polygon', text: 'Each plot is sent as its boundary and counts as measured, so the area, and the price, are exact. Single GPS points are not accepted.' },
  { icon: Wallet, title: 'From a prepaid wallet', text: 'Top up by bank transfer, quoting your payment reference. Checks draw on the wallet.' },
  { icon: ShieldCheck, title: 'Held, then charged for what was checked', text: 'Sending a check holds its cost. When it finishes, only the area really checked is charged; the rest goes back to your wallet.' },
  { icon: KeyRound, title: 'Build for free', text: 'Test keys run the same real check, free: 10 test requests per account, each up to 1 ha. Pay only when you go live.' },
];

const NEVER = ['Validating your file against the EU rules', 'Plots the EU rules refuse', 'Checks that fail', 'Test keys', 'A repeated request with the same Idempotency-Key'];

const EXAMPLES = [
  { who: 'A smallholder plot', plots: '1 plot', area: 0.4, note: 'Under a hectare: its fraction' },
  { who: 'A co-operative', plots: '250 plots, 1.6 ha each', area: 400, note: 'The total area, whatever the number of plots' },
  { who: 'A family farm', plots: '3 plots, 1.2 ha each', area: 3.6, note: 'Each plot as its boundary' },
  { who: 'An estate', plots: '12 blocks', area: 2_150, note: 'Polygons, as measured' },
];

const FAQ = [
  ['How is crop monitoring billed?', 'Every month, on the hectares of the fields you have mapped, at the price per hectare shown above. Add or remove fields and the next month follows.'],
  ['Do I need the API to use FarmIntelytics?', 'No. Monitoring works in the web portal and the phone app. The API is for teams that want to send plots from their own software.'],
  ['What if I split my land into many small plots?', 'The price does not change: it is the total area that is charged, never the number of plots.'],
  ['What do I get for each plot?', 'Pass, review or fail against the 31 December 2020 cut-off, with forest in 2020, tree cover lost since and its year, protected-area overlap, and a GeoJSON file ready for the EU information system.'],
  ['How do I top up?', 'Pay by bank transfer and quote your payment reference (shown in your Developer page). Your balance updates when the payment is recorded.'],
  ['What happens if my balance is too low?', 'The request is refused with a clear message (402) and nothing runs or is charged. Top up and send it again.'],
];

// One calculator for every service: tick what you need and enter its hectares. Monitoring is a monthly amount;
// the API checks are paid once per hectare checked. Prices come from the admin (a service without one is "on request").
function CostCalculator({ plans }) {
  const [pick, setPick] = useState({ mon: true });
  const [ha, setHa] = useState({});
  const n = (k) => Math.max(0, parseFloat(ha[k] ?? '50') || 0);
  const line = (pl) => (pl.price ? (pl.key === 'mon' ? Math.max(n('mon') * pl.price, pl.minimum || 0) : n(pl.key) * pl.price) : null);
  const monthly = plans.filter((pl) => pl.key === 'mon' && pick.mon && pl.price).reduce((s, pl) => s + line(pl), 0);
  const once = plans.filter((pl) => pl.key !== 'mon' && pick[pl.key] && pl.price).reduce((s, pl) => s + line(pl), 0);
  const onRequest = plans.filter((pl) => pick[pl.key] && !pl.price).map((pl) => pl.title);
  const inputCls = 'w-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-base font-mono focus:border-[var(--brand-primary)] outline-none disabled:opacity-40';
  return (
    <div className="rounded-3xl border border-[#E3EFDF] bg-white p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-[#EEF6EC] text-[var(--brand-primary)] flex items-center justify-center"><Calculator size={20} /></span>
        <div>
          <h3 className="font-display text-xl font-semibold text-gray-900">Work out your cost</h3>
          <p className="text-sm text-gray-600">Tick the services you need and enter the hectares for each.</p>
        </div>
      </div>
      <div className="mt-6 divide-y divide-gray-100 border-y border-gray-100">
        {plans.map((pl) => (
          <div key={pl.key} className="py-4 grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_auto_9rem] items-center gap-x-4 gap-y-2">
            <input type="checkbox" checked={!!pick[pl.key]} onChange={(e) => setPick({ ...pick, [pl.key]: e.target.checked })} aria-label={pl.title} className="w-5 h-5 accent-[var(--brand-primary)]" />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{pl.title}</p>
              <p className="text-xs text-gray-500">{pl.price ? `${naira(pl.price)} ${pl.unit}` : 'Price on request'}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600"><input className={inputCls} inputMode="decimal" value={ha[pl.key] ?? '50'} disabled={!pick[pl.key]} onChange={(e) => setHa({ ...ha, [pl.key]: e.target.value })} aria-label={`Hectares for ${pl.title}`} /> ha</label>
            <p className={`col-span-3 sm:col-span-1 text-right font-display text-lg font-semibold tabular-nums ${pick[pl.key] ? 'text-gray-900' : 'text-gray-300'}`}>
              {pl.price ? `${naira(line(pl))}${pl.key === 'mon' ? ' a month' : ''}` : '—'}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#F5FAF3] border border-[#E3EFDF] p-5">
          <p className="text-sm text-gray-600">Every month</p>
          <p className="mt-1 font-display text-3xl font-semibold text-gray-900">{naira(monthly)}</p>
          <p className="text-xs text-gray-500 mt-1">Crop monitoring, on the hectares you map</p>
        </div>
        <div className="rounded-2xl bg-[#FBF8F1] border border-[#F0E9DA] p-5">
          <p className="text-sm text-gray-600">Once, from your wallet</p>
          <p className="mt-1 font-display text-3xl font-semibold text-gray-900">{naira(once)}</p>
          <p className="text-xs text-gray-500 mt-1">API checks, on the area really checked</p>
        </div>
      </div>
      {onRequest.length > 0 && <p className="mt-3 text-xs text-gray-500">{onRequest.join(' and ')}: price on request, not in the totals.</p>}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  // The published price, from the admin (the EUDR plan marked "Show on the pricing page").
  const load = useCallback(() => fetch('/public-api/v1/pricing', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { data: [] })), []);
  const prices = useLoader(load);
  const eudr = (prices.data?.data || []).find((p) => p.code === 'eudr-check');
  const suit = (prices.data?.data || []).find((p) => p.code === 'suitability-check');
  const PRICE_PER_HA = eudr ? eudr.price_per_ha_minor / 100 : null;
  const SUIT_PER_HA = suit ? suit.price_per_ha_minor / 100 : null;
  const RULES = rulesFor(PRICE_PER_HA);
  // Crop monitoring: the monthly price per hectare, from the admin.
  const loadSubs = useCallback(() => fetch(`${API_BASE}/public/subscription-prices`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { data: [] })), []);
  const subs = useLoader(loadSubs);
  const mon = (subs.data?.data || []).find((p) => p.code === 'crop-monitoring');
  const MON_PER_HA = mon ? mon.price_per_ha_month_minor / 100 : null;
  const MON_MIN = mon?.minimum_month_minor ? mon.minimum_month_minor / 100 : 0;
  const loading = prices.state === 'loading' || subs.state === 'loading';
  const PLANS = [
    { key: 'mon', img: '/crops/groundnut.webp', title: 'Crop monitoring', price: MON_PER_HA, unit: 'a hectare a month', who: 'For farms, estates and co-operatives',
      points: ['Every field watched from space, every few days', 'Crop health, water and weather advice in plain words', 'Alerts when a field needs a visit', 'Reports for your team, buyers and lenders', 'The phone app for your field teams'] },
    { key: 'eudr', img: '/crops/hero/eudr.webp', title: 'EUDR deforestation check', price: PRICE_PER_HA, unit: 'a hectare checked', who: 'API, for exporters and buyers',
      points: ['Pass, review or fail for every plot', 'Forest in 2020, loss since and its year', 'Protected-area overlap', 'A GeoJSON file for the EU information system'] },
    { key: 'suit', img: '/crops/millet.webp', title: 'Crop suitability', price: SUIT_PER_HA, unit: 'a hectare checked', who: 'API, before you plant',
      points: ['How well each plot suits the crop', 'What limits it: rain, soil, slope, heat', 'A full PDF report for every check', 'Charged on the area you check'] },
    // Any other API plan the admin publishes (for example a crop monitoring API) shows here with its own name.
    ...(prices.data?.data || []).filter((p) => !['eudr-check', 'suitability-check'].includes(p.code)).map((p) => ({
      key: p.code, img: '/crops/field_logs.webp', title: p.name, price: p.price_per_ha_minor / 100, unit: `a ${p.unit || 'hectare'}`, who: 'API',
      points: ['Through the FarmIntelytics API', 'From your prepaid wallet', 'Test keys included'] })),
  ];
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      <LandingNav />

      {/* Hero: the price, plainly */}
      <section className="bg-[#F5FAF3] border-b border-[#E3EFDF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-primary-dark)]">Pricing</p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08] max-w-3xl">
              Simple pricing, <span className="text-[var(--brand-primary)]">by the hectare</span>
            </h1>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-xl">
              Pay only for the land area we monitor, not the number of files or fields. Monitoring is billed
              monthly, while EUDR and suitability checks are charged per hectare. Top up your wallet and pay only
              for the checks you need.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate('/contact')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
                Get started<ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => navigate('/developers')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 bg-white hover:bg-gray-50">
                For developers
              </button>
            </div>
          </div>

        </div>
      </section>

      <main className="flex-1">
        {/* The three ways to pay */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16">
          <div className={`grid gap-5 ${PLANS.length > 3 ? 'lg:grid-cols-2 xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {PLANS.map((pl) => (
              <article key={pl.key} className="rounded-3xl border border-[#D8EBD3] bg-white overflow-hidden flex flex-col">
                <div className="relative h-32">
                  <img src={pl.img} alt="" data-credit={creditFor(pl.img)} className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute left-4 bottom-4 rounded-lg bg-white/95 px-3 py-1 text-sm font-semibold text-gray-900">{pl.title}</span>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-xs font-semibold text-[#9A6A00]">{pl.who}</p>
                  <p className="mt-2 flex items-end gap-2">
                    {pl.price ? (<><span className="font-display text-5xl font-semibold tracking-tight text-gray-900">{naira(pl.price)}</span><span className="pb-1.5 text-gray-600">{pl.unit}</span></>)
                      : <span className="font-display text-2xl font-semibold text-gray-900">{loading ? '…' : 'Price on request'}</span>}
                  </p>
                  {pl.key === 'mon' && MON_MIN > 0 && <p className="text-xs text-gray-500 mt-1">Minimum {naira(MON_MIN)} a month</p>}
                  <ul className="mt-5 space-y-2.5 text-sm text-gray-700 flex-1">
                    {pl.points.map((x) => <li key={x} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />{x}</li>)}
                  </ul>
                  <button type="button" onClick={() => navigate(pl.key === 'mon' ? '/contact' : '/developers')}
                    className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
                    {pl.key === 'mon' ? 'Talk to us' : 'Get a test key'}<ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-500">All prices in naira, set by our team and shown here as they are. Contact us for very large areas.</p>
        </section>

        {/* One calculator for every service */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-start">
            <CostCalculator plans={PLANS.map((pl) => ({ ...pl, minimum: pl.key === 'mon' ? MON_MIN : 0 }))} />
            <div>
              <p className="text-sm font-semibold text-[var(--brand-primary)]">How it adds up</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Pay monthly for watching, once for checking</h2>
              <p className="mt-4 text-gray-600 leading-relaxed">{MON_PER_HA ? `Crop monitoring counts the hectares of the fields you map and multiplies by ${naira(MON_PER_HA)} a hectare a month. Map a new field and it is counted from the next month; take one off and it stops. ` : ''}The EUDR and suitability checks draw on your prepaid wallet, per hectare checked, only when you run them.</p>
            </div>
          </div>
        </section>

        {/* How it is charged */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="text-sm font-semibold text-[var(--brand-primary)]">How the API checks are charged</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight">Fair: you pay for land, not for files</h2>
          {SUIT_PER_HA && <p className="mt-3 text-gray-600 max-w-3xl">The same rules apply to crop suitability, at {naira(SUIT_PER_HA)} a hectare, with its PDF report included. The examples below are for the EUDR check.</p>}
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {RULES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-gray-200 p-6">
                <span className="w-11 h-11 rounded-xl bg-[#EEF6EC] text-[var(--brand-primary)] flex items-center justify-center"><Icon size={20} /></span>
                <h3 className="mt-4 font-display text-lg font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Examples of an EUDR check */}
        <section className="bg-[#FBF8F1] border-y border-[#F0E9DA]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div>
              <p className="text-sm font-semibold text-[#9A6A00]">Examples</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">What a check costs</h2>
              <div className="mt-6 rounded-2xl border border-[#F0E9DA] bg-white divide-y divide-[#F0E9DA] overflow-hidden">
                {EXAMPLES.map((e) => (
                  <div key={e.who} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-5 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{e.who}</p>
                      <p className="text-sm text-gray-600">{e.plots} · {ha(e.area)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{e.note}</p>
                    </div>
                    <p className="self-center font-display text-xl font-semibold text-gray-900">{PRICE_PER_HA ? naira(e.area * PRICE_PER_HA) : ha(e.area)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-[#F0E9DA] bg-white p-5">
                <p className="font-semibold text-gray-900">Never charged</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-gray-700">
                  {NEVER.map((x) => <li key={x} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />{x}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="text-sm font-semibold text-[var(--brand-primary)]">Questions</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Good to know</h2>
          <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-gray-900">
                  {q}<span className="text-[var(--brand-primary)] transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-2 text-gray-600 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="rounded-3xl bg-[var(--brand-primary)] px-6 py-10 sm:px-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-white">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold">Check your first plots free</h2>
              <p className="mt-2 text-white/90">Ask for a test key; pay per hectare when you go live.</p>
            </div>
            <button type="button" onClick={() => navigate('/contact')}
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-gray-50">
              Talk to us<ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
