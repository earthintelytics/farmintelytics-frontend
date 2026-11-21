import { useEffect, useState } from 'react';
import { Check, X, ShieldAlert, Eye } from 'lucide-react';
import { buildQuery, ffbCall } from '../api/ffbApi';

const STATUS_BADGE = {
  APPROVED: 'bg-green-50 text-green-800 border-green-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};

export default function FfbApprovals({ tenantSlug }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [active, setActive] = useState(null);
  const [note, setNote] = useState('');
  const [choice, setChoice] = useState('ai');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await ffbCall(`/approvals${buildQuery({ status, search })}`, { tenantSlug });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tenantSlug, status, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitReview = async (targetStatus) => {
    if (!active) return;
    if (!note.trim()) { setErr('Please write a supervisor audit note before approving or rejecting.'); return; }
    setSaving(true); setErr('');
    try {
      const needsChoice = active.ai_detected_count > 0 && active.total_count > 0 && active.ai_detected_count !== active.total_count;
      await ffbCall(`/approvals/${active.id}/review`, {
        method: 'POST',
        tenantSlug,
        body: { status: targetStatus, comment: note, count_choice: needsChoice ? choice : null },
      });
      setActive(null); setNote('');
      await load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-main)]">Approval & Exception Center</h1>
          <p className="text-sm text-[var(--text-muted)]">{total} records matching filter · Inspect 9-layer Shield scores and field photos.</p>
        </div>
        <div className="flex items-center gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${status === s ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]' : 'bg-white text-gray-700 border-[var(--border-light)] hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Plot, worker or clerk…"
            className="px-3 py-1.5 text-xs rounded-xl border border-[var(--border-light)] bg-white w-44" />
        </div>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}

      <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-light)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Plot / Cell</th>
              <th className="px-4 py-3 font-semibold">Worker & Carrier</th>
              <th className="px-4 py-3 font-semibold">Clerk</th>
              <th className="px-4 py-3 font-semibold">AI / Typed</th>
              <th className="px-4 py-3 font-semibold">Shield Score</th>
              <th className="px-4 py-3 font-semibold">Recon</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--text-muted)]">Loading records…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--text-muted)]">No records found.</td></tr>
            ) : items.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--bg-subtle)]">
                <td className="px-4 py-3 font-mono text-gray-700">{r.captured_at.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-4 py-3"><span className="font-semibold text-gray-900">{r.plot_id}</span>{r.grid_cell_id && <span className="block font-mono text-[10px] text-gray-400">{r.grid_cell_id}</span>}</td>
                <td className="px-4 py-3">{r.worker_name} <span className="text-gray-400">({r.worker_role})</span><span className="block text-[10px] text-gray-500">Carried: {r.carrier_name}</span></td>
                <td className="px-4 py-3">{r.clerk_name}</td>
                <td className="px-4 py-3 font-mono">{r.ai_detected_count ?? '—'} / {r.total_count ?? '—'}</td>
                <td className="px-4 py-3 font-mono font-semibold">{r.validation_score}/100</td>
                <td className="px-4 py-3 capitalize">{r.recon_state}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_BADGE[r.approval_status] || ''}`}>{r.approval_status}</span></td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setActive(r); setNote(r.reviewer_comment || ''); setChoice('ai'); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-[var(--brand-primary)] font-semibold hover:bg-green-100">
                    <Eye size={13} /> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center p-4" onClick={() => setActive(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold">Audit Record #{active.id} · Plot {active.plot_id}</h2>
                <p className="text-xs text-[var(--text-muted)]">Score: <strong className="font-mono">{active.validation_score}/100</strong> · Pitch: {active.pitch_angle ?? '—'}° · GPS ±{active.gps_accuracy_m ?? '—'}m</p>
              </div>
              <button onClick={() => setActive(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>

            {active.photo_url && (
              <img src={active.photo_url} alt="Field scan" className="w-full max-h-64 object-cover rounded-xl border border-gray-200" />
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(active.validation_details || {}).map(([k, v]) => (
                v && typeof v === 'object' && v.msg ? (
                  <div key={k} className="p-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)]">
                    <div className="flex justify-between font-semibold text-gray-800">
                      <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-mono">{v.score}/10</span>
                    </div>
                    <p className="text-gray-600 mt-1">{v.msg}</p>
                  </div>
                ) : null
              ))}
            </div>

            {active.ai_detected_count > 0 && active.total_count > 0 && active.ai_detected_count !== active.total_count && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                <p className="font-semibold text-amber-900 flex items-center gap-1.5"><ShieldAlert size={14} /> AI ({active.ai_detected_count}) differs from Clerk Typed ({active.total_count}) — select confirmed count:</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={choice === 'ai'} onChange={() => setChoice('ai')} /> Confirm AI ({active.ai_detected_count})</label>
                  <label className="flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={choice === 'typed'} onChange={() => setChoice('typed')} /> Confirm Typed ({active.total_count})</label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Supervisor Audit Note (required)</label>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="State what was verified before decision…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-light)]" />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => submitReview('REJECTED')} disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                <X size={15} /> Reject
              </button>
              <button onClick={() => submitReview('APPROVED')} disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-primary-dark)] disabled:opacity-50">
                <Check size={15} /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
