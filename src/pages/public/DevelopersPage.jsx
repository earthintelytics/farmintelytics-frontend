import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Copy, KeyRound, Leaf, Map as MapIcon, RefreshCw, ShieldCheck, Webhook, Wallet } from 'lucide-react';
import LandingNav from '../landing/components/LandingNav';
import LandingFooter from '../landing/components/LandingFooter';
import { copyText } from '../../utils/copyText';

/**
 * /developers: the FarmIntelytics API for engineers. The products (EUDR check, crop suitability), a request in three
 * languages with its real response shape, the endpoints, keys and sandbox, charging, webhooks and errors. Everything
 * here matches api_platform (public_api.py, products/*, errors.py, webhooks.py): change both together. Prices are
 * agreed per account, so none are shown.
 */
const BASE = '/public-api/v1';

const PRODUCTS = [
  {
    code: 'eudr-check', icon: ShieldCheck, name: 'EUDR deforestation check', path: '/eudr',
    text: 'Send plots as points or polygons. For each plot you get pass, review or fail against the 31 December 2020 cut-off, with forest in 2020, tree cover lost since and the year, protected-area overlap, and a GeoJSON file the EU information system accepts.',
    facts: ['EU information system geolocation rules, checked first and free', 'JRC GFC2020 · Hansen/UMD GFC · protected areas', 'Map versions named in every result'],
  },
  {
    code: 'suitability-check', icon: Leaf, name: 'Crop suitability', path: '/suitability',
    text: 'Send fields as polygons and a crop. Each field gets an FAO suitability class from S1 (very suitable) to N (not suitable), the factors that hold it back, the data that was missing, and how sure the rating is.',
    facts: ['Slope, rainfall, dry season, temperature, soil pH, water, flooding', '30 m grid, worst limiting factor (FAO)', 'Irrigated fields rated without the rain limits'],
  },
];

const ENDPOINTS = [
  ['GET', '/me', 'Your account: products on your plan, prices, balance and limits'],
  ['POST', '/eudr/validate', 'Check plots by the EU information system rules. Free, instant'],
  ['POST', '/eudr/checks', 'Send plots for the EUDR check. Answers 202 with a check id'],
  ['GET', '/eudr/checks', 'Your EUDR checks, newest first (cursor: starting_after)'],
  ['GET', '/eudr/checks/{id}', 'One check, then each plot\'s result'],
  ['GET', '/eudr/checks/{id}/geojson', 'The plots as GeoJSON for the EU information system'],
  ['GET', '/suitability/crops', 'The crops that can be rated, and their factors'],
  ['POST', '/suitability/checks', 'Send fields for a crop rating. Answers 202 with a check id'],
  ['GET', '/suitability/checks', 'Your suitability checks, newest first'],
  ['GET', '/suitability/checks/{id}', 'One check, then each field\'s class and limits'],
  ['GET', '/wallet', 'Balance and every top-up, hold, release and charge'],
  ['GET', '/usage', 'Plots and spend for a month'],
];

const PLOT = '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"ref":"farm-1001","ProducerName":"Ada Obi","ProducerCountry":"NG"},"geometry":{"type":"Point","coordinates":[8.330123,7.880456]}}]}';

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

const RESPONSE = `{
  "id": "chk_6f1d…",
  "object": "eudr_check",
  "status": "done",
  "commodity": "cocoa",
  "cutoff_date": "2020-12-31",
  "plots": { "sent": 1, "valid": 1, "charged": 1 },
  "billing": { "currency": "NGN", "held_minor": …, "charged_minor": … },
  "results": [{
    "ref": "farm-1001",
    "status": "pass",
    "forest_2020_pct": 0.0,
    "loss_after_cutoff_ha": 0.0,
    "loss_year": null,
    "protected_overlap": false
  }],
  "sources": [ … ], "data_versions": { … }
}`;

