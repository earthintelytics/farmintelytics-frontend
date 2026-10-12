import { useSearchParams } from 'react-router-dom';
import { Compass, Sprout, Droplets, MapPinned, ShieldCheck, FileText, CloudSun, Plug } from 'lucide-react';
import PublicLayout from './PublicLayout';

/**
 * How FarmIntelytics works, in plain words. Every statement here must match what the platform
 * really does (see docs/DATA_RESEARCH.md for the data and its limits).
 */
const TOPICS = [
  {
    id: 'how-it-works', label: 'How it works', icon: Compass,
    body: [
      ['From your boundary to answers', 'Your estates or fields are set up once from their boundary files. For each service you use, FarmIntelytics looks for new satellite pictures of that area, measures each block, and turns the result into maps, numbers, alerts and advice.'],
      ['When results update', 'Runs happen on a schedule set for your organisation, or when the FarmIntelytics team starts one. Each page says when its results were last updated and the date of the picture behind them.'],
      ['What you see', 'Maps of each measure with a legend in plain words, the blocks that need attention, trends over the season, alerts with what to do, a farm advisor you can ask questions, and reports to share.'],
    ],
  },
  {
    id: 'crop-health', label: 'Crop health and growth', icon: Sprout,
    body: [
      ['Greenness and vigour', 'Satellite pictures measure how green and dense the canopy is (indices such as NDVI and EVI). Each crop has its own scale, set from research for that crop, from "act now" to "healthy".'],
      ['Blocks that need a visit', 'Blocks well below the rest of the estate, or that dropped sharply since the last pictures, are raised as alerts with a suggested action.'],
      ['Trends', 'The season chart shows the farm average on each clear picture date, so you can see whether the crop is improving or falling behind.'],
    ],
  },
  {
    id: 'irrigation', label: 'Water and flooding', icon: Droplets,
    body: [
      ['Water in the crop', 'Moisture indices (such as NDMI) show where plants are short of water or waterlogged. Rainfall and temperature records add the weather behind it.'],
      ['Flooding and paddies', 'Radar pictures show standing water even under cloud, which matters for rice and for flood-prone fields.'],
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
      ['Where the pictures come from', 'Sentinel-2 (every 5 days, 10-20 m), Landsat 8 and 9 (30 m) and Sentinel-1 radar (about every 6 days, sees through cloud), all open public missions.'],
      ['Cloud in the rainy season', 'From about March to October, clouds can hide a farm from optical satellites for weeks. FarmIntelytics keeps the most recent clear view of each part of the farm and shows its date, and uses radar for water and growth when optical pictures are blocked.'],
      ['Honest numbers', 'No value is ever made up. When there is no clear picture yet, the page says so instead of showing a number.'],
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

export default function DocumentationPage() {
  const [params, setParams] = useSearchParams();
  const active = TOPICS.find((t) => t.id === params.get('topic')) || TOPICS[0];
  return (
    <PublicLayout eyebrow="Guide" title="How FarmIntelytics works" wide
      intro="What each part of the platform does, where its numbers come from and what to expect from satellite data in Nigeria.">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Guide topics" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-2 lg:pb-0">
          {TOPICS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setParams({ topic: id })}
              className={`shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left ${active.id === id ? 'bg-green-50 text-green-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon size={16} />{label}
            </button>
          ))}
        </nav>
        <article className="min-w-0">
          <h2 className="font-display text-2xl font-semibold">{active.label}</h2>
          <div className="mt-6 space-y-6">
            {active.body.map(([title, text]) => (
              <section key={title}>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-[15px] text-gray-700 leading-relaxed">{text}</p>
              </section>
            ))}
          </div>
        </article>
      </div>
    </PublicLayout>
  );
}
