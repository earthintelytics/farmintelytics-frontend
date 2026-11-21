import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, LayoutDashboard, CheckSquare, Map, TrendingUp,
  SearchCheck, Banknote, Users, ShieldAlert, LogOut, Smartphone,
} from 'lucide-react';
import { ffbAdminOverview, ffbCall } from './api/ffbApi';
import FfbDashboard from './views/FfbDashboard';
import FfbApprovals from './views/FfbApprovals';
import FfbMapGeoIntel from './views/FfbMapGeoIntel';
import FfbAnalytics from './views/FfbAnalytics';
import FfbClerkLookup from './views/FfbClerkLookup';
import FfbSettlement from './views/FfbSettlement';
import FfbWorkforce from './views/FfbWorkforce';
import FfbAlertsAndGuide from './views/FfbAlertsAndGuide';
import FfbAppConnection from './views/FfbAppConnection';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'approvals', label: 'Approval Center', icon: CheckSquare },
  { id: 'map', label: 'Geospatial Intel', icon: Map },
  { id: 'analytics', label: 'Yield & Analytics', icon: TrendingUp },
  { id: 'clerk-lookup', label: 'Clerk Lookup', icon: SearchCheck },
  { id: 'settlement', label: 'Settlement & Rates', icon: Banknote },
  { id: 'workforce', label: 'Workforce & QR', icon: Users },
  { id: 'mobile-app', label: 'Field App & QR', icon: Smartphone },
  { id: 'alerts', label: 'Alerts & Rules', icon: ShieldAlert },
];

export default function FfbWorkspace({ onBack, onSignOut }) {
  const { tenant: urlTenant } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const [orgs, setOrgs] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(urlTenant || localStorage.getItem('fi_tenant') || '');
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!urlTenant && !localStorage.getItem('fi_token')) {
      ffbAdminOverview().then((res) => {
        const list = res.items || [];
        setOrgs(list);
        if (!selectedTenant && list[0]) setSelectedTenant(list[0].company_id);
      });
    }
  }, [urlTenant, selectedTenant]);

  useEffect(() => {
    if (!selectedTenant && !localStorage.getItem('fi_token')) return;
    ffbCall('/settings', { tenantSlug: selectedTenant })
      .then(setMeta)
      .catch(() => {});
  }, [selectedTenant]);

  const setTab = (id) => setSearchParams({ tab: id });
  const orgName = meta?.display_name || localStorage.getItem('fi_display_name') || selectedTenant || 'Enterprise';

  return (
    <div className="min-h-screen flex bg-[var(--bg-main)] text-[var(--text-main)] font-sans">
      <aside className="w-64 shrink-0 border-r border-[var(--border-light)] bg-white flex flex-col">
        <div className="p-5 border-b border-[var(--border-light)] space-y-3">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button onClick={onBack} aria-label="Back" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="flex items-center gap-2.5 min-w-0">
              {meta?.logo_url ? (
                <img src={meta.logo_url} alt="" className="w-8 h-8 rounded-lg object-contain border border-gray-200 p-0.5" />
              ) : (
                <span className="w-8 h-8 rounded-lg bg-[#034321] text-white font-display font-bold text-xs flex items-center justify-center shrink-0">FFB</span>
              )}
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold truncate">{orgName}</p>
                <p className="text-[11px] text-[var(--brand-primary)] font-medium">Earthintelytics FFB</p>
              </div>
            </div>
          </div>

          {orgs.length > 0 && (
            <select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)]">
              {orgs.map((o) => <option key={o.company_id} value={o.company_id}>{o.display_name}</option>)}
            </select>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button key={id} onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive ? 'bg-[#034321] text-white' : 'text-gray-700 hover:bg-[var(--bg-subtle)]'
                }`}>
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {onSignOut && (
          <div className="p-3 border-t border-[var(--border-light)]">
            <button onClick={onSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 min-w-0 p-6 lg:p-8 bg-[var(--bg-subtle)]/40">
        {!selectedTenant && !localStorage.getItem('fi_token') ? (
          <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-2xl border border-[var(--border-light)] text-center space-y-2">
            <h2 className="font-display text-xl font-semibold">No FFB-licensed organisation selected</h2>
            <p className="text-sm text-[var(--text-muted)]">Enable <strong>FFB</strong> on an organisation under Admin → Organisations → Licence first.</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <FfbDashboard tenantSlug={selectedTenant} />}
            {activeTab === 'approvals' && <FfbApprovals tenantSlug={selectedTenant} />}
            {activeTab === 'map' && <FfbMapGeoIntel tenantSlug={selectedTenant} />}
            {activeTab === 'analytics' && <FfbAnalytics tenantSlug={selectedTenant} />}
            {activeTab === 'clerk-lookup' && <FfbClerkLookup tenantSlug={selectedTenant} />}
            {activeTab === 'settlement' && <FfbSettlement tenantSlug={selectedTenant} />}
            {activeTab === 'workforce' && <FfbWorkforce tenantSlug={selectedTenant} />}
            {activeTab === 'mobile-app' && <FfbAppConnection tenantSlug={selectedTenant} />}
            {activeTab === 'alerts' && <FfbAlertsAndGuide tenantSlug={selectedTenant} />}
          </>
        )}
      </main>
    </div>
  );
}