const SUIT_RESPONSE = `{
  "object": "suitability_check",
  "crop": "cocoa",
  "status": "done",
  "summary": { "plots_rated": 1, "by_class": { "S2": 1 } },
  "results": [{
    "ref": "field-07",
    "class": "S2",
    "class_name": "Suitable",
    "limiting_factors": ["…"],
    "missing_factors": [],
    "confidence": "medium"
  }]
}`;

const WEBHOOK = `# FI-Signature: t=1732370000,v1=5c2e…
import hmac, hashlib

def verify(raw_body: bytes, header: str, secret: str) -> bool:
    parts = dict(p.split("=", 1) for p in header.split(","))
    signed = f"{parts['t']}.".encode() + raw_body
    expected = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])`;

const ERRORS = [
  ['400', 'invalid_request', 'A field is missing or wrong; details name it'],
  ['401', 'invalid_api_key', 'No key, or a revoked one'],
  ['402', 'insufficient_balance', 'Not enough balance: nothing was run or charged'],
  ['403', 'product_not_allowed', 'Your plan does not include this product'],
  ['409', 'idempotency_conflict', 'Same Idempotency-Key, different body'],
  ['422', 'invalid_geojson', 'No plot can be checked; each issue has a code'],
  ['429', 'rate_limited', 'Slow down; wait Retry-After seconds'],
];

const NAV = [['products', 'Products'], ['quickstart', 'Quickstart'], ['endpoints', 'Endpoints'], ['responses', 'Responses'],
  ['keys', 'Keys and sandbox'], ['charging', 'Charging'], ['webhooks', 'Webhooks'], ['errors', 'Errors']];

