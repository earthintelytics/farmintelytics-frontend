import { fmtDateTime } from '../utils/formatters';
import { useState } from 'react';
import { useNavigate } from '../utils/portalRouter';
import { Menu, LogOut, RefreshCw, Clock, UserCircle, Shield, MapPin, ArrowLeft, Smartphone } from 'lucide-react';
import { API } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { estateLabel, getEstateScope, getRole, getUserEmail } from '../utils/access';

function cleanOrgName(raw, slug) {
  if (raw && raw.trim()) return raw.trim().replace(/_/g, ' ');
  const s = String(slug || 'Enterprise FFB').replace(/[_-]+/g, ' ').trim();
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Topbar({ onToggleSidebar, onBack, onSignOut }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(
    (typeof localStorage !== 'undefined' && localStorage.getItem('fi-ffb-last-sync')) || fmtDateTime(new Date()),
  );
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const navigate = useNavigate();
  const { refreshData, tenantSlug, tenantMeta, orgs, onSelectTenant } = useAppContext();

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const start = Date.now();
    try {
      await API.refreshAnalytics();
      API.invalidateCache();
      if (refreshData) await refreshData();
      window.dispatchEvent(new Event('ffb:refresh'));
      const elapsed = Date.now() - start;
      if (elapsed < 500) await new Promise((r) => setTimeout(r, 500 - elapsed));
      const now = fmtDateTime(new Date());
      try {
        localStorage.setItem('fi-ffb-last-sync', now);
      } catch {
        /* ignore */
      }
      setLastRefreshed(now);
    } catch {
      /* ignore transient */
    } finally {
      setIsSyncing(false);
    }
  };

  const userEmail = getUserEmail();
  const roleLabel = getRole();
  const orgName = cleanOrgName(tenantMeta?.display_name, tenantSlug);

  return (
    <header id="topbar" role="banner" aria-label="Application topbar">
      <div className="topbar-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Menu size={18} strokeWidth={1.5} />
        </button>
        <span className="topbar-title">Harvest Intelligence</span>
        <div className="topbar-sync" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '14px' }}>
          <button
            className="btn-sync-global"
            onClick={handleSync}
            disabled={isSyncing}
            title="Sync Latest Harvest & Analytics Data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#3F8432',
              color: '#FFFFFF',
              border: '1px solid #3F8432',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.85 : 1,
            }}
          >
            <RefreshCw size={14} strokeWidth={1.5} className={isSyncing ? 'spin' : ''} />
            <span>{isSyncing ? 'Syncing' : 'Sync Data'}</span>
          </button>

          <div className="topbar-last" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#64748B', fontWeight: 400 }}>
            <Clock size={12} strokeWidth={1.5} />
            <span>Updated {lastRefreshed}</span>
          </div>
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {orgs && orgs.length > 0 && onSelectTenant && (
          <select
            value={tenantSlug}
            onChange={(e) => onSelectTenant(e.target.value)}
            aria-label="Switch organisation"
            style={{
              height: '34px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#2D6A2C',
              background: '#F3F8EF',
            }}
          >
            {orgs.map((o) => (
              <option key={o.company_id} value={o.company_id}>
                {o.display_name}
              </option>
            ))}
          </select>
        )}

        <span
          className="topbar-estate"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 500,
            color: '#334155',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            padding: '6px 12px',
            borderRadius: '8px',
          }}
          title={getEstateScope() ? `Scoped to ${getEstateScope()}` : `${orgName} — ${estateLabel()}`}
        >
          <MapPin size={13} strokeWidth={1.5} color="#3F8432" />
          <span className="topbar-estate__label" style={{ color: '#64748B', fontWeight: 500, fontSize: '11px', textTransform: 'none' }}>Estate:</span>
          <span>{estateLabel()}</span>
        </span>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="topbar-user-avatar"
            style={{
              color: '#3F8432',
              background: '#FFFFFF',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #E2E8F0',
              cursor: 'pointer',
            }}
            title="Account & Controls"
          >
            <UserCircle size={20} strokeWidth={1.5} />
          </button>

          {showUserDropdown && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '44px',
                minWidth: '240px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                boxShadow: '0 8px 20px rgba(15,23,42,0.08)',
                padding: '8px',
                zIndex: 9999,
              }}
            >
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #E2E8F0', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#0F172A' }}>{userEmail}</div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: '#3F8432' }}>
                  {orgName} · {roleLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUserDropdown(false);
                  navigate('/mobile-app');
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500, color: '#0F172A', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Smartphone size={15} strokeWidth={1.5} /> Field App &amp; QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUserDropdown(false);
                  navigate('/admin');
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500, color: '#0F172A', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Shield size={15} strokeWidth={1.5} /> Admin &amp; Alerts
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onBack();
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500, color: '#0F172A', cursor: 'pointer', borderRadius: '8px' }}
                >
                  <ArrowLeft size={15} strokeWidth={1.5} /> Back to Portal
                </button>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onSignOut();
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500, color: '#DC2626', cursor: 'pointer', borderRadius: '8px' }}
                >
                  <LogOut size={15} strokeWidth={1.5} /> Sign Out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
