import { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ffbCall } from '../api/ffbApi';

const SHIELD_LAYERS = [
  ['1. Spatial Boundary & Edge Platform', 'Matches phone GPS to tenant PostGIS fishnet boundary cells at the plot edge.'],
  ['2. Duplicate Detection', 'Flags identical GPS coordinates or repeated same-day scans on the same platform outside a 30-min session.'],
  ['3. Temporal Consistency', 'Detects unrealistic worker movement speeds (>15 km/h) or rapid non-session scans (<60s).'],
  ['4. Device & Identity Teleportation', 'Checks daily volume limits and impossible device jumps (>60 km/h across >500m).'],
  ['5. Behavioral Flat-Line Pattern', 'Flags repeated identical job totals across 5+ consecutive sessions (std dev = 0).'],
  ['6. Spatial Neighborhood Density', 'Compares job count against 30-day plot mean & standard deviation (z-score > 2σ / 3σ).'],
  ['7. Cross-Harvester Collision', 'Flags when multiple workers claim the exact same platform cell on the same day.'],
  ['8. Historical Yield Trend', 'Compares harvest totals against long-term plot averages (1.5x / 2.5x inflation guards).'],
  ['9. 3-Layer Loading Reconciliation', 'Verifies harvested = loaded + rotten bunches (or loose fruit kg within max(50kg, 5%)).'],
];

export default function FfbAlertsAndGuide({ tenantSlug }) {
  const [alerts, setAlerts] = useState([]);
  const [err, setErr] = useState('');

  const load = () => {
    ffbCall('/alerts', { tenantSlug })
      .then((res) => setAlerts(res.items || []))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => { load(); }, [tenantSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveAlert = async (id) => {
    try {
      await ffbCall(`/alerts/${id}/resolve`, { method: 'POST', tenantSlug });
      load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--text-main)]">Anti-Fraud Alerts & Methodology</h1>
        <p className="text-sm text-[var(--text-muted)]">Real-time exception alerts paired with the 9-layer Shield architecture.</p>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}

      <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 space-y-3">
        <h2 className="font-display text-base font-semibold flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> Active & Historical Alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No anti-fraud alerts recorded.</p>
        ) : (
          <div className="divide-y divide-gray-100 text-xs">
            {alerts.map((a) => (
              <div key={a.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">[{a.severity.toUpperCase()}] {a.category} · Plot {a.plot_id || '—'}</p>
                  <p className="text-gray-600 mt-0.5">{a.message}</p>
                </div>
                {a.is_resolved ? (
                  <span className="inline-flex items-center gap-1 text-green-700 font-semibold shrink-0"><CheckCircle2 size={14} /> Resolved</span>
                ) : (
                  <button onClick={() => resolveAlert(a.id)} className="px-3 py-1 rounded-lg bg-[var(--brand-primary)] text-white font-semibold shrink-0">Resolve</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-[var(--border-light)] p-6 space-y-4">
        <h2 className="font-display text-base font-semibold flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--brand-primary)]" /> 9-Layer Anti-Fraud Shield & Field Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {SHIELD_LAYERS.map(([title, desc]) => (
            <div key={title} className="p-3.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)]">
              <p className="font-semibold text-[var(--brand-forest)]">{title}</p>
              <p className="text-[var(--text-muted)] mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
