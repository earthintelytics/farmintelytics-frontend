import { useNavigate } from 'react-router-dom';
import { ArrowRight, Leaf, Droplets, ShieldCheck } from 'lucide-react';
import HeroBackdrop from './HeroBackdrop';

// What the platform does, in three plain lines. No client data on a public page.
const POINTS = [
  { icon: Leaf, title: 'Crop health from satellite', text: 'See which blocks are growing well and which need a visit, updated with every new image.' },
  { icon: Droplets, title: 'Water and weather advice', text: 'Know where fields are short of water or flooded, with what to do this week.' },
  { icon: ShieldCheck, title: 'EUDR and land suitability', text: 'Check deforestation risk for every parcel and where each crop fits best.' },
];

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <main className="flex-1 bg-white">
      <section className="relative">
        <HeroBackdrop />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-40 sm:pb-24 lg:grid lg:grid-cols-[1fr_320px] lg:gap-12 lg:items-end">
        <div>
        <p className="text-sm font-medium text-[var(--brand-primary)]">Powered by Earthintelytics</p>
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-gray-900 mt-3 max-w-3xl">
          Know what is happening on every field, without walking it.
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mt-5 max-w-2xl leading-relaxed">
          FarmIntelytics turns satellite imagery into plain answers for farms, estates and co-operatives:
          crop health and growth, water and irrigation advice, EUDR deforestation checks and land suitability,
          in one easy platform.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button type="button" id="hero-primary-sign-in" onClick={() => navigate('/login')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-colors">
            Sign in<ArrowRight size={16} />
          </button>
          <button type="button" onClick={() => navigate('/docs')}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 hover:bg-gray-50 transition-colors">
            See how it works
          </button>
        </div>
        </div>
        {/* An example of what a client sees, so the imagery reads as "answers", not decoration */}
        <div className="hidden lg:block mb-2 rounded-2xl bg-white/95 border border-gray-200 p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Example reading</p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-base font-semibold text-gray-900">Field 12</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-800 border border-green-200">Growing well</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">Crop vigour is steady against last month. No action needed this week.</p>
          <p className="text-xs text-gray-500">Latest image 7 Oct · 92% of the field clear</p>
        </div>
        </div>
      </section>

      <section className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid gap-8 sm:grid-cols-3">
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
