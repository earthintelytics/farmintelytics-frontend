import { useNavigate } from 'react-router-dom';
import { creditFor } from './photoCredits';
import { ArrowRight, Building2, Code2, Leaf, MessageSquareText, Satellite, Sprout, Trees, Users, Wheat } from 'lucide-react';

/**
 * The warm middle of the front page: the people it is for, how a reading flows from the field to their phone,
 * what it can do, and who uses it. Photos are real and credited (public/crops/CREDITS.md); no client data, no
 * invented figures, quotes or partner logos.
 */
const PEOPLE = [
  { src: '/crops/hero/field_logs.webp', alt: 'Two women farmers tending maize and vegetables on their smallholding in Kenya', label: 'Smallholders', className: 'sm:row-span-2' },
  { src: '/crops/hero/restoration.webp', alt: 'Two women in a tree nursery holding their phones among rows of seedlings in Tanzania', label: 'Co-operatives' },
  { src: '/crops/hero/advisor.webp', alt: 'A farmer kneeling among young plants in a shaded nursery', label: 'Field teams' },
];

const FLOW = [
  { icon: Sprout, title: 'Add your fields', text: 'Draw them on the map or upload a file. You only do this once.' },
  { icon: Satellite, title: 'Satellites keep watch', text: 'Every few days they take a fresh picture of each field, even when it is cloudy.' },
  { icon: Leaf, title: 'We do the reading', text: 'We look at growth, water, weather and land change for you, field by field.' },
  { icon: MessageSquareText, title: 'You get the news', text: 'A short note on your phone: what looks good, and what to check this week.' },
];

const SERVICES = [
  { img: '/crops/groundnut.webp', title: 'Crop health and growth', text: 'See at a glance which fields are doing well and which need you.' },
  { img: '/crops/sorghum.webp', title: 'Water and weather', text: 'Know when crops are thirsty or flooded, and what to do next.' },
  { img: '/crops/eudr.webp', title: 'EUDR deforestation check', text: 'Show European buyers, plot by plot, that no forest was cleared after 2020.' },
  { img: '/crops/millet.webp', title: 'Land suitability', text: 'Find out where a crop will thrive before you put a seed in the ground.' },
  { img: '/crops/field_logs.webp', title: 'Farmer groups', text: 'Keep every member, their plots and their visits together, for the whole co-operative.' },
  { img: '/crops/finance.webp', title: 'Evidence for buyers and lenders', text: 'Clear reports you can hand to a buyer or a bank with confidence.' },
];

const WHO = [
  { icon: Wheat, title: 'Estates and plantations', text: 'All your blocks on one map, and a heads-up before a small problem becomes a big one.' },
  { icon: Users, title: 'Co-operatives and groups', text: 'Thousands of small farms in one clear picture, with every member on their own phone.' },
  { icon: Building2, title: 'Buyers and exporters', text: 'EUDR evidence for every plot your suppliers farm, ready to send to the EU.' },
  { icon: Trees, title: 'Carbon and restoration', text: 'Watch the trees you planted take hold, with satellite evidence to show for it.' },
];

const LandingStory = () => {
  const navigate = useNavigate();
  return (
    <>
      {/* The people it is for */}
      <section className="bg-[#FBF8F1] border-y border-[#F0E9DA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center">
          <div>
            <p className="text-sm font-medium text-[var(--brand-primary)]">For the people who grow our food</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-3">
              Spend your time where your farm needs you.
            </h2>
            <p className="text-gray-600 mt-5 leading-relaxed max-w-lg">
              Every farmer knows the feeling: you find the problem a week too late. A corner drying out, a block that
              stopped growing, a buyer asking for proof you don't have to hand. FarmIntelytics helps you see these
              things early, from your phone, so you can go straight to the field that needs you.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate('/contact')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-colors">
                Get started<ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => navigate('/docs')}
                className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
                See how it works
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:grid-rows-2 sm:h-[440px]">
            {PEOPLE.map((p) => (
              <figure key={p.src} className={`relative overflow-hidden rounded-3xl ${p.className || ''} h-56 sm:h-auto`}>
                <img src={p.src} alt={p.alt} data-credit={creditFor(p.src)} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                <figcaption className="absolute left-3 bottom-3 rounded-lg bg-white/95 px-3 py-1 text-xs font-semibold text-gray-800">{p.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* How a reading flows from the field to the phone */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="text-sm font-medium text-[var(--brand-primary)] text-center">How it works</p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-3 text-center">From the sky to your pocket, every week</h2>
          <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <span aria-hidden="true" className="fi-flow-line hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5" />
            {FLOW.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative text-center">
                <span className="relative mx-auto w-14 h-14 rounded-2xl bg-[#EEF6EC] border border-[#D8EBD3] text-[var(--brand-primary)] flex items-center justify-center">
                  <Icon size={24} />
                </span>
                <p className="mt-5 text-xs font-semibold text-[#9A6A00]">Step {i + 1}</p>
                <h3 className="font-display text-lg font-semibold text-gray-900 mt-1">{title}</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed max-w-[15rem] mx-auto">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What it can do */}
      <section className="bg-[#F5FAF3] border-y border-[#E3EFDF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[var(--brand-primary)]">One platform</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-3">Listen to what your land is telling you</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <article key={s.title} className="group rounded-3xl bg-white border border-[#E3EFDF] overflow-hidden">
                <div className="h-40 overflow-hidden"><img src={s.img} alt="" data-credit={creditFor(s.img)} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" /></div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold text-gray-900">{s.title}</h3>
                  <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{s.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Who uses it */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <p className="text-sm font-medium text-[var(--brand-primary)]">Who it is for</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 mt-3">From smallholder to estate</h2>
            <p className="text-gray-600 mt-5 leading-relaxed">Tell us what you grow and where. We set FarmIntelytics up for your crops and your land, with only the services you need.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {WHO.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-gray-200 p-5">
                <span className="w-10 h-10 rounded-xl bg-[#FFF5DD] text-[#9A6A00] flex items-center justify-center"><Icon size={19} /></span>
                <h3 className="font-display text-base font-semibold text-gray-900 mt-4">{title}</h3>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For developers */}
      <section className="border-t border-gray-100 bg-[#FBF8F1]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl flex gap-4">
            <span className="shrink-0 w-11 h-11 rounded-xl bg-white border border-[#F0E9DA] text-[var(--brand-primary)] flex items-center justify-center"><Code2 size={20} /></span>
            <div>
              <h2 className="font-display text-2xl font-semibold text-gray-900">Already have your own system?</h2>
              <p className="text-gray-600 mt-2 leading-relaxed">Plug FarmIntelytics into it. Our API runs the EUDR deforestation check and crop suitability for each plot you send, and you pay per plot, in naira.</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/developers')}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
            For developers<ArrowRight size={16} />
          </button>
        </div>
      </section>

    </>
  );
};

export default LandingStory;
