import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Code2, Leaf, Droplets, ShieldCheck, Smartphone } from 'lucide-react';
import { paths, sessionTenant } from '../../../routes/paths';
import { hasValidTeamToken } from '../../../services/session';
import HeroBackdrop from './HeroBackdrop';

// What the platform does, in three plain lines. No client data on a public page.
const POINTS = [
  { icon: Leaf, title: 'How your crops are doing', text: 'Which blocks are thriving and which could use a visit. It updates every time a new satellite image comes in.' },
  { icon: Droplets, title: 'Water and weather, made simple', text: 'Know when a field is thirsty or waterlogged, and what to do about it this week.' },
  { icon: ShieldCheck, title: 'Proof and planning', text: 'Show buyers no forest was cleared for your crop, and find the land where each crop will do best.' },
  { icon: Code2, title: 'Works with your software', text: 'Already have a system? Send your plots to our API and get the EUDR check and crop suitability back.' },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const tenant = sessionTenant();
  const home = tenant ? paths.orgHub(tenant) : hasValidTeamToken() ? paths.teamHub : null;
  return (
    <main className="flex-1 bg-white">
      <section className="relative">
        <HeroBackdrop />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-40 sm:pb-24 lg:grid lg:grid-cols-[1fr_320px] lg:gap-12 lg:items-end">
        <div>
        <p className="text-sm font-medium text-[var(--brand-primary)]">Powered by Earthintelytics</p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 mt-3 max-w-xl">
          <span className="block">Know your fields.</span>
          <span className="block">Even the far ones.</span>
          <span className="block text-[var(--brand-primary)]">Especially the far ones.</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mt-5 max-w-lg leading-relaxed">
          You can't walk every field every week. Satellites can. FarmIntelytics looks at your land from above
          and tells you, in plain words, how your crops are doing, where they need water, and what to check
          next, whether you farm two hectares or run a whole estate.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button type="button" id="hero-primary-sign-in" onClick={() => navigate(home || '/login')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-colors">
            Sign in<ArrowRight size={16} />
          </button>
          <button type="button" onClick={() => navigate('/docs')}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 hover:bg-gray-50 transition-colors">
            See how it works
          </button>
          {(
            <a href="/app" onClick={(e) => { e.preventDefault(); navigate('/app'); }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-[var(--brand-primary-dark)] border border-[#D8EBD3] bg-[#EEF6EC] hover:bg-[#E2F0DE] transition-colors">
              <Smartphone size={16} />Get the app
            </a>
          )}
        </div>
        </div>
        {/* An example of what a client sees, so the imagery reads as "answers", not decoration */}
        <div className="hidden lg:block mb-2 rounded-2xl bg-white/95 border border-gray-200 p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Reading</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-base font-semibold text-gray-900">Field 12</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-green-50 text-green-800 border border-green-200">Growing well</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">Looking healthy, about the same as last month. Nothing to do here this week.</p>
          <p className="text-xs text-gray-500">Latest image 7 Oct · 92% of the field clear</p>
        </div>
        </div>
        <a href="#more" aria-label="Scroll to see more"
          className="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 z-10 hidden sm:inline-flex rounded-xl border border-gray-200 bg-white px-3 py-1.5 flex-col items-center gap-0.5 text-xs font-medium text-gray-600 hover:text-gray-900">
          Scroll to see more<ChevronDown size={18} className="fi-scroll-cue" />
        </a>
      </section>

      <section id="more" className="border-t border-gray-100 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <span className="w-10 h-10 rounded-xl bg-green-50 text-[var(--brand-primary)] flex items-center justify-center"><Icon size={20} /></span>
              <h2 className="font-display text-lg font-semibold text-gray-900 mt-4">{title}</h2>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

    </main>
  );
};

export default HeroSection;
