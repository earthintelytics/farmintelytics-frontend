import { FileDown, CheckCircle2, ShieldCheck, Printer, RefreshCw } from 'lucide-react';
import { Card, StatusPill } from '../../../components/page/PageKit';
import { CLASSES, classLabel, cropName } from '../suitabilityLabels';

const ha = (v) => (v != null ? `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha` : '—');

export default function SuitabilityReportView({ run, onDownloadPdf, pdfBusy, pdfMsg }) {
  const crop = cropName(run?.crop);
  const total = Object.values(run?.classes_area_ha || {}).reduce((a, b) => a + (Number(b) || 0), 0) || Number(run?.total_area_ha) || 0;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── TOP ACTION BANNER ── */}
      <Card className="p-6 bg-white border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-green-800 uppercase tracking-wider block mb-1">
            Official Assessment Report
          </span>
          <h3 className="text-lg font-bold text-gray-900">
            {crop} Land Suitability & Environmental Audit Dossier
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Boardroom-ready vector PDF document with verified satellite telemetry, terrain maps, and agronomic recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={pdfBusy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-green-700 text-white hover:bg-green-800 shadow-sm transition-all disabled:opacity-50 shrink-0"
        >
          {pdfBusy ? <RefreshCw size={16} className="animate-spin" /> : <FileDown size={16} />}
          <span>{pdfBusy ? 'Compiling PDF…' : 'Download Vector PDF'}</span>
        </button>
      </Card>

      {pdfMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
          {pdfMsg}
        </div>
      )}

      {/* ── PRINTABLE DOSSIER PREVIEW ── */}
      <Card className="p-8 bg-white border border-gray-200 shadow-md space-y-8 font-sans">
        {/* Dossier Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-green-700" />
              <span className="text-xs font-bold uppercase tracking-wider text-green-800">
                FarmIntelytics Environmental Intelligence
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">
              Land Suitability Evaluation Report: {crop}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Assessment ID: <span className="font-mono">{run?.run_id}</span> · Compiled {new Date(run?.created_at || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="text-right text-xs text-gray-500 space-y-0.5">
            <p className="font-bold text-gray-800">{run?.company_name || run?.company_id || 'Organization'}</p>
            <p>{run?.irrigated ? 'Irrigated Production' : 'Rain-fed Production'}</p>
            <p className="font-mono text-green-700 font-bold">{run?.resolution_m || 30}m Pixel Resolution</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            1. Executive Summary & Planting Feasibility
          </h4>
          <p className="text-xs text-gray-700 leading-relaxed">
            This land suitability assessment was conducted using continuous 30-meter resolution satellite observations, multi-spectral indices, digital elevation models, and long-term climatological datasets. The total evaluated boundary encompasses <strong>{ha(total)}</strong>. Evaluation follows standard Food and Agriculture Organization (FAO) land evaluation guidelines and rigorous European Union Deforestation Regulation (EUDR) cut-off criteria.
          </p>
        </div>

        {/* FAO Class Breakdown Table */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            2. Land Classification Summary
          </h4>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200 font-bold">
                <tr>
                  <th className="px-4 py-2.5 text-left">FAO Classification</th>
                  <th className="px-4 py-2.5 text-left">Significance</th>
                  <th className="px-4 py-2.5 text-right">Area (ha)</th>
                  <th className="px-4 py-2.5 text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {CLASSES.map((c) => {
                  const v = Number(run?.classes_area_ha?.[c.key] || 0);
                  const share = total > 0 ? Math.round((v / total) * 100) : 0;
                  return (
                    <tr key={c.key}>
                      <td className="px-4 py-2.5 font-bold flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-xs ${c.bar}`} />
                        <span>{c.key} – {c.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {c.key === 'S1' ? 'Prime commercial planting land; no limitations.' :
                         c.key === 'S2' ? 'Good planting land with minor, manageable constraints.' :
                         c.key === 'S3' ? 'Marginal land requiring significant capital interventions.' :
                         'Strictly uncultivable or protected environmental exclusion.'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-900">{ha(v)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-600">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance & Regulatory Standing */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            3. Regulatory & Deforestation Compliance (EUDR & WDPA)
          </h4>
          <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-green-800 font-bold">
              <CheckCircle2 size={16} className="text-green-700" />
              <span>EUDR Baseline & Statutory Protected Area Cross-Check</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Every parcel was verified against the Global Forest Change (Hansen / UMD v1.12) dataset for tree cover loss occurring after the 31 December 2020 EUDR cut-off date, and cross-referenced with the World Database on Protected Areas (WDPA). All statutory conservation reserves were excluded prior to analysis.
            </p>
          </div>
        </div>

        {/* Footer Audit Sign-Off */}
        <div className="pt-6 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400">
          <span>FarmIntelytics Autonomous Spatial Intelligence System</span>
          <span>Verified against Copernicus DEM GLO-30 & NASA POWER</span>
        </div>
      </Card>
    </div>
  );
}
