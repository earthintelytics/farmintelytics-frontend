import { fmtDateTime } from '../utils/formatters';
import { useState } from 'react';
import { useNavigate } from '../utils/portalRouter';
import { Menu, LogOut, RefreshCw, Clock, UserCircle, Shield, MapPin, ArrowLeft, Smartphone } from 'lucide-react';
import { API } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { estateLabel, getEstateScope, getRole, getUserEmail } from '../utils/access';

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
  const orgName = tenantMeta?.display_name || tenantSlug || 'Enterprise FFB';

  return (
    <header id="topbar" role="banner" aria-label="Application topbar">
      <div className="topbar-left">
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Menu size={18} strokeWidth={2.5} />
        </button>
        <span className="topbar-title">OPERATIONS ANALYTICS</span>
        <div className="topbar-sync" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
          <button
            className="btn-sync-global"
            onClick={handleSync}
            disabled={isSyncing}
            title="Refresh All Analytics Data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#034321',
              color: 'white',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 900,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.85 : 1,
            }}
          >
            <RefreshCw size={15} className={isSyncing ? 'spin' : ''} />
            <span>{isSyncing ? 'REFRESHING' : 'REFRESH'}</span>
          </button>

          <div className="topbar-last" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#0f172a', fontWeight: 700 }}>
            <Clock size={12} />
            <span>Last: {lastRefreshed}</span>
          </div>
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {orgs && orgs.length > 0 && onSelectTenant && (
          <select
            value={tenantSlug}
            onChange={(e) => onSelectTenant(e.target.value)}
            aria-label="Switch organisation"
            style={{
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '0 10px',
              fontSize: '12px',
              fontWeight: 700,
              color: '#034321',
              background: '#E8F2E5',
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
          title={getEstateScope() ? `Scoped to ${getEstateScope()}` : `${orgName} — ${estateLabel()}`}
        >
          <MapPin size={14} />
          <span className="topbar-estate__label">Estate</span>
          {estateLabel()}
        </span>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="topbar-user-avatar"
            style={{
              color: '#034321',
              background: 'transparent',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Account & Controls"
          >
            <UserCircle size={24} />
          </button>

          {showUserDropdown && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '48px',
                minWidth: '240px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
                padding: '10px',
                zIndex: 9999,
              }}
            >
              <div style={{ padding: '6px 10px', borderBottom: '1px solid #F1F5F9', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>{userEmail}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#034321' }}>
                  {orgName} · {roleLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUserDropdown(false);
                  navigate('/mobile-app');
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Smartphone size={15} /> Field App &amp; QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUserDropdown(false);
                  navigate('/admin');
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer', borderRadius: '8px' }}
              >
                <Shield size={15} /> Admin &amp; Alerts
              </button>
              {onBack && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onBack();
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer', borderRadius: '8px' }}
                >
                  <ArrowLeft size={15} /> Back to Portal
                </button>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserDropdown(false);
                    onSignOut();
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, color: '#DC2626', cursor: 'pointer', borderRadius: '8px' }}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
