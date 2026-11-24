import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Copy, Leaf, ShieldCheck, Terminal } from 'lucide-react';
import LandingNav from '../landing/components/LandingNav';
import LandingFooter from '../landing/components/LandingFooter';
import { copyText } from '../../utils/copyText';

/**
 * /developers: the front door of the FarmIntelytics API ("Developers" in the menu). What it is (the products), a first
 * request in three languages, four steps to a result, and the way to the reference: ReDoc to read it (/redoc, the
 * default) and Swagger to try it (/docs). The detail (endpoints, fields, errors, webhooks, charging) lives only in the
 * reference, so it is written once (api_platform/public_api.py). Prices are agreed per account, so none are shown.
 */
const BASE = '/public-api/v1';

const PRODUCTS = [
  {
    code: 'eudr-check', icon: ShieldCheck, name: 'EUDR deforestation check', path: '/eudr',
    text: 'Send each plot as its boundary (a polygon). For each plot you get pass, review or fail against the 31 December 2020 cut-off, with forest in 2020, tree cover lost since and the year, protected-area overlap, and a GeoJSON file the EU information system accepts.',
    facts: ['EU information system geolocation rules, checked first and free', 'JRC GFC2020 · Hansen/UMD GFC · protected areas', 'Map versions named in every result'],
  },
  {
    code: 'suitability-check', icon: Leaf, name: 'Crop suitability', path: '/suitability',
    text: 'Send fields as polygons and a crop. Each field gets an FAO suitability class from S1 (very suitable) to N (not suitable), the factors that hold it back and how sure the rating is, and you get the designed suitability report as a PDF.',
    facts: ['Slope, rainfall, dry season, temperature, soil pH, water, flooding', '30 m grid, worst limiting factor (FAO)', 'The PDF report of every check, included'],
  },
];

const PLOT = '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"ref":"farm-1001","ProducerName":"Ada Obi","ProducerCountry":"NG"},"geometry":{"type":"Polygon","coordinates":[[[8.330123,7.880456],[8.331223,7.880456],[8.331223,7.881556],[8.330123,7.881556],[8.330123,7.880456]]]}}]}';

const SAMPLES = {
  curl: `curl -X POST https://<your-host>${BASE}/eudr/checks \\
  -H "Authorization: Bearer $FI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: po-1001" \\
  -d '{"commodity": "cocoa", "reference": "PO-1001",
       "geojson": ${PLOT}}'`,
  python: `import os, requests

r = requests.post(
    "https://<your-host>${BASE}/eudr/checks",
    headers={"Authorization": f"Bearer {os.environ['FI_API_KEY']}",
             "Idempotency-Key": "po-1001"},
    json={"commodity": "cocoa", "reference": "PO-1001",
          "geojson": plots},   # a GeoJSON FeatureCollection
    timeout=60,
)
check = r.json()               # 202: {"id": "chk_…", "status": "queued", …}`,
  javascript: `const r = await fetch("https://<your-host>${BASE}/eudr/checks", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${process.env.FI_API_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "po-1001",
  },
  body: JSON.stringify({ commodity: "cocoa", reference: "PO-1001", geojson: plots }),
});
const check = await r.json();  // 202: { id: "chk_…", status: "queued", … }`,
};

function Code({ code, label }) {
  const [done, setDone] = useState(false);
  return (
    <div className="relative rounded-xl border border-gray-200 bg-[#F7F9F7] min-w-0">
      {label && <div className="px-4 pt-3 text-xs font-semibold text-gray-500">{label}</div>}
      <button type="button" aria-label="Copy" onClick={() => copyText(code).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}
        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 hover:text-gray-900">
        {done ? <Check size={13} /> : <Copy size={13} />}{done ? 'Copied' : 'Copy'}
      </button>
      <pre className="overflow-x-auto px-4 py-4 pr-20 font-mono text-[12.5px] leading-relaxed text-gray-800"><code>{code}</code></pre>
    </div>
  );
}

