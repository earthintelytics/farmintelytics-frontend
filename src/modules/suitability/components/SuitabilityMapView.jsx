import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sparkles, HelpCircle, ChevronUp, ChevronDown, Info, ShieldAlert } from 'lucide-react';
import { getFarmerLayerExplanation } from '../farmerLayerExplanations';
import { CLASSES, classLabel, cropName } from '../suitabilityLabels';

function Fit({ geometry }) {
  const map = useMap();
  useEffect(() => {
    if (!geometry) return;
    try {
      const b = L.geoJSON(geometry).getBounds();
      if (b.isValid()) {
        map.fitBounds(b, { padding: [32, 32], maxZoom: 16 });
      }
    } catch {
      // ignore
    }
  }, [geometry, map]);
  return null;
}

export default function SuitabilityMapView({
  run,
  selectedLayer,
  availableLayers,
  onSelectLayer,
  layerOpacity,
  basemap,
  showOverlay,
  onAskAiAboutLayer,
}) {
  const [panelOpen, setPanelOpen] = useState(true);
  const crop = cropName(run?.crop);

  const currentTileUrl =
    selectedLayer === 'final_class'
      ? run?.tiles?.result || run?.tiles?.factors?.final_class || null
      : run?.tiles?.factors?.[selectedLayer] || null;

  const currentLegend = run?.factor_legends?.[selectedLayer] || run?.layer_legends?.[selectedLayer];
  const explanation = getFarmerLayerExplanation(selectedLayer, crop);

  const onEachField = (feature, layer) => {
    const props = feature.properties || {};
    const title = props.name || props.field_id || 'Parcel';
    const cls = props.overall_class ? classLabel(props.overall_class) : '—';
    const area = props.area_ha != null ? `${props.area_ha} ha` : '';
    const limits = (props.limiting_factors || []).join(', ');
    const missing = (props.missing_factors || []).join(', ');
    const conf = props.confidence ? `Data Confidence: ${props.confidence}` : '';

    const html = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #111827; min-width: 150px;">
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">${title}</div>
        <div style="color: #4b5563; margin-bottom: 4px; font-weight: 500;">${cls}${area ? ` · ${area}` : ''}</div>
        ${conf ? `<div style="color: #047857; font-weight: 600; font-size: 11px; margin-bottom: 2px;">${conf}</div>` : ''}
        ${limits ? `<div style="color: #b45309; margin-top: 4px; font-size: 11px;"><strong>Limits:</strong> ${limits}</div>` : ''}
        ${missing ? `<div style="color: #6b7280; font-size: 10px; margin-top: 2px;">Data gaps: ${missing}</div>` : ''}
      </div>
    `;
    layer.bindPopup(html);
  };

  return (
    <div className="h-full w-full relative flex flex-col overflow-hidden bg-gray-900">
      {/* ── MAP CANVAS ── */}
      <div className="flex-1 w-full relative">
        <MapContainer center={[0, 0]} zoom={2} className="h-full w-full">
          {/* Basemap */}
          {basemap === 'satellite' ? (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Esri World Imagery"
              maxZoom={19}
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
              maxZoom={19}
            />
          )}

          {/* 30 m Raster Tile Layer */}
          {showOverlay && currentTileUrl && (
            <TileLayer
              key={`${selectedLayer}-${currentTileUrl}-${layerOpacity}`}
              url={currentTileUrl}
              opacity={layerOpacity}
            />
          )}

          {/* White Boundary Outlines */}
          {run?.fields_geojson && (
            <GeoJSON
              key={`fields-${run?.run_id}`}
              data={run.fields_geojson}
              style={{
                color: '#ffffff',
                weight: 2.5,
                fillColor: '#ffffff',
                fillOpacity: 0.05,
                dashArray: '',
              }}
              onEachFeature={onEachField}
            />
          )}

          {/* Camera Auto-Fit */}
          {run?.fields_geojson && <Fit geometry={run.fields_geojson} />}
        </MapContainer>

        {/* ── TOP FLOATING CHIPS BAR ── */}
        <div className="absolute top-4 left-4 right-4 z-[400] pointer-events-none flex items-center justify-between">
          <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-gray-100 text-xs font-semibold text-gray-800">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse" />
            <span>Active Layer:</span>
            <span className="font-bold text-green-800">{explanation.label}</span>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
              30m Grid
            </span>
          </div>

          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-gray-100 text-xs font-semibold text-gray-700 hover:text-gray-900"
          >
            <span>Farmer Interpretation & Legend</span>
            {panelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* ── BOTTOM DOCKED PANEL: FARMER INTERPRETATION & DYNAMIC LEGEND ── */}
        {panelOpen && (
          <div className="absolute bottom-4 left-4 right-4 z-[400] max-w-4xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all">
            {/* Header of Drawer */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50/70 to-white">
              <div className="flex items-center gap-2.5">
                <span className="p-1 rounded-lg bg-green-700 text-white">
                  <Sparkles size={14} />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 leading-tight">
                    {explanation.plainTitle} ({explanation.label})
                  </h4>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Plain-English interpretation for farmers (no GIS jargon)
                  </p>
                </div>
              </div>

              {explanation.farmerQuestions?.length > 0 && (
                <button
                  type="button"
                  onClick={() => onAskAiAboutLayer(explanation.farmerQuestions[0])}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 text-xs font-semibold transition-colors"
                >
                  <Sparkles size={12} className="text-green-700" />
                  <span>Ask AI about this layer</span>
                </button>
              )}
            </div>

            {/* Body of Drawer: Explanation + Dynamic Legend */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
              {/* Left Column: Plain-English Meaning & Practical Farmer Advice (7 cols) */}
              <div className="md:col-span-7 space-y-2 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-4">
                <div>
                  <span className="font-bold text-gray-900">What this means on your farm: </span>
                  <span className="text-gray-700">{explanation.whatItMeans}</span>
                </div>

                <div className="pt-1">
                  <span className="font-bold text-green-900">Why it matters for {crop}: </span>
                  <span className="text-gray-700">{explanation.whyItMatters}</span>
                </div>

                {explanation.farmerAdvice && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900">
                    <span className="font-bold">🌾 Practical Field Advice: </span>
                    {explanation.farmerAdvice}
                  </div>
                )}
              </div>

              {/* Right Column: Contextual Layer Legend (5 cols) */}
              <div className="md:col-span-5 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                    Map Color Key
                  </span>

                  {/* 1. Elevation Continuous Ramp */}
                  {currentLegend?.kind === 'ramp' ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono font-medium text-gray-700">
                        <span>{currentLegend.edges?.[0] != null ? `${currentLegend.edges[0]} m` : 'Low'}</span>
                        <span className="text-gray-400 font-sans">Terrain elevation (Copernicus DEM)</span>
                        <span>{currentLegend.edges?.[currentLegend.edges.length - 1] != null ? `${currentLegend.edges[currentLegend.edges.length - 1]} m` : 'High'}</span>
                      </div>
                      <div
                        className="h-3 w-full rounded-full shadow-inner"
                        style={{
                          background: `linear-gradient(to right, ${(currentLegend.colours || []).join(', ')})`,
                        }}
                      />
                    </div>
                  ) : currentLegend?.kind === 'categories' ? (
                    /* 2. Categorized Land Cover */
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {Object.entries(currentLegend.items || {}).map(([name, col]) => (
                        <div key={name} className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-xs shrink-0 shadow-2xs" style={{ backgroundColor: col }} />
                          <span className="text-gray-800 capitalize truncate">{name.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  ) : currentLegend?.kind === 'exclusion' ? (
                    /* 3. Regulatory Exclusion */
                    <div className="p-2.5 rounded-xl bg-red-100/70 border border-red-200 text-red-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <ShieldAlert size={15} className="text-red-700 shrink-0" />
                        <span>Regulatory Exclusion Zone</span>
                      </div>
                      <p className="text-[11px] text-red-800 leading-tight">
                        {currentLegend.meaning || 'Land is legally or environmentally excluded from clearing.'}
                      </p>
                    </div>
                  ) : currentLegend?.items?.length ? (
                    /* 4. Threshold Class Bands */
                    <div className="space-y-1 text-[11px]">
                      {currentLegend.items.map((item, idx) => (
                        <div key={item.class || idx} className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-xs shrink-0 shadow-2xs"
                              style={{ backgroundColor: item.color || '#2e7d32' }}
                            />
                            <span className="font-semibold text-gray-800">{item.label || item.class}</span>
                          </div>
                          {item.range && (
                            <span className="font-mono text-gray-500 text-[10px]">({item.range})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* 5. Standard FAO S1–N Color Badges */
                    <div className="space-y-1 text-[11px]">
                      {explanation.classesGuide ? (
                        explanation.classesGuide.map((c) => (
                          <div key={c.code} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-xs shrink-0 shadow-2xs" style={{ backgroundColor: c.color }} />
                            <span className="font-semibold text-gray-800">{c.code}:</span>
                            <span className="text-gray-600 truncate">{c.name.split('(')[0]}</span>
                          </div>
                        ))
                      ) : (
                        CLASSES.map((c) => (
                          <div key={c.key} className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-xs ${c.bar}`} />
                            <span className="font-semibold text-gray-800">{c.key}:</span>
                            <span className="text-gray-600">{c.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Question Chips for Farmer */}
                {explanation.farmerQuestions?.length > 1 && (
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <span className="text-[10px] text-gray-400 font-semibold block mb-1">
                      Quick Questions:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {explanation.farmerQuestions.slice(1, 3).map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onAskAiAboutLayer(q)}
                          className="text-[10px] text-green-800 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-md text-left truncate max-w-[220px]"
                          title={q}
                        >
                          "{q}"
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
