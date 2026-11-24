import { API_BASE, ADMIN_API_BASE } from '../../../services/apiBase';

const FFB_BASE = API_BASE.replace(/\/agromonitoring\/?$/, '/ffb');
const FFB_ADMIN_BASE = ADMIN_API_BASE.replace(/\/admin\/?$/, '/admin/ffb');

function getAuthHeaders(tenantSlug) {
  const tenantToken = localStorage.getItem('fi_token');
  const teamToken = localStorage.getItem('fi_admin_token');
  const headers = {};
  if (tenantToken) {
    headers.Authorization = `Bearer ${tenantToken}`;
  } else if (teamToken) {
    headers.Authorization = `Bearer ${teamToken}`;
    if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;
  }
  return headers;
}

export async function ffbCall(path, { method = 'GET', body, form, tenantSlug } = {}) {
  const headers = getAuthHeaders(tenantSlug);
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${FFB_BASE}${path}`, {
    method,
    headers,
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || data.message || `Request failed (${res.status})`);
    err.status = res.status; // 403 'not_licensed': FFB is not assigned to this organisation
    throw err;
  }
  return data;
}

export async function ffbAdminOverview() {
  const token = localStorage.getItem('fi_admin_token');
  if (!token) return { items: [] };
  const res = await fetch(`${FFB_ADMIN_BASE}/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { items: [] };
  return res.json();
}

export function buildQuery(params = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '' && v !== 'ALL'),
  ).toString();
  return q ? `?${q}` : '';
}
