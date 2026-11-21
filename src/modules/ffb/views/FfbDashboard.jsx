import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import { ShieldCheck, Layers, Scale, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { buildQuery, ffbCall } from '../api/ffbApi';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const KpiCard = ({ label, value, sub, icon: Icon, tone = 'text-[var(--brand-primary)] bg-green-50' }) => (
  <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 flex items-start justify-between">
    <div>
      <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
      <p className="font-mono text-2xl font-semibold text-[var(--text-main)] mt-1">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
    </div>
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
      <Icon size={18} />
    </span>
  </div>
);

export default function FfbDashboard({ tenantSlug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ start_date: '', end_date: '', plot_id: '' });

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await ffbCall(`/analytics/dashboard${buildQuery(filters)}`, { tenantSlug });
      setData(res);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tenantSlug, filters.start_date, filters.end_date, filters.plot_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const k = data?.kpis || {};
  const trend = data?.daily_trend || [];

  const chartData = {
    labels: trend.map((d) => d.date),
    datasets: [
      { label: 'Harvested Bunches', data: trend.map((d) => d.harvested), backgroundColor: '#3F8432', borderRadius: 6 },
      { label: 'Loaded Bunches', data: trend.map((d) => d.loaded), backgroundColor: '#5AA041', borderRadius: 6 },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-main)]">Harvest Overview</h1>
          <p className="text-sm text-[var(--text-muted)]">Real-time FFB bunch verification, reconciliation status, and 9-layer shield metrics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="px-3 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-white" />
          <input type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="px-3 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-white" />
          <input type="text" placeholder="Filter plot ID…" value={filters.plot_id} onChange={(e) => setFilters({ ...filters, plot_id: e.target.value })}
            className="px-3 py-2 text-xs rounded-xl border border-[var(--border-light)] bg-white w-36" />
        </div>
      </div>

      {err && <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{err}</div>}

      {loading ? (
        <div className="p-10 text-center text-sm text-[var(--text-muted)]">Loading harvest metrics…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Bunches Cut" value={(k.total_bunches || 0).toLocaleString()} sub={`${k.total_unripe || 0} unripe · ${k.total_rotten || 0} rotten`} icon={Layers} />
            <KpiCard label="Loaded Bunches" value={(k.total_loaded_bunches || 0).toLocaleString()} sub={`Matched: ${k.matched_count || 0} · Mismatch: ${k.mismatch_count || 0}`} icon={CheckCircle2} />
            <KpiCard label="Loose Fruit Collected" value={`${(k.total_loose_fruit_kg || 0).toLocaleString()} kg`} sub={`${k.total_records || 0} total scan records`} icon={Scale} tone="text-[#034321] bg-green-50" />
            <KpiCard label="Avg Shield Score" value={`${k.avg_validation_score || 0}/100`} sub={`Pending: ${k.pending_count || 0} · Rejected: ${k.rejected_count || 0}`} icon={ShieldCheck} tone="text-amber-700 bg-amber-50" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--border-light)] p-6">
              <h2 className="font-display text-base font-semibold text-[var(--text-main)] mb-4">Daily Harvested vs Loaded Bunches</h2>
              {trend.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] py-12 text-center">No field scans recorded in this window yet.</p>
              ) : (
                <div className="h-72">
                  <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[var(--border-light)] p-6 space-y-4">
              <h2 className="font-display text-base font-semibold text-[var(--text-main)]">Verification Pipeline</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)]">
                  <span className="flex items-center gap-2 text-green-800 font-medium"><CheckCircle2 size={16} /> Approved</span>
                  <span className="font-mono font-semibold">{k.approved_count || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70">
                  <span className="flex items-center gap-2 text-amber-800 font-medium"><Clock size={16} /> Pending Review</span>
                  <span className="font-mono font-semibold">{k.pending_count || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/70">
                  <span className="flex items-center gap-2 text-red-700 font-medium"><AlertTriangle size={16} /> Rejected</span>
                  <span className="font-mono font-semibold">{k.rejected_count || 0}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-[var(--border-light)] text-xs text-[var(--text-muted)] space-y-1">
                <p>3-Layer Consensus: <strong className="text-[var(--text-main)]">{k.matched_count || 0}</strong> matched</p>
                <p>Waiting for Loader: <strong className="text-[var(--text-main)]">{k.waiting_count || 0}</strong></p>
                <p>Discrepancies: <strong className="text-red-600">{k.mismatch_count || 0}</strong></p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
