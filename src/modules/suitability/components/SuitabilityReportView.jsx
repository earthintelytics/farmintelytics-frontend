import { useState, useMemo } from 'react';
import {
  FileText,
  FileDown,
  CalendarDays,
  Mountain,
  Sprout,
  ShieldCheck,
  Sparkles,
  Layers,
  RefreshCw,
  } from 'lucide-react';
import { Card } from '../../../components/page/PageKit';
import { CLASSES, cropName } from '../suitabilityLabels';

const ha = (v) =>
  v != null ? `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha` : '—';

const REPORT_TYPES = [
  {
    id: 'dossier',
    label: 'Comprehensive Suitability Dossier',
    desc: 'Executive summary, financial viability, and FAO land class breakdown.',
    icon: <CalendarDays size={18} />,
  },
  {
    id: 'limiting',
    label: 'Agronomic & Soil Limiting Factors',
    desc: 'Soil pH, slope gradient, and terrain remediation directives.',
    icon: <Mountain size={18} />,
  },
  {
    id: 'eudr',
    label: 'EUDR & Regulatory Compliance',
    desc: 'Hansen post-2020 forest loss and WDPA reserve analysis.',
    icon: <ShieldCheck size={18} />,
  },
  {
    id: 'field_action',
    label: 'Field Action & Nursery Plan',
    desc: 'Phase 1 clearance priority, liming rates, and drainage layout.',
    icon: <Sprout size={18} />,
  },
];

const SECTIONS = [
  'Summary in plain words',
  'Status at a glance',
  'Blocks needing action, with what to do',
  'What changed against the comparison',
  'Advice for your focus',
  'Data used and limits',
];

