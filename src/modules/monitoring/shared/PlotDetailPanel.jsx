import { useState, useMemo } from 'react';
import { X, MapPin, UserCheck } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import GroundScoutingModal from './GroundScoutingModal';
import { getCssToken } from '../../../utils/tokens';

// Slide-in panel showing ONE plot's own data — not a Leaflet <Popup>, since
// with 1000+ dense polygons (Okomu) a popup anchored to a tiny plot is easy
// to lose track of and clips against the map edge. Pulls straight from the
// plot object already in plotsData (from /plots/intelligence) plus whatever
// pixel time-series handlePlotClick already fetched — no new backend calls.
// House rules: white, no shadow, sentence case, plain words (no index names or long decimals), block codes
// as people say them ("Plot 1").

const readable = (id) => String(id ?? '').replace(/\b([A-Za-z]+)_0*(\d+)\b/g, '$1 $2');
const CONDITION = (v) => (v == null ? null : v >= 0.7 ? 'Strong' : v >= 0.55 ? 'Good' : v >= 0.4 ? 'Weaker than usual' : 'Poor');
const WATER = (v) => (v == null ? null : v >= 0.3 ? 'Plenty of water in the leaves' : v >= 0.1 ? 'Normal' : v >= 0 ? 'Slightly dry' : 'Short of water');

function Fact({ label, value, note }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
      {note && <span className="text-[11px] text-amber-700">{note}</span>}
    </div>
  );
}

export default function PlotDetailPanel({ plot, series, indexLabel = 'Index', dashboardFilterKeys = [], alerts = [], onClose }) {
  const [scoutingModalOpen, setScoutingModalOpen] = useState(false);

  const brandPrimary = getCssToken('--brand-primary', '#3F8432');
  const textMuted = getCssToken('--text-muted', '#64748b');
  const borderLight = getCssToken('--border-light', '#e2e8f0');

  const chartData = useMemo(() => {
    if (!series || series.length === 0) return null;
    return {
      labels: series.map((s) => s.date),
      datasets: [{
        label: indexLabel.toUpperCase(),
        data: series.map((s) => s.value),
        borderColor: brandPrimary,
        backgroundColor: 'rgba(63, 132, 50, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        spanGaps: true,
      }],
    };
  }, [series, indexLabel, brandPrimary]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: textMuted, font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { color: textMuted, font: { size: 10 } }, grid: { color: borderLight } },
    },
  }), [textMuted, borderLight]);

  if (!plot) return null;

  // A real open alert on this block, if any; otherwise the visit is recorded on its own.
  const openAlert = (alerts || []).find((a) => String(a.plot) === String(plot.id) && a.status === 'Active');
  const visitAlert = openAlert
    ? { alert_id: openAlert.id, plot_id: String(plot.id), plot_name: plot.name, type: openAlert.category, severity: openAlert.severity, message: openAlert.desc, status: openAlert.workflow || 'open' }
    : { alert_id: null, plot_id: String(plot.id), plot_name: plot.name, status: 'open' };

  return (
    <>
      <div className="absolute top-3 right-3 bottom-3 w-80 max-w-[calc(100%-24px)] bg-white border border-gray-200 rounded-2xl flex flex-col z-[1000] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0 text-green-700">
            <MapPin size={16} color={brandPrimary} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="m-0 font-display text-sm font-semibold text-gray-900 truncate">{readable(plot.name || plot.id)}</p>
            {plot.subfarm && <p className="mt-0.5 text-xs text-gray-500 m-0">{plot.subfarm}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer flex shrink-0 transition-colors border-0"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Fact label="Condition" value={plot.health || 'Not measured yet'} />
            <Fact label="Area" value={plot.area || 'Not recorded'} />
            {(() => {
              const v = plot.indices?.crop_condition ?? plot.indices?.fused_ndvi ?? plot.indices?.ndvi;
              const radar = plot.indices?.source === 'radar_estimate' || plot.is_estimated || plot.source === 'radar_estimate';
              return v != null ? <Fact label="Crop growth" value={CONDITION(Number(v))} note={radar ? 'Estimated from radar (cloudy pictures)' : null} /> : null;
            })()}
            {plot.indices?.ndmi != null && <Fact label="Leaf water" value={WATER(Number(plot.indices.ndmi))} />}
          </div>

          {/* Action Ground Scout Button */}
          <button
            type="button"
            onClick={() => setScoutingModalOpen(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-3.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer border-0"
          >
            <UserCheck size={15} color="#ffffff" />
            <span>{openAlert ? 'Act on this alert' : 'Record a field visit'}</span>
          </button>

          {dashboardFilterKeys.length > 0 && plot.filters && Object.keys(plot.filters).length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              {dashboardFilterKeys.filter((k) => plot.filters[k] != null).map((k) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-500">{k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')}</span>
                  <span className="text-sm font-semibold text-gray-900">{String(plot.filters[k])}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-900 mb-0.5">At the point you clicked</p>
            <p className="text-xs text-gray-500 mb-2">How the crop changed there on each clear picture (higher is denser, greener crop).</p>
            {chartData ? (
              <div className="h-40">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <p className="text-xs text-gray-500 m-0">No clear picture of this point yet.</p>
            )}
          </div>
        </div>
      </div>

      {scoutingModalOpen && (
        <GroundScoutingModal
          alert={visitAlert}
          visitOnly={!openAlert}
          onClose={() => setScoutingModalOpen(false)}
          onAlertUpdated={() => setScoutingModalOpen(false)}
        />
      )}
    </>
  );
}
