/**
 * Suitability API client (contract SU1 in docs/WORK_SPLIT.md).
 * Suitability is a FarmIntelytics team tool: every call uses the team
 * (superadmin) token. Failures are thrown, never replaced by invented results.
 */
import { NotConnectedError } from './datasetsApi';
import { API_BASE } from './apiBase';
import { responseError } from './apiError';

const BASE_URL = `${API_BASE}/suitability`;

const authHeaders = () => {
  const token = localStorage.getItem('fi_admin_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers: authHeaders() });
  } catch {
    throw new NotConnectedError();
  }
  if (res.status === 404 || res.status === 405 || !(res.headers.get('content-type') || '').includes('json')) {
    throw new NotConnectedError();
  }
  if (!res.ok) {
    throw await responseError(res);
  }
  return res.json();
}

const q = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();

export const fetchCompanies = async () => {
  const data = await call('/companies');
  return Array.isArray(data) ? data : [];
};

export const fetchSuitabilityRuns = async (companyId, cropId = null) => {
  const data = await call(`/runs?${q({ company_id: companyId, crop: cropId })}`);
  return Array.isArray(data) ? data : [];
};

export const fetchSuitabilityRun = (runId) => call(`/runs/${encodeURIComponent(runId)}`);

export const submitSuitabilityRun = (payload) => call('/runs', { method: 'POST', body: JSON.stringify(payload) });

export const deleteSuitabilityRun = (runId) => call(`/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' });

export const generateReportPdf = (runId) =>
  call(`/runs/${encodeURIComponent(runId)}/report/pdf`, { method: 'POST' });

export const downloadSuitabilityPdf = async (runId) => {
  const token = localStorage.getItem('fi_admin_token');
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/runs/${encodeURIComponent(runId)}/report.pdf`, {
    headers,
  });
  if (!res.ok) throw await responseError(res);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `suitability_report_${runId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const fetchSuitabilityShares = (runId) =>
  call(`/runs/${encodeURIComponent(runId)}/shares`);

export const createSuitabilityShare = (runId, payload) =>
  call(`/runs/${encodeURIComponent(runId)}/shares`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const revokeSuitabilityShare = (shareId) =>
  call(`/shares/${encodeURIComponent(shareId)}/revoke`, {
    method: 'POST',
  });

export const fetchPublicSuitability = async (token) => {
  const res = await fetch(`${API_BASE}/public/suitability/${encodeURIComponent(token)}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw await responseError(res);
  return res.json();
};

/** The team asks the AI about a result; answers come from the result only. */
export const askSuitabilityRun = (runId, question, companyId) =>
  call(`/runs/${encodeURIComponent(runId)}/ask${companyId ? `?company_id=${encodeURIComponent(companyId)}` : ''}`, { method: 'POST', body: JSON.stringify({ question }) });

export const askPublicSuitabilityAi = async (token, question) => {
  const res = await fetch(`${API_BASE}/public/suitability/${encodeURIComponent(token)}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw await responseError(res);
  return res.json();
};

export const publicReportPdfUrl = (token) =>
  `${API_BASE}/public/suitability/${encodeURIComponent(token)}/report.pdf`;

// The designed suitability report (report engine) as a page and as its PDF, for the team (by run) and for
// the client (by share link). Same pages as the Reports page.
const teamFile = async (path) => {
  const token = localStorage.getItem('fi_admin_token');
  const res = await fetch(`${BASE_URL}${path}`, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw await responseError(res);
  return res;
};
const publicFile = async (token, name) => {
  const res = await fetch(`${API_BASE}/public/suitability/${encodeURIComponent(token)}/${name}`, { cache: 'no-store' });
  if (!res.ok) throw await responseError(res);
  return res;
};
export const fetchSuitabilityReportHtml = async (runId) => (await teamFile(`/runs/${encodeURIComponent(runId)}/report.html`)).text();
export const fetchSuitabilityReportPdf = async (runId) => (await teamFile(`/runs/${encodeURIComponent(runId)}/report.pdf`)).blob();
export const fetchSharedReportHtml = async (token) => (await publicFile(token, 'report.html')).text();
export const fetchSharedReportPdf = async (token) => (await publicFile(token, 'report.pdf')).blob();
