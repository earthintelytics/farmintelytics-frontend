/**
 * GWON's calls to the backend. Signing in uses the FarmIntelytics account of an organisation that has the GWON
 * service; the token is the same one the rest of the portal uses (fi_token).
 */
import { API_BASE } from '../../services/apiBase';
import { login } from '../../services/authApi';
import { clearTenantAccount, clearTenantSession } from '../../services/session';

const get = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
// Which login GWON uses: an organisation's (fi_token) when it has GWON, else the Earthintelytics team's (fi_admin_token).
let useTeam = false;
const token = () => (useTeam ? get('fi_admin_token') : get('fi_token') || get('fi_admin_token'));

export async function gwonFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.detail || data.message || `Request failed (${res.status})`);
    e.status = res.status; e.code = data.detail;
    throw e;
  }
  return data;
}

export const NOT_LICENSED = 'The account signed in on this browser belongs to an organisation without GWON. Sign in with a GWON account, or ask your administrator to add the GreenWall Observatory service.';

/** Who is signed in to GWON, or null (not signed in, or the organisation has no GWON). */
export async function gwonMe() {
  useTeam = false;
  if (!get('fi_token') && !get('fi_admin_token')) return null;
  try { return await gwonFetch('/platforms/gwon/me'); } catch (e) {
    if (e.status !== 401 && e.status !== 403) throw e;
    // The organisation's login has no GWON: try the team's login, if there is one.
    if (get('fi_token') && get('fi_admin_token')) {
      useTeam = true;
      try { return await gwonFetch('/platforms/gwon/me'); } catch { useTeam = false; }
    }
    return e.status === 403 ? { error: NOT_LICENSED, email: get('fi_email') } : null;
  }
}

export async function gwonSignIn(email, password) {
  const r = await login({ email, access_code: password });
  if (!(r?.status === 'success' && r.token && r.tenant)) throw new Error(r?.message || 'Wrong email or password.');
  clearTenantAccount();
  localStorage.setItem('fi_token', r.token);
  localStorage.setItem('fi_email', r.email);
  localStorage.setItem('fi_tenant', r.tenant);
  localStorage.setItem('fi_role', r.role || 'admin');
  if (r.full_name) localStorage.setItem('fi_full_name', r.full_name);
  return gwonMe();
}

export function gwonSignOut() { useTeam = false; clearTenantSession(); }
