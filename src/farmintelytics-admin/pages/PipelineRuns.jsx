import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, RotateCcw, Search, ChevronRight, Copy, Check } from 'lucide-react';
import { fetchAdminJobs, retryAdminJob, fetchOrganizations } from '../../services/adminApi';
import ErrorBanner from '../components/ErrorBanner';
import { inputCls } from '../components/formHelpers';
import { Page, Button, IconButton, Chip, Pill, Table, Td, Empty, Loading, Stat, Modal, Note } from '../components/ui';
import ErrorBox from './runlogs/ErrorBox';
import { copyText } from '../../utils/copyText';

const KINDS = {
  monitoring_run: 'Satellite monitoring',
  suitability_run: 'Suitability analysis',
  boundary_ingest: 'Boundary upload',
  dataset_ingest: 'Farm data upload',
  report_build: 'Report generation',
  eudr_check: 'EUDR check',
  parcel_check: 'Parcel check',
  drone_process: 'Drone survey',
};

const STATUS_MAP = {
  queued: ['Waiting', 'warning'],
  pending: ['Waiting', 'warning'],
  running: ['Running', 'info'],
  processing: ['Running', 'info'],
  done: ['Done', 'good'],
  completed: ['Done', 'good'],
  partial: ['Partial', 'warning'],
  failed: ['Failed', 'critical'],
};

