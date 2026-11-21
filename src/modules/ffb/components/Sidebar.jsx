import { useEffect, useState } from 'react';
import { NavLink, useLocation } from '../utils/portalRouter';
import { LOGO_ICON } from '../utils/icons';
import { API } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { plotDays, issuePlotDays } from '../utils/reconStatus';
import { isManager, getRole } from '../utils/access';
import {
  LayoutDashboard,
  Map,
  CheckSquare,
  Users,
  Grid,
  TrendingUp,
  BrainCircuit,
  ClipboardList,
  UserCheck,
  CalendarCheck,
  HelpCircle,
  MessageCircleQuestion,
  BookOpen,
  Smartphone,
  Shield,
  ArrowLeft,
  LogOut,
  SearchCheck,
} from 'lucide-react';

const ISSUES_POLL_MS = 60_000;

function usePendingIssues(tenantSlug) {
  const [pending, setPending] = useState(null);
  const tick = useRefreshTick();
  const { pathname } = useLocation();
  useEffect(() => {
    let alive = true;
    const load = () =>
      Promise.all([API.fetchPlotExceptions({}), API.fetchPlotExceptions({ mode: 'picker' }).catch(() => [])])
        .then(([harvester, picker]) => {
          if (alive) setPending(issuePlotDays(plotDays(harvester, picker)).length);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, ISSUES_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [tick, pathname, tenantSlug]);
  return pending;
}

function IssueBadge({ count, collapsed }) {
  if (!count) return null;
  const text = count > 99 ? '99+' : String(count);
  const title = `${count} plot${count === 1 ? '' : 's'} with issues (pending, mismatch or rejected)`;
  if (collapsed) {
    return (
      <span
        title={title}
        aria-label={title}
        style={{
          position: 'absolute',
          top: '6px',
          left: '30px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#DC2626',
          border: '2px solid #FFFFFF',
        }}
      />
    );
  }
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        minWidth: '22px',
        height: '22px',
        padding: '0 7px',
        borderRadius: '11px',
        background: '#DC2626',
        color: '#FFFFFF',
        fontSize: '12px',
        fontWeight: 800,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
      }}
    >
      {text}
    </span>
  );
}

