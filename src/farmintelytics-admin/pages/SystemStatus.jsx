import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Server,
  Database,
  Layers,
  Cpu,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Mail,
  Send,
  Check,
} from 'lucide-react';
import {
  fetchSystemStatus,
  updateSystemAlertSettings,
  resolveSystemAlert,
  sendTestSystemAlert,
} from '../../services/adminApi';
import { Tabs } from '../components/ui';
import StorageUsage from './system/StorageUsage';

const SERVICE_META = {
  backend:         { name: 'Backend API',        icon: Server,    desc: 'Core Django & Ninja REST API services' },
  database:        { name: 'PostgreSQL Database', icon: Database,  desc: 'Relational & PostGIS geospatial tables' },
  redis:           { name: 'Redis Broker',       icon: Layers,    desc: 'Celery queue and memory cache layer' },
  celery:          { name: 'Celery Workers',     icon: Cpu,       desc: 'Scheduled tasks and report workers' },
  pipeline_worker: { name: 'Pipeline Worker',    icon: Activity,  desc: 'Geospatial imagery analytics processor' },
  minio:           { name: 'Object Storage',     icon: HardDrive, desc: 'MinIO imagery rasters and run artifacts' },
  disk:            { name: 'Storage Disk Space', icon: HardDrive, desc: 'Server filesystem capacity (<85% threshold)' },
};

