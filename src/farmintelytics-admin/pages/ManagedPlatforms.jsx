import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Database, Building2, RefreshCw, Cpu } from 'lucide-react';
import { useLoader } from '../../components/page/useLoader';
import { fetchOrganizations } from '../../services/adminApi';

/**
 * Managed platforms: the platforms Earthintelytics builds and runs for an organisation, on the same engine. For each:
 * where it lives, which organisations have it (the service in Licence), its datasets with their last update (from the
 * platform's STAC catalogue), and how each dataset is refreshed. Prototype: refreshing from here, as a pipeline run,
 * comes with the full platform; today the scripts are run by the team.
 */
const PLATFORMS = [
  {
    id: 'platform-gwon', name: 'GreenWall Observatory Nigeria (GWON)', client: 'National Agency for the Great Green Wall', url: '/platforms/gwon', stac: '/gwon-data/stac/catalog.json', status: 'Prototype',
    scripts: {
      'climate-series': 'scripts/gwon_climate_series.py', 'drought-indices': 'scripts/gwon_drought_indices.py', 'climate-projections': 'scripts/gwon_projections.py',
      'land-use': 'scripts/gwon_landcover_series.py', 'cropland-kinds': 'scripts/gwon_cropland_series.py', people: 'scripts/gwon_socioeconomic.py',
      'people-by-lga-ward': 'scripts/gwon_people_drilldown.py', 'admin-boundaries': 'scratch boundaries script (OCHA, GRID3)', 'frontline-states': 'geoBoundaries (fixed)',
    },
    cadence: { 'climate-series': 'Weekly', 'drought-indices': 'Monthly', 'climate-projections': 'Yearly', 'land-use': 'When ESA publishes a year', 'cropland-kinds': 'When ESA publishes a year', people: 'Yearly', 'people-by-lga-ward': 'Yearly', 'admin-boundaries': 'When boundaries change', 'frontline-states': 'Fixed' },
  },
];

const age = (iso, now) => { if (!iso) return null; const d = Math.floor((now - new Date(iso).getTime()) / 86400000); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`; };

function Datasets({ stac, scripts, cadence }) {
  const [cols, setCols] = useState(null);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    fetch(stac).then((r) => r.json()).then((cat) => Promise.all(cat.links.filter((l) => l.rel === 'child').map((l) => fetch(stac.replace('catalog.json', l.href.replace('./', ''))).then((r) => r.json()).catch(() => null))))
      .then((x) => setCols((x || []).filter(Boolean))).catch(() => setCols([]));
  }, [stac]);
  if (!cols) return <p className="text-sm text-gray-500">Reading the catalogue…</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-[#F5FAF3] text-left text-xs text-gray-600"><tr><th className="px-3 py-2">Dataset</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Updated</th><th className="px-3 py-2">Refresh</th><th className="px-3 py-2">How</th></tr></thead>
        <tbody className="divide-y divide-gray-100">
          {cols.map((c) => {
            const up = c.assets?.data?.updated;
            const stale = up && (now - new Date(up).getTime()) / 86400000 > 35 && /Weekly|Monthly/.test(cadence[c.id] || '');
            return (
              <tr key={c.id}>
                <td className="px-3 py-2 font-medium text-gray-900">{c.title}</td>
                <td className="px-3 py-2 text-gray-600">{c.providers?.[0]?.name}</td>
                <td className={`px-3 py-2 ${stale ? 'text-amber-700 font-semibold' : 'text-gray-700'}`}>{up ? `${up.slice(0, 10)} (${age(up)})` : '—'}</td>
                <td className="px-3 py-2 text-gray-700">{cadence[c.id] || '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{scripts[c.id] || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ManagedPlatforms() {
  const load = useCallback(() => fetchOrganizations(), []);
  const orgs = useLoader(load);
  const list = Array.isArray(orgs.data) ? orgs.data : orgs.data?.organizations || orgs.data?.data || [];
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--brand-primary)]">Managed platforms</p>
        <h1 className="font-display text-3xl font-semibold text-gray-900 mt-1">Platforms we build and run</h1>
        <p className="text-gray-600 mt-2 max-w-3xl">Each managed platform runs on the FarmIntelytics engine with its own name, pages and data. Give an organisation the platform’s service in its Licence to let its staff sign in.</p>
      </div>
      {PLATFORMS.map((p) => {
        const holders = list.filter((o) => (o.allowed_modules || []).includes(p.id));
        return (
          <section key={p.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-[#0E2D41] to-[#007248] text-white px-6 py-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="/gwon-data/naggw-seal.png" alt="" className="w-12 h-12 rounded-full bg-white p-0.5" />
                <div><p className="font-display text-xl font-semibold">{p.name}</p><p className="text-sm text-white/80">For {p.client} · {p.status}</p></div>
              </div>
              <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#0E2D41] text-sm font-semibold">Open the platform <ExternalLink size={14} /></a>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#D8EBD3] bg-[#F5FAF3] p-4"><p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><Building2 size={14} /> Organisations with it</p>
                  <p className="font-display text-2xl font-semibold text-gray-900 mt-1">{orgs.state === 'loading' ? '…' : holders.length}</p>
                  <p className="text-xs text-gray-600 mt-1">{holders.map((o) => o.display_name || o.schema_name).join(', ') || 'None yet: switch the service on in an organisation’s Licence.'}</p></div>
                <div className="rounded-xl border border-[#F0E9DA] bg-[#FBF8F1] p-4"><p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><Database size={14} /> Data catalogue</p>
                  <a href={p.stac} target="_blank" rel="noreferrer" className="block font-semibold text-[var(--brand-primary)] mt-2">STAC catalogue →</a>
                  <p className="text-xs text-gray-600 mt-1">Public, free to download; listed on the platform’s Data and API page.</p></div>
                <div className="rounded-xl border border-[#E3E7F5] bg-[#F4F6FC] p-4"><p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><Cpu size={14} /> Integrations it uses</p>
                  <p className="text-sm text-gray-700 mt-2">AI settings (Assistant), NASA FIRMS (fire points), Earth Engine (forestry layers).</p></div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><RefreshCw size={15} /> Datasets and their refresh</p>
                <Datasets stac={p.stac} scripts={p.scripts} cadence={p.cadence} />
                <p className="text-xs text-gray-500">Amber: older than its refresh cycle. In this prototype the team runs the scripts and redeploys; in the full platform each refresh is a scheduled pipeline run, shown under Pipeline runs.</p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