export function Sidebar({ isCollapsed, onBack, onSignOut }) {
  const { tenantMeta, tenantSlug } = useAppContext();
  const pendingIssues = usePendingIssues(tenantSlug);
  const userRole = getRole();

  const orgTitle = tenantMeta?.display_name || tenantSlug || 'Enterprise FFB';
  const orgLogo = tenantMeta?.logo_url || LOGO_ICON;

  const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} />, end: true },
    { path: '/map', label: 'Geospatial Intel', icon: <Map size={20} /> },
    { path: '/approval', label: 'Approval Center', icon: <CheckSquare size={20} /> },
    { path: '/approved-workers', label: 'Approved Workers', icon: <UserCheck size={20} />, end: true },
    { path: '/approved-workers/monthly-settlement', label: 'Monthly Settlement', icon: <CalendarCheck size={17} />, child: true },
    { path: '/plots', label: 'Plot Analytics', icon: <Grid size={20} /> },
    { path: '/workers', label: 'Worker Analytics', icon: <Users size={20} /> },
    { path: '/yield', label: 'Yield Intelligence', icon: <TrendingUp size={20} /> },
    { path: '/efficiency', label: 'Personnel Board', icon: <ClipboardList size={20} /> },
    { path: '/audit-quality', label: 'Audit Quality', icon: <BrainCircuit size={20} /> },
    { path: '/harvest', label: 'Clerk Lookup', icon: <SearchCheck size={20} /> },
    { path: '/mobile-app', label: 'Field App & QR', icon: <Smartphone size={20} /> },
    { path: '/admin', label: 'Admin & Alerts', icon: <Shield size={20} /> },
    { path: '/methodology', label: 'Rules & Methodology', icon: <BookOpen size={20} /> },
  ];

  return (
    <aside id="sidebar" role="complementary" aria-label="Main navigation sidebar" className={isCollapsed ? 'sidebar--collapsed' : ''}>
      <div
        className="sidebar-header"
        style={{ height: '104px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '18px' }}
      >
        <div style={{ background: 'white', padding: '6px', borderRadius: '10px' }}>
          <img src={orgLogo} alt={orgTitle} style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="sidebar-brand-text" style={{ textAlign: 'center', maxWidth: '100%' }}>
          <span className="sidebar-brand-name" style={{ fontSize: '15px', letterSpacing: '0.04em', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {orgTitle}
          </span>
          <span className="sidebar-brand-sub" style={{ opacity: 0.75, fontSize: '11px' }}>Earthintelytics FFB</span>
        </div>
      </div>

      <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
        <ul className="sidebar-nav-list" id="sidebarNavList" style={{ padding: '0 12px' }}>
          {NAV_ITEMS.filter((item) => {
            if (item.path === '/efficiency' && userRole === 'View') return false;
            if (item.child && !isManager()) return false;
            if (item.path === '/admin' && !isManager()) return false;
            return true;
          }).map((item) => {
            const isRestricted = item.path === '/approval' && userRole === 'View';
            return (
              <li className="sidebar-nav-item" key={item.path} style={{ marginBottom: '2px' }}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `sidebar-nav-btn ${isActive ? 'sidebar-nav-btn--active' : ''} ${item.child && !isCollapsed ? 'sidebar-nav-btn--child' : ''}`
                  }
                  style={{ borderRadius: '10px', margin: '2px 0', transition: 'all 0.2s ease', position: 'relative' }}
                  aria-label={`Navigate to ${item.label}`}
                >
                  <span className="nav-icon" style={{ fontSize: '20px' }}>{item.icon}</span>
                  <span className="nav-label" style={{ flex: 1, marginLeft: '4px' }}>{item.label}</span>
                  {item.path === '/approval' && <IssueBadge count={pendingIssues} collapsed={isCollapsed} />}
                  {isRestricted && (
                    <span style={{ fontSize: '9px', opacity: 0.65, textTransform: 'uppercase', background: 'rgba(255,255,255,0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                      View Only
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-help" style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <NavLink
          to="/help"
          end
          className={({ isActive }) => `sidebar-nav-btn ${isActive ? 'sidebar-nav-btn--active' : ''}`}
          style={{ borderRadius: '10px' }}
        >
          <span className="nav-icon"><HelpCircle size={20} /></span>
          <span className="nav-label" style={{ flex: 1, marginLeft: '4px' }}>Help</span>
        </NavLink>
        <NavLink
          to="/help/common-questions"
          className={({ isActive }) => `sidebar-nav-btn ${isActive ? 'sidebar-nav-btn--active' : ''}`}
          style={{ borderRadius: '10px' }}
        >
          <span className="nav-icon"><MessageCircleQuestion size={20} /></span>
          <span className="nav-label" style={{ flex: 1, marginLeft: '4px' }}>FAQ</span>
        </NavLink>
        {onBack && (
          <button type="button" onClick={onBack} className="sidebar-nav-btn" style={{ borderRadius: '10px', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer' }}>
            <span className="nav-icon"><ArrowLeft size={20} /></span>
            <span className="nav-label" style={{ flex: 1, marginLeft: '4px', textAlign: 'left' }}>Back to Portal</span>
          </button>
        )}
        {onSignOut && (
          <button type="button" onClick={onSignOut} className="sidebar-nav-btn" style={{ borderRadius: '10px', border: 'none', background: 'transparent', width: '100%', cursor: 'pointer' }}>
            <span className="nav-icon"><LogOut size={20} /></span>
            <span className="nav-label" style={{ flex: 1, marginLeft: '4px', textAlign: 'left' }}>Sign out</span>
          </button>
        )}
      </div>
    </aside>
  );
}
