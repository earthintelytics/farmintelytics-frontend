import { useEffect, useState } from 'react';
import { ArrowLeft, FileDown, Layers, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchSuitabilityRun, generateReportPdf } from '../../../services/suitabilityApi';
import { fetchSuitabilityThresholds } from '../../../services/adminApi';
import { Card, StatusPill, SecondaryButton, ErrorNote, EmptyState } from '../../../components/page/PageKit';
import { CLASSES, classLabel, classTone, runStatus, isFinished, cropName, adviceFor, CROPS } from '../suitabilityLabels';

const POLL_MS = 5000;
// Shares may arrive as fractions (0–1) or percentages.
const pct = (v) => { const n = Number(v) || 0; return Math.round(n <= 1 ? n * 100 : n); };
const ha = (v) => (v != null ? `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha` : '—');

const LAYER_LABELS = {
  final_class: 'Final class',
  rainfall: 'Rainfall',
  dry_season: 'Dry season',
  temperature: 'Temperature',
  surface_heat: 'Surface heat (LST)',
  slope: 'Slope',
  soil_ph: 'Soil pH',
  soil_depth: 'Soil depth',
  distance_to_water: 'Distance to water',
  flood_frequency: 'Flood frequency',
  wetness: 'Canopy moisture (NDMI)',
  forest_2020: 'Forest 2020 (EUDR)',
  protected_exclusion: 'Protected areas (WDPA)',
};

function Fit({ geometry }) {
  const map = useMap();
  useEffect(() => {
    if (!geometry) return;
    try {
      const b = L.geoJSON(geometry).getBounds();
      if (b.isValid()) {
        map.fitBounds(b, { padding: [24, 24], maxZoom: 16 });
      }
    } catch {
      // ignore
    }
  }, [geometry, map]);
  return null;
}

/**
 * One analysis: its real status (re-checked until it finishes), area per
 * class, the result map with factor layer switching, plain legends, field outlines,
 * and every field with its limiting factors, missing factors, confidence, and advice.
 */
