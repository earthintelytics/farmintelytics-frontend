import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code2 } from 'lucide-react';
import { Empty } from '../../farmintelytics-admin/components/ui';
import { paths } from '../../routes/paths';
import { licensedServices, SERVICE_TABS } from './orgProfile';
import { fetchCropMonitoringConfig } from '../../services/organizationMonitorApi';

/** /org/<tenant>: the services this organisation was given at onboarding. */
const OrgServicesPage = ({ profile }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const services = licensedServices(profile);
  const first = (profile.fullName || '').split(' ')[0];
  // Developer (the API) is one of the services: it counts like the others and has its own API tab.
  const hasApi = (profile.modules || []).some((m) => String(m).endsWith('-api'));
  const total = services.length + (hasApi ? 1 : 0);
  const tabs = [...SERVICE_TABS, { id: 'api', label: 'API' }]
    .map((t) => ({ ...t, count: t.id === 'all' ? total : t.id === 'api' ? (hasApi ? 1 : 0) : services.filter((s) => s.group === t.id).length }))
    .filter((t) => t.id === 'all' || t.count > 0);
  const shown = tab === 'all' ? services : tab === 'api' ? [] : services.filter((s) => s.group === tab);
  // Licensed crops with no estate blocks yet are marked, so nobody opens an empty dashboard expecting data.
  const [withBlocks, setWithBlocks] = useState(null);
  useEffect(() => {
    let live = true;
    fetchCropMonitoringConfig().then((c) => { if (live && Array.isArray(c?.services_with_blocks)) setWithBlocks(new Set(c.services_with_blocks)); }).catch(() => {});
    return () => { live = false; };
  }, []);
  const noBlocks = (s) => s.group === 'crops' && withBlocks && !withBlocks.has(s.id);

  const open = (id) => {
    const s = services.find((x) => x.id === id);
    if (s?.href) { navigate(s.href); return; }       // a managed platform opens at its own address
    navigate(paths.service(id, profile.tenant));
  };

  return (
    <>
      {/* A light welcome band: who you are, what you have, today's date. */}
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-green-800">{profile.name}</p>
          <h1 className="font-display text-3xl font-semibold text-gray-900 tracking-tight mt-1">{first ? `Welcome, ${first}` : 'Your services'}</h1>
          <p className="text-sm text-gray-500 mt-2">Open a service to see your farms, results and reports.</p>
        </div>
        <dl className="flex gap-3">
          {[['Services', total], ['Crops', (profile.crops || []).length], ['Today', new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })]].map(([k, v]) => (
            <div key={k} className="min-w-[88px] rounded-xl bg-white border border-gray-200 px-4 py-3">
              <dt className="text-xs text-gray-500">{k}</dt>
              <dd className="font-display text-xl font-semibold text-gray-900 mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {tabs.length > 1 && (
        <div role="tablist" className="flex flex-wrap gap-x-1 border-b border-gray-200">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 -mb-px border-b-2 text-sm font-semibold ${tab === t.id ? 'border-[var(--brand-primary)] text-[var(--brand-primary-dark)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.label} <span className="font-normal text-gray-400">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {total === 0 ? (
        <Empty>No services are set up for {profile.name} yet. FarmIntelytics adds them during onboarding; contact your FarmIntelytics team.</Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shown.map((s) => (
            <button key={s.id} type="button" onClick={() => open(s.id)}
              className="group w-full text-left flex flex-col items-stretch bg-white border border-gray-200 hover:border-gray-400 rounded-2xl overflow-hidden">
              <div className="w-full h-40 bg-gray-100 overflow-hidden">
                {s.photo && <img src={s.photo} alt="" loading="lazy" className="block w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />}
              </div>
              <div className="flex-1 flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-gray-900">{s.title}</h3>
                  {noBlocks(s) && <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">No blocks yet</span>}
                </div>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed flex-1">{noBlocks(s) ? 'Licensed, but no estate has blocks for this crop yet. Results appear once its boundaries are uploaded.' : s.text}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  Open <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          ))}
          {hasApi && (tab === 'all' || tab === 'api') && (
            <button type="button" onClick={() => navigate(paths.orgDeveloper(profile.tenant))}
              className="group w-full text-left flex flex-col items-stretch bg-white border border-gray-200 hover:border-gray-400 rounded-2xl overflow-hidden">
              <div className="w-full h-40 bg-[#F5FAF3] border-b border-[#E3EFDF] flex items-center justify-center">
                <span className="w-16 h-16 rounded-2xl bg-white border border-[#E3EFDF] text-[var(--brand-primary)] flex items-center justify-center"><Code2 size={30} /></span>
              </div>
              <div className="flex-1 flex flex-col p-5">
                <h3 className="font-display text-base font-semibold text-gray-900">Developer and API</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed flex-1">Use FarmIntelytics checks from your own software: your keys, wallet, usage and the API reference.</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                  Open <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default OrgServicesPage;
