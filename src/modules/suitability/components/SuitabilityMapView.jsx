import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Sparkles,
  Layers,
  X,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Mountain,
  CloudRain,
  FlaskConical,
  Waves,
  Trees,
  Sliders,
  Check,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { getFarmerLayerExplanation, FARMER_LAYER_EXPLANATIONS } from '../farmerLayerExplanations';
import { CLASSES, cropName } from '../suitabilityLabels';

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

const CATEGORY_META = {
  Summary: { name: 'Overall Evaluation', icon: Layers, order: 1 },
  Terrain: { name: 'Topography & Terrain', icon: Mountain, order: 2 },
  Climate: { name: 'Climate & Rainfall', icon: CloudRain, order: 3 },
  Soil: { name: 'Soil Chemistry & Acidity', icon: FlaskConical, order: 4 },
  Water: { name: 'Hydrology & Inundation', icon: Waves, order: 5 },
  Compliance: { name: 'Land Cover & EUDR Compliance', icon: Trees, order: 6 },
};

export default function SuitabilityMapView({
  run,
  selectedLayer,
  availableLayers = [],
  onSelectLayer,
  layerOpacity = 0.8,
  onChangeOpacity,
  basemap = 'satellite',
  onChangeBasemap,
  showOverlay = true,
  onToggleOverlay,
  onAskAiAboutLayer,
}) {
  const [showRightLegend, setShowRightLegend] = useState(true);
  const [showBasemapDropdown, setShowBasemapDropdown] = useState(false);
  const crop = cropName(run?.crop);

  // Expanded groups & layers state
  const [expandedGroups, setExpandedGroups] = useState(null);
  const [expandedLayers, setExpandedLayers] = useState([selectedLayer]);

  // Keep selected layer expanded whenever it changes
  useEffect(() => {
    setExpandedLayers((prev) => (prev.includes(selectedLayer) ? prev : [...prev, selectedLayer]));
  }, [selectedLayer]);

  const currentTileUrl =
    selectedLayer === 'final_class'
      ? run?.tiles?.result || run?.tiles?.factors?.final_class || null
      : run?.tiles?.factors?.[selectedLayer] || null;

  // Active layer explanation
  const activeExplanation = getFarmerLayerExplanation(selectedLayer, crop);

  // Group all available layers used to generate the analysis
  const legendGroups = useMemo(() => {
    const layerList = availableLayers.length > 0 ? availableLayers : Object.keys(FARMER_LAYER_EXPLANATIONS);
    const groups = {};

    layerList.forEach((key) => {
      const info = getFarmerLayerExplanation(key, crop);
      const catKey = info.category || 'Summary';
      const meta = CATEGORY_META[catKey] || { name: catKey, icon: Layers, order: 99 };

      if (!groups[catKey]) {
        groups[catKey] = {
          id: catKey,
          name: meta.name,
          icon: meta.icon,
          order: meta.order,
          entries: [],
        };
      }

      const legend = run?.factor_legends?.[key] || run?.layer_legends?.[key];

      groups[catKey].entries.push({
        key,
        info,
        legend,
        hasTiles: Boolean(
          key === 'final_class'
            ? run?.tiles?.result || run?.tiles?.factors?.final_class
            : run?.tiles?.factors?.[key]
        ),
      });
    });

    return Object.values(groups).sort((a, b) => a.order - b.order);
  }, [availableLayers, crop, run?.factor_legends, run?.layer_legends, run?.tiles]);

  // Handle open groups toggle
  const openGroupIds = expandedGroups || legendGroups.map((g) => g.id);
  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => {
      const current = prev || legendGroups.map((g) => g.id);
      return current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId];
    });
  };

  const toggleLayerCard = (key) => {
    setExpandedLayers((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectLayerOnMap = (key) => {
    if (onSelectLayer) onSelectLayer(key);
    if (!showOverlay && onToggleOverlay) onToggleOverlay();
    if (!expandedLayers.includes(key)) {
      setExpandedLayers((prev) => [...prev, key]);
    }
  };

  return (
    <div className="h-full w-full relative flex overflow-hidden bg-gray-900 font-sans">
      {/* ── MAP CANVAS (Left & Center) ── */}
      <div className="flex-1 h-full relative min-w-0 map-wrapper-pane">
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

          {/* Leaflet Zoom Control Bottom-Right (Matches Screenshot 1) */}
          <ZoomControl position="bottomright" />

          {/* Map resize invalidate trigger when legend toggles */}
          <ResizeMap trigger={showRightLegend} />
        </MapContainer>

        {/* ── TOP-LEFT FLOATING CONTROLS (Basemap Selector & Active Layer Chip) ── */}
        <div className="absolute top-4 left-4 z-[400] flex items-center gap-2 pointer-events-auto">
          {/* Floating Basemap Selector (Matches main dashboard renderFloatingBasemapSelector) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBasemapDropdown(!showBasemapDropdown)}
              className="bg-white border border-gray-200 px-3 py-2 rounded-xl shadow-xs hover:bg-gray-50 flex items-center gap-1.5 font-bold text-xs text-gray-700 transition-all"
            >
              <span>{basemap === 'street' ? 'Streets' : 'Satellite (Esri)'}</span>
              <ChevronDown
                size={13}
                className={`text-gray-500 transition-transform ${showBasemapDropdown ? 'rotate-180' : ''}`}
              />
            </button>
            {showBasemapDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden py-1 z-[500]">
                <button
                  type="button"
                  onClick={() => {
                    if (onChangeBasemap) onChangeBasemap('satellite');
                    setShowBasemapDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    basemap === 'satellite' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Satellite (Esri)</span>
                  {basemap === 'satellite' && <CheckCircle2 size={13} className="text-green-700" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onChangeBasemap) onChangeBasemap('street');
                    setShowBasemapDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                    basemap === 'street' ? 'bg-green-50 text-green-800 font-bold' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Streets</span>
                  {basemap === 'street' && <CheckCircle2 size={13} className="text-green-700" />}
                </button>
              </div>
            )}
          </div>

          {/* Active Layer Chip */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl shadow-xs border border-gray-200 text-xs font-semibold text-gray-800">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse shrink-0" />
            <span className="text-gray-500">Active Layer:</span>
            <span className="font-bold text-green-900">{activeExplanation.label}</span>
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
              30m Pixels
            </span>
          </div>
        </div>

        {/* ── TOP-CENTER FLOATING SEARCH BAR (Matches Screenshot 1) ── */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] w-[min(380px,calc(100%-2rem))] pointer-events-auto">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Find an estate or block..."
              className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-xs font-medium text-gray-700 shadow-xs outline-none focus:border-green-600 transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* ── TOP-RIGHT TOGGLE BUTTON (Matches Screenshot 1 CropHealthMapPage) ── */}
        <button
          type="button"
          onClick={() => setShowRightLegend(!showRightLegend)}
          aria-pressed={showRightLegend}
          className={`absolute top-4 right-4 z-[400] flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-white text-xs font-semibold shadow-xs transition-all ${
            showRightLegend
              ? 'border-green-600 text-green-800 ring-2 ring-green-100'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Layers size={16} className="text-green-700" />
          <span>Map layers</span>
        </button>
      </div>

      {/* ── RIGHT-SIDE LEGEND & LAYERS PANEL (Matches Screenshot 1 MapLayersPanel Layout) ── */}
      {showRightLegend && (
        <aside className="w-[310px] lg:w-[350px] bg-white border-l border-gray-200 flex flex-col shrink-0 overflow-y-auto z-20 shadow-xs animate-in slide-in-from-right duration-150">
          {/* Header (Matches Screenshot 1) */}
          <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-30">
            <span className="flex items-center gap-2 font-display text-base font-semibold text-gray-900">
              <Layers size={18} className="text-green-700" />
              <span>Map layers</span>
            </span>
            <button
              type="button"
              onClick={() => setShowRightLegend(false)}
              aria-label="Close map layers"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Panel Content: Grouped Layers Used in the Analysis */}
          <div className="p-4 space-y-4 flex-1 text-xs">
            {legendGroups.map((group) => {
              const isGroupOpen = openGroupIds.includes(group.id);
              const GroupIcon = group.icon || Layers;
              const activeCountInGroup = group.entries.filter(
                (e) => e.key === selectedLayer && showOverlay
              ).length;

              return (
                <div key={group.id} className="space-y-2">
                  {/* Group Header Accordion */}
                  <div
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center justify-between py-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 cursor-pointer select-none border-b border-gray-100"
                  >
                    <div className="flex items-center gap-1.5">
                      {isGroupOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <GroupIcon size={14} className="text-gray-500" />
                      <span className="uppercase tracking-wider">{group.name}</span>
                      <span className="font-semibold text-gray-400">({group.entries.length})</span>
                    </div>

                    {activeCountInGroup > 0 && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                        Active on map
                      </span>
                    )}
                  </div>

                  {/* Group Layer Cards */}
                  {isGroupOpen && (
                    <div className="space-y-2.5 pt-1">
                      {group.entries.map((entry) => {
                        const isSelected = selectedLayer === entry.key;
                        const isOnMap = isSelected && showOverlay;
                        const isCardOpen = isSelected || expandedLayers.includes(entry.key);
                        const info = entry.info;
                        const legend = entry.legend;

                        return (
                          <div
                            key={entry.key}
                            className={`border rounded-xl p-3 bg-white space-y-2.5 transition-all ${
                              isOnMap
                                ? 'border-green-400 ring-2 ring-green-100/70 shadow-2xs'
                                : isSelected
                                ? 'border-gray-300 bg-gray-50/50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {/* Card Header & Controls */}
                            <div className="flex items-start justify-between gap-2">
                              <div
                                onClick={() => toggleLayerCard(entry.key)}
                                className="flex-1 cursor-pointer select-none space-y-0.5"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-gray-900 text-xs">
                                    {info.plainTitle || info.label}
                                  </span>
                                  {isOnMap && (
                                    <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.2 shrink-0">
                                      On map
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500 font-medium">
                                  {info.label} · <span className="font-mono text-gray-400">{info.badge || '30m'}</span>
                                </p>
                              </div>

                              {/* Toggle Switch */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isOnMap) {
                                    if (onToggleOverlay) onToggleOverlay();
                                  } else {
                                    handleSelectLayerOnMap(entry.key);
                                  }
                                }}
                                title={isOnMap ? 'Hide layer overlay from map' : 'Display this layer on map'}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                                  isOnMap ? 'bg-green-700' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full bg-white shadow transition-transform duration-150 ${
                                    isOnMap ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Card Body: Dynamic Legend & Farmer Explanations */}
                            {isCardOpen && (
                              <div className="space-y-2.5 pt-2 border-t border-gray-100">
                                {/* ── COLOR SCALE / LEGEND ── */}
                                <div>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                                    Map Color Key
                                  </span>

                                  {/* 1. Continuous Ramp */}
                                  {legend?.kind === 'ramp' ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-[10px] font-mono font-medium text-gray-700">
                                        <span>{legend.edges?.[0] != null ? `${legend.edges[0]} m` : 'Low'}</span>
                                        <span className="text-gray-400 font-sans text-[10px]">Elevation (DEM)</span>
                                        <span>{legend.edges?.[legend.edges.length - 1] != null ? `${legend.edges[legend.edges.length - 1]} m` : 'High'}</span>
                                      </div>
                                      <div
                                        className="h-2.5 w-full rounded-full shadow-inner"
                                        style={{
                                          background: `linear-gradient(to right, ${(legend.colours || []).join(', ')})`,
                                        }}
                                      />
                                    </div>
                                  ) : legend?.kind === 'categories' ? (
                                    /* 2. Categorized Land Cover */
                                    <div className="grid grid-cols-1 gap-1 text-[11px]">
                                      {Object.entries(legend.items || {}).map(([name, col]) => (
                                        <div key={name} className="flex items-center gap-1.5">
                                          <span className="w-3 h-3 rounded-xs shrink-0 shadow-2xs" style={{ backgroundColor: col }} />
                                          <span className="text-gray-800 capitalize font-medium">{name.replace(/_/g, ' ')}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : legend?.kind === 'exclusion' ? (
                                    /* 3. Regulatory Exclusion */
                                    <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-900 space-y-0.5">
                                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-red-800">
                                        <ShieldAlert size={14} className="text-red-700 shrink-0" />
                                        <span>Regulatory Exclusion Zone</span>
                                      </div>
                                      <p className="text-[10px] text-red-800 leading-tight">
                                        {legend.meaning || 'Land is legally or environmentally excluded from clearing.'}
                                      </p>
                                    </div>
                                  ) : legend?.items?.length ? (
                                    /* 4. Threshold Class Bands */
                                    <div className="space-y-1 text-[11px]">
                                      {legend.items.map((item, idx) => (
                                        <div key={item.class || idx} className="flex items-center justify-between gap-1">
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span
                                              className="w-3 h-3 rounded-xs shrink-0 shadow-2xs"
                                              style={{ backgroundColor: item.color || '#2e7d32' }}
                                            />
                                            <span className="font-semibold text-gray-800 truncate">{item.label || item.class}</span>
                                          </div>
                                          {item.range && (
                                            <span className="font-mono text-gray-500 text-[10px] shrink-0">({item.range})</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    /* 5. Standard FAO S1–N Color Badges */
                                    <div className="space-y-1 text-[11px]">
                                      {info.classesGuide ? (
                                        info.classesGuide.map((c) => (
                                          <div key={c.code} className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-xs shrink-0 shadow-2xs" style={{ backgroundColor: c.color }} />
                                            <span className="font-bold text-gray-800">{c.code}:</span>
                                            <span className="text-gray-600 truncate">{c.name.split('(')[0]}</span>
                                          </div>
                                        ))
                                      ) : (
                                        CLASSES.map((c) => (
                                          <div key={c.key} className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-xs shrink-0 ${c.bar}`} />
                                            <span className="font-bold text-gray-800">{c.key}:</span>
                                            <span className="text-gray-600">{c.label}</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* ── PLAIN-ENGLISH MEANING ── */}
                                <div className="space-y-1 leading-snug">
                                  <span className="font-bold text-gray-900 block text-[11px]">What this means:</span>
                                  <p className="text-gray-600 text-[11px] leading-relaxed">{info.whatItMeans}</p>
                                </div>

                                {/* ── OPACITY SLIDER (when active on map, matching main dashboard) ── */}
                                {isOnMap && onChangeOpacity && (
                                  <div className="pt-2 border-t border-gray-100 space-y-1">
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
                                      <span className="flex items-center gap-1">
                                        <Sliders size={12} className="text-gray-400" />
                                        Layer opacity
                                      </span>
                                      <span className="font-mono text-gray-500">{Math.round(layerOpacity * 100)}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0.2"
                                      max="1.0"
                                      step="0.05"
                                      value={layerOpacity}
                                      onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-700"
                                    />
                                  </div>
                                )}

                                {/* ── AI PROMPTS ── */}
                                {onAskAiAboutLayer && info.farmerQuestions?.length > 0 && (
                                  <div className="pt-1.5 border-t border-gray-100">
                                    <button
                                      type="button"
                                      onClick={() => onAskAiAboutLayer(info.farmerQuestions[0])}
                                      className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-green-800 hover:text-green-900 bg-green-50 hover:bg-green-100/80 px-2 py-1 rounded-md transition-colors w-full justify-center"
                                    >
                                      <Sparkles size={11} className="text-green-700" />
                                      <span>Ask AI: "{info.farmerQuestions[0]}"</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-400 text-center font-mono shrink-0">
            Copernicus DEM 30m · CHIRPS · ISRIC SoilGrids · Hansen GFC
          </div>
        </aside>
      )}
    </div>
  );
}
