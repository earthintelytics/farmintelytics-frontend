import { useCallback, useEffect, useState } from 'react';
import { FileText, RefreshCw, Eye, X, Download, Search } from 'lucide-react';
import { fetchOrganizations } from '../../services/adminApi';
import { fetchActivityLogs, exportActivityLogs } from '../../services/activityApi';
import ErrorBanner from '../components/ErrorBanner';
import { inputCls } from '../components/formHelpers';
import { Page, Card, CardHeader, Button, IconButton, Pill, Table, Td, Empty, Loading } from '../components/ui';

const ACTION_PILL_MAP = {
  create: ['Created', 'good'],
  update: ['Updated', 'neutral'],
  delete: ['Deleted', 'critical'],
  export: ['Exported', 'neutral'],
  login: ['Sign in', 'neutral'],
  trigger: ['Triggered', 'neutral'],
};

const TARGET_TYPES = [
  { id: '', label: 'All targets' },
  { id: 'licence', label: 'Licences' },
  { id: 'schedule', label: 'Schedules' },
  { id: 'threshold', label: 'Map classes & thresholds' },
  { id: 'integration', label: 'Integrations & AI' },
  { id: 'user', label: 'Users & roles' },
  { id: 'boundary', label: 'Boundaries' },
  { id: 'protected_area', label: 'Protected areas' },
  { id: 'activity_log', label: 'Activity & exports' },
];

const fmtDate = (t) => {
  if (!t) return '—';
  try {
    return new Date(t).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(t);
  }
};

export default function Activity() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [orgs, setOrgs] = useState([]);
  const [company, setCompany] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [inspectLog, setInspectLog] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchActivityLogs({
        page,
        pageSize,
        organizationId: company,
        targetType,
        action: actionFilter,
        search,
      });
      setLogs(data?.items || []);
      setTotal(data?.total || 0);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load activity audit log.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, company, targetType, actionFilter, search]);

  useEffect(() => {
    fetchOrganizations()
      .then((o) => setOrgs(Array.isArray(o) ? o : o?.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportActivityLogs(company);
      setSuccessMsg(`Export recorded: ${res.total_records || 0} records for ${res.scope || 'all organisations'}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      load();
    } catch (e) {
      setError(e.message || 'Failed to export activity logs.');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Page
      eyebrow="Operations"
      title="Activity audit log"
      text="Trace administrative changes, licence events, schedule updates, and configuration diffs across all organisations."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" onClick={handleExport} disabled={exporting || loading}>
            <Download size={14} />
            <span>{exporting ? 'Exporting...' : 'Export log'}</span>
          </Button>
        </div>
      }
      wide
    >
      {error && <ErrorBanner error={error} onDismiss={() => setError('')} />}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium">
          {successMsg}
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className={`${inputCls} pl-9`}
              placeholder="Search user, summary, or target ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-48">
            <select
              className={inputCls}
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All organisations</option>
              {orgs.map((o) => (
                <option key={o.schema_name} value={o.schema_name}>
                  {o.name || o.schema_name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-48">
            <select
              className={inputCls}
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value);
                setPage(1);
              }}
            >
              {TARGET_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="w-36">
            <select
              className={inputCls}
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="export">Export</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader
          title={`Activity events (${total})`}
          text="Complete record of actions with before/after state diffs (credentials automatically scrubbed)."
        />

        {loading ? (
          <div className="p-12">
            <Loading text="Loading activity logs..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12">
            <Empty
              icon={FileText}
              title="No activity events found"
              text="No audit events matched your search or filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table
              columns={['When', 'Who', 'Organisation', 'Action', 'Target', 'Summary', 'Changes'].map((label) => ({ label }))}
            >
              {logs.map((log) => {
                const [pillLabel, pillKind] = ACTION_PILL_MAP[log.action] || [log.action, 'neutral'];
                return (
                  <tr key={log.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                    <Td className="whitespace-nowrap text-xs text-gray-500 font-mono">
                      {fmtDate(log.created_at)}
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 text-xs">{log.user_email}</span>
                        <span className="text-[11px] text-gray-500 capitalize">{log.user_role || 'user'}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono font-medium text-gray-700">
                        {log.organization_id || <span className="text-gray-400 italic">System</span>}
                      </span>
                    </Td>
                    <Td>
                      <Pill tone={pillKind}>{pillLabel}</Pill>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-800 capitalize">{log.target_type}</span>
                        {log.target_id && (
                          <span className="text-[11px] font-mono text-gray-400 truncate max-w-[140px]" title={log.target_id}>
                            {log.target_id}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="max-w-md">
                      <p className="text-xs text-gray-700 truncate" title={log.summary}>
                        {log.summary || '—'}
                      </p>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <IconButton
                        label="View change diff"
                        onClick={() => setInspectLog(log)}
                        disabled={!log.before_value && !log.after_value}
                      >
                        <Eye size={15} />
                      </IconButton>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <span>
              Page {page} of {totalPages} ({total} events)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Diff Inspection Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold text-gray-900 text-base">
                  What changed: {inspectLog.target_type} ({inspectLog.target_id || inspectLog.id})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Action performed by {inspectLog.user_email} on {fmtDate(inspectLog.created_at)}
                </p>
              </div>
              <IconButton label="Close" onClick={() => setInspectLog(null)}>
                <X size={16} />
              </IconButton>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {inspectLog.summary && (
                <div className="p-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-700">
                  <span className="font-semibold text-gray-900">Summary: </span>
                  {inspectLog.summary}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before State */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Before</span>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded-xl text-xs font-mono h-64 overflow-y-auto border border-gray-800">
                    {inspectLog.before_value ? (
                      <pre className="whitespace-pre-wrap">{JSON.stringify(inspectLog.before_value, null, 2)}</pre>
                    ) : (
                      <span className="text-gray-500 italic">No previous state recorded (created new)</span>
                    )}
                  </div>
                </div>

                {/* After State */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-green-700">After</span>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded-xl text-xs font-mono h-64 overflow-y-auto border border-gray-800">
                    {inspectLog.after_value ? (
                      <pre className="whitespace-pre-wrap text-green-300">{JSON.stringify(inspectLog.after_value, null, 2)}</pre>
                    ) : (
                      <span className="text-gray-500 italic">No resulting state (deleted)</span>
                    )}
                  </div>
                </div>
              </div>

              {inspectLog.ip_address && (
                <p className="text-[11px] text-gray-400">
                  Client IP: <span className="font-mono text-gray-600">{inspectLog.ip_address}</span>
                </p>
              )}
            </div>

            <div className="px-6 py-3 border-t border-gray-100 flex justify-end bg-white border border-gray-200">
              <Button variant="secondary" onClick={() => setInspectLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