const METHOD = { GET: 'text-sky-700 bg-sky-50 border-sky-200', POST: 'text-green-800 bg-green-50 border-green-200' };

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
            <p className="font-mono text-xs font-semibold text-[var(--brand-primary)]">REST · JSON · {BASE}</p>
            <h1 className="mt-5 font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">
              Satellite checks for farm land, <span className="text-[var(--brand-primary)]">from your own code</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
              Send plot boundaries, get back evidence: whether forest was cleared after the EUDR cut-off, and how suited each field is to a crop. Plot by plot, with the sources named.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`${BASE}/docs`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
                <BookOpen size={16} />API reference
              </a>
              <button type="button" onClick={() => navigate('/contact')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 hover:bg-gray-50">
                Get a test key<ArrowRight size={16} />
              </button>
            </div>
            <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[['2', 'products'], ['202', 'async, with callbacks'], ['₦', 'billed per plot']].map(([v, l]) => (
                <div key={l}><dt className="font-mono text-xl font-semibold text-gray-900">{v}</dt><dd className="text-xs text-gray-500 mt-0.5">{l}</dd></div>
              ))}
            </dl>
          </div>
          <CodeTabs />
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid gap-12 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block sticky top-24 self-start space-y-1 text-sm">
          {NAV.map(([id, label]) => <a key={id} href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900">{label}</a>)}
        </nav>

        <main className="min-w-0 space-y-20">
          <section className="space-y-6">
            <H2 id="products" kicker="Products" text="Each product is switched on per account, with its own price per plot. More services join the same API, keys and wallet.">What you can call</H2>
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
                ['1', 'Get a test key', 'We set up your account and send a fi_test_ key. Test keys run the real check, free, up to a daily number of plots.'],
                ['2', 'Validate your file', 'POST /eudr/validate tells you, plot by plot, what the EU rules would refuse and why. It costs nothing.'],
                ['3', 'Send the plots', 'POST /eudr/checks or /suitability/checks answers 202 with a check id. Send an Idempotency-Key so a retry is never run twice.'],
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
            <H2 id="endpoints" kicker="Reference" text={`All paths start with ${BASE}. Send your key as Authorization: Bearer <key>.`}>Endpoints</H2>
            <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {ENDPOINTS.map(([m, path, text]) => (
                <div key={m + path} className="grid gap-x-4 gap-y-1 px-4 sm:px-5 py-3 sm:grid-cols-[64px_minmax(0,260px)_minmax(0,1fr)] items-baseline">
                  <span className={`justify-self-start rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${METHOD[m]}`}>{m}</span>
                  <code className="font-mono text-[13px] text-gray-900 break-all">{path}</code>
                  <span className="text-sm text-gray-600">{text}</span>
                </div>
              ))}
            </div>
            <a href={`${BASE}/docs`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:underline">
              Try every endpoint in Swagger<ArrowRight size={15} />
            </a>
            <a href={`${BASE}/redoc`} target="_blank" rel="noreferrer" className="ml-6 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:underline">
              Read it as a document (ReDoc)<ArrowRight size={15} />
            </a>
          </section>

          <section className="space-y-6">
            <H2 id="responses" kicker="Responses" text="One shape per product, the same for polling and webhooks. Money is in kobo (minor units).">What comes back</H2>
            <div className="grid gap-4 xl:grid-cols-2">
              <Code label="GET /eudr/checks/{id}" code={RESPONSE} />
              <Code label="GET /suitability/checks/{id}" code={SUIT_RESPONSE} />
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div id="keys" className="scroll-mt-24 rounded-2xl border border-gray-200 p-6">
              <KeyRound size={20} className="text-[var(--brand-primary)]" />
              <h3 className="mt-3 font-display text-lg font-semibold">Keys and sandbox</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed">
                <li><code className="font-mono text-gray-900">fi_test_…</code> runs the same real check, free, up to a daily limit.</li>
                <li><code className="font-mono text-gray-900">fi_live_…</code> is charged. Keep keys on your server only.</li>
                <li>Make, rotate and revoke keys yourself in Settings, Developer and API. A key is shown once.</li>
              </ul>
            </div>
            <div id="charging" className="scroll-mt-24 rounded-2xl border border-gray-200 p-6">
              <Wallet size={20} className="text-[var(--brand-primary)]" />
              <h3 className="mt-3 font-display text-lg font-semibold">Charging</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed">
                <li>Per plot, in naira: a prepaid wallet or a monthly invoice. Prices are agreed for your volumes.</li>
                <li>Sending holds the cost; only plots really checked are charged and the rest comes back.</li>
                <li>Never charged: validation, refused plots, test keys, failed checks, retries with the same Idempotency-Key.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <H2 id="webhooks" kicker="Webhooks" text="Set a callback URL (https, public address). When a check finishes we POST the result, signed with your secret. If your server does not answer 2xx, we retry 5 more times over about 7 hours.">Get called when it is done</H2>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] items-start">
              <Code label="Verify FI-Signature (Python)" code={WEBHOOK} />
              <ul className="rounded-2xl border border-gray-200 p-5 space-y-3 text-sm">
                {[[Webhook, 'eudr.check.completed / .failed'], [MapIcon, 'suitability.check.completed / .failed'], [RefreshCw, 'Header FI-Event names the event']].map(([I, t]) => (
                  <li key={t} className="flex gap-2.5"><I size={16} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" /><code className="font-mono text-[12.5px] text-gray-800 break-all">{t}</code></li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-6">
            <H2 id="errors" kicker="Errors" text={'Every error has the same shape: {"error": {"code", "message", "details"}, "request_id"}. Handle the code, not the message.'}>Errors you can handle</H2>
            <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {ERRORS.map(([s, code, text]) => (
                <div key={code} className="grid gap-x-4 gap-y-1 px-4 sm:px-5 py-3 sm:grid-cols-[48px_220px_minmax(0,1fr)] items-baseline">
                  <span className="font-mono text-sm font-semibold text-gray-900">{s}</span>
                  <code className="font-mono text-[13px] text-gray-800">{code}</code>
                  <span className="text-sm text-gray-600">{text}</span>
                </div>
              ))}
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
