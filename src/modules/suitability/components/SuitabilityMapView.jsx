import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Sparkles, Layers, X, ShieldAlert, Sliders, Info, HelpCircle } from 'lucide-react';
import { getFarmerLayerExplanation } from '../farmerLayerExplanations';
import { CLASSES, classLabel, cropName } from '../suitabilityLabels';

function Fit({ geometry }) {
  const map = useMap();
  useEffect(() => {
    if (!geometry) return;
    try {
      const b = L.geoJSON(geometry).getBounds();
      if (b.isValid()) {
        map.fitBounds(b, { padding: [16, 16], maxZoom: 18 });
        const z = map.getZoom();
        if (z < 14) {
          map.setZoom(Math.min(15, z + 2));
        }
      }
    } catch {
      // ignore
    }
  }, [geometry, map]);
  return null;
}

function ResizeMap({ trigger }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [trigger, map]);
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
  const [showRightLegend, setShowRightLegend] = useState(true);
  const crop = cropName(run?.crop);

  const currentTileUrl =
    selectedLayer === 'final_class'
      ? run?.tiles?.result || run?.tiles?.factors?.final_class || null
      : run?.tiles?.factors?.[selectedLayer] || null;

  const currentLegend = run?.factor_legends?.[selectedLayer] || run?.layer_legends?.[selectedLayer];
  const explanation = getFarmerLayerExplanation(selectedLayer, crop);

  return (
    <div className="h-full w-full relative flex overflow-hidden bg-gray-900 font-sans">
      {/* ── MAP CANVAS (Left & Center) ── */}
      <div className="flex-1 h-full relative min-w-0">
        <MapContainer center={[0, 0]} zoom={2} className="h-full w-full" zoomControl={false}>
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

          {/* Camera Auto-Fit */}
          {run?.fields_geojson && <Fit geometry={run.fields_geojson} />}

          {/* Map resize invalidate trigger when legend toggles */}
          <ResizeMap trigger={showRightLegend} />
        </MapContainer>

        {/* ── TOP-LEFT FLOATING LAYER CHIP ── */}
        <div className="absolute top-4 left-4 z-[400] pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-xl shadow-sm border border-gray-200 text-xs font-semibold text-gray-800">
          <span className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse shrink-0" />
          <span className="text-gray-500">Active Layer:</span>
          <span className="font-bold text-green-900">{explanation.label}</span>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
            30m Pixels
          </span>
        </div>

        {/* ── TOP-RIGHT TOGGLE BUTTON (Matches Main Dashboard) ── */}
        <button
          type="button"
          onClick={() => setShowRightLegend(!showRightLegend)}
          aria-pressed={showRightLegend}
          className={`absolute top-4 right-4 z-[400] flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/95 backdrop-blur-xs text-xs font-semibold shadow-sm transition-all ${
            showRightLegend
              ? 'border-green-600 text-green-800 ring-2 ring-green-100'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Layers size={15} className="text-green-700" />
          <span>Map Legend</span>
        </button>
      </div>

      {/* ── RIGHT-SIDE LEGEND PANEL (Matches Main Dashboard MapLayersPanel Layout) ── */}
      {showRightLegend && (
        <aside className="w-[320px] lg:w-[350px] bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto z-20 shadow-sm animate-in slide-in-from-right duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <Layers size={17} className="text-green-700" />
              <span>Map Legend & Insights</span>
            </span>
            <button
              type="button"
              onClick={() => setShowRightLegend(false)}
              aria-label="Close map legend"
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={17} />
            </button>
          </div>

          {/* Panel Content */}
          <div className="p-4 space-y-4 flex-1 text-xs">
            {/* Active Layer Banner Card */}
            <div className="p-3.5 bg-green-50/70 border border-green-200 rounded-xl space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="p-1 rounded-md bg-green-700 text-white">
                      <Sparkles size={11} />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-800">
                      Layer on Map
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm">
                    {explanation.plainTitle}
                  </h4>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {explanation.label} · 30m Grid
                  </p>
                </div>

                <span className="text-[10px] font-bold text-green-700 bg-white border border-green-200 rounded-full px-2 py-0.5 shadow-2xs shrink-0">
                  On map
                </span>
              </div>

              {onAskAiAboutLayer && explanation.farmerQuestions?.length > 0 && (
                <button
                  type="button"
                  onClick={() => onAskAiAboutLayer(explanation.farmerQuestions[0])}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-green-700 text-white hover:bg-green-800 text-[11px] font-semibold transition-colors shadow-2xs"
                >
                  <Sparkles size={12} />
                  <span>Ask AI about this layer</span>
                </button>
              )}
            </div>

            {/* ── MAP COLOR SCALE / LEGEND CARD ── */}
            <div className="border border-gray-200 rounded-xl p-3.5 space-y-2.5 bg-white">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Color Key & Scale
              </span>

              {/* 1. Continuous Ramp */}
              {currentLegend?.kind === 'ramp' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono font-medium text-gray-700">
                    <span>{currentLegend.edges?.[0] != null ? `${currentLegend.edges[0]} m` : 'Low'}</span>
                    <span className="text-gray-400 font-sans text-[10px]">Elevation (DEM)</span>
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
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  {Object.entries(currentLegend.items || {}).map(([name, col]) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-2xs" style={{ backgroundColor: col }} />
                      <span className="text-gray-800 capitalize font-medium">{name.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              ) : currentLegend?.kind === 'exclusion' ? (
                /* 3. Regulatory Exclusion */
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-red-800">
                    <ShieldAlert size={15} className="text-red-700 shrink-0" />
                    <span>Regulatory Exclusion Zone</span>
                  </div>
                  <p className="text-[11px] text-red-800 leading-tight">
                    {currentLegend.meaning || 'Land is legally or environmentally excluded from clearing under EUDR/WDPA.'}
                  </p>
                </div>
              ) : currentLegend?.items?.length ? (
                /* 4. Threshold Class Bands */
                <div className="space-y-1.5 text-[11px]">
                  {currentLegend.items.map((item, idx) => (
                    <div key={item.class || idx} className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.color || '#2e7d32' }}
                        />
                        <span className="font-semibold text-gray-800 truncate">{item.label || item.class}</span>
                      </div>
                      {item.range && (
                        <span className="font-mono text-gray-500 text-[10px] shrink-0 font-medium">({item.range})</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* 5. Standard FAO S1–N Color Badges */
                <div className="space-y-1.5 text-[11px]">
                  {explanation.classesGuide ? (
                    explanation.classesGuide.map((c) => (
                      <div key={c.code} className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-2xs" style={{ backgroundColor: c.color }} />
                        <span className="font-bold text-gray-800">{c.code}:</span>
                        <span className="text-gray-600 truncate">{c.name.split('(')[0]}</span>
                      </div>
                    ))
                  ) : (
                    CLASSES.map((c) => (
                      <div key={c.key} className="flex items-center gap-2">
                        <span className={`w-3.5 h-3.5 rounded-xs shrink-0 ${c.bar}`} />
                        <span className="font-bold text-gray-800">{c.key}:</span>
                        <span className="text-gray-600">{c.label}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* ── PLAIN-ENGLISH MEANING & FIELD ADVICE ── */}
            <div className="border border-gray-200 rounded-xl p-3.5 space-y-2.5 bg-white">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Farmer Agronomic Interpretation
              </span>

              <div className="space-y-1.5 leading-relaxed">
                <span className="font-bold text-gray-900 block">What this means on your farm:</span>
                <p className="text-gray-700">{explanation.whatItMeans}</p>
              </div>

              <div className="space-y-1.5 leading-relaxed pt-2 border-t border-gray-100">
                <span className="font-bold text-green-950 block">Why it matters for {crop}:</span>
                <p className="text-gray-700">{explanation.whyItMatters}</p>
              </div>

              {explanation.farmerAdvice && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
                  <span className="font-bold block mb-0.5">🌾 Practical Field Advice:</span>
                  {explanation.farmerAdvice}
                </div>
              )}
            </div>

            {/* ── QUICK QUESTIONS CHIPS FOR AI ADVISOR ── */}
            {onAskAiAboutLayer && explanation.farmerQuestions?.length > 1 && (
              <div className="border border-gray-200 rounded-xl p-3.5 space-y-2 bg-white">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Quick AI Inquiries
                </span>
                <div className="space-y-1.5">
                  {explanation.farmerQuestions.slice(1, 4).map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onAskAiAboutLayer(q)}
                      className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-green-50 hover:text-green-800 border border-gray-100 hover:border-green-200 text-gray-700 text-[11px] transition-colors leading-snug flex items-center justify-between gap-1 group"
                    >
                      <span className="line-clamp-2">"{q}"</span>
                      <Sparkles size={11} className="text-gray-400 group-hover:text-green-700 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
