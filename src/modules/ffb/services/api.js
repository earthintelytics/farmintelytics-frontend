import { CONFIG } from '../config';

function approvalStatusParam(s) {
  if (!s) return undefined;
  const list = Array.isArray(s) ? s : [s];
  if (list.length !== 1) return undefined;
  const v = list[0];
  return v === 'valid' ? 'APPROVED' : v === 'error' ? 'REJECTED' : v === 'warning' ? 'PENDING' : v.toUpperCase();
}

export const API = (() => {
  const cache = new Map();
  const inflight = new Map();
  let activeTenant = (typeof localStorage !== 'undefined' && localStorage.getItem('fi_tenant')) || '';

  function setActiveTenant(slug) {
    const clean = String(slug || '').trim().toLowerCase();
    if (clean !== activeTenant) {
      activeTenant = clean;
      invalidateCache();
    }
  }

  function getActiveTenant() {
    return activeTenant;
  }

  function invalidateCache() {
    cache.clear();
  }

  function _tokenInfo() {
    const tenantTok = typeof localStorage !== 'undefined' ? localStorage.getItem('fi_token') : null;
    const teamTok = typeof localStorage !== 'undefined' ? localStorage.getItem('fi_admin_token') : null;
    if (tenantTok) return { token: tenantTok, isTeam: false };
    if (teamTok) return { token: teamTok, isTeam: true };
    return { token: '', isTeam: false };
  }

  function authHeaders(extra = {}) {
    const { token, isTeam } = _tokenInfo();
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    if (isTeam && activeTenant) h['X-Tenant-Slug'] = activeTenant;
    return h;
  }

  function signedUrl(url) {
    const { token, isTeam } = _tokenInfo();
    if (token) url.searchParams.set('access_token', token);
    if (isTeam && activeTenant) url.searchParams.set('tenant', activeTenant);
    return url.toString();
  }

  function _fullUrl(endpoint) {
    return `${CONFIG.API_BASE_URL}${endpoint}`;
  }

  async function _get(endpoint, params = {}, options = {}) {
    const ttl = options.noCache ? 0 : (options.ttl ?? 15000);
    const url = new URL(
      _fullUrl(endpoint).startsWith('http') ? _fullUrl(endpoint) : `${window.location.origin}${_fullUrl(endpoint)}`,
    );
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.append(key, value);
      }
    });

    const urlStr = url.toString();
    const key = `${activeTenant}::${urlStr}`;
    const hit = cache.get(key);
    if (ttl > 0 && hit && Date.now() - hit.at < ttl) return hit.data;
    if (inflight.has(key)) return inflight.get(key);

    const pending = (async () => {
      let res;
      try {
        res = await fetch(urlStr, { method: 'GET', headers: authHeaders({ Accept: 'application/json' }) });
      } catch (err) {
        const netErr = new Error('Cannot reach the server — check connection and retry.');
        netErr.cause = err;
        throw netErr;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `API Error ${res.status}`);
      }
      const data = await res.json();
      if (ttl > 0) cache.set(key, { at: Date.now(), data });
      return data;
    })();

    inflight.set(key, pending);
    try {
      return await pending;
    } finally {
      inflight.delete(key);
    }
  }

  async function _write(method, endpoint, payload) {
    const res = await fetch(_fullUrl(endpoint), {
      method,
      headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.message || `API Error ${res.status}`);
    }
    invalidateCache();
    if (res.status === 204) return null;
    return res.json();
  }

  const _patch = (endpoint, payload) => _write('PATCH', endpoint, payload);
  const _post = (endpoint, payload) => _write('POST', endpoint, payload);
  const _delete = (endpoint) => _write('DELETE', endpoint, undefined);

  function resolveImageUrl(url) {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return typeof window !== 'undefined' && window.location.protocol === 'https:'
        ? url.replace(/^http:\/\//, 'https://')
        : url;
    }
    if (url.startsWith('/')) return url;
    return `${CONFIG.API_BASE_URL}/${url.replace(/^\//, '')}`;
  }

  const _baseUrlObj = (path) => {
    const raw = _fullUrl(path);
    return new URL(raw.startsWith('http') ? raw : `${window.location.origin}${raw}`);
  };

  // --- Tenant Settings & App Connection ---
  const fetchSettings = () => _get('/settings', {}, { ttl: 60000 });
  const fetchAppConnection = () => _get('/app-connection', {}, { noCache: true });

  // --- Dashboard ---
  const fetchDashboardCards = (filters = {}) =>
    _get('/analytics/dashboard/cards', {
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  const fetchMainChart = (filters = {}) =>
    _get('/analytics/dashboard/main-chart', {
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  const fetchHarvestedBunches = (filters = {}) =>
    _get('/analytics/dashboard/harvested-bunches', {
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  const fetchPickFruit = (filters = {}) =>
    _get('/analytics/dashboard/pick-fruit', {
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  // --- Plots ---
  const fetchPlotCards = (filters = {}) =>
    _get('/analytics/plots/cards', {
      estate: filters.estate || undefined,
      plot_id: filters.plot || filters.search || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  const fetchPlotProductionTrend = (filters = {}) =>
    _get('/analytics/plots/production-trend', {
      estate: filters.estate || undefined,
      plot_id: filters.plot || filters.search || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  const fetchProductionPredictions = (filters = {}) =>
    _get('/analytics/plots/production-predictions', {
      estate: filters.estate || undefined,
      plot_id: filters.plot || filters.search || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  const fetchPlotTable = (filters = {}) =>
    _get('/analytics/plots/table', {
      estate: filters.estate || undefined,
      plot_id: filters.plot || filters.search || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
      page: filters.page || 1,
      size: filters.size || 50,
    });

  const fetchPlotComparison = (filters = {}) =>
    _get('/analytics/plots/comparison', {
      estate: filters.estate || undefined,
      plot_id: filters.plot || filters.search || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  // --- Workers & Efficiency ---
  const fetchWorkerCards = (filters = {}) =>
    _get('/analytics/workers/cards', {
      estate: filters.estate || undefined,
      plot_id: filters.plot || undefined,
      team: filters.team || undefined,
      contractor: filters.contractor || undefined,
      search: filters.search?.trim() || undefined,
      worker_role: filters.role || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
      approval_status: approvalStatusParam(filters.status) || undefined,
    });

  const fetchWorkerTable = (filters = {}) =>
    _get(
      '/analytics/workers/table',
      {
        estate: filters.estate || undefined,
        plot_id: filters.plot || undefined,
        team: filters.team || undefined,
        contractor: filters.contractor || undefined,
        worker_role: filters.role || undefined,
        start_date: filters.dateRange?.from || undefined,
        end_date: filters.dateRange?.to || undefined,
        approval_status: approvalStatusParam(filters.status) || undefined,
        search: filters.search?.trim() || undefined,
        role_group: filters.role_group || undefined,
        page: filters.page || 1,
        size: filters.size || 50,
      },
      { noCache: true },
    );

  const fetchEfficiencyRanks = (filters = {}) =>
    _get('/analytics/workers/efficiency', {
      plot_id: filters.plot || filters.search || undefined,
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      contractor: filters.contractor || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  // --- Payouts ---
  const fetchPayoutSummary = (filters = {}) =>
    _get('/analytics/payouts/summary', {
      estate: filters.estate || undefined,
      team: filters.team || undefined,
      worker_id: filters.worker_id || filters.search || undefined,
      role: filters.role || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  const fetchPayoutAnalytics = (filters = {}) =>
    _get('/analytics/payouts/', {
      estate: filters.estate || undefined,
      team: filters.team || undefined,
      worker_id: filters.worker_id || filters.search || undefined,
      role: filters.role || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
      page: filters.page || 1,
      size: filters.size || 50,
    });

  // --- Approvals ---
  const fetchApprovalRecords = (filters = {}) =>
    _get('/analytics/approval/records', {
      plot_id: filters.plot || undefined,
      worker_role: filters.role || undefined,
      status: filters.status || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
      search: filters.search || undefined,
      estate: filters.estate || undefined,
      page: filters.page || 1,
      size: filters.size || 50,
    });

  function approvalRecordsExportUrl(filters = {}) {
    const url = _baseUrlObj('/analytics/approval/records/export');
    const params = {
      plot_id: filters.plot,
      status: filters.status,
      search: filters.search,
      estate: filters.estate,
      start_date: filters.dateRange?.from,
      end_date: filters.dateRange?.to,
      columns: filters.columns,
    };
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
    return signedUrl(url);
  }

  function workersExportUrl(filters = {}, scope = 'all', columns = null) {
    const url = _baseUrlObj(`/analytics/approval/${scope === 'approved' ? 'approved-workers' : 'workers'}/export`);
    if (scope !== 'approved') url.searchParams.set('status', approvalStatusParam(filters.status) || 'all');
    const params = {
      plot_id: filters.plot,
      team: filters.team,
      contractor: filters.contractor,
      search: filters.search,
      estate: filters.estate,
      start_date: filters.dateRange?.from || filters.from,
      end_date: filters.dateRange?.to || filters.to,
    };
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
    if (columns && columns.length > 0) url.searchParams.set('columns', columns.join(','));
    return signedUrl(url);
  }

  const fetchApprovedWorkersSummary = (filters = {}) =>
    _get(
      '/analytics/approval/approved-workers/summary',
      {
        plot_id: filters.plot || undefined,
        team: filters.team || undefined,
        contractor: filters.contractor || undefined,
        estate: filters.estate || undefined,
        start_date: filters.dateRange?.from || filters.from || undefined,
        end_date: filters.dateRange?.to || filters.to || undefined,
        search: filters.search || undefined,
      },
      { noCache: true },
    );

  const fetchApprovedWorkers = (filters = {}) =>
    _get('/analytics/approval/approved-workers', {
      plot_id: filters.plot || undefined,
      team: filters.team || undefined,
      contractor: filters.contractor || undefined,
      estate: filters.estate || undefined,
      start_date: filters.dateRange?.from || filters.from || undefined,
      end_date: filters.dateRange?.to || filters.to || undefined,
      search: filters.search || undefined,
      role_group: filters.role_group || undefined,
      page: filters.page || 1,
      size: filters.size || 50,
    });

  const fetchApprovalCards = (filters = {}) => {
    const s = (filters.status || '').toLowerCase();
    return _get('/analytics/approval/cards', {
      plot_id: filters.plot || undefined,
      status:
        s === 'valid' || s === 'approved'
          ? 'APPROVED'
          : s === 'error' || s === 'rejected'
            ? 'REJECTED'
            : s === 'warning' || s === 'pending'
              ? 'PENDING'
              : undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
      page: filters.page || 1,
      size: filters.size || 50,
    });
  };

  const fetchApprovalTotals = (filters = {}) =>
    _get(
      '/analytics/approval/cards/totals',
      {
        plot_id: filters.plot || undefined,
        search: filters.plot ? undefined : filters.search || undefined,
        estate: filters.estate || undefined,
        start_date: filters.dateRange?.from || undefined,
        end_date: filters.dateRange?.to || undefined,
      },
      { noCache: true },
    );

  const fetchPlotExceptions = (filters = {}) =>
    _get('/analytics/approval/plot-exceptions', {
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
      search: filters.search || undefined,
      estate: filters.estate || undefined,
      mode: filters.mode || undefined,
    });

  const fetchPlotHarvestHistory = (plotId, startDate, endDate) =>
    _get('/analytics/geospatial/plot-harvest-history', { plot_id: plotId, start_date: startDate, end_date: endDate });

  const fetchPlotDrilldown = (plotId, workDate) =>
    _get(`/analytics/approval/plot-exceptions/${encodeURIComponent(plotId)}/drilldown`, { work_date: workDate });

  const updateApproval = (recordId, payload) => {
    const s = (payload.approval_status || '').toLowerCase();
    const mapped = s === 'valid' || s === 'approved' ? 'approved' : s === 'error' || s === 'rejected' ? 'rejected' : 'pending';
    return _patch(`/approval/${recordId}`, {
      approval_status: mapped,
      reviewer_comment: payload.reviewer_comment || '',
      reviewer_id: payload.reviewer_id || 'Supervisor',
      count_choice: payload.count_choice || undefined,
    });
  };

  const bulkUpdateApprovals = (records) =>
    _patch('/approvals/bulk-mixed', {
      records: records.map((r) => {
        const s = (r.status || r.approval_status || '').toUpperCase();
        return {
          id: r.id,
          approval_status: s === 'APPROVED' || s === 'VALID' ? 'approved' : s === 'REJECTED' || s === 'ERROR' ? 'rejected' : 'pending',
          reviewer_comment: r.reviewer_comment || r.comment || '',
          reviewer_id: r.reviewer_id || 'Supervisor',
          count_choice: r.count_choice || undefined,
        };
      }),
    });

  // --- Geospatial ---
  const fetchHarvesterGeo = (filters = {}) =>
    _get('/analytics/geospatial/harvester', {
      plot_id: filters.plot || filters.search || undefined,
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      size: 100,
    });

  const fetchLoadedGeo = (filters = {}) =>
    _get('/analytics/geospatial/loaded', {
      plot_id: filters.plot || filters.search || undefined,
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      size: 100,
    });

  const fetchGeospatialMarkers = (filters = {}) =>
    _get('/analytics/geospatial/markers', {
      plot_id: filters.plot || undefined,
      search: filters.search?.trim() || undefined,
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  const fetchPlotPlatforms = (plotId) => _get('/analytics/geospatial/plot-platforms', { plot_id: plotId });

  const fetchPlotsHarvestStatus = (filters = {}) =>
    _get('/analytics/geospatial/plots-harvest-status', {
      start_date: filters.start_date || filters.date_from || filters.dateRange?.from || undefined,
      end_date: filters.end_date || filters.date_to || filters.dateRange?.to || undefined,
    });

  const fetchWorkerGeo = (filters = {}) =>
    _get('/analytics/geospatial/worker', {
      plot_id: filters.plot || filters.search || undefined,
      estate: filters.estate || undefined,
      worker_role: filters.role || undefined,
      size: 100,
    });

  const fetchValidationSummary = (filters = {}) =>
    _get('/analytics/geospatial/validation', {
      plot_id: filters.plot || filters.search || undefined,
      estate: filters.estate || undefined,
      validation_status: filters.validation_status || undefined,
      start_date: filters.dateRange?.from || undefined,
      end_date: filters.dateRange?.to || undefined,
    });

  // --- Pay Rates & Settlement ---
  const fetchPayRates = () => _get('/pay-rates/');
  const updatePayRate = (role, payload) => _patch(`/pay-rates/${encodeURIComponent(role)}`, payload);

  const settlementParams = (f = {}) => ({
    period: f.period,
    estate: f.estate || undefined,
    role: f.role || undefined,
    search: f.search || undefined,
  });

  const fetchSettlementPeriods = () => _get('/analytics/settlement/periods', {}, { ttl: 30000 });
  const fetchSettlement = (filters = {}, options = {}) => _get('/analytics/settlement', settlementParams(filters), options);

  function settlementExportUrl(filters = {}, columns = null) {
    const url = _baseUrlObj('/analytics/settlement/export');
    Object.entries(settlementParams(filters)).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
    if (columns && columns.length > 0) url.searchParams.set('columns', columns.join(','));
    return signedUrl(url);
  }

  const lockSettlement = (period) => _post(`/analytics/settlement/lock?period=${encodeURIComponent(period)}`, {});
  const unlockSettlement = (period) => _delete(`/analytics/settlement/lock?period=${encodeURIComponent(period)}`);

  const fetchRecorderPatterns = (filters = {}) =>
    _get(
      '/analytics/approval/recorder-patterns',
      { days: filters.days, estate: filters.estate || undefined, only_flagged: filters.onlyFlagged || undefined },
      { ttl: 300000 },
    );

  // --- Clerk Lookup (authenticated/tenant-scoped) ---
  async function clerkOptions() {
    const url = _baseUrlObj('/public/clerk-options');
    if (activeTenant) url.searchParams.set('tenant', activeTenant);
    const res = await fetch(url.toString(), { headers: authHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error('Could not load the clerk list.');
    return res.json();
  }

  async function lookupClerks(q, from, to) {
    const url = _baseUrlObj('/public/clerk-lookup');
    url.searchParams.set('q', q);
    if (activeTenant) url.searchParams.set('tenant', activeTenant);
    if (from) url.searchParams.set('date_from', from);
    if (to) url.searchParams.set('date_to', to);
    const res = await fetch(url.toString(), { headers: authHeaders() });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || body.message || 'Could not search clerks.');
    return body;
  }

  // --- Workforce / Employees ---
  const fetchEmployees = (filtersOrStatus = 'ALL') => {
    const p = typeof filtersOrStatus === 'string' ? { status: filtersOrStatus === 'ALL' ? undefined : filtersOrStatus } : filtersOrStatus;
    return _get('/employees/', p, { noCache: true });
  };

  const toggleWorkerStatus = (employeeId, workerStatus) =>
    _patch(`/employees/${encodeURIComponent(employeeId)}/status?worker_status=${encodeURIComponent(workerStatus)}`, {});

  const bulkUpdateWorkerStatus = (employeeIds, workerStatus) =>
    _post('/employees/bulk-status', { employee_ids: employeeIds, worker_status: workerStatus });

  const bulkCreateEmployees = (employees) => _post('/employees/bulk', { employees });

  async function uploadEmployeeCSV(file, onProgress) {
    if (onProgress) onProgress(30);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(_fullUrl('/employees/upload-csv'), {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    if (onProgress) onProgress(100);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.message || `Upload failed (${res.status})`);
    invalidateCache();
    return data;
  }

  // --- Portal GeoJSON & Refresh ---
  const fetchGeoJSON = () => _get('/system/geojson', {}, { ttl: 120000 });
  const refreshAnalytics = () => _post('/system/refresh', {});

  async function fetchAllAnalytics(filters = {}) {
    const [indiv, plots, emps] = await Promise.all([
      fetchApprovalRecords({ ...filters, size: 100 }),
      fetchPlotTable({ ...filters, size: 100 }),
      fetchEmployees('ALL'),
    ]);
    return {
      individual: indiv || { items: [], total: 0 },
      plots: plots || { items: [], total: 0 },
      employees: emps || { items: [], total: 0 },
    };
  }

  // --- System Logs & Alerts ---
  const fetchSystemLogs = (params = {}) => _get('/log', params, { noCache: true });
  const clearSystemLogs = (days = null, purgeAll = false) => {
    const q = new URLSearchParams();
    if (days != null) q.set('days', days);
    if (purgeAll) q.set('purge_all', 'true');
    return _delete(`/log/clear?${q.toString()}`);
  };
  function getExportLogsUrl(params = {}) {
    const url = _baseUrlObj('/log/export');
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
    return signedUrl(url);
  }
  const fetchAlertRecipients = () => _get('/alerts/recipients', {}, { noCache: true });
  const createAlertRecipient = (payload) => _post('/alerts/recipients', payload);
  const updateAlertRecipient = (id, payload) => _patch(`/alerts/recipients/${id}`, payload);
  const deleteAlertRecipient = (id) => _delete(`/alerts/recipients/${id}`);
  const sendTestAlert = (payload = {}) => _post('/alerts/test', payload);
  const fetchAlertStatus = () => _get('/alerts/status', {}, { noCache: true });
  const updateSmtpConfig = (payload = {}) => _post('/alerts/config', payload);
  const fetchAlertHistory = (params = {}) => _get('/alerts/history', params, { noCache: true });
  const deleteAlertHistory = (ids) => _post('/alerts/history/delete', { ids });

  // Stubs for portal-level user list controls (org credentials are managed in FarmIntelytics Admin)
  const fetchUsers = async () => [];
  const createUser = async () => ({ message: 'Manage org logins under FarmIntelytics Admin -> Credentials.' });
  const toggleUserStatus = async () => ({});
  const updateUserAccess = async () => ({});
  const resetUserPassword = async () => ({});
  const deleteUser = async () => ({});
  const clearEmployees = async () => ({});
  const logout = () => invalidateCache();

  return {
    setActiveTenant,
    getActiveTenant,
    invalidateCache,
    resolveImageUrl,
    fetchSettings,
    fetchAppConnection,
    fetchAllAnalytics,
    fetchDashboardCards,
    fetchMainChart,
    fetchHarvestedBunches,
    fetchPickFruit,
    fetchPlotCards,
    fetchPlotProductionTrend,
    fetchProductionPredictions,
    fetchPlotTable,
    fetchPlotComparison,
    fetchWorkerCards,
    fetchWorkerTable,
    fetchEfficiencyRanks,
    fetchPayoutSummary,
    fetchPayoutAnalytics,
    fetchApprovalRecords,
    approvalRecordsExportUrl,
    workersExportUrl,
    fetchApprovedWorkersSummary,
    fetchApprovedWorkers,
    fetchApprovalCards,
    fetchApprovalTotals,
    fetchPlotExceptions,
    fetchPlotHarvestHistory,
    fetchPlotDrilldown,
    updateApproval,
    bulkUpdateApprovals,
    fetchHarvesterGeo,
    fetchLoadedGeo,
    fetchWorkerGeo,
    fetchPlotsHarvestStatus,
    fetchPlotPlatforms,
    fetchGeospatialMarkers,
    fetchValidationSummary,
    fetchUsers,
    createUser,
    toggleUserStatus,
    updateUserAccess,
    resetUserPassword,
    deleteUser,
    fetchPayRates,
    updatePayRate,
    fetchSettlementPeriods,
    fetchSettlement,
    settlementExportUrl,
    lockSettlement,
    unlockSettlement,
    fetchRecorderPatterns,
    lookupClerks,
    clerkOptions,
    fetchEmployees,
    toggleWorkerStatus,
    bulkUpdateWorkerStatus,
    bulkCreateEmployees,
    clearEmployees,
    uploadEmployeeCSV,
    fetchGeoJSON,
    refreshAnalytics,
    fetchSystemLogs,
    clearSystemLogs,
    getExportLogsUrl,
    fetchAlertRecipients,
    createAlertRecipient,
    updateAlertRecipient,
    deleteAlertRecipient,
    sendTestAlert,
    fetchAlertStatus,
    updateSmtpConfig,
    fetchAlertHistory,
    deleteAlertHistory,
    logout,
  };
})();
