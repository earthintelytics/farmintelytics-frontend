import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import PublicLayout from './PublicLayout';

/**
 * /developers: the FarmIntelytics API, starting with the EUDR check. What it does, how it works in four calls,
 * how it is charged, and where the full reference is. Prices are not on this page: they are agreed per account.
 */
const STEPS = [
  { call: 'POST /eudr/validate', text: 'Check your plots by the EU information system\'s own geolocation rules. Free, instant, plot by plot.' },
  { call: 'POST /eudr/checks', text: 'Send the plots for the deforestation check. Points or polygons, with the producer and country.' },
  { call: 'GET /eudr/checks/{id}', text: 'Read each plot\'s result: pass, review or fail, with forest in 2020, loss after the cut-off and its year, and protected areas.' },
  { call: 'GET /eudr/checks/{id}/geojson', text: 'Download the plots as the GeoJSON file the EU information system takes.' },
];

const FACTS = [
  ['The EUDR cut-off', 'Plots are checked for forest cleared after 31 December 2020, using JRC Global Forest Cover 2020 (made for the EUDR), Hansen/UMD Global Forest Change by year, and protected areas. Every result names the map versions used.'],
  ['Charged per plot', 'In naira, from a prepaid wallet or on a monthly invoice. Only plots really checked are charged: plots the EU rules refuse, test keys and failed checks cost nothing.'],
  ['Safe to retry', 'Send an Idempotency-Key and a repeated request returns the same check, never a second charge.'],
  ['Test keys', 'Test keys run the same real check, free, up to a daily number of plots, so you can build your integration first.'],
  ['Callbacks', 'We can call your server when a check finishes, signed so you can prove it came from us.'],
  ['Your keys, your account', 'Make, rotate and revoke keys, and see your balance, usage and statement, in your FarmIntelytics settings.'],
];

export default function DevelopersPage() {
  const navigate = useNavigate();
  return (
    <PublicLayout eyebrow="Developers" title="The FarmIntelytics API" wide
      intro="FarmIntelytics checks from your own software. First product: the EUDR deforestation check, plot by plot.">
      <div className="space-y-12">
        <section>
          <h2 className="font-display text-xl font-semibold text-gray-900">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.call} className="rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-500">Step {i + 1}</p>
                <code className="mt-1 block font-mono text-sm text-[var(--brand-primary)] break-words">{s.call}</code>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {FACTS.map(([title, text]) => (
            <div key={title}>
              <h3 className="font-display text-base font-semibold text-gray-900">{title}</h3>
              <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-gray-900">Get access</h2>
            <p className="mt-1 text-sm text-gray-600">Tell us about your volumes and systems; we set up your account and your first test key.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/public-api/v1/docs" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 bg-white hover:bg-gray-50">
              <BookOpen size={16} />API reference
            </a>
            <button type="button" onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
              Talk to us<ArrowRight size={16} />
            </button>
          </div>
        </section>

        <p className="text-xs text-gray-500">A check from maps, not a due diligence statement or a legal opinion: confirm plots marked for review or failed on the ground.</p>
      </div>
    </PublicLayout>
  );
}
