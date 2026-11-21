import { useEffect, useState } from 'react';
import { ffbCall } from '../api/ffbApi';

const TABS = [
  { id: 'plots', label: 'Plot Analytics' },
  { id: 'workers', label: 'Worker Leaderboard' },
  { id: 'efficiency', label: 'Clerk Efficiency' },
  { id: 'bunch', label: 'Bunch Weight' },
  { id: 'audit', label: 'Audit Quality' },
];

export default function FfbAnalytics({ tenantSlug }) {
  const [tab, setTab] = useState('plots');
  const [rows, setRows] = useState([]);
  const [audit, setAudit] = useState(null);
  const [history, setHistory] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setErr('');
    const ep = tab === 'plots' ? '/analytics/plots'
      : tab === 'workers' ? '/analytics/workers'
        : tab === 'efficiency' ? '/analytics/efficiency'
          : tab === 'bunch' ? '/analytics/bunch-weight'
            : '/analytics/audit-quality';
    ffbCall(ep, { tenantSlug })
      .then((res) => {
        if (tab === 'audit') setAudit(res);
        else setRows(res.items || []);
      })
      .catch((e) => setErr(e.message));
  }, [tenantSlug, tab]);

  const openPlotHistory = (plotId) => {
    ffbCall(`/analytics/plots/${encodeURIComponent(plotId)}/history`, { tenantSlug })
      .then(setHistory)
      .catch((e) => setErr(e.message));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-main)]">Yield & Operational Analytics</h1>
          <p className="text-sm text-[var(--text-muted)]">Plot yields, worker output, clerk scan efficiency, and AI discrepancy audits.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${tab === t.id ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]' : 'bg-white text-gray-700 border-[var(--border-light)]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}

      {tab === 'audit' && audit ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 space-y-3">
            <h2 className="font-display text-base font-semibold">Shield Score Distribution</h2>
            {Object.entries(audit.score_buckets || {}).map(([bucket, cnt]) => (
              <div key={bucket} className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                <span>Score {bucket}</span><span className="font-mono font-semibold">{cnt}</span>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 space-y-3">
            <h2 className="font-display text-base font-semibold">Layer Flag Frequency</h2>
            {Object.entries(audit.layer_flags || {}).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No layer anomalies flagged.</p>
            ) : Object.entries(audit.layer_flags).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm py-1.5 border-b border-gray-100">
                <span className="capitalize">{k.replace(/_/g, ' ')}</span><span className="font-mono font-semibold text-amber-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-light)]">
              <tr>
                {tab === 'plots' && <>
                  <th className="px-4 py-3">Plot</th><th className="px-4 py-3">Records</th><th className="px-4 py-3">Bunches</th>
                  <th className="px-4 py-3">Loose Fruit (kg)</th><th className="px-4 py-3">Avg Score</th><th className="px-4 py-3 text-right">History</th>
                </>}
                {tab === 'workers' && <>
                  <th className="px-4 py-3">Staff ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">Role</th><th className="px-4 py-3">Bunches</th><th className="px-4 py-3">Loose Fruit (kg)</th>
                </>}
                {tab === 'efficiency' && <>
                  <th className="px-4 py-3">Clerk ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Scans</th>
                  <th className="px-4 py-3">Bunches</th><th className="px-4 py-3">Avg Duration</th><th className="px-4 py-3">AI Agreement</th>
                </>}
                {tab === 'bunch' && <>
                  <th className="px-4 py-3">Plot</th><th className="px-4 py-3">Records</th><th className="px-4 py-3">Bunches</th>
                  <th className="px-4 py-3">Total Weight (kg)</th><th className="px-4 py-3">Avg Bunch Weight</th>
                </>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">No records yet.</td></tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--bg-subtle)]">
                  {tab === 'plots' && <>
                    <td className="px-4 py-3 font-semibold">{r.plot_id}</td>
                    <td className="px-4 py-3 font-mono">{r.records}</td>
                    <td className="px-4 py-3 font-mono">{r.bunches}</td>
                    <td className="px-4 py-3 font-mono">{r.loose_fruit_kg}</td>
                    <td className="px-4 py-3 font-mono">{r.avg_score}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => openPlotHistory(r.plot_id)} className="text-[var(--brand-primary)] font-semibold hover:underline">View</button></td>
                  </>}
                  {tab === 'workers' && <>
                    <td className="px-4 py-3 font-mono">{r.worker_id}</td><td className="px-4 py-3 font-semibold">{r.worker_name}</td>
                    <td className="px-4 py-3">{r.division || '—'}</td><td className="px-4 py-3">{r.role}</td>
                    <td className="px-4 py-3 font-mono">{r.bunches}</td><td className="px-4 py-3 font-mono">{r.loose_fruit_kg}</td>
                  </>}
                  {tab === 'efficiency' && <>
                    <td className="px-4 py-3 font-mono">{r.clerk_id}</td><td className="px-4 py-3 font-semibold">{r.clerk_name}</td>
                    <td className="px-4 py-3 font-mono">{r.scans}</td><td className="px-4 py-3 font-mono">{r.bunches}</td>
                    <td className="px-4 py-3 font-mono">{r.avg_duration_s}s</td><td className="px-4 py-3 font-mono">{r.ai_match_pct}%</td>
                  </>}
                  {tab === 'bunch' && <>
                    <td className="px-4 py-3 font-semibold">{r.plot_id}</td><td className="px-4 py-3 font-mono">{r.records}</td>
                    <td className="px-4 py-3 font-mono">{r.bunches}</td><td className="px-4 py-3 font-mono">{r.weight_kg}</td>
                    <td className="px-4 py-3 font-mono">{r.avg_bunch_weight_kg} kg</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {history && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center p-4" onClick={() => setHistory(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-lg font-semibold">Plot {history.plot_id} Harvest History</h3>
              <button onClick={() => setHistory(null)} className="text-xs font-semibold text-gray-500">Close</button>
            </div>
            <div className="divide-y divide-gray-100 text-xs">
              {(history.items || []).map((it) => (
                <div key={it.id} className="py-2.5 flex justify-between">
                  <span><strong className="font-mono">{it.captured_at.slice(0, 16).replace('T', ' ')}</strong> · Worker {it.worker_id}</span>
                  <span className="font-mono">{it.bunches} bunches · {it.status} ({it.score})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
