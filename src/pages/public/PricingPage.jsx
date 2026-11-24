import { useCallback, useState } from 'react';
import { useLoader } from '../../components/page/useLoader';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calculator, Check, Coins, KeyRound, Layers, MapPin, ShieldCheck, Wallet } from 'lucide-react';
import LandingNav from '../landing/components/LandingNav';
import LandingFooter from '../landing/components/LandingFooter';
import { creditFor } from '../landing/components/photoCredits';

/**
 * /pricing: what the EUDR check costs and exactly how it is charged (api_platform/pricing.py): per hectare, on the
 * total area of a request's plots, from a prepaid wallet; only the area really checked is charged. Only the EUDR check
 * is sold now (owner, 24 Nov 2026). The price is set in Admin, API clients: the EUDR plan marked "Show on the
 * pricing page", read from GET /public-api/v1/pricing. Without one, the page says the price is on request.
 */

const naira = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;
const ha = (n) => `${Number(n.toFixed(4)).toLocaleString('en-NG')} ha`;

const rulesFor = (PRICE_PER_HA) => [
  { icon: Layers, title: 'Charged on the total area', text: `A request costs the total area of its valid plots × ${PRICE_PER_HA ? naira(PRICE_PER_HA) : 'the price per hectare'}. Fifty small plots cost exactly the same as one plot covering the same land.` },
  { icon: Coins, title: 'Smaller than a hectare? You pay the fraction', text: PRICE_PER_HA ? `A 0.4 ha plot costs 0.4 × ${naira(PRICE_PER_HA)} = ${naira(0.4 * PRICE_PER_HA)}. Nothing is rounded up to a whole hectare.` : 'A 0.4 ha plot costs 0.4 of the price per hectare. Nothing is rounded up to a whole hectare.' },
  { icon: MapPin, title: 'Every plot is a polygon', text: 'Each plot is sent as its boundary and counts as measured, so the area, and the price, are exact. Single GPS points are not accepted.' },
  { icon: Wallet, title: 'From a prepaid wallet', text: 'Top up by bank transfer, quoting your payment reference. Checks draw on the wallet. No subscription, no monthly fee, no invoice.' },
  { icon: ShieldCheck, title: 'Held, then charged for what was checked', text: 'Sending a check holds its cost. When it finishes, only the area really checked is charged; the rest goes back to your wallet.' },
  { icon: KeyRound, title: 'Build for free', text: 'Test keys run the same real check, free, up to your free test hectares every day. Pay only when you go live.' },
];

const NEVER = ['Validating your file against the EU rules', 'Plots the EU rules refuse', 'Checks that fail', 'Test keys', 'A repeated request with the same Idempotency-Key'];

const EXAMPLES = [
  { who: 'A smallholder plot', plots: '1 plot', area: 0.4, note: 'Under a hectare: its fraction' },
  { who: 'A co-operative', plots: '250 plots, 1.6 ha each', area: 400, note: 'The total area, whatever the number of plots' },
  { who: 'A family farm', plots: '3 plots, 1.2 ha each', area: 3.6, note: 'Each plot as its boundary' },
  { who: 'An estate', plots: '12 blocks', area: 2_150, note: 'Polygons, as measured' },
];

const FAQ = [
  ['Is there a minimum spend or a contract?', 'No. Top up what you need; there is no monthly fee and no contract term.'],
  ['What if I split my land into many small plots?', 'The price does not change: it is the total area that is charged, never the number of plots.'],
  ['What do I get for each plot?', 'Pass, review or fail against the 31 December 2020 cut-off, with forest in 2020, tree cover lost since and its year, protected-area overlap, and a GeoJSON file ready for the EU information system.'],
  ['How do I top up?', 'Pay by bank transfer and quote your payment reference (shown in your Developer page). Your balance updates when the payment is recorded.'],
  ['What happens if my balance is too low?', 'The request is refused with a clear message (402) and nothing runs or is charged. Top up and send it again.'],
];

