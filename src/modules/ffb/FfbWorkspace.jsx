import { lazy, Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams as useOuterSearchParams } from 'react-router-dom';
import './styles/ffb-portal.css';
import { ffbAdminOverview, ffbCall } from './api/ffbApi';
import { AppProvider } from './context/AppContext';
import { PortalRouter, Navigate, Route, Routes, useLocation } from './utils/portalRouter';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { PageLoader } from './components/PageLoader';
import { WelcomeTour } from './components/WelcomeTour';
import { getRole, isManager } from './utils/access';
import { scrollPageTop } from './utils/scroll';

const DashboardView = lazy(() => import('./pages/DashboardView').then((m) => ({ default: m.DashboardView })));
const GeoIntelView = lazy(() => import('./pages/GeoIntelView').then((m) => ({ default: m.GeoIntelView })));
const ApprovalView = lazy(() => import('./pages/ApprovalView').then((m) => ({ default: m.ApprovalView })));
const ApprovedWorkersView = lazy(() => import('./pages/ApprovedWorkersView').then((m) => ({ default: m.ApprovedWorkersView })));
const SettlementView = lazy(() => import('./pages/SettlementView').then((m) => ({ default: m.SettlementView })));
const FaqView = lazy(() => import('./pages/FaqView').then((m) => ({ default: m.FaqView })));
const HelpView = lazy(() => import('./pages/HelpView').then((m) => ({ default: m.HelpView })));
const WorkerView = lazy(() => import('./pages/WorkerView').then((m) => ({ default: m.WorkerView })));
const PlotView = lazy(() => import('./pages/PlotView').then((m) => ({ default: m.PlotView })));
const YieldView = lazy(() => import('./pages/YieldView').then((m) => ({ default: m.YieldView })));
const AIQualityView = lazy(() => import('./pages/AuditQualityView').then((m) => ({ default: m.AIQualityView })));
const EfficiencyView = lazy(() => import('./pages/EfficiencyView').then((m) => ({ default: m.EfficiencyView })));
const MethodologyView = lazy(() => import('./pages/MethodologyView'));
const AdminView = lazy(() => import('./pages/AdminView').then((m) => ({ default: m.AdminView })));
const ClerkLookup = lazy(() => import('./pages/ClerkLookup').then((m) => ({ default: m.ClerkLookup })));
const FfbAppConnection = lazy(() => import('./views/FfbAppConnection'));

const TAB_TO_PATH = {
  dashboard: '/',
  map: '/map',
  approvals: '/approval',
  approved: '/approved-workers',
  settlement: '/approved-workers/monthly-settlement',
  plots: '/plots',
  workers: '/workers',
  analytics: '/yield',
  yield: '/yield',
  efficiency: '/efficiency',
  quality: '/audit-quality',
  'clerk-lookup': '/harvest',
  workforce: '/admin',
  'mobile-app': '/mobile-app',
  alerts: '/admin',
  admin: '/admin',
  methodology: '/methodology',
  help: '/help',
  faq: '/help/common-questions',
};

function FfbShell({ selectedTenant, onBack, onSignOut }) {
  const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isMobileViewport);
  const { pathname } = useLocation();
  const userRole = getRole();

  useEffect(() => {
    if (isMobileViewport()) setIsSidebarCollapsed(true);
    scrollPageTop('auto');
  }, [pathname]);

  return (
    <div id="app-layout" className={isSidebarCollapsed ? 'layout--sidebar-collapsed' : ''}>
      <Sidebar isCollapsed={isSidebarCollapsed} onBack={onBack} onSignOut={onSignOut} />
      <Topbar
        onToggleSidebar={() => setIsSidebarCollapsed((v) => !v)}
        onBack={onBack}
        onSignOut={onSignOut}
      />

      <main id="main-content" role="main" aria-label="Main content area">
        <div className="view-wrapper">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<DashboardView />} />
              <Route path="/map" element={<GeoIntelView />} />
              <Route path="/approval" element={<ApprovalView />} />
              <Route path="/approved-workers" element={<ApprovedWorkersView />} />
              <Route
                path="/approved-workers/monthly-settlement"
                element={isManager() ? <SettlementView /> : <Navigate to="/approved-workers" replace />}
              />
              <Route path="/workers" element={<WorkerView />} />
              <Route path="/plots" element={<PlotView />} />
              <Route path="/yield" element={<YieldView />} />
              <Route path="/efficiency" element={userRole === 'View' ? <Navigate to="/" replace /> : <EfficiencyView />} />
              <Route path="/audit-quality" element={<AIQualityView />} />
              <Route path="/harvest" element={<ClerkLookup />} />
              <Route path="/mobile-app" element={<FfbAppConnection tenantSlug={selectedTenant} />} />
              <Route path="/admin" element={isManager() ? <AdminView /> : <Navigate to="/" replace />} />
              <Route path="/methodology" element={<MethodologyView />} />
              <Route path="/help" element={<HelpView />} />
              <Route path="/help/common-questions" element={<FaqView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      <WelcomeTour />
    </div>
  );
}

export default function FfbWorkspace({ onBack, onSignOut }) {
  const { tenant: urlTenant } = useParams();
  const [outerParams] = useOuterSearchParams();
  const initialTab = outerParams.get('tab') || 'dashboard';
  const initialPath = TAB_TO_PATH[initialTab] || '/';

  const [orgs, setOrgs] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(
    (urlTenant || (typeof localStorage !== 'undefined' && localStorage.getItem('fi_tenant')) || '').trim().toLowerCase(),
  );
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

  if (!selectedTenant && !localStorage.getItem('fi_token')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-8">
        <div className="max-w-lg w-full p-8 bg-white rounded-2xl border border-gray-200 text-center space-y-3">
          <h2 className="text-xl font-bold text-[#3F8432]">No FFB-licensed organisation selected</h2>
          <p className="text-sm text-gray-600">
            Enable <strong>FFB</strong> on an organisation under Admin → Organisations → Licence first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ffb-portal">
      <AppProvider
        tenantSlug={selectedTenant}
        tenantMeta={meta}
        orgs={orgs}
        onSelectTenant={(slug) => setSelectedTenant(slug)}
      >
        <PortalRouter initialEntry={initialPath}>
          <FfbShell selectedTenant={selectedTenant} onBack={onBack} onSignOut={onSignOut} />
        </PortalRouter>
      </AppProvider>
    </div>
  );
}
