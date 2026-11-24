import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Code2, Leaf, Droplets, ShieldCheck, Smartphone } from 'lucide-react';
import { paths, sessionTenant } from '../../../routes/paths';
import { hasValidTeamToken } from '../../../services/session';
import HeroBackdrop from './HeroBackdrop';

// What the platform does, in three plain lines. No client data on a public page.
const POINTS = [
  { icon: Leaf, title: 'Crop health from satellite', text: 'See which blocks are growing well and which need a visit, updated with every new image.' },
  { icon: Droplets, title: 'Water and weather advice', text: 'Know where fields are short of water or flooded, with what to do this week.' },
  { icon: ShieldCheck, title: 'EUDR and land suitability', text: 'Check deforestation risk for every parcel and where each crop fits best.' },
  { icon: Code2, title: 'An API for your own systems', text: 'Send plots from your own software: the EUDR check and crop suitability, plot by plot.' },
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
          <span className="block">Monitor every field.</span>
          <span className="block">Stay informed.</span>
          <span className="block text-[var(--brand-primary)]">Stay in control.</span>
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mt-5 max-w-lg leading-relaxed">
          FarmIntelytics turns satellite imagery into plain answers for farms, estates and co-operatives:
          crop health and growth, water and irrigation advice, EUDR deforestation checks and land suitability,
          in one easy platform.
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Example reading</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-base font-semibold text-gray-900">Field 12</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-green-50 text-green-800 border border-green-200">Growing well</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">Crop vigour is steady against last month. No action needed this week.</p>
          <p className="text-xs text-gray-500">Latest image 7 Oct · 92% of the field clear</p>
        </div>
        </div>
        <a href="#more" aria-label="Scroll to see more"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden sm:inline-flex flex-col items-center gap-0.5 text-xs font-medium text-gray-600 hover:text-gray-900">
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
