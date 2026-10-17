import { useMemo } from 'react';
import { Card, StatusPill, EmptyState } from '../../../components/page/PageKit';
import { CLASSES, classLabel, cropName, adviceFor } from '../suitabilityLabels';
import { Sparkles, Mountain, Compass, ShieldCheck, AlertTriangle, Layers, Sprout } from 'lucide-react';

const ha = (v) => (v != null ? `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha` : '—');
const pct = (v) => { const n = Number(v) || 0; return Math.round(n <= 1 ? n * 100 : n); };

export default function SuitabilityAnalyticsView({ run, actions, onAskAi }) {
  const crop = cropName(run?.crop);
  const totalArea = Object.values(run?.classes_area_ha || {}).reduce((a, b) => a + (Number(b) || 0), 0) || Number(run?.total_area_ha) || 0;

  // Compute limiting factors distribution across fields
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

  // Compute terrain statistics from fields
  const terrainStats = useMemo(() => {
    const fields = run?.fields || [];
    const slopes = fields.map((f) => f.slope_degrees != null ? Number(f.slope_degrees) : null).filter((v) => v != null);
    const elevs = fields.map((f) => f.elevation_m != null ? Number(f.elevation_m) : null).filter((v) => v != null);

    return {
      avgSlope: slopes.length ? (slopes.reduce((a, b) => a + b, 0) / slopes.length).toFixed(1) : null,
      maxSlope: slopes.length ? Math.max(...slopes).toFixed(1) : null,
      minElev: elevs.length ? Math.min(...elevs).toFixed(0) : null,
      maxElev: elevs.length ? Math.max(...elevs).toFixed(0) : null,
    };
  }, [run?.fields]);

  // Plain-English Farmer Briefing text
  const farmerBriefing = useMemo(() => {
    const s1 = Number(run?.classes_area_ha?.S1 || 0);
    const s2 = Number(run?.classes_area_ha?.S2 || 0);
    const s3 = Number(run?.classes_area_ha?.S3 || 0);
    const n = Number(run?.classes_area_ha?.N || 0);
    const primeTotal = s1 + s2;
    const primePct = totalArea > 0 ? Math.round((primeTotal / totalArea) * 100) : 0;

    let lead = `Out of ${Math.round(totalArea).toLocaleString()} hectares evaluated, ${Math.round(primeTotal).toLocaleString()} ha (${primePct}%) is commercially suitable for ${crop}.`;
    if (s1 > 0) {
      lead += ` You have ${Math.round(s1).toLocaleString()} ha of prime, top-tier land (S1) ready for immediate nursery transplanting with standard management.`;
    }

    let obstacles = '';
    if (limitingStats.length > 0) {
      const topLimits = limitingStats.slice(0, 2).map(([name]) => name.toLowerCase()).join(' and ');
      obstacles = ` The primary farming challenges holding back scores are ${topLimits}.`;
    }

    let exclusions = '';
    if (n > 0) {
      exclusions = ` Approximately ${Math.round(n).toLocaleString()} ha (${totalArea > 0 ? Math.round((n / totalArea) * 100) : 0}%) is unsuitable (N) due to severe slope, standing floodwater, or statutory environmental/EUDR protection.`;
    }

    return { lead, obstacles, exclusions };
  }, [run?.classes_area_ha, totalArea, crop, limitingStats]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* ── TOP KPI CARDS: FAO SUITABILITY CLASSES ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            FAO Planting Suitability Breakdown
          </h3>
          <span className="text-xs font-mono text-gray-400 font-semibold">
            {run?.resolution_m || 30} m Pixel Evaluation
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CLASSES.map((c) => {
            const v = Number(run?.classes_area_ha?.[c.key] || 0);
            const share = totalArea > 0 ? Math.round((v / totalArea) * 100) : 0;

            return (
              <Card key={c.key} className="p-5">
                <div className="flex items-center justify-between">
                  <StatusPill tone={c.tone}>{c.label}</StatusPill>
                  <span className="text-xs font-bold font-mono text-gray-400">{c.key}</span>
                </div>
                <p className="font-mono text-2xl font-bold text-gray-900 mt-3">{ha(v)}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>{share}% of total area</span>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${c.bar}`} style={{ width: `${share}%` }} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── EXECUTIVE FARMER BRIEFING (Plain English) ── */}
      <Card className="p-6 bg-white border border-gray-100 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-2xl bg-green-700 text-white shrink-0 mt-0.5">
            <Sprout size={22} />
          </div>
          <div className="space-y-2 flex-1 text-sm">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 text-base">
                Agronomic Plain-English Briefing for Farmers
              </h4>
              <button
                type="button"
                onClick={() => onAskAi?.('Give me a detailed 5-point action plan for developing this farm based on this suitability run.')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Sparkles size={13} className="text-green-700" />
                Ask AI for Field Action Plan
              </button>
            </div>
            <p className="text-gray-800 leading-relaxed font-medium">
              {farmerBriefing.lead}
              <span className="text-gray-600 font-normal">{farmerBriefing.obstacles}</span>
              <span className="text-red-700 font-normal">{farmerBriefing.exclusions}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* ── CHARTS ROW: DISTRIBUTION & LIMITING FACTORS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Class Share Bar Distribution (5 cols) */}
        <Card className="lg:col-span-5 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-900">Suitability Share Distribution</h4>
              <span className="text-xs font-mono text-gray-400 font-semibold">{ha(totalArea)}</span>
            </div>

            {/* Stacked Percentage Bar */}
            <div className="h-6 w-full rounded-xl overflow-hidden flex shadow-inner bg-gray-100">
              {CLASSES.map((c) => {
                const v = Number(run?.classes_area_ha?.[c.key] || 0);
                const share = totalArea > 0 ? (v / totalArea) * 100 : 0;
                if (share <= 0) return null;
                return (
                  <div
                    key={c.key}
                    style={{ width: `${share}%` }}
                    className={`${c.bar} h-full transition-all flex items-center justify-center text-[10px] font-bold text-white overflow-hidden`}
                    title={`${c.label} (${c.key}): ${ha(v)} (${Math.round(share)}%)`}
                  >
                    {share > 8 ? `${Math.round(share)}%` : ''}
                  </div>
                );
              })}
            </div>

            {/* Legend list */}
            <div className="mt-5 space-y-2.5">
              {CLASSES.map((c) => {
                const v = Number(run?.classes_area_ha?.[c.key] || 0);
                const share = totalArea > 0 ? Math.round((v / totalArea) * 100) : 0;
                return (
                  <div key={c.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-xs ${c.bar}`} />
                      <span className="font-semibold text-gray-800">{c.label}</span>
                      <span className="font-mono text-gray-400 text-[11px]">({c.key})</span>
                    </div>
                    <div className="font-mono font-semibold text-gray-700">
                      {ha(v)} <span className="text-gray-400 font-normal">({share}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terrain Snapshot Footer */}
          {terrainStats.avgSlope && (
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-2.5 rounded-xl">
                <span className="text-gray-500 block text-[11px]">Average Slope</span>
                <span className="font-mono font-bold text-gray-900 text-sm">{terrainStats.avgSlope}°</span>
                <span className="text-gray-400 text-[10px] block mt-0.5">Max {terrainStats.maxSlope}°</span>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl">
                <span className="text-gray-500 block text-[11px]">Elevation Range</span>
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {terrainStats.minElev} – {terrainStats.maxElev} m
                </span>
                <span className="text-gray-400 text-[10px] block mt-0.5">Above sea level</span>
              </div>
            </div>
          )}
        </Card>

        {/* Limiting Factors Ranking (7 cols) */}
        <Card className="lg:col-span-7 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Most Common Limiting Conditions</h4>
              <p className="text-xs text-gray-500 mt-0.5">What environmental constraints are pulling down field scores</p>
            </div>
            <span className="text-xs font-mono text-gray-400 font-semibold">
              {limitingStats.length} {limitingStats.length === 1 ? 'factor' : 'factors'}
            </span>
          </div>

          {limitingStats.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No limiting factors identified. All evaluated parameters meet prime S1 requirements!
            </div>
          ) : (
            <div className="space-y-3">
              {limitingStats.slice(0, 6).map(([factorName, count]) => {
                const maxCount = Math.max(1, ...limitingStats.map(([, c]) => c));
                const barWidth = Math.round((count / maxCount) * 100);

                return (
                  <div key={factorName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-800">{factorName}</span>
                      <span className="font-mono text-gray-500 text-[11px]">
                        Limits {count} {count === 1 ? 'parcel' : 'parcels'}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── PER-FIELD EVALUATION TABLE ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Per-Field Evaluation Breakdown</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Confidence rating, limiting conditions, and practical farmer actions for each parcel.
            </p>
          </div>
          <span className="text-xs font-mono text-gray-400 font-semibold">
            {(run?.fields || []).length} Parcels
          </span>
        </div>

        {(run?.fields || []).length === 0 ? (
          <EmptyState title="No field breakdown" text="This suitability analysis did not generate a per-parcel table." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Parcel</th>
                    <th className="px-5 py-3">Result</th>
                    <th className="px-5 py-3">Confidence</th>
                    <th className="px-5 py-3">Suitability Share</th>
                    <th className="px-5 py-3">Limiting Factors</th>
                    <th className="px-5 py-3">What To Do (Farmer Action)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {run.fields.map((f, i) => {
                    const cls = f.overall_class || '—';
                    const isN = String(cls).startsWith('N');
                    const tone = isN ? 'critical' : cls === 'S1' || cls === 'S2' ? 'good' : 'warning';
                    const advice = (f.limiting_factors || []).map((lim) => adviceFor(lim, actions)).filter(Boolean)[0];

                    return (
                      <tr key={f.field_id || i} className="hover:bg-gray-50/80 transition-colors">
                        {/* Parcel ID & Area */}
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-gray-900">{f.name || f.field_id || `Parcel ${i + 1}`}</p>
                          <p className="text-xs font-mono text-gray-500 mt-0.5">{ha(f.area_ha)}</p>
                        </td>

                        {/* Assigned Class */}
                        <td className="px-5 py-3.5">
                          <StatusPill tone={tone}>{classLabel(cls)}</StatusPill>
                        </td>

                        {/* Confidence */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${
                              f.confidence === 'high'
                                ? 'bg-green-50 text-green-800'
                                : f.confidence === 'medium'
                                ? 'bg-blue-50 text-blue-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {f.confidence ? f.confidence.toUpperCase() : 'STANDARD'}
                          </span>
                        </td>

                        {/* Suitability Share Bar */}
                        <td className="px-5 py-3.5 min-w-[130px]">
                          {f.classes_area_ha ? (
                            <div className="space-y-1">
                              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                                {CLASSES.map((k) => {
                                  const haVal = Number(f.classes_area_ha?.[k.key] || 0);
                                  const totalF = Object.values(f.classes_area_ha).reduce((a, b) => a + (Number(b) || 0), 0) || Number(f.area_ha) || 1;
                                  return (
                                    <span
                                      key={k.key}
                                      className={k.bar}
                                      style={{ width: `${(haVal / totalF) * 100}%` }}
                                      title={`${k.key}: ${ha(haVal)}`}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Limiting Factors */}
                        <td className="px-5 py-3.5 text-xs text-gray-700 max-w-xs">
                          {f.limiting_factors?.length ? (
                            <span className="text-amber-800 font-medium">
                              {f.limiting_factors.join(' · ')}
                            </span>
                          ) : (
                            <span className="text-green-700 font-medium">None (Optimal)</span>
                          )}
                        </td>

                        {/* Farmer Action Advice */}
                        <td className="px-5 py-3.5 text-xs text-gray-600 max-w-sm">
                          {advice ? (
                            <span className="text-gray-800 font-normal">{advice}</span>
                          ) : isN ? (
                            <span className="text-red-700 font-medium">Do not clear or cultivate. Preserve natural buffer.</span>
                          ) : (
                            <span className="text-gray-500">Standard agronomic best practices.</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* ── DATA SOURCES & AUDIT ── */}
      <div className="pt-2">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Verified Earth Observation Sources
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { name: 'Copernicus DEM GLO-30', measure: 'Terrain Elevation & Slope (30m)' },
            { name: 'NASA POWER Climatology', measure: 'Annual Rainfall & Dry Season' },
            { name: 'ESA WorldCover 2020 / 2021', measure: 'Land Cover & EUDR Baseline' },
            { name: 'Hansen Global Forest Change', measure: 'Post-2020 Deforestation Detection' },
            { name: 'ISRIC SoilGrids', measure: '0–30 cm Soil pH' },
            { name: 'JRC Global Surface Water', measure: 'Flood Occurrence & River Distance' },
            { name: 'WDPA Nature Reserves', measure: 'Protected Area Boundary Exclusions' },
          ].map((src, idx) => (
            <div key={idx} className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-gray-900">
                <ShieldCheck size={14} className="text-green-700 shrink-0" />
                <span className="truncate">{src.name}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">{src.measure}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