function Estimator({ PRICE_PER_HA }) {
  const [mode, setMode] = useState('area');
  const [area, setArea] = useState('100');
  const [plots, setPlots] = useState('50');
  const [avg, setAvg] = useState('1.5');
  const total = mode === 'area' ? Math.max(0, parseFloat(area) || 0) : Math.max(0, parseFloat(plots) || 0) * Math.max(0, parseFloat(avg) || 0);
  const inputCls = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base font-mono focus:border-[var(--brand-primary)] outline-none';
  return (
    <div className="rounded-3xl border border-[#E3EFDF] bg-white p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-[#EEF6EC] text-[var(--brand-primary)] flex items-center justify-center"><Calculator size={20} /></span>
        <h3 className="font-display text-xl font-semibold text-gray-900">Estimate your cost</h3>
      </div>
      <div role="tablist" aria-label="Estimate by" className="mt-5 inline-flex p-1 rounded-xl bg-[#EEF6EC] border border-[#D8EBD3]">
        {[['area', 'Total hectares'], ['plots', 'Plots × average size']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${mode === id ? 'bg-white text-[var(--brand-primary-dark)] border border-[#D8EBD3]' : 'text-gray-600 border border-transparent'}`}>{label}</button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {mode === 'area' ? (
          <label className="block sm:col-span-2"><span className="text-sm font-semibold text-gray-800">Total area of your plots (hectares)</span>
            <input className={`mt-1.5 ${inputCls}`} inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} /></label>
        ) : (
          <>
            <label className="block"><span className="text-sm font-semibold text-gray-800">Number of plots</span>
              <input className={`mt-1.5 ${inputCls}`} inputMode="numeric" value={plots} onChange={(e) => setPlots(e.target.value)} /></label>
            <label className="block"><span className="text-sm font-semibold text-gray-800">Average plot size (ha)</span>
              <input className={`mt-1.5 ${inputCls}`} inputMode="decimal" value={avg} onChange={(e) => setAvg(e.target.value)} /></label>
          </>
        )}
      </div>
      <div className="mt-6 rounded-2xl bg-[#F5FAF3] border border-[#E3EFDF] p-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-600">{ha(total)} × {naira(PRICE_PER_HA)} per hectare</p>
          <p className="mt-1 font-display text-4xl font-semibold text-gray-900">{naira(total * PRICE_PER_HA)}</p>
        </div>
        <p className="text-xs text-gray-500 max-w-[14rem]">Charged only for the area really checked. Plots the EU rules refuse are free.</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  // The published price, from the admin (the EUDR plan marked "Show on the pricing page").
  const load = useCallback(() => fetch('/public-api/v1/pricing', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { data: [] })), []);
  const prices = useLoader(load);
  const eudr = (prices.data?.data || []).find((p) => p.code === 'eudr-check');
  const PRICE_PER_HA = eudr ? eudr.price_per_ha_minor / 100 : null;
  const RULES = rulesFor(PRICE_PER_HA);
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      <LandingNav />

      {/* Hero: the price, plainly */}
      <section className="bg-[#F5FAF3] border-b border-[#E3EFDF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-primary-dark)]">Pricing</p>
            <h1 className="mt-2 font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">
              One price per hectare. <span className="text-[var(--brand-primary)]">Nothing else.</span>
            </h1>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-xl">
              The EUDR deforestation check, plot by plot, charged on the land you check, from a prepaid wallet. No
              subscription, no monthly fee, no contract.
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

          {/* The price card */}
          <div className="rounded-3xl border border-[#D8EBD3] bg-white overflow-hidden">
            <div className="relative h-36">
              <img src="/crops/hero/eudr.webp" alt="" data-credit={creditFor('/crops/hero/eudr.webp')} className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute left-4 bottom-4 rounded-lg bg-white/95 px-3 py-1 text-sm font-semibold text-gray-900">EUDR deforestation check</span>
            </div>
            <div className="p-7">
              <p className="flex items-end gap-2">
                {PRICE_PER_HA ? (
                  <><span className="font-display text-6xl font-semibold tracking-tight text-gray-900">{naira(PRICE_PER_HA)}</span>
                    <span className="pb-2 text-gray-600">per hectare</span></>
                ) : <span className="font-display text-3xl font-semibold text-gray-900">{prices.state === 'loading' ? '…' : 'Price per hectare on request'}</span>}
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-gray-700">
                {['Pass, review or fail for every plot', 'Forest in 2020, loss since and its year', 'Protected-area overlap', 'A GeoJSON file for the EU information system', 'API, callbacks and test keys included'].map((x) => (
                  <li key={x} className="flex gap-2.5"><Check size={16} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />{x}</li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-gray-500">Prices in naira. Contact us for very large volumes.</p>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        {/* How it is charged */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="text-sm font-semibold text-[var(--brand-primary)]">How it is charged</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight">Fair by design: you pay for land, not for files</h2>
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

        {/* Estimator and examples */}
        <section className="bg-[#FBF8F1] border-y border-[#F0E9DA]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
            {PRICE_PER_HA ? <Estimator PRICE_PER_HA={PRICE_PER_HA} /> : <div className="rounded-3xl border border-[#E3EFDF] bg-white p-8 text-gray-600">The estimator appears once the price is published.</div>}
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