const RunResult = ({ runId, companyId, onBack }) => {
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');
  const [actions, setActions] = useState({});
  const [pdf, setPdf] = useState({ busy: false, msg: '' });
  const [selectedLayer, setSelectedLayer] = useState('final_class');

  useEffect(() => {
    let live = true;
    let timer;
    const load = () => fetchSuitabilityRun(runId)
      .then((r) => { if (!live) return; setRun(r); setError(''); if (!isFinished(r.status)) timer = setTimeout(load, POLL_MS); })
      .catch((e) => { if (live) setError(e.message); });
    load();
    return () => { live = false; clearTimeout(timer); };
  }, [runId]);

  useEffect(() => {
    if (!run?.crop) return undefined;
    let live = true;
    const admin = CROPS.find((c) => c.id === run.crop)?.admin || run.crop;
    fetchSuitabilityThresholds(admin, companyId).then((d) => { if (live) setActions(d?.farmer_actions || {}); }).catch(() => {});
    return () => { live = false; };
  }, [run?.crop, companyId]);

  const report = async () => {
    setPdf({ busy: true, msg: '' });
    try {
      const r = await generateReportPdf(runId);
      if (r?.pdf_url && r.status === 'ready') window.open(r.pdf_url, '_blank', 'noopener');
      setPdf({ busy: false, msg: r?.status === 'ready' ? '' : 'The report is being prepared.' });
    } catch (e) { setPdf({ busy: false, msg: e.message }); }
  };

  const back = <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft size={15} />All analyses</button>;
  if (error && !run) return <div className="space-y-6">{back}<ErrorNote message={error} /></div>;
  if (!run) return <div className="space-y-6">{back}<p className="text-sm text-gray-500">Loading the analysis…</p></div>;

  const [statusLabel, statusTone] = runStatus(run.status);
  const total = Object.values(run.classes_area_ha || {}).reduce((a, b) => a + (Number(b) || 0), 0) || Number(run.total_area_ha) || 0;
  const done = isFinished(run.status) && run.status !== 'failed';

  // Compute available factor layers
  const availableLayers = (() => {
    const set = new Set();
    set.add('final_class');
    (run?.layers || []).forEach((l) => set.add(l));
    if (run?.tiles?.factors) {
      Object.keys(run.tiles.factors).forEach((k) => set.add(k));
    }
    const list = Array.from(set).filter((k) => k !== 'final_class');
    return ['final_class', ...list];
  })();

  // Compute tile URL for selected layer
  const currentTileUrl = selectedLayer === 'final_class'
    ? run?.tiles?.result || run?.tiles?.factors?.final_class || null
    : run?.tiles?.factors?.[selectedLayer] || null;

  const currentLegend = run.factor_legends?.[selectedLayer];

  const onEachField = (feature, layer) => {
    const props = feature.properties || {};
    const title = props.name || props.field_id || 'Field';
    const cls = props.overall_class ? classLabel(props.overall_class) : '—';
    const area = props.area_ha != null ? `${props.area_ha} ha` : '';
    const limits = (props.limiting_factors || []).join(', ');
    const missing = (props.missing_factors || []).join(', ');
    const conf = props.confidence ? `Confidence: ${props.confidence}` : '';

    const html = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #111827; min-width: 140px;">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">${title}</div>
        <div style="color: #4b5563; margin-bottom: 4px;">${cls}${area ? ` · ${area}` : ''}</div>
        ${conf ? `<div style="color: #047857; font-weight: 500; margin-bottom: 2px;">${conf}</div>` : ''}
        ${limits ? `<div style="color: #b45309; margin-top: 2px;">Limits: ${limits}</div>` : ''}
        ${missing ? `<div style="color: #6b7280; font-size: 11px; margin-top: 2px;">Missing: ${missing}</div>` : ''}
      </div>
    `;
    layer.bindPopup(html);
  };

  return (
    <div className="space-y-8">
      {back}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-green-700">{cropName(run.crop)}{run.variant ? ` · ${run.variant}` : ''}</p>
          <h2 className="font-display text-3xl font-semibold text-gray-900 tracking-tight mt-1">Where {cropName(run.crop).toLowerCase()} fits</h2>
          <p className="text-sm text-gray-500 mt-2">{[run.irrigated ? 'Irrigated' : 'Rain-fed', run.strictness && `${run.strictness} thresholds`, run.created_at && new Date(run.created_at).toLocaleString()].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill tone={statusTone}>{statusLabel}{!isFinished(run.status) && run.progress != null ? ` · ${run.progress}%` : ''}</StatusPill>
          {done && <SecondaryButton onClick={report} disabled={pdf.busy}><FileDown size={15} />{pdf.busy ? 'Preparing…' : 'Report (PDF)'}</SecondaryButton>}
        </div>
      </div>
      {pdf.msg && <p className="text-sm text-gray-600">{pdf.msg}</p>}

      {!isFinished(run.status) && (
        <Card className="p-6 flex items-center gap-3 text-sm text-gray-700">
          <RefreshCw size={16} className="animate-spin text-green-700" />
          The pipeline is working on this analysis. This page updates by itself.
        </Card>
      )}
      {run.status === 'failed' && <ErrorNote message="This analysis failed in the pipeline. Start it again, or check Admin → Logs." />}

      {done && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {CLASSES.map((c) => {
              const v = Number(run.classes_area_ha?.[c.key] || 0);
              return (
                <Card key={c.key} className="p-5">
                  <StatusPill tone={c.tone}>{c.label}</StatusPill>
                  <p className="font-mono text-2xl text-gray-900 mt-3">{ha(v)}</p>
                  <p className="text-xs text-gray-500 mt-1">{total ? `${Math.round((v / total) * 100)} % of the area` : '—'}</p>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden">
            {/* Factor Layer Switcher */}
            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Suitability Layers
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {availableLayers.length} {availableLayers.length === 1 ? 'layer' : 'layers'} available
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {availableLayers.map((layerKey) => {
                  const active = selectedLayer === layerKey;
                  const label = LAYER_LABELS[layerKey] || layerKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <button
                      key={layerKey}
                      type="button"
                      onClick={() => setSelectedLayer(layerKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-green-700 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map Canvas */}
            <div className="h-[460px] relative">
              <MapContainer center={[0, 0]} zoom={2} className="h-full w-full">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Esri"
                />
                {currentTileUrl && (
                  <TileLayer
                    key={`${selectedLayer}-${currentTileUrl}`}
                    url={currentTileUrl}
                    opacity={0.8}
                  />
                )}
                {run.fields_geojson && (
                  <GeoJSON
                    key={`fields-${runId}`}
                    data={run.fields_geojson}
                    style={{ color: '#ffffff', weight: 2.5, fillOpacity: 0.05 }}
                    onEachFeature={onEachField}
                  />
                )}
                {run.fields_geojson && <Fit geometry={run.fields_geojson} />}
              </MapContainer>
            </div>

            {/* Plain Legend per Layer */}
            {currentLegend?.items?.length ? (
              <div className="px-5 py-3.5 border-t border-gray-100 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-semibold text-gray-800">
                    {currentLegend.name || LAYER_LABELS[selectedLayer] || selectedLayer}
                    {currentLegend.unit ? ` (${currentLegend.unit})` : ''}
                  </span>
                  <span className="text-[11px] text-gray-500">Evaluation thresholds & class ranges</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                  {currentLegend.items.map((item, idx) => (
                    <span key={item.class || idx} className="inline-flex items-center gap-1.5 text-gray-700">
                      <span
                        className="w-3.5 h-3.5 rounded-sm flex-shrink-0 shadow-xs"
                        style={{ backgroundColor: item.color || '#2e7d32' }}
                      />
                      <span className="font-medium text-gray-900">{item.label || item.class}</span>
                      {item.range && (
                        <span className="font-mono text-gray-500 text-[11px]">({item.range})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-gray-100 text-xs text-gray-600 bg-white">
                {CLASSES.map((c) => (
                  <span key={c.key} className="inline-flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-sm ${c.bar}`} />
                    <span className="font-medium text-gray-900">{c.label}</span>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Per-field table with limiting factors, missing factors, and confidence */}
          {(run.fields || []).length === 0 ? (
            <EmptyState title="No field results" text="This analysis has no per-field breakdown." />
          ) : (
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Per-field evaluation breakdown</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Confidence rating, missing factors, and limiting conditions for each parcel.
                  </p>
                </div>
                <span className="text-xs font-mono text-gray-500">
                  {run.fields.length} {run.fields.length === 1 ? 'field' : 'fields'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white text-left text-xs font-semibold text-gray-600">
                    <tr>
                      <th className="px-5 py-3">Field</th>
                      <th className="px-5 py-3">Result</th>
                      <th className="px-5 py-3">Confidence</th>
                      <th className="px-5 py-3">Missing factors</th>
                      <th className="px-5 py-3">Share of the field</th>
                      <th className="px-5 py-3">What limits it</th>
                      <th className="px-5 py-3">What to do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {run.fields.map((f) => {
                      const advice = (f.limiting_factors || []).map((x) => adviceFor(x, actions)).find(Boolean);
                      const confTone =
                        f.confidence === 'High' || (f.data_coverage != null && f.data_coverage >= 0.8)
                          ? 'good'
                          : f.confidence === 'Low' || (f.data_coverage != null && f.data_coverage < 0.5)
                          ? 'critical'
                          : 'warning';
                      const confText = f.confidence || (f.data_coverage != null ? `${Math.round(f.data_coverage * 100)}% coverage` : 'Standard');
                      const missingList = f.missing_factors || [];

                      return (
                        <tr key={f.field_id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-gray-900">{f.name || f.field_id}</td>
                          <td className="px-5 py-3">
                            <StatusPill tone={classTone(f.overall_class)}>{classLabel(f.overall_class)}</StatusPill>
                          </td>
                          <td className="px-5 py-3">
                            <StatusPill tone={confTone}>{confText}</StatusPill>
                          </td>
                          <td className="px-5 py-3 text-xs">
                            {missingList.length === 0 ? (
                              <span className="text-gray-400">None</span>
                            ) : (
                              <span className="text-amber-700 font-medium">{missingList.join(', ')}</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex h-2.5 w-36 rounded-full overflow-hidden bg-gray-100">
                              {CLASSES.map((c) => (
                                <span key={c.key} className={c.bar} style={{ width: `${pct(f.share?.[c.key])}%` }} />
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-700">{(f.limiting_factors || []).join(', ') || 'Nothing'}</td>
                          <td className="px-5 py-3 text-gray-700">
                            {advice || (f.limiting_factors?.length ? (
                              <span className="text-gray-400">Set advice in Admin → Map classes and suitability</span>
                            ) : (
                              'Plant as usual'
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <details className="text-sm text-gray-600">
            <summary className="cursor-pointer text-gray-800 font-medium">How this was worked out</summary>
            <p className="mt-2 max-w-3xl">FAO land evaluation: each factor (rainfall and dry season from CHIRPS, temperature from ERA5-Land, slope and wetness from the Copernicus 30 m terrain model, soil from SoilGrids 250 m, flooding from radar) is scored for the crop with the thresholds set in the admin; forest on 31 December 2020 (JRC GFC2020), protected areas (WDPA) and river banks are excluded. Soil at 250 m and rainfall at 5 km make this a planning screen, not a field survey.</p>
          </details>
        </>
      )}
    </div>
  );
};

export default RunResult;
