import { useEffect, useState } from 'react';
import { NavLink, useLocation } from '../utils/portalRouter';
import { LOGO_ICON } from '../utils/icons';
import OrgLogo from '../../../components/OrgLogo';
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

function formatOrgTitle(rawName, slug) {
  if (rawName && rawName.trim()) return rawName.trim().replace(/_/g, ' ');
  const s = String(slug || 'Enterprise FFB').replace(/[_-]+/g, ' ').trim();
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const title = `${count} block${count === 1 ? '' : 's'} needing review`;
  if (collapsed) {
    return (
      <span
        title={title}
        aria-label={title}
        style={{
          position: 'absolute',
          top: '3px',
          left: '24px',
          minWidth: '16px',
          height: '15px',
          padding: '0 4px',
          borderRadius: '5px',
          background: '#DC2626',
          color: '#FFFFFF',
          fontSize: '10px',
          fontWeight: 500,
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
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        minWidth: '20px',
        height: '18px',
        padding: '0 5px',
        borderRadius: '5px',
        background: '#FEF2F2',
        color: '#DC2626',
        border: '1px solid #E2E8F0',
        fontSize: '10.5px',
        fontWeight: 500,
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

  const orgTitle = formatOrgTitle(tenantMeta?.display_name, tenantSlug);
  const logoVersion = tenantMeta?.has_logo ? '1' : '';

  const NAV_GROUPS = [
    {
      label: 'Overview',
      items: [
        { path: '/', label: 'Overview', icon: <LayoutDashboard size={16} strokeWidth={1.5} />, end: true },
        { path: '/map', label: 'Geointelytics', icon: <Map size={16} strokeWidth={1.5} /> },
      ],
    },
    {
      label: 'Verification & Pay',
      items: [
        { path: '/approval', label: 'Verification Queue', icon: <CheckSquare size={16} strokeWidth={1.5} /> },
        { path: '/approved-workers', label: 'Approved Workers', icon: <UserCheck size={16} strokeWidth={1.5} />, end: true },
        { path: '/approved-workers/monthly-settlement', label: 'Pay Cycles', icon: <CalendarCheck size={15} strokeWidth={1.5} />, child: true },
      ],
    },
    {
      label: 'Analytics',
      items: [
        { path: '/plots', label: 'Block Performance', icon: <Grid size={16} strokeWidth={1.5} /> },
        { path: '/workers', label: 'Workers Performance', icon: <Users size={16} strokeWidth={1.5} /> },
        { path: '/yield', label: 'Yield Forecast', icon: <TrendingUp size={16} strokeWidth={1.5} /> },
        { path: '/efficiency', label: 'Efficiency Ranks', icon: <ClipboardList size={16} strokeWidth={1.5} /> },
        { path: '/audit-quality', label: 'AI Quality Audit', icon: <BrainCircuit size={16} strokeWidth={1.5} /> },
        { path: '/harvest', label: 'Worker Records', icon: <SearchCheck size={16} strokeWidth={1.5} /> },
      ],
    },
    {
      label: 'Field & System',
      items: [
        { path: '/mobile-app', label: 'Field App & QR', icon: <Smartphone size={16} strokeWidth={1.5} /> },
        { path: '/admin', label: 'Admin & Alerts', icon: <Shield size={16} strokeWidth={1.5} /> },
        { path: '/methodology', label: 'Validation Rules', icon: <BookOpen size={16} strokeWidth={1.5} /> },
      ],
    },
    {
      label: 'Support',
      items: [
        { path: '/help', label: 'Help Guide', icon: <HelpCircle size={16} strokeWidth={1.5} />, end: true },
        { path: '/help/common-questions', label: 'FAQ', icon: <MessageCircleQuestion size={16} strokeWidth={1.5} /> },
      ],
    },
  ];

  const fallbackLogo = (
    <img
      src={LOGO_ICON}
      alt={orgTitle}
      style={{
        height: '32px',
        width: '32px',
        objectFit: 'contain',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        padding: '2px',
        flexShrink: 0,
      }}
    />
  );

  return (
    <aside id="sidebar" role="complementary" aria-label="Main navigation sidebar" className={isCollapsed ? 'sidebar--collapsed' : ''}>
      {/* Compact Brand Header + Pinned Back to Portal */}
      <div style={{ borderBottom: '1px solid #E2E8F0', padding: '12px 14px 10px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <OrgLogo
            tenant={tenantSlug}
            version={logoVersion}
            className="w-8 h-8 rounded-lg shrink-0"
            fallback={fallbackLogo}
          />
          <div className="sidebar-brand-text" style={{ minWidth: 0, flex: 1 }}>
            <span
              className="sidebar-brand-name"
              style={{
                fontSize: '13.5px',
                fontWeight: 500,
                color: '#0F172A',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {orgTitle}
            </span>
            <span className="sidebar-brand-sub" style={{ fontSize: '10px', color: '#3F8432', fontWeight: 500 }}>
              FarmIntelytics FFB
            </span>
          </div>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              marginTop: '10px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '7px',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} color="#3F8432" />
            <span>Back to Services</span>
          </button>
        )}
      </div>

      {/* Categorized Navigation */}
      <nav className="sidebar-nav" role="navigation" aria-label="Main navigation">
        <div style={{ padding: '0 10px' }}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (item.path === '/efficiency' && userRole === 'View') return false;
              if (item.child && !isManager()) return false;
              if (item.path === '/admin' && !isManager()) return false;
              return true;
            });
            if (!visibleItems.length) return null;
            return (
              <div key={group.label} style={{ marginBottom: '4px' }}>
                {!isCollapsed && <div className="sidebar-group-label">{group.label}</div>}
                <ul className="sidebar-nav-list" style={{ padding: 0, margin: 0 }}>
                  {visibleItems.map((item) => {
                    const isRestricted = item.path === '/approval' && userRole === 'View';
                    return (
                      <li className="sidebar-nav-item" key={item.path} style={{ marginBottom: '1px' }}>
                        <NavLink
                          to={item.path}
                          end={item.end}
                          className={({ isActive }) =>
                            `sidebar-nav-btn ${isActive ? 'sidebar-nav-btn--active' : ''} ${item.child && !isCollapsed ? 'sidebar-nav-btn--child' : ''}`
                          }
                          style={{ borderRadius: '7px', transition: 'background 0.15s ease', position: 'relative' }}
                          aria-label={`Navigate to ${item.label}`}
                        >
                          <span className="nav-icon">{item.icon}</span>
                          <span className="nav-label" style={{ flex: 1 }}>{item.label}</span>
                          {item.path === '/approval' && <IssueBadge count={pendingIssues} collapsed={isCollapsed} />}
                          {isRestricted && (
                            <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1px 4px', borderRadius: '4px' }}>
                              View
                            </span>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Compact Sign Out Footer */}
      {onSignOut && (
        <div
          className="sidebar-help"
          style={{
            padding: '8px 10px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onSignOut}
            className="sidebar-nav-btn"
            style={{ borderRadius: '7px', border: 'none', background: 'transparent', width: '100%', padding: '7px 10px', cursor: 'pointer', color: '#DC2626', justifyContent: 'flex-start', gap: '8px' }}
            title="Sign Out"
          >
            <LogOut size={15} strokeWidth={1.5} color="#DC2626" />
            <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#DC2626' }}>Sign Out</span>
          </button>
        </div>
      )}
    </aside>
  );
}
