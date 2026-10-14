import { useState, useEffect, useMemo } from 'react';
import { Clock, Plus, Trash2, Pencil, X, Check, ChevronDown, Play, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  fetchSchedulerJobs, createSchedulerJob, updateSchedulerJob, deleteSchedulerJob,
  fetchPipelineConfigs, fetchOrganizations, fetchPipelineLogs, runSchedulerJob, runOrganizationServices,
} from '../../services/adminApi';
import { runnableServiceOptions } from './organisation/serviceOptions';
import { useConfirm } from '../components/ConfirmProvider';
import ErrorBanner from '../components/ErrorBanner';
import { WEEKDAYS, DEFAULT_SCHEDULE, cronFor, parseCron, scheduleText, nextRun, nextRuns, cronError } from '../components/schedule';
import { Page, Button, IconButton, Toggle, Pill, Note } from '../components/ui';

/**
 * Monitoring schedule: when each organisation's crop and tree services
 * get new satellite images processed. Plain schedules (every N days / weekly /
 * monthly at a time); the cron rule only appears under technical details.
 */
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:border-green-600';
const Chip = ({ on, children, ...rest }) => (
  <button type="button" {...rest} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${on ? 'bg-green-50 border-green-600 text-green-800' : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}>{children}</button>
);
const fmt = (d) => (d ? d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const RUN_TONE = {
  success: 'good',
  completed: 'good',
  partial: 'warning',
  failed: 'critical',
  processing: 'info',
  pending: 'warning',
};

const RUN_LABEL = {
  success: 'Done',
  completed: 'Done',
  partial: 'Partial',
  failed: 'Failed',
  processing: 'Running',
  pending: 'Waiting',
};

function formatScheduleWords(cron) {
  if (!cron) return 'Not scheduled';
  const parsed = parseCron(cron);
  if (parsed) {
    const text = scheduleText(parsed);
    return text.charAt(0).toLowerCase() + text.slice(1);
  }
  return `custom rule (${cron})`;
}

function SchedulePicker({ value, onChange }) {
  const s = value;
  const set = (patch) => onChange({ ...s, ...patch });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[['days', 'Every few days'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['custom', 'Custom rule']].map(([id, label]) => (
          <Chip key={id} on={s.mode === id} onClick={() => set(id === 'custom' && !s.custom ? { mode: id, custom: cronFor(s) } : { mode: id })}>{label}</Chip>
        ))}
      </div>
      {s.mode === 'custom' ? <CustomRule value={s.custom || ''} onChange={(custom) => set({ custom })} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {s.mode === 'days' && (
            <label className="space-y-1.5 block">
              <span className="text-sm font-semibold text-gray-800">How often</span>
              <select className={inputCls} value={s.every} onChange={(e) => set({ every: +e.target.value })}>
                {[1, 2, 3, 5, 7, 10, 14].map((n) => <option key={n} value={n}>{n === 1 ? 'Every day' : `Every ${n} days`}</option>)}
              </select>
            </label>
          )}
          {s.mode === 'days' && Number(s.every) > 1 && (
            <label className="space-y-1.5 block">
              <span className="text-sm font-semibold text-gray-800">Starting on day</span>
              <select className={inputCls} value={s.startDay || 1} onChange={(e) => set({ startDay: +e.target.value })}>
                {Array.from({ length: Number(s.every) }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d === 1 ? '1 (default)' : d}</option>)}
              </select>
              <span className="block text-xs text-gray-500">Give each organisation a different start day to spread the load.</span>
            </label>
          )}
          {s.mode === 'weekly' && (
            <label className="space-y-1.5 block">
              <span className="text-sm font-semibold text-gray-800">Day</span>
              <select className={inputCls} value={s.weekday} onChange={(e) => set({ weekday: +e.target.value })}>
                {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
          )}
          {s.mode === 'monthly' && (
            <label className="space-y-1.5 block">
              <span className="text-sm font-semibold text-gray-800">Day of the month</span>
              <select className={inputCls} value={s.monthday} onChange={(e) => set({ monthday: +e.target.value })}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
          )}
          <label className="space-y-1.5 block">
            <span className="text-sm font-semibold text-gray-800">Time (server time)</span>
            <select className={inputCls} value={s.hour} onChange={(e) => set({ hour: +e.target.value, minute: 0 })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </label>
        </div>
      )}
      {s.mode !== 'custom' && (
        <p className="text-sm text-gray-700">
          Runs <span className="font-semibold">{scheduleText(s).charAt(0).toLowerCase() + scheduleText(s).slice(1)}</span>.
        </p>
      )}
    </div>
  );
}