function CodeTabs() {
  const [lang, setLang] = useState('curl');
  return (
    <div className="space-y-2 min-w-0">
      <div role="tablist" aria-label="Language" className="inline-flex p-1 rounded-lg bg-gray-100 border border-gray-200">
        {[['curl', 'cURL'], ['python', 'Python'], ['javascript', 'JavaScript']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={lang === id} onClick={() => setLang(id)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${lang === id ? 'bg-white text-gray-900 border border-gray-200' : 'text-gray-600 border border-transparent hover:text-gray-900'}`}>{label}</button>
        ))}
      </div>
      <Code code={SAMPLES[lang]} />
    </div>
  );
}

function H2({ id, kicker, children, text }) {
  return (
    <div id={id} className="scroll-mt-24">
      {kicker && <p className="font-mono text-xs font-semibold text-[var(--brand-primary)]">{kicker}</p>}
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-gray-900">{children}</h2>
      {text && <p className="mt-2 text-[15px] text-gray-600 leading-relaxed max-w-2xl">{text}</p>}
    </div>
  );
}

export default function DevelopersPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      <LandingNav />

      {/* Hero */}
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">
              Satellite checks for farm land, <span className="text-[var(--brand-primary)]">from your own code</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
              Send plot boundaries, get back evidence: whether forest was cleared after the EUDR cut-off, and how suited each field is to a crop. Plot by plot, with the sources named.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`${BASE}/redoc`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
                <BookOpen size={16} />API reference
              </a>
              <a href={`${BASE}/docs`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 hover:bg-gray-50">
                <Terminal size={16} />Try it in Swagger
              </a>
              <button type="button" onClick={() => navigate('/contact')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 hover:bg-gray-50">
                Get a test key<ArrowRight size={16} />
              </button>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[['2', 'products'], ['202', 'async, with callbacks'], ['₦', 'per hectare, prepaid']].map(([v, l]) => (
                <div key={l}><dt className="font-mono text-xl font-semibold text-gray-900">{v}</dt><dd className="text-xs text-gray-500 mt-0.5">{l}</dd></div>
              ))}
            </dl>
          </div>
          <CodeTabs />
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <main className="min-w-0 space-y-16">
          <section className="space-y-6">
            <H2 id="products" kicker="Products" text="Each product is switched on per account, priced per hectare from a prepaid wallet. More services join the same API, keys and wallet.">What you can call</H2>
            <div className="grid gap-4 md:grid-cols-2">
              {PRODUCTS.map((p) => (
                <article key={p.code} className="rounded-2xl border border-gray-200 p-6 flex flex-col">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-[var(--brand-primary)]"><p.icon size={19} /></span>
                    <div><h3 className="font-display text-lg font-semibold">{p.name}</h3><code className="font-mono text-xs text-gray-500">{p.code} · {BASE}{p.path}</code></div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600 leading-relaxed">{p.text}</p>
                  <ul className="mt-4 space-y-1.5 text-sm text-gray-700">
                    {p.facts.map((f) => <li key={f} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />{f}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <H2 id="quickstart" kicker="Quickstart" text="Four calls from a test key to a result.">From zero to a result</H2>
            <ol className="grid gap-4 sm:grid-cols-2">
              {[
                ['1', 'Get a test key', 'We set up your account and send a fi_test_ key. Test keys run the real check, free: 10 test requests, each up to 1 ha.'],
                ['2', 'Validate your file', 'POST /eudr/validate tells you, plot by plot, what the EU rules would refuse and why. It costs nothing.'],
                ['3', 'Send the plots', 'POST /eudr/checks (or /suitability/checks) answers 202 with a check id. Send an Idempotency-Key so a retry is never run twice.'],
                ['4', 'Read the result', 'Poll GET …/checks/{id} until status is done, or let us call your webhook. Most checks finish in seconds to minutes.'],
              ].map(([n, t, x]) => (
                <li key={n} className="rounded-2xl border border-gray-200 p-5">
                  <span className="font-mono text-xs font-semibold text-[var(--brand-primary)]">STEP {n}</span>
                  <p className="mt-1 font-semibold text-gray-900">{t}</p>
                  <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{x}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-6">
            <H2 id="reference" kicker="Reference" text="Every endpoint, field, parameter, example request and response, error code, the webhook signature and how charging works are in the API reference. Two views of the same reference:">Everything else is in the reference</H2>
            <div className="grid gap-4 md:grid-cols-2">
              <a href={`${BASE}/redoc`} target="_blank" rel="noreferrer" className="group rounded-2xl border border-gray-200 p-6 hover:border-[var(--brand-primary)]">
                <BookOpen size={22} className="text-[var(--brand-primary)]" />
                <h3 className="mt-3 font-display text-lg font-semibold">Read the API reference</h3>
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">The full reference as a document, section by section, with every example. Start here.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)]">Open the reference<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
              </a>
              <a href={`${BASE}/docs`} target="_blank" rel="noreferrer" className="group rounded-2xl border border-gray-200 p-6 hover:border-[var(--brand-primary)]">
                <Terminal size={22} className="text-[var(--brand-primary)]" />
                <h3 className="mt-3 font-display text-lg font-semibold">Try it in Swagger</h3>
                <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">Press Authorize, add your test key, and send real requests from the page.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)]">Open Swagger<ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-[#F7F9F7] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900">Ready to build?</h2>
              <p className="mt-1 text-sm text-gray-600">Tell us your volumes and systems; we set up your account and send your test key.</p>
            </div>
            <button type="button" onClick={() => navigate('/contact')}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
              Talk to us<ArrowRight size={16} />
            </button>
          </section>

          <p className="text-xs text-gray-500">Results come from satellite maps and models. They are evidence for your own checks, not a due diligence statement, a legal opinion or a soil survey: confirm plots marked review or fail, and fields before planting, on the ground.</p>
        </main>
      </div>
      <LandingFooter />
    </div>
  );
}