const LIVE_MS = 10000;
const fmt = (t) => (t ? new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const took = (a, b) => {
  if (!a || !b) return '—';
  const s = Math.round((new Date(b) - new Date(a)) / 1000);
  return s < 90 ? `${s} s` : `${Math.round(s / 60)} min`;
};

function JobDetailModal({ job, orgName, onClose, onRetry }) {
  const [copied, setCopied] = useState(false);
  const [label, tone] = STATUS_MAP[job.status] || [job.status, 'neutral'];
  const copyRecord = () => {
    copyText(JSON.stringify(job, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <Modal
      size="lg"
      title={`${KINDS[job.kind] || job.kind}: ${orgName(job.company_id)}`}
      text={`Job ID: ${job.id}`}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={copyRecord}>
            {copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy details</>}
          </Button>
          {job.status === 'failed' && onRetry && (
            <Button onClick={() => onRetry(job.id)}>
              <RotateCcw size={14} />Run again
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </>
      )}
    >
      <div className="flex items-center gap-3">
        <Pill tone={tone}>
          {label}{job.status === 'running' && job.progress != null ? ` · ${job.progress}%` : ''}
        </Pill>
        {job.queue_position != null && job.status === 'queued' && (
          <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Queue place #{job.queue_position}
          </span>
        )}
        <span className="text-xs text-gray-500 font-mono">Started {fmt(job.started_at || job.created_at)}</span>
      </div>

      {job.error && <ErrorBox error={job.error} />}

      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
        {[
          ['Organisation', orgName(job.company_id)],
          ['Service / Farm', job.service || job.farm_id || 'All licensed'],
          ['Priority', job.priority || 'normal'],
          ['Duration', took(job.started_at, job.finished_at)],
          ['Started by', job.created_by || 'Schedule'],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-gray-500">{k}</dt>
            <dd className="text-sm font-semibold text-gray-900 mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>

      {job.step && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700">
          <span className="font-semibold text-gray-900 mr-2">Current step:</span>
          {job.step}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Stored output files</p>
        {(job.outputs || []).length > 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
            {job.outputs.map((o) => (
              <p key={o} className="text-xs font-mono text-gray-800 break-all select-all">{o}</p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">No output files stored yet.</p>
        )}
      </div>
    </Modal>
  );
}

/**
 * Pipeline runs: every job the backend has sent to the pipeline, for every
 * organisation, with its live status, step and outputs. Refreshes every 10s
 * while jobs are waiting or running.
 */
const PipelineRuns = () => {
  const [jobs, setJobs] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [activeJob, setActiveJob] = useState(null);

  const load = async () => {
    try {
      const data = await fetchAdminJobs({ companyId: company || undefined, status: status || undefined });
      setJobs(Array.isArray(data) ? data : []);
      setError('');
      setOffline(false);
    } catch (e) {
      if (e.code === 'NOT_CONNECTED') setOffline(true);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations()
      .then((o) => setOrgs(Array.isArray(o) ? o : o?.items || []))
      .catch(() => {});
  }, []);

  // load() is async: state updates happen after the network responses resolve
  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [company, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLive = jobs.some((j) => ['queued', 'pending', 'running', 'processing'].includes(j.status));
  useEffect(() => {
    if (!isLive) return undefined;
    const t = setInterval(load, LIVE_MS);
    return () => clearInterval(t);
  }, [isLive, company, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = async (id) => {
    try {
      await retryAdminJob(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.schema_name, o.display_name || o.schema_name])), [orgs]);
  const orgName = (id) => orgMap.get(id) || id;

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (kind) {
      list = list.filter((j) => j.kind === kind);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) => (
        (j.id && j.id.toLowerCase().includes(q))
        || (j.company_id && j.company_id.toLowerCase().includes(q))
        || ((orgMap.get(j.company_id) || '').toLowerCase().includes(q))
        || (j.service && j.service.toLowerCase().includes(q))
        || (j.farm_id && j.farm_id.toLowerCase().includes(q))
        || (j.error && j.error.toLowerCase().includes(q))
        || (j.step && j.step.toLowerCase().includes(q))
      ));
    }
    return list;
  }, [jobs, kind, search, orgMap]);

  const counts = useMemo(() => jobs.reduce((c, j) => {
    const s = j.status || 'unknown';
    return { ...c, [s]: (c[s] || 0) + 1 };
  }, {}), [jobs]);

  return (
    <Page
      wide
      eyebrow="Operations"
      title="Pipeline runs"
      text="Every job sent to the pipeline: monitoring, suitability, uploads, checks and reports, for every organisation, with its live status. A job is done only when its results are stored."
      actions={(
        <Button variant="secondary" onClick={load}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      )}
    >
      <ErrorBanner message={error} onDismiss={() => setError('')} onRetry={load} />

      {offline ? (
        <Note>The pipeline jobs service is not running on this server yet, so runs cannot be listed here. The Monitoring schedule still shows each schedule's last run.</Note>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Waiting" value={(counts.queued || 0) + (counts.pending || 0)} />
            <Stat label="Running" value={(counts.running || 0) + (counts.processing || 0)} />
            <Stat label="Done" value={(counts.done || 0) + (counts.completed || 0)} />
            <Stat label="Failed" value={counts.failed || 0} sub={counts.failed ? 'Click a row to inspect error' : null} />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500 mr-1">What ran</span>
              {[
                ['', 'All'],
                ['monitoring_run', 'Monitoring'],
                ['suitability_run', 'Suitability'],
                ['report_build', 'Reports'],
                ['eudr_check', 'EUDR checks'],
                ['parcel_check', 'Parcel checks'],
                ['dataset_ingest', 'Farm data'],
                ['drone_process', 'Drone surveys'],
              ].map(([v, l]) => (
                <Chip key={v || 'all'} on={kind === v} onClick={() => setKind(v)}>{l}</Chip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-gray-500 mr-1">Status</span>
              {[
                ['', 'All'],
                ['queued', 'Waiting'],
                ['running', 'Running'],
                ['done', 'Done'],
                ['failed', 'Failed'],
              ].map(([v, l]) => (
                <Chip key={v || 'all'} on={status === v} onClick={() => setStatus(v)}>{l}</Chip>
              ))}

              <select
                className={`${inputCls} w-auto ml-auto`}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                aria-label="Filter organisation"
              >
                <option value="">All organisations</option>
                {orgs.map((o) => (
                  <option key={o.schema_name} value={o.schema_name}>{o.display_name || o.schema_name}</option>
                ))}
              </select>

              <label className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className={`${inputCls} pl-10`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Organisation, service, error or ID"
                />
              </label>
            </div>
          </div>

          {loading && !jobs.length ? (
            <Loading>Loading runs…</Loading>
          ) : filteredJobs.length === 0 ? (
            <Empty>
              {kind || status || company || search ? 'No runs match the selected filters.' : 'No pipeline runs recorded yet. Start one from the Monitoring schedule.'}
            </Empty>
          ) : (
            <Table
              columns={[
                { label: 'What ran' },
                { label: 'Organisation' },
                { label: 'Status' },
                { label: 'Step' },
                { label: 'Started' },
                { label: 'Duration' },
                { label: 'Actions', className: 'w-24 text-right' },
              ]}
            >
              {filteredJobs.map((j) => {
                const [label, tone] = STATUS_MAP[j.status] || [j.status, 'neutral'];
                return (
                  <tr
                    key={j.id}
                    onClick={() => setActiveJob(j)}
                    className={`cursor-pointer transition-colors ${j.status === 'failed' ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-gray-50/70'}`}
                  >
                    <Td>
                      <p className="font-semibold text-gray-900">{KINDS[j.kind] || j.kind}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {j.service ? `${j.service.replace(/_/g, ' ')}` : ''}
                        {j.service && j.farm_id ? ' · ' : ''}
                        {j.farm_id || ''}
                      </p>
                    </Td>
                    <Td className="text-gray-800 font-medium">{orgName(j.company_id)}</Td>
                    <Td>
                      <Pill tone={tone}>
                        {label}
                        {j.status === 'running' && j.progress != null ? ` · ${j.progress}%` : ''}
                      </Pill>
                      {j.queue_position != null && j.status === 'queued' && (
                        <span className="block text-[11px] text-amber-700 mt-1 font-mono">
                          Queue #{j.queue_position}
                        </span>
                      )}
                    </Td>
                    <Td className="text-gray-600 text-xs max-w-xs truncate" title={j.step || ''}>
                      {j.step || (j.status === 'queued' ? 'Queued' : '—')}
                    </Td>
                    <Td className="text-xs text-gray-600 font-mono">{fmt(j.started_at || j.created_at)}</Td>
                    <Td className="text-xs text-gray-600 font-mono">{took(j.started_at, j.finished_at)}</Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {j.status === 'failed' && (
                          <IconButton label="Run again" onClick={() => retry(j.id)}>
                            <RotateCcw size={15} />
                          </IconButton>
                        )}
                        <IconButton label="View details" onClick={() => setActiveJob(j)}>
                          <ChevronRight size={15} />
                        </IconButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </Table>
          )}

          {activeJob && (
            <JobDetailModal
              job={activeJob}
              orgName={orgName}
              onClose={() => setActiveJob(null)}
              onRetry={(id) => { retry(id); setActiveJob(null); }}
            />
          )}
        </>
      )}
    </Page>
  );
};

export default PipelineRuns;
