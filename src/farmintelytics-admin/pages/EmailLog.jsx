import { useEffect, useMemo, useState } from 'react';
import { Mail, RefreshCw, Eye, X, AlertCircle } from 'lucide-react';
import { fetchEmailLogs, fetchOrganizations } from '../../services/adminApi';
import ErrorBanner from '../components/ErrorBanner';
import { inputCls } from '../components/formHelpers';
import { Page, Button, IconButton, Chip, Pill, Table, Td, Empty, Loading, Stat } from '../components/ui';

const STATUS_MAP = {
  sent: ['Sent', 'good'],
  logged: ['Logged (no SMTP)', 'neutral'],
  failed: ['Failed', 'critical'],
};

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

/**
 * Audit log of every alert notification email dispatched or logged across all
 * organisations (T2/T28). Shows recipients, alert counts, delivery status, and
 * plain error descriptions when email transport fails.
 */
const EmailLog = () => {
  const [logs, setLogs] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [company, setCompany] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inspectLog, setInspectLog] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchEmailLogs({ companyId: company, limit: 100 });
      setLogs(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load email log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations()
      .then((o) => setOrgs(Array.isArray(o) ? o : o?.items || []))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [company]); // eslint-disable-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps

  const orgName = (schema) => orgs.find((o) => o.schema_name === schema)?.display_name || schema;

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      return true;
    });
  }, [logs, statusFilter]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l) => l.status === 'sent').length;
    const logged = logs.filter((l) => l.status === 'logged').length;
    const failed = logs.filter((l) => l.status === 'failed').length;
    const totalAlerts = logs.reduce((sum, l) => sum + (Number(l.alert_count) || 0), 0);
    return { total, sent, logged, failed, totalAlerts };
  }, [logs]);

  return (
    <Page
      wide
      eyebrow="Operations"
      title="Email log"
      text="Audit log of alert emails: every alert message sent or recorded after a monitoring run, with recipients, alert counts and plain delivery diagnostics."
      actions={
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      }
    >
      <ErrorBanner message={error} onDismiss={() => setError('')} onRetry={load} />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total messages" value={stats.total} />
        <Stat label="Delivered" value={stats.sent} sub={stats.sent ? 'Successfully dispatched' : null} />
        <Stat label="Logged without SMTP" value={stats.logged} sub="Recorded locally" />
        <Stat
          label="Failed"
          value={stats.failed}
          sub={stats.failed ? 'Check error details' : 'Zero delivery errors'}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          ['', 'All statuses'],
          ['sent', 'Sent'],
          ['logged', 'Logged'],
          ['failed', 'Failed'],
        ].map(([val, label]) => (
          <Chip key={val} on={statusFilter === val} onClick={() => setStatusFilter(val)}>
            {label}
          </Chip>
        ))}

        <select
          className={`${inputCls} w-auto ml-auto text-sm`}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          aria-label="Filter by organisation"
        >
          <option value="">All organisations</option>
          {orgs.map((o) => (
            <option key={o.schema_name} value={o.schema_name}>
              {o.display_name}
            </option>
          ))}
        </select>
      </div>

      {loading && !logs.length ? (
        <Loading>Loading email logs…</Loading>
      ) : filteredLogs.length === 0 ? (
        <Empty>
          {logs.length === 0
            ? 'No alert emails sent yet. When a run detects critical alerts and an organisation has recipients configured, emails appear here.'
            : 'No email logs match the selected filter.'}
        </Empty>
      ) : (
        <Table
          columns={[
            { label: 'Date & time' },
            { label: 'Organisation' },
            { label: 'Run' },
            { label: 'Recipients' },
            { label: 'Alerts' },
            { label: 'Status' },
            { label: 'Diagnostic' },
            { label: '', className: 'w-12' },
          ]}
        >
          {filteredLogs.map((log) => {
            const [label, tone] = STATUS_MAP[log.status] || [log.status, 'neutral'];
            const recipients = Array.isArray(log.recipients) ? log.recipients : [];
            const recipientSummary = recipients.length === 0
              ? 'None'
              : recipients.length === 1
              ? recipients[0]
              : `${recipients[0]} (+${recipients.length - 1} more)`;

            return (
              <tr
                key={log.id}
                onClick={() => setInspectLog(log)}
                className={`cursor-pointer ${
                  log.status === 'failed' ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'
                }`}
              >
                <Td className="whitespace-nowrap text-xs text-gray-700">
                  {fmtDate(log.sent_at)}
                </Td>
                <Td>
                  <p className="font-semibold text-gray-900">{orgName(log.company_id)}</p>
                  <p className="text-xs font-mono text-gray-500">{log.company_id}</p>
                </Td>
                <Td className="font-mono text-xs text-gray-600">
                  {log.run_id ? log.run_id.slice(0, 12) : '—'}
                </Td>
                <Td className="text-xs text-gray-700 max-w-[200px] truncate" title={recipients.join(', ')}>
                  {recipientSummary}
                </Td>
                <Td>
                  <span className="font-mono text-xs font-semibold text-gray-900">
                    {log.alert_count} alert{log.alert_count === 1 ? '' : 's'}
                  </span>
                </Td>
                <Td>
                  <Pill tone={tone}>{label}</Pill>
                </Td>
                <Td className="text-xs text-gray-600 max-w-[220px] truncate">
                  {log.error ? (
                    <span className="text-red-700 font-medium">{log.error}</span>
                  ) : log.status === 'logged' ? (
                    <span className="text-gray-500 italic">No SMTP configured; logged</span>
                  ) : (
                    <span className="text-green-700">Delivered</span>
                  )}
                </Td>
                <Td>
                  <IconButton
                    label="View email details"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectLog(log);
                    }}
                  >
                    <Eye size={15} />
                  </IconButton>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Detail inspect modal */}
      {inspectLog && (
        <div
          className="fixed inset-0 z-[1100] bg-gray-900/30 flex items-center justify-center p-4"
          onClick={() => setInspectLog(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-gray-200 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-7 pt-6 border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-green-700">
                  Email transmission #{inspectLog.id}
                </span>
                <h3 className="font-display text-lg font-semibold text-gray-900 mt-1">
                  {inspectLog.subject || 'Alert notification'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {orgName(inspectLog.company_id)} · Sent {fmtDate(inspectLog.sent_at)}
                </p>
              </div>
              <IconButton label="Close" onClick={() => setInspectLog(null)}>
                <X size={18} />
              </IconButton>
            </div>

            <div className="px-7 py-5 space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-500 block">Organisation</span>
                  <span className="font-semibold text-gray-800">{orgName(inspectLog.company_id)}</span>
                  <span className="font-mono text-gray-500 block">({inspectLog.company_id})</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Run ID</span>
                  <span className="font-mono text-gray-800 break-all">{inspectLog.run_id || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Status</span>
                  <Pill tone={STATUS_MAP[inspectLog.status]?.[1] || 'neutral'}>
                    {STATUS_MAP[inspectLog.status]?.[0] || inspectLog.status}
                  </Pill>
                </div>
                <div>
                  <span className="text-gray-500 block">Alert count</span>
                  <span className="font-semibold text-gray-800">{inspectLog.alert_count} alert(s)</span>
                </div>
              </div>

              {inspectLog.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-red-800">
                    <AlertCircle size={14} />
                    Delivery error
                  </div>
                  <p className="font-mono whitespace-pre-wrap">{inspectLog.error}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                  Recipients ({(inspectLog.recipients || []).length})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(inspectLog.recipients || []).length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No recipients recorded</span>
                  ) : (
                    (inspectLog.recipients || []).map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 border border-gray-200"
                      >
                        <Mail size={12} className="text-gray-500" />
                        {r}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {inspectLog.body && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">
                    Message body
                  </label>
                  <pre className="p-3.5 bg-white rounded-xl border border-gray-200 font-mono text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto max-h-60 leading-relaxed">
                    {inspectLog.body}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end px-7 pb-6 pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setInspectLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

export default EmailLog;
