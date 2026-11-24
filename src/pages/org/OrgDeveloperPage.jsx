import { ArrowUpRight, BookOpen, Code2, Coins, KeyRound, Terminal, Webhook } from 'lucide-react';
import DeveloperCard from './settings/DeveloperCard';

/**
 * /org/<tenant>/developer: the organisation's FarmIntelytics API, as one of its services ("Developer" in the top bar
 * and a tile on the services page, for organisations with an API service in their licence). First what it is and how
 * it is charged, with the reference; then the account itself: wallet, keys, callback, usage and statement.
 */
const START = [
  { icon: KeyRound, title: 'Make a test key', text: 'Free: 10 test requests, each up to 1 ha. Build and test your integration with it.' },
  { icon: Code2, title: 'Send your plots', text: 'Each plot as its boundary (a polygon), from your own system. Each check answers with an id at once.' },
  { icon: Webhook, title: 'Get the results', text: 'Ask for the check, or set a callback and we call you when it finishes.' },
  { icon: Coins, title: 'Pay per hectare', text: 'From your prepaid wallet: the total area of your plots × the price per hectare.' },
];

export default function OrgDeveloperPage({ profile }) {
  const isAdmin = profile.role === 'admin';
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[#E3EFDF] bg-[#F5FAF3] p-6 sm:p-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
        <div>
          <p className="text-sm font-semibold text-[var(--brand-primary-dark)]">Developer</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">The FarmIntelytics API for {profile.name}</h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed max-w-2xl">
            Use FarmIntelytics checks from your own software: send plots, get back, plot by plot, whether forest was
            cleared after the EUDR cut-off, with the evidence and a file ready for the EU information system.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/public-api/v1/redoc" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
              <BookOpen size={16} />API reference<ArrowUpRight size={15} />
            </a>
            <a href="/public-api/v1/docs" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 bg-white hover:bg-gray-50">
              <Terminal size={16} />Try it in Swagger<ArrowUpRight size={15} />
            </a>
            <a href="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 bg-white hover:bg-gray-50">
              <Coins size={16} />How pricing works
            </a>
          </div>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {START.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-xl border border-[#E3EFDF] bg-white p-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-[#EEF6EC] text-[var(--brand-primary)] flex items-center justify-center"><Icon size={16} /></span>
                <p className="text-xs font-semibold text-gray-500">Step {i + 1}</p>
              </div>
              <p className="mt-2 font-semibold text-gray-900">{title}</p>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <DeveloperCard isAdmin={isAdmin} />
    </div>
  );
}
