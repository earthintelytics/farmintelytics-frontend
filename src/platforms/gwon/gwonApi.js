/**
 * GWON's calls to the backend. Signing in uses the FarmIntelytics account of an organisation that has the GWON
 * service; the token is the same one the rest of the portal uses (fi_token).
 */
import { API_BASE } from '../../services/apiBase';
import { login } from '../../services/authApi';
import { clearTenantAccount, clearTenantSession } from '../../services/session';

const token = () => { try { return localStorage.getItem('fi_token') || ''; } catch { return ''; } };

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

export const NOT_LICENSED = 'Your organisation does not have GWON yet. Ask your administrator to add the GreenWall Observatory service.';

/** Who is signed in to GWON, or null (not signed in, or the organisation has no GWON). */
export async function gwonMe() {
  if (!token()) return null;
  try { return await gwonFetch('/platforms/gwon/me'); } catch (e) { if (e.status === 401 || e.status === 403) return { error: e.status === 403 ? NOT_LICENSED : null }; throw e; }
}

export async function gwonSignIn(email, accessCode) {
  const r = await login({ email, access_code: accessCode });
  if (!(r?.status === 'success' && r.token && r.tenant)) throw new Error(r?.message || 'Wrong email or access code.');
  clearTenantAccount();
  localStorage.setItem('fi_token', r.token);
  localStorage.setItem('fi_email', r.email);
  localStorage.setItem('fi_tenant', r.tenant);
  localStorage.setItem('fi_role', r.role || 'admin');
  if (r.full_name) localStorage.setItem('fi_full_name', r.full_name);
  return gwonMe();
}

export function gwonSignOut() { clearTenantSession(); }
