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
      <div className="absolute top-3 right-3 bottom-3 w-80 max-w-[calc(100%-24px)] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col z-[1000] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0 text-green-700">
            <MapPin size={16} color={brandPrimary} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="m-0 text-sm font-extrabold text-gray-900 truncate">{plot.name || plot.id}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-gray-500 m-0">{plot.id}{plot.subfarm ? ` · ${plot.subfarm}` : ''}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 cursor-pointer flex shrink-0 transition-colors border-0"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">Health</span>
              <span className="text-sm font-extrabold text-gray-900" style={plot.color ? { color: plot.color } : undefined}>
                {plot.health || 'No Data'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">Area</span>
              <span className="text-sm font-extrabold text-gray-900">{plot.area || '—'}</span>
            </div>
            {(plot.indices?.fused_ndvi != null || plot.indices?.crop_condition != null || plot.indices?.ndvi != null) && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">Crop condition</span>
                <span className="text-sm font-extrabold text-gray-900">
                  {Number(plot.indices?.crop_condition ?? plot.indices?.fused_ndvi ?? plot.indices?.ndvi).toFixed(3)}
                  {(plot.indices?.source === 'radar_estimate' || plot.is_estimated || plot.source === 'radar_estimate') && (
                    <span className="block text-[11px] text-amber-700 font-medium">From radar (cloudy)</span>
                  )}
                </span>
              </div>
            )}
            {plot.indices?.ndmi != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">NDMI</span>
                <span className="text-sm font-extrabold text-gray-900">{plot.indices.ndmi.toFixed(3)}</span>
              </div>
            )}
            {plot.indices?.chlorophyll != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">Chlorophyll</span>
                <span className="text-sm font-extrabold text-gray-900">{plot.indices.chlorophyll.toFixed(3)}</span>
              </div>
            )}
            {plot.indices?.uas_anomaly_score != null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">Anomaly score</span>
                <span className="text-sm font-extrabold text-gray-900">{plot.indices.uas_anomaly_score.toFixed(3)}</span>
              </div>
            )}
          </div>

          {/* Action Ground Scout Button */}
          <button
            type="button"
            onClick={() => setScoutingModalOpen(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-3.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer border-0"
          >
            <UserCheck size={15} color="#ffffff" />
            <span>{openAlert ? 'Act on this alert' : 'Record a field visit'}</span>
          </button>

          {dashboardFilterKeys.length > 0 && plot.filters && Object.keys(plot.filters).length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              {dashboardFilterKeys.filter((k) => plot.filters[k] != null).map((k) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase">{k}</span>
                  <span className="text-xs font-extrabold text-gray-900">{String(plot.filters[k])}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-[11px] font-extrabold text-gray-400 tracking-wider uppercase mb-2">Time series</p>
            {chartData ? (
              <div className="h-40">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <p className="text-xs text-gray-400 m-0">No time-series data for this pixel yet.</p>
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