export default function SystemStatus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [tab, setTab] = useState('overview');

  // Team alert emails editor
  const [emailsInput, setEmailsInput] = useState('');
  const [savingEmails, setSavingEmails] = useState(false);
  const [savedEmailsNotice, setSavedEmailsNotice] = useState(null);

  // Test alert sender
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchSystemStatus();
      setData(res);
      if (res.team_alert_emails) {
        setEmailsInput(res.team_alert_emails.join(', '));
      }
    } catch (err) {
      setError(err.message || 'Could not load system status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchSystemStatus()
      .then((res) => {
        if (!active) return;
        setData(res);
        setLoading(false);
        if (res.team_alert_emails) {
          setEmailsInput(res.team_alert_emails.join(', '));
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Could not load system status');
        setLoading(false);
      });

    const interval = setInterval(loadStatus, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [loadStatus]);

  const handleResolveAlert = async (alertId) => {
    try {
      setResolvingId(alertId);
      await resolveSystemAlert(alertId);
      await loadStatus();
    } catch (err) {
      setError(`Could not resolve alert: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  const handleSaveEmails = async (e) => {
    e.preventDefault();
    try {
      setSavingEmails(true);
      setSavedEmailsNotice(null);
      const list = emailsInput.split(',').map((s) => s.trim()).filter((s) => s && s.includes('@'));
      await updateSystemAlertSettings(list);
      setSavedEmailsNotice('Team alert recipient list updated.');
      await loadStatus();
    } catch (err) {
      setError(`Could not update alert recipients: ${err.message}`);
    } finally {
      setSavingEmails(false);
    }
  };

  const handleSendTestAlert = async () => {
    try {
      setSendingTest(true);
      setTestResult(null);
      const res = await sendTestSystemAlert('Test verification notice triggered from System Status console');
      setTestResult(res.notified_team ? 'Notice sent to team addresses.' : 'Notice logged (no recipients or SMTP host).');
      await loadStatus();
    } catch (err) {
      setError(`Test alert failed: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const services = data?.services || {};
  const activeAlerts = data?.active_alerts || [];
  // Until the first check returns, the status is unknown: show that, never an outage.
  const overallStatus = data?.status || 'checking';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-gray-900">System status</h1>
          <p className="text-sm text-gray-500 mt-1">
            Health of every platform service, storage use, incidents and who is told about them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">
            Updated {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '...'}
          </span>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'storage', label: 'Storage' },
        { id: 'incidents', label: 'Incidents', count: activeAlerts.length },
        { id: 'notices', label: 'Team notices' },
      ]} />

      {tab === 'overview' && (<>
      {/* ── Overall System Banner ── */}
      <div
        className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          overallStatus === 'checking'
            ? 'bg-white border-gray-200 text-gray-800'
            : overallStatus === 'healthy'
            ? 'bg-green-50/50 border-green-200 text-green-900'
            : overallStatus === 'degraded'
            ? 'bg-amber-50/60 border-amber-200 text-amber-900'
            : 'bg-red-50/60 border-red-200 text-red-900'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              overallStatus === 'checking'
                ? 'bg-gray-100 text-gray-500'
                : overallStatus === 'healthy'
                ? 'bg-green-100 text-green-700'
                : overallStatus === 'degraded'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {overallStatus === 'checking' ? (
              <RefreshCw size={22} className="animate-spin" />
            ) : overallStatus === 'healthy' ? (
              <CheckCircle2 size={24} />
            ) : overallStatus === 'degraded' ? (
              <AlertTriangle size={24} />
            ) : (
              <XCircle size={24} />
            )}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold capitalize">
              {overallStatus === 'checking'
                ? 'Checking services…'
                : overallStatus === 'healthy'
                ? 'All systems operational'
                : overallStatus === 'degraded'
                ? 'System performance degraded'
                : 'System outage / attention required'}
            </h2>
            <p className="text-xs opacity-80 mt-0.5">
              {overallStatus === 'checking'
                ? 'Asking each service for its state.'
                : activeAlerts.length === 0
                ? 'No unhandled errors or bottlenecks flagged.'
                : `${activeAlerts.length} active incident(s) require operator review.`}
            </p>
          </div>
        </div>

        {activeAlerts.length > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 self-start md:self-auto">
            {activeAlerts.length} need action
          </span>
        )}
      </div>

      {/* ── 7 Services Status Grid ── */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-gray-900">Services diagnostics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(SERVICE_META).map(([key, meta]) => {
            const s = services[key] || {};
            const isOk = s.status === 'ok';
            const isCritical = s.status === 'critical' || s.status === 'down';
            const Icon = meta.icon;

            return (
              <div
                key={key}
                className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between hover:border-gray-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-600">
                        <Icon size={16} />
                      </div>
                      <h3 className="font-medium text-sm text-gray-900">{meta.name}</h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isOk
                          ? 'bg-green-50 text-green-700'
                          : isCritical
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOk ? 'bg-green-600' : isCritical ? 'bg-red-600' : 'bg-amber-500'
                        }`}
                      />
                      {s.status ? s.status.toUpperCase() : 'UNKNOWN'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{meta.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-600 space-y-1 font-mono">
                  {key === 'disk' && s.percent_used !== undefined ? (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Used: {s.percent_used}%</span>
                        <span>Free: {s.free_gb} GB</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.percent_used > 85 ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(100, s.percent_used)}%` }}
                        />
                      </div>
                    </div>
                  ) : key === 'pipeline_worker' ? (
                    <>
                      <div>Active workers: <span className="text-gray-800">{s.workers_count !== undefined ? s.workers_count : (s.status === 'ok' ? 1 : 0)}</span></div>
                      <div>State: <span className="font-semibold text-gray-800">{s.state || 'stopped'}</span></div>
                      {s.last_heartbeat_seconds_ago !== undefined && (
                        <div>Heartbeat: <span className="text-gray-800">{s.last_heartbeat_seconds_ago}s ago</span></div>
                      )}
                      {s.workers && s.workers.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                          {s.workers.map((w) => (
                            <div key={w.worker_id} className="flex justify-between items-center text-[11px]">
                              <span className="font-semibold text-gray-700 truncate max-w-[120px]">{w.worker_id}</span>
                              <span className={w.is_healthy ? 'text-green-700' : 'text-amber-700'}>
                                {w.state} ({w.last_heartbeat_seconds_ago}s ago)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {s.latency_ms !== undefined && (
                        <div>Latency: <span className="text-gray-800">{s.latency_ms} ms</span></div>
                      )}
                      {s.workers_count !== undefined && (
                        <div>Active workers: <span className="text-gray-800">{s.workers_count}</span></div>
                      )}
                      {s.message && <div className="text-amber-700 font-sans">{s.message}</div>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      </>)}

      {tab === 'storage' && <StorageUsage disk={services.disk} />}

      {tab === 'incidents' && (<>
      {/* ── Active Incidents Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-gray-900">Active incidents</h2>
          <span className="text-xs text-gray-400">{activeAlerts.length} unresolved</span>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <CheckCircle2 size={32} className="mx-auto text-green-600 mb-2 opacity-80" />
            <p className="font-medium text-sm text-gray-800">All systems operating normally</p>
            <p className="text-xs text-gray-500 mt-1">
              No failed runs, stuck jobs, worker restarts, or email delivery issues.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {alert.category_label || alert.category}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                    {alert.company_id && (
                      <span className="text-xs font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                        Org: {alert.company_id}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{alert.details}</p>
                </div>
                <button
                  onClick={() => handleResolveAlert(alert.id)}
                  disabled={resolvingId === alert.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-50 shrink-0 self-start md:self-auto"
                >
                  <Check size={14} />
                  {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      </>)}

      {tab === 'notices' && (<>
      {/* ── Team Notifications Setting (alerts.team_emails) ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-700">
            <Mail size={16} />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-gray-900">
              Team alert notifications (Integrations setting)
            </h3>
            <p className="text-xs text-gray-500">
              Addresses notified when runs fail, jobs get stuck, disk exceeds 85%, or workers restart (T38).
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveEmails} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Recipient email addresses (comma-separated)
            </label>
            <input
              type="text"
              value={emailsInput}
              onChange={(e) => setEmailsInput(e.target.value)}
              placeholder="ops@farmintelytics.com, team@farmintelytics.com"
              className="w-full text-sm px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingEmails}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[var(--brand-primary)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {savingEmails ? 'Saving...' : 'Save recipients'}
              </button>
              <button
                type="button"
                onClick={handleSendTestAlert}
                disabled={sendingTest}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <Send size={13} />
                {sendingTest ? 'Sending...' : 'Send test notice'}
              </button>
            </div>

            {savedEmailsNotice && (
              <span className="text-xs text-green-700 font-medium">{savedEmailsNotice}</span>
            )}
            {testResult && (
              <span className="text-xs text-gray-600 font-medium">{testResult}</span>
            )}
          </div>
        </form>
      </div>
      </>)}
    </div>
  );
}