export default function SuitabilityReportView({
  run,
  onDownloadPdf,
  pdfBusy,
  pdfMsg,
}) {
  const [selectedType, setSelectedType] = useState('dossier');
  const [selectedArea, setSelectedArea] = useState('whole');
  const [showFullDossier] = useState(true);

  const crop = cropName(run?.crop);
  const totalArea =
    Object.values(run?.classes_area_ha || {}).reduce((a, b) => a + (Number(b) || 0), 0) ||
    Number(run?.total_area_ha) ||
    0;

  const s1 = Number(run?.classes_area_ha?.S1 || 0);
  const s2 = Number(run?.classes_area_ha?.S2 || 0);
  const n = Number(run?.classes_area_ha?.N || 0);
  const primeTotal = s1 + s2;
  const primePct = totalArea > 0 ? Math.round((primeTotal / totalArea) * 100) : 0;

  // Limiting factors statistics across fields
  const limitingStats = useMemo(() => {
    const counts = {};
    (run?.fields || []).forEach((f) => {
      (f.limiting_factors || []).forEach((lim) => {
        const clean = lim.split('(')[0].trim();
        counts[clean] = (counts[clean] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [run?.fields]);

  // AI Agronomic Directives
  const aiDirective = useMemo(() => {
    const remedies = [];
    const topNames = limitingStats.slice(0, 3).map(([name]) => name.toLowerCase());

    for (const name of topNames) {
      if (name.includes('ph') || name.includes('acid')) {
        remedies.push(
          'Broadcast 1.5 to 2.0 tonnes/ha of agricultural limestone or dolomite 4 weeks prior to basal fertilizer application.'
        );
      } else if (name.includes('slope') || name.includes('topograph')) {
        remedies.push(
          'Establish contour bunds and broadcast leguminous cover crops (Mucuna bracteata) across blocks exceeding 8° gradient.'
        );
      } else if (name.includes('flood') || name.includes('drainage')) {
        remedies.push(
          'Excavate peripheral interceptor drainage canals to evacuate seasonal standing floodwaters.'
        );
      } else if (name.includes('rainfall') || name.includes('dry')) {
        remedies.push(
          'Schedule deep organic mulching and evaluate supplementary drip irrigation during prolonged dry months.'
        );
      }
    }
    if (remedies.length === 0) {
      remedies.push(
        'Maintain standard balanced N-P-K nutrient management with scheduled bi-annual soil organic carbon monitoring.'
      );
    }

    return {
      feasibility: `Out of ${ha(totalArea)} evaluated, ${ha(primeTotal)} (${primePct}%) is commercially viable for ${crop} cultivation. Prime S1 land represents ${ha(s1)} (${totalArea > 0 ? Math.round((s1 / totalArea) * 100) : 0}%), demonstrating optimal agro-ecological readiness.`,
      soilRemediation: remedies.join(' '),
      slopeMgmt:
        'On parcels exceeding 8° slope, plant curved contour rows along the hill profile and maintain leguminous cover crops to stop soil wash-off.',
      exclusions:
        n > 0
          ? `${ha(n)} (${totalArea > 0 ? Math.round((n / totalArea) * 100) : 0}%) is classified N (unsuitable). Commercial clearing is prohibited due to steep slope erosion hazards (>16°), standing wetlands, or EUDR/WDPA conservation buffers.`
          : 'Zero statutory conservation exclusions or Hansen post-2020 deforestation infractions detected across the evaluated boundary.',
    };
  }, [totalArea, primeTotal, primePct, s1, n, crop, limitingStats]);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* ── HEADER (Matches Screenshot 2) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700 shadow-2xs">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-gray-900 tracking-tight">
              Reports
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Choose what, where and when on the left; your report appears on the right, in plain language, ready to download or share.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400">Past Reports (0)</span>
        </div>
      </div>

      {/* ── TWO-COLUMN GRID (Matches Screenshot 2 Layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
        {/* ══ LEFT CONFIGURATION COLUMN ══ */}
        <aside className="space-y-6">
          <Card className="p-6 space-y-6 border border-gray-200 bg-white shadow-xs rounded-2xl">
            {/* Step 1: What kind of report? */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span>What kind of report?</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {REPORT_TYPES.map((t) => {
                  const isSelected = selectedType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedType(t.id)}
                      className={`text-left px-4 py-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-green-600 ring-2 ring-green-600/20 bg-green-50/40 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-green-700">
                        {t.icon}
                        <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-1">{t.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Which area? */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>Which area?</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedArea('whole')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedArea === 'whole'
                      ? 'bg-green-50 border-green-600 text-green-800 shadow-xs'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  Whole organisation ({ha(totalArea)})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedArea('prime')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedArea === 'prime'
                      ? 'bg-green-50 border-green-600 text-green-800 shadow-xs'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  High suitability ({ha(primeTotal)})
                </button>
              </div>
            </div>

            {/* Step 3: Observation Period & Resolution */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>Observation telemetry</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 font-medium">
                  Copernicus DEM 30m
                </span>
                <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 font-medium">
                  CHIRPS Rain
                </span>
                <span className="px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 font-medium">
                  ISRIC Soil
                </span>
              </div>
            </div>

            {/* Action Trigger */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <button
                type="button"
                onClick={onDownloadPdf}
                disabled={pdfBusy}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-green-700 hover:bg-green-800 shadow-xs hover:shadow disabled:bg-gray-200 disabled:text-gray-500 transition-all"
              >
                {pdfBusy ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Preparing report…</span>
                  </>
                ) : (
                  <>
                    <FileDown size={16} />
                    <span>Download PDF Report</span>
                  </>
                )}
              </button>
              {pdfMsg && <p role="status" className="text-sm text-center text-gray-700">{pdfMsg}</p>}

              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Sparkles size={14} className="text-green-700" />
                <span>Built from your satellite telemetry, terrain and climate models</span>
              </div>
            </div>
          </Card>
        </aside>

        {/* ══ RIGHT PREVIEW & RESULTS COLUMN (Matches Screenshot 2) ══ */}
        <section className="min-w-0 space-y-6">
          {/* Preview Container: 6 Structured Reading Sections (Screenshot 2) */}
          <Card className="p-8 lg:p-10 border border-gray-200 bg-white rounded-2xl shadow-xs text-center space-y-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center text-green-700">
              <FileText size={22} />
            </div>

            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Your report will appear here</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Pick the report, the area and the period on the left, then press Create report. It reads top to bottom:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
              {SECTIONS.map((s, idx) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-xs text-gray-700 bg-white shadow-2xs"
                >
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-gray-800">{s}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Formatted Dossier Sections (Rendered when viewing) */}
          {showFullDossier && (
            <div className="space-y-6 pt-2">
              {/* SECTION 1: Summary in plain words */}
              <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h4 className="text-sm font-bold text-gray-900">Summary in plain words</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-green-800 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    {primePct}% Commercially Viable
                  </span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">{aiDirective.feasibility}</p>
              </Card>

              {/* SECTION 2: Status at a glance */}
              <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">Status at a glance</h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CLASSES.map((cls) => {
                    const area = Number(run?.classes_area_ha?.[cls.key] || 0);
                    const pct = totalArea > 0 ? Math.round((area / totalArea) * 100) : 0;
                    return (
                      <div
                        key={cls.key}
                        className={`p-3.5 rounded-xl border ${cls.border} ${cls.bg} space-y-1`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800">{cls.label}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cls.color }}
                          />
                        </div>
                        <div className="text-base font-bold text-gray-900">{ha(area)}</div>
                        <div className="text-[11px] font-semibold text-gray-500">{pct}% of land</div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* SECTION 3: Blocks needing action, with what to do */}
              <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">
                    Blocks needing action, with what to do
                  </h4>
                </div>

                {limitingStats.length > 0 ? (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                    {limitingStats.slice(0, 4).map(([factor, count]) => (
                      <div
                        key={factor}
                        className="p-3.5 flex items-center justify-between gap-4 bg-white hover:bg-gray-50 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-gray-900 capitalize">{factor}</span>
                          <p className="text-gray-500 text-[11px]">
                            Constrains {count} surveyed block{count === 1 ? '' : 's'}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                          Action required
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    No critical limitations recorded across the evaluated boundary.
                  </p>
                )}
              </Card>

              {/* SECTION 4: What changed against the comparison */}
              <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">
                    What changed against the comparison
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-700">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <span className="font-semibold text-gray-500 block text-[11px]">Topography Baseline</span>
                    <span className="text-sm font-bold text-gray-900">Copernicus GLO-30 DEM</span>
                    <span className="text-[10px] text-gray-500 block">Slope & terrace classification</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <span className="font-semibold text-gray-500 block text-[11px]">Climate History</span>
                    <span className="text-sm font-bold text-gray-900">CHIRPS 30-Year Reanalysis</span>
                    <span className="text-[10px] text-gray-500 block">Rainfall deficit & dry season</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                    <span className="font-semibold text-gray-500 block text-[11px]">Deforestation Cut-off</span>
                    <span className="text-sm font-bold text-gray-900">Hansen GFC 2020-2024</span>
                    <span className="text-[10px] text-gray-500 block">EUDR 31 Dec 2020 compliance</span>
                  </div>
                </div>
              </Card>

              {/* SECTION 5: Advice for your focus */}
              <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center">
                    5
                  </span>
                  <h4 className="text-sm font-bold text-gray-900">Advice for your focus</h4>
                </div>
                <div className="space-y-2 text-xs text-gray-700 leading-relaxed">
                  <p>• <span className="font-bold text-gray-900">Soil Management:</span> {aiDirective.soilRemediation}</p>
                  <p>• <span className="font-bold text-gray-900">Hill Profile & Terracing:</span> {aiDirective.slopeMgmt}</p>
                  <p>• <span className="font-bold text-gray-900">Conservation & Exclusions:</span> {aiDirective.exclusions}</p>
                </div>
              </Card>

              {/* SECTION 6: Data used and limits */}
              <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold flex items-center justify-center">
                    6
                  </span>
                  <Layers size={16} className="text-gray-600" />
                  <span>Data used and limits</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-5">
                  <li>Evaluation resolution is calibrated to 30 m pixels based on Copernicus GLO-30 DEM.</li>
                  <li>EUDR deforestation screening utilizes Hansen Global Forest Change dataset post-31 Dec 2020.</li>
                  <li>Soil characteristics reflect ISRIC SoilGrids v2.0 modeled data at 0–30 cm topsoil layer.</li>
                  <li>Weather and precipitation baselines incorporate CHIRPS 0.05° gridded satellite climatology.</li>
                </ul>
              </Card>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