export function CustomRule({ value, onChange }) {
  const err = value.trim() ? cronError(value) : 'Type a rule, e.g. "0 3 1,15 * *" (03:00 on the 1st and 15th).';
  const runs = err ? [] : nextRuns(value, 3);
  const simple = err ? null : parseCron(value);
  return (
    <div className="space-y-2">
      <label className="space-y-1.5 block">
        <span className="text-sm font-semibold text-gray-800">Cron rule</span>
        <input className={`${inputCls} font-mono`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="minute hour day-of-month month day-of-week" spellCheck={false} />
      </label>
      <div className="text-xs text-gray-500">5 parts: minute (0–59) · hour (0–23) · day of month (1–31) · month (1–12) · day of week (0–6, Sunday = 0). Use * for any, lists 1,15, ranges 1-5, steps */6.</div>
      {err ? <div className="text-xs text-amber-800">{err}</div> : (
        <div className="text-sm text-gray-700">{simple && <><span className="font-semibold">{scheduleText(simple)}</span>. </>}Next runs: {runs.map((d) => d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })).join(' · ') || 'none within a year'}</div>
      )}
    </div>
  );
}

function JobModal({ job, orgs, configs, onSave, onClose }) {
  const parsed = job ? parseCron(job.cron) : DEFAULT_SCHEDULE;
  const [schedule, setSchedule] = useState(parsed || { ...DEFAULT_SCHEDULE, mode: 'custom', custom: job?.cron || '' });
  const [org, setOrg] = useState(() => (job ? orgs.find((o) => (job.company_id && o.schema_name === job.company_id) || job.name.startsWith(o.schema_name))?.schema_name || '' : ''));
  const [configPath, setConfigPath] = useState(job?.config_path || '');
  const [name, setName] = useState(job?.name || '');
  const [description, setDescription] = useState(job?.description || '');
  const [isBatch, setIsBatch] = useState(job ? job.is_batch : true);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const orgConfigs = org ? configs.filter((c) => c.filename.startsWith(org) || (c.batch_name || '').startsWith(org)) : configs;
  const cron = cronFor(schedule);
  const autoName = configPath ? `${configPath.replace('configs/', '').replace(/\.ya?ml$/, '')}_scheduled_monitoring` : (org ? `${org}_monitoring` : '');

  const save = async () => {
    if (!configPath && !org) return setError('Choose an organisation or site configuration.');
    if (cronError(cron)) return setError(cronError(cron));
    setSaving(true); setError('');
    try {
      const site = configs.find((c) => `configs/${c.filename}` === configPath);
      await onSave(job?.name, {
        name: job?.name || name.trim() || autoName,
        cron,
        config_path: configPath || (org ? `configs/${org}_monitoring.yaml` : ''),
        is_batch: isBatch,
        enabled: job ? job.enabled : true,
        company_id: org || undefined,
        description: description.trim() || `Satellite monitoring for ${site?.batch_name || org || configPath}`,
      });
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-900/30 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl p-7 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-gray-900">{job ? 'Edit schedule' : 'New schedule'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Close"><X size={18} /></button>
        </div>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {!job && (
          <div className="grid grid-cols-1 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-sm font-semibold text-gray-800">Organisation</span>
              <select className={inputCls} value={org} onChange={(e) => { setOrg(e.target.value); setConfigPath(''); }}>
                <option value="">All organisations</option>
                {orgs.map((o) => <option key={o.schema_name} value={o.schema_name}>{o.display_name || o.schema_name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 block">
              <span className="text-sm font-semibold text-gray-800">Site or configuration</span>
              <select className={inputCls} value={configPath} onChange={(e) => setConfigPath(e.target.value)}>
                <option value="">Standard monitoring for organisation</option>
                {orgConfigs.map((c) => <option key={c.filename} value={`configs/${c.filename}`}>{c.batch_name || c.filename}</option>)}
              </select>
            </label>
          </div>
        )}
        <SchedulePicker value={schedule} onChange={setSchedule} />
        <div className="rounded-xl border border-gray-200">
          <button type="button" onClick={() => setAdvanced((a) => !a)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700">
            Technical details
            <ChevronDown size={16} className={advanced ? 'rotate-180' : ''} />
          </button>
          {advanced && (
            <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-4">
              {!job && <label className="space-y-1.5 block"><span className="text-sm font-semibold text-gray-800">Job name</span><input className={inputCls} placeholder={autoName || 'generated from site'} value={name} onChange={(e) => setName(e.target.value)} /></label>}
              <label className="space-y-1.5 block"><span className="text-sm font-semibold text-gray-800">Description</span><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Generated from organisation" /></label>
              <div className="text-xs text-gray-600">Cron rule saved: <span className="font-mono">{cron || '—'}</span></div>
              <label className="flex items-center gap-3 text-sm text-gray-800"><input type="checkbox" checked={isBatch} onChange={(e) => setIsBatch(e.target.checked)} className="w-4 h-4 accent-green-700" />Run all estates in this configuration together</label>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500"><Check size={15} />{saving ? 'Saving…' : job ? 'Save' : 'Create schedule'}</button>
        </div>
      </div>
    </div>
  );
}

function RunServicesModal({ org, onClose, onStarted }) {
  const options = runnableServiceOptions(org);
  const [chosen, setChosen] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggle = (id) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const start = async () => {
    if (!chosen.length) return setError('Choose at least one service.');
    setBusy(true); setError('');
    try { const res = await runOrganizationServices(org.schema_name, chosen); onStarted(res); } catch (e) { setError(e.message); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-900/30 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-xl p-7 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-gray-900">Run now: {org.display_name || org.schema_name}</h3>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100" aria-label="Close"><X size={18} /></button>
        </div>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {options.length === 0 ? (
          <p className="text-sm text-gray-600">This organisation has no licensed service that a monitoring run covers. Turn one on under its licence first.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Which services?</span>
              <button type="button" onClick={() => setChosen(chosen.length === options.length ? [] : options.map((o) => o.id))} className="text-xs font-semibold text-green-700 hover:underline">{chosen.length === options.length ? 'Clear all' : 'Choose all'}</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.map((o) => <Chip key={o.id} on={chosen.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}</Chip>)}
            </div>
            <p className="text-xs text-gray-500">Each service runs as its own job, only on the estates whose boundary is for that service. Progress shows under Pipeline runs.</p>
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50">Cancel</button>
          <button onClick={start} disabled={busy || !chosen.length} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500"><Play size={15} />{busy ? 'Starting…' : chosen.length ? `Run ${chosen.length} ${chosen.length === 1 ? 'service' : 'services'}` : 'Choose services'}</button>
        </div>
      </div>
    </div>
  );
}

const Scheduler = () => {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [started, setStarted] = useState({});
  const [jobs, setJobs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [runFor, setRunFor] = useState(null);
  const [orgStarted, setOrgStarted] = useState({});

  const load = async () => {
    try {
      const [j, c, o, l] = await Promise.all([
        fetchSchedulerJobs(),
        fetchPipelineConfigs().catch(() => []),
        fetchOrganizations().catch(() => []),
        fetchPipelineLogs(null, 100).catch(() => ({ logs: [] })),
      ]);
      setJobs(Array.isArray(j) ? j : []);
      setConfigs(Array.isArray(c) ? c : []);
      setOrgs(Array.isArray(o) ? o : o?.items || []);
      setLogs(l?.logs || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const rows = useMemo(() => jobs.map((job) => {
    const org = orgs.find((o) => (job.company_id && o.schema_name === job.company_id) || job.name.startsWith(o.schema_name) || job.config_path.includes(o.schema_name));
    const site = configs.find((c) => `configs/${c.filename}` === job.config_path);
    const last = logs.find((l) => l.kind === 'monitoring_run' && org && l.company_id === org.schema_name);
    const serviceName = job.service || (job.name.includes('_') ? job.name.split('_')[1] : null);
    return {
      job,
      org,
      site,
      serviceName,
      parsed: parseCron(job.cron),
      next: job.enabled ? (job.next_run_at ? new Date(job.next_run_at) : nextRun(job.cron)) : null,
      last: job.last_run_at ? { status: 'completed', timestamp: job.last_run_at } : last,
    };
  }), [jobs, orgs, configs, logs]);

  const groups = useMemo(() => {
    const byOrg = new Map(orgs.map((o) => [o.schema_name, { org: o, rows: [] }]));
    const unassigned = [];
    rows.forEach((r) => {
      if (r.org && byOrg.has(r.org.schema_name)) byOrg.get(r.org.schema_name).rows.push(r);
      else unassigned.push(r);
    });
    const list = [...byOrg.values()].sort((a, b) => (b.rows.length - a.rows.length) || (a.org.display_name || a.org.schema_name).localeCompare(b.org.display_name || b.org.schema_name));
    return { list, unassigned };
  }, [rows, orgs]);

  const toggle = async (job) => {
    setJobs((prev) => prev.map((j) => (j.name === job.name ? { ...j, enabled: !job.enabled } : j)));
    try { await updateSchedulerJob(job.name, { enabled: !job.enabled }); } catch (e) { setError(`Could not change it: ${e.message}`); await load(); }
  };

  const runNow = async (name) => {
    try { await runSchedulerJob(name); setStarted((s) => ({ ...s, [name]: true })); } catch (e) { setError(`Could not start it: ${e.message}`); }
  };
  const save = async (name, form) => { if (name) await updateSchedulerJob(name, form); else await createSchedulerJob(form); setModal(null); await load(); };
  const remove = async (name) => {
    if (!(await confirm(`Delete the schedule "${name}"? Monitoring for that service stops until a new schedule is created.`))) return;
    try { await deleteSchedulerJob(name); await load(); } catch (e) { setError(e.message); }
  };

  return (
    <Page
      wide
      eyebrow="Operations"
      title="Monitoring schedule"
      text="When each organisation's crop and tree services get new satellite images processed, when they run next, and how the last run went."
      actions={(
        <>
          <Button variant="secondary" onClick={load}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</Button>
          <Button onClick={() => setModal({ job: null })}><Plus size={16} />New schedule</Button>
        </>
      )}
    >
      <ErrorBanner message={error} onDismiss={() => setError('')} onRetry={load} />

      <Note tone="info">
        Each active schedule runs automatically via the backend scheduler service. Live executions and progress are tracked under Pipeline runs. Pausing a schedule preserves its settings without deleting the rule.
      </Note>

      {loading ? <div className="text-center py-16 text-sm text-gray-500">Loading schedules…</div> : groups.list.length === 0 && rows.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-gray-300 rounded-2xl text-sm text-gray-600">No organisations or schedules yet. Onboarding creates schedules automatically, or add one with “New schedule”.</div>
      ) : [...groups.list, ...(groups.unassigned.length ? [{ org: null, rows: groups.unassigned }] : [])].map(({ org: gOrg, rows: gRows }) => {
        const services = gOrg ? runnableServiceOptions(gOrg) : [];
        const key = gOrg?.schema_name || 'unassigned';
        return (
          <section key={key} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-gray-900">{gOrg ? (gOrg.display_name || gOrg.schema_name) : 'Not linked to an organisation'}</h2>
                {gOrg && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {services.length ? services.map((s) => <span key={s.id} className="text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200 text-gray-700">{s.label}</span>) : <span className="text-xs text-gray-500">No monitored services licensed</span>}
                  </div>
                )}
              </div>
              {gOrg && (orgStarted[key]
                ? <button onClick={() => navigate('/admin/runs')} className="shrink-0 px-3 py-2 rounded-xl text-sm font-semibold text-sky-800 bg-sky-50 border border-sky-200">{orgStarted[key]} started · view runs</button>
                : <button onClick={() => setRunFor(gOrg)} disabled={!services.length} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-800 border border-gray-300 hover:bg-gray-50 disabled:opacity-40"><Play size={15} />Run now…</button>)}
            </div>
            {gRows.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-500">No schedule for this organisation yet. Add one with “New schedule”, or use Run now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                    <tr>
                      <th className="px-5 py-3">Service</th>
                      <th className="px-5 py-3">Schedule</th>
                      <th className="px-5 py-3">Next run</th>
                      <th className="px-5 py-3">Last run</th>
                      <th className="px-5 py-3">On</th>
                      <th className="px-5 py-3 w-36 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gRows.map(({ job, site, next, last, serviceName }) => {
                      const serviceOption = services.find((s) => s.id === serviceName || s.id === `rs-${serviceName}`);
                      const displayTitle = serviceOption?.label || (serviceName ? `${serviceName.replace(/_/g, ' ')} monitoring` : (site?.batch_name || job.config_path.replace('configs/', '').replace(/\.ya?ml$/, '')));
                      return (
                        <tr key={job.name} className={job.enabled ? 'hover:bg-gray-50/50' : 'bg-gray-50/60'}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${job.enabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                <Clock size={16} />
                              </span>
                              <div>
                                <p className="font-semibold text-gray-900">{displayTitle}</p>
                                {site?.batch_name && site.batch_name !== displayTitle && <p className="text-xs text-gray-500">{site.batch_name}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-gray-800 font-medium">{formatScheduleWords(job.cron)}</div>
                            <div className="text-xs font-mono text-gray-400 mt-0.5">{job.cron}</div>
                          </td>
                          <td className="px-5 py-4 text-gray-700 font-mono text-xs">
                            {job.enabled ? (next ? fmt(next) : 'See custom rule') : <Pill tone="neutral">Paused</Pill>}
                          </td>
                          <td className="px-5 py-4">
                            {last ? (
                              <div>
                                <Pill tone={RUN_TONE[last.status] || 'neutral'}>{RUN_LABEL[last.status] || last.status || 'Done'}</Pill>
                                {last.timestamp && <div className="text-xs text-gray-500 font-mono mt-1">{fmt(new Date(last.timestamp))}</div>}
                              </div>
                            ) : <span className="text-xs text-gray-400">No run recorded yet</span>}
                          </td>
                          <td className="px-5 py-4">
                            <Toggle on={job.enabled} onChange={() => toggle(job)} label={job.enabled ? 'Pause schedule' : 'Resume schedule'} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {started[job.name]
                                ? <button onClick={() => navigate('/admin/runs')} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200">Started · view</button>
                                : <IconButton label="Run now" onClick={() => runNow(job.name)}><Play size={15} /></IconButton>}
                              <IconButton label="Edit" onClick={() => setModal({ job })}><Pencil size={15} /></IconButton>
                              <IconButton label="Delete" danger onClick={() => remove(job.name)}><Trash2 size={15} /></IconButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
      {runFor && <RunServicesModal org={runFor} onClose={() => setRunFor(null)} onStarted={(res) => { setOrgStarted((s) => ({ ...s, [runFor.schema_name]: `${res?.jobs?.length || 0} ${res?.jobs?.length === 1 ? 'job' : 'jobs'}` })); setRunFor(null); }} />}
      {modal && <JobModal job={modal.job} orgs={orgs} configs={configs} onSave={save} onClose={() => setModal(null)} />}
    </Page>
  );
};

export default Scheduler;
