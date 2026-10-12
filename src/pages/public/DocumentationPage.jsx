import { useSearchParams } from 'react-router-dom';
import { Compass, Sprout, Droplets, MapPinned, ShieldCheck, FileText, CloudSun, Plug } from 'lucide-react';
import PublicLayout from './PublicLayout';
import { TUTORIALS } from './guideTutorials';

/**
 * How FarmIntelytics works, in plain words. Every statement here must match what the platform
 * really does (see docs/DATA_RESEARCH.md for the data and its limits).
 */
const TOPICS = [
  {
    id: 'how-it-works', label: 'How it works', icon: Compass,
    body: [
      ['From your boundary to answers', 'Your estates or fields are set up once from their boundary files. For each service you use, FarmIntelytics looks for new satellite imagery of that area, measures each block, and turns the result into maps, numbers, alerts and advice.'],
      ['When results update', 'Runs happen on a schedule set for your organisation, or when the FarmIntelytics team starts one. Each page says when its results were last updated and the date of the image behind them.'],
      ['What you see', 'Maps of each measure with a legend in plain words, the blocks that need attention, trends over the season, alerts with what to do, a farm advisor you can ask questions, and reports to share.'],
    ],
  },
  {
    id: 'crop-health', label: 'Crop health and growth', icon: Sprout,
    body: [
      ['Greenness and vigour', 'Satellite imagery measures how green and dense the canopy is (indices such as NDVI and EVI). Each crop has its own scale, set from research for that crop, from "act now" to "healthy".'],
      ['Blocks that need a visit', 'Blocks well below the rest of the estate, or that dropped sharply since the last images, are raised as alerts with a suggested action.'],
      ['Trends', 'The season chart shows the farm average on each clear image date, so you can see whether the crop is improving or falling behind.'],
    ],
  },
  {
    id: 'irrigation', label: 'Water and flooding', icon: Droplets,
    body: [
      ['Water in the crop', 'Moisture indices (such as NDMI) show where plants are short of water or waterlogged. Rainfall and temperature records add the weather behind it.'],
      ['Flooding and paddies', 'Radar images show standing water even under cloud, which matters for rice and for flood-prone fields.'],
    ],
  },
  {
    id: 'suitability', label: 'Land suitability', icon: MapPinned,
    body: [
      ['Where each crop fits', 'Rainfall, temperature, terrain, soil and flooding are scored against each crop\'s needs. Land is classed from "well suited" to "not suited", with the factor that limits each field.'],
      ['Excluded land', 'Forest present in 2020 and protected areas are excluded, so new planting there is never suggested.'],
      ['Who uses it', 'Suitability analyses are run by the FarmIntelytics team for an organisation, which receives the result and the report.'],
    ],
  },
  {
    id: 'eudr', label: 'Deforestation checks (EUDR)', icon: ShieldCheck,
    body: [
      ['What is checked', 'Each parcel is compared with the 2020 forest baseline and with tree-cover loss and protected-area data, to show whether forest was cleared after the EU cut-off date.'],
      ['What it is not', 'The check reports what the data shows for each parcel. It supports your due diligence; it is not a legal certificate of compliance.'],
    ],
  },
  {
    id: 'reports', label: 'Reports and the farm advisor', icon: FileText,
    body: [
      ['Reports', 'Monthly, block, comparison and season reports, built from your own results, with the data used and its limits listed. They download as PDF to share.'],
      ['Farm advisor', 'Ask questions about your farm from a phone or computer. Answers use only your organisation\'s own results, alerts and records, say how recent they are, and say plainly when something is not known.'],
    ],
  },
  {
    id: 'data', label: 'Data, cloud and limits', icon: CloudSun,
    body: [
      ['Where the images come from', 'Sentinel-2 (every 5 days, 10-20 m), Landsat 8 and 9 (30 m) and Sentinel-1 radar (about every 6 days, sees through cloud), all open public missions.'],
      ['Cloud in the rainy season', 'From about March to October, clouds can hide a farm from optical satellites for weeks. FarmIntelytics keeps the most recent clear view of each part of the farm and shows its date, and uses radar for water and growth when optical images are blocked.'],
      ['Honest numbers', 'No value is ever made up. When there is no clear image yet, the page says so instead of showing a number.'],
    ],
  },
  {
    id: 'api', label: 'Connecting your systems', icon: Plug,
    body: [
      ['Data exports', 'Reports download as PDF, and block results and member records can be exported from the platform.'],
      ['Direct access', 'Organisations that want results in their own farm or ERP software can ask us for direct data access. Contact us with what you need and we will set it up with you.'],
    ],
  },
];

const ALL = [...TOPICS, ...TUTORIALS];

function NavGroup({ title, items, active, onPick }) {
  return (
    <div className="flex lg:flex-col gap-1 shrink-0">
      <p className="hidden lg:block px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 first:pt-0">{title}</p>
      {items.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => onPick(id)}
          className={`shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left ${active === id ? 'bg-green-50 text-green-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
          <Icon size={16} />{label}
        </button>
      ))}
    </div>
  );
}

export default function DocumentationPage() {
  const [params, setParams] = useSearchParams();
  const active = ALL.find((t) => t.id === params.get('topic')) || TOPICS[0];
  const pick = (id) => { setParams({ topic: id }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const idx = TUTORIALS.findIndex((t) => t.id === active.id);
  const next = idx >= 0 ? TUTORIALS[idx + 1] : null;
  return (
    <PublicLayout eyebrow="Guide" title="How FarmIntelytics works" wide
      intro="What each part of the platform does, where its numbers come from, and step-by-step tutorials for everyday tasks.">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Guide topics" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0">
          <NavGroup title="Learn" items={TOPICS} active={active.id} onPick={pick} />
          <NavGroup title="Tutorials" items={TUTORIALS} active={active.id} onPick={pick} />
        </nav>
        <article className="min-w-0">
          {active.steps ? (
            <>
              <p className="text-sm font-medium text-[var(--brand-primary)]">Tutorial · {active.time}</p>
              <h2 className="font-display text-2xl font-semibold mt-1">{active.label}</h2>
              <p className="mt-2 text-[15px] text-gray-600 leading-relaxed">{active.intro}</p>
              <ol className="mt-8 space-y-0">
                {active.steps.map(([title, text], i) => (
                  <li key={title} className="relative pl-12 pb-7 last:pb-0">
                    {i < active.steps.length - 1 && <span className="absolute left-[15px] top-9 bottom-0 w-px bg-gray-200" aria-hidden="true" />}
                    <span className="absolute left-0 top-0 w-8 h-8 rounded-full bg-green-50 border border-green-200 text-green-900 text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                    <h3 className="font-semibold text-gray-900 pt-1">{title}</h3>
                    <p className="mt-1.5 text-[15px] text-gray-700 leading-relaxed">{text}</p>
                  </li>
                ))}
              </ol>
              {active.tip && (
                <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Tip: </span>{active.tip}</p>
                </div>
              )}
              {next && (
                <button type="button" onClick={() => pick(next.id)}
                  className="mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50">
                  Next tutorial: {next.label} →
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold">{active.label}</h2>
              <div className="mt-6 space-y-6">
                {active.body.map(([title, text]) => (
                  <section key={title}>
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="mt-1.5 text-[15px] text-gray-700 leading-relaxed">{text}</p>
                  </section>
                ))}
              </div>
            </>
          )}
        </article>
      </div>
    </PublicLayout>
  );
}
