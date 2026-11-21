import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { buildQuery, ffbCall } from '../api/ffbApi';

export default function FfbClerkLookup({ tenantSlug }) {
  const [clerks, setClerks] = useState([]);
  const [rows, setRows] = useState([]);
  const [clerkId, setClerkId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    setErr('');
    ffbCall(`/analytics/clerk-lookup${buildQuery({ clerk_id: clerkId, start_date: startDate, end_date: endDate })}`, { tenantSlug })
      .then((res) => {
        setClerks(res.clerks || []);
        setRows(res.rows || []);
      })
      .catch((e) => setErr(e.message));
  };

  useEffect(() => { load(); }, [tenantSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-main)]">Clerk Lookup & Daily Sheet</h1>
          <p className="text-sm text-[var(--text-muted)]">Line-by-line harvest records per clerk across every approval status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={clerkId} onChange={(e) => setClerkId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-white">
            <option value="">All Harvesting Clerks</option>
            {clerks.map((c) => <option key={c.clerk_id} value={c.clerk_id}>{c.name} ({c.clerk_id})</option>)}
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-white" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-white" />
          <button onClick={load} className="px-3.5 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold">Show</button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl border border-[var(--border-light)] bg-white text-xs font-semibold">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}

      <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-light)]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Clerk</th>
              <th className="px-4 py-3">Worker</th>
              <th className="px-4 py-3">Plot</th>
              <th className="px-4 py-3">Bunches</th>
              <th className="px-4 py-3">Loose Fruit (kg)</th>
              <th className="px-4 py-3">Shield</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--text-muted)]">No clerk submissions found.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5 font-mono">{r.captured_at.slice(0, 16).replace('T', ' ')}</td>
                <td className="px-4 py-2.5 font-semibold">{r.clerk_name}</td>
                <td className="px-4 py-2.5">{r.worker_name}</td>
                <td className="px-4 py-2.5 font-mono">{r.plot_id}</td>
                <td className="px-4 py-2.5 font-mono">{r.bunches}</td>
                <td className="px-4 py-2.5 font-mono">{r.loose_fruit_kg}</td>
                <td className="px-4 py-2.5 font-mono">{r.score}/100</td>
                <td className="px-4 py-2.5 font-semibold">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
