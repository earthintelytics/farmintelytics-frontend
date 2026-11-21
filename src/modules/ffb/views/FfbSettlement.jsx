import { useEffect, useState } from 'react';
import { Download, Lock, Plus } from 'lucide-react';
import { ffbCall } from '../api/ffbApi';

export default function FfbSettlement({ tenantSlug }) {
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(defaultPeriod);
  const [mode, setMode] = useState('itemized'); // itemized | aggregated | rates
  const [data, setData] = useState(null);
  const [rates, setRates] = useState([]);
  const [runs, setRuns] = useState([]);
  const [rateForm, setRateForm] = useState({ role: 'Cutter', ripe_rate: 0, unripe_rate: 0, rotten_rate: 0, kg_rate: 0, unit: 'bunch' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const [pay, rateRes, runRes] = await Promise.all([
        ffbCall(`/settlement/${mode === 'aggregated' ? 'aggregated' : 'itemized'}?period=${encodeURIComponent(period)}`, { tenantSlug }),
        ffbCall('/pay-rates', { tenantSlug }),
        ffbCall('/settlement/runs', { tenantSlug }),
      ]);
      setData(pay);
      setRates(rateRes.items || []);
      setRuns(runRes.items || []);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, [tenantSlug, period, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const lockMonth = async () => {
    setErr(''); setMsg('');
    try {
      await ffbCall('/settlement/runs', { method: 'POST', tenantSlug, body: { period } });
      setMsg(`Period ${period} locked.`);
      await load();
    } catch (e) { setErr(e.message); }
  };

  const saveRate = async () => {
    setErr(''); setMsg('');
    try {
      await ffbCall('/pay-rates', { method: 'POST', tenantSlug, body: rateForm });
      setMsg(`Rate for ${rateForm.role} updated.`);
      await load();
    } catch (e) { setErr(e.message); }
  };

  const exportCsv = () => {
    const rows = data?.rows || [];
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? '')).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `ffb_settlement_${period}_${mode}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-main)]">Monthly Settlement & Pay Rates</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {data ? `${data.period_start} → ${data.period_end} · Status: ${data.status} · Currency: ${data.currency}` : 'Approved payroll summary'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-[var(--border-light)] bg-white" />
          {['itemized', 'aggregated', 'rates'].map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border ${mode === m ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]' : 'bg-white text-gray-700 border-[var(--border-light)]'}`}>
              {m === 'rates' ? 'Pay Rates' : m}
            </button>
          ))}
          {mode !== 'rates' && (
            <>
              <button onClick={exportCsv} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-light)] bg-white text-xs font-semibold"><Download size={13} /> CSV</button>
              {data?.status !== 'LOCKED' && (
                <button onClick={lockMonth} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#034321] text-white text-xs font-semibold"><Lock size={13} /> Lock Month</button>
              )}
            </>
          )}
        </div>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">{msg}</div>}

      {mode === 'rates' ? (
        <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 space-y-4">
          <div className="grid grid-cols-6 gap-2 items-end text-xs">
            <div><label className="block font-semibold mb-1">Role</label><input className="w-full px-2.5 py-1.5 border rounded-lg" value={rateForm.role} onChange={(e) => setRateForm({ ...rateForm, role: e.target.value })} /></div>
            <div><label className="block font-semibold mb-1">Ripe</label><input type="number" className="w-full px-2.5 py-1.5 border rounded-lg" value={rateForm.ripe_rate} onChange={(e) => setRateForm({ ...rateForm, ripe_rate: Number(e.target.value) })} /></div>
            <div><label className="block font-semibold mb-1">Unripe</label><input type="number" className="w-full px-2.5 py-1.5 border rounded-lg" value={rateForm.unripe_rate} onChange={(e) => setRateForm({ ...rateForm, unripe_rate: Number(e.target.value) })} /></div>
            <div><label className="block font-semibold mb-1">Rotten</label><input type="number" className="w-full px-2.5 py-1.5 border rounded-lg" value={rateForm.rotten_rate} onChange={(e) => setRateForm({ ...rateForm, rotten_rate: Number(e.target.value) })} /></div>
            <div><label className="block font-semibold mb-1">Per Kg</label><input type="number" className="w-full px-2.5 py-1.5 border rounded-lg" value={rateForm.kg_rate} onChange={(e) => setRateForm({ ...rateForm, kg_rate: Number(e.target.value) })} /></div>
            <button onClick={saveRate} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-[var(--brand-primary)] text-white font-semibold"><Plus size={14} /> Save</button>
          </div>
          <table className="w-full text-left text-xs border-t border-gray-100">
            <thead><tr className="text-[var(--text-muted)]"><th className="py-2">Role</th><th>Ripe</th><th>Unripe</th><th>Rotten</th><th>Per Kg</th><th>Unit</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {rates.map((r) => (
                <tr key={r.id}><td className="py-2 font-semibold">{r.role}</td><td className="font-mono">{r.ripe_rate}</td><td className="font-mono">{r.unripe_rate}</td><td className="font-mono">{r.rotten_rate}</td><td className="font-mono">{r.kg_rate}</td><td>{r.unit}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-[var(--border-light)]"><span className="text-[var(--text-muted)]">Approved Records</span><p className="font-mono text-lg font-semibold mt-1">{data?.record_count || 0}</p></div>
            <div className="bg-white p-4 rounded-2xl border border-[var(--border-light)]"><span className="text-[var(--text-muted)]">Total Bunches</span><p className="font-mono text-lg font-semibold mt-1">{(data?.total_bunches || 0).toLocaleString()}</p></div>
            <div className="bg-white p-4 rounded-2xl border border-[var(--border-light)]"><span className="text-[var(--text-muted)]">Loose Fruit (kg)</span><p className="font-mono text-lg font-semibold mt-1">{(data?.total_loose_fruit_kg || 0).toLocaleString()}</p></div>
            <div className="bg-white p-4 rounded-2xl border border-[var(--border-light)]"><span className="text-[var(--text-muted)]">Total Payout ({data?.currency})</span><p className="font-mono text-lg font-semibold text-[var(--brand-primary)] mt-1">{(data?.total_payout || 0).toLocaleString()}</p></div>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-light)]">
                <tr>
                  <th className="px-4 py-3">Staff ID</th><th className="px-4 py-3">Worker</th><th className="px-4 py-3">Role(s)</th>
                  <th className="px-4 py-3">Division</th><th className="px-4 py-3">Bunches</th><th className="px-4 py-3">Loose Fruit (kg)</th><th className="px-4 py-3">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.rows || []).length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">No approved settlement entries for {period}.</td></tr>
                ) : (data.rows || []).map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono">{r.worker_id}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.worker_name}</td>
                    <td className="px-4 py-2.5">{r.role || (r.roles || []).join(', ')}</td>
                    <td className="px-4 py-2.5">{r.division || '—'}</td>
                    <td className="px-4 py-2.5 font-mono">{r.bunches}</td>
                    <td className="px-4 py-2.5 font-mono">{r.loose_fruit_kg}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold">{r.payout.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {runs.length > 0 && (
            <div className="bg-white rounded-2xl border border-[var(--border-light)] p-4 text-xs space-y-2">
              <p className="font-semibold text-gray-800">Locked Settlement History</p>
              {runs.map((run) => (
                <div key={run.id} className="flex justify-between py-1 border-b border-gray-100 font-mono">
                  <span>{run.period} ({run.period_start} → {run.period_end})</span>
                  <span>{run.total_bunches} bunches · {run.total_payout.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
