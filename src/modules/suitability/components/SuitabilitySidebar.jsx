import { Map as MapIcon, BarChart3, Sliders, Eye, EyeOff, Layers, Mountain, CloudRain, Droplets, Thermometer, FlaskConical, ShieldAlert, Trees, Waves } from 'lucide-react';
import { FARMER_LAYER_EXPLANATIONS } from '../farmerLayerExplanations';

const LAYER_ICONS = {
  final_class: <Layers size={15} />,
  slope: <Mountain size={15} />,
  elevation: <Mountain size={15} />,
  land_cover: <Trees size={15} />,
  rainfall: <CloudRain size={15} />,
  dry_season: <CloudRain size={15} />,
  temperature: <Thermometer size={15} />,
  soil_ph: <FlaskConical size={15} />,
  flood_frequency: <Waves size={15} />,
  distance_to_water: <Droplets size={15} />,
  forest_loss: <ShieldAlert size={15} />,
  protected_exclusion: <ShieldAlert size={15} />,
};

export default function SuitabilitySidebar({
  activeView,
  onSelectView,
  availableLayers,
  selectedLayer,
  onSelectLayer,
  layerOpacity,
  onChangeOpacity,
  basemap,
  onChangeBasemap,
  showOverlay,
  onToggleOverlay,
}) {
  return (
    <aside className="w-64 lg:w-72 bg-white border-r border-gray-100 flex flex-col z-40 shadow-sm shrink-0 overflow-y-auto py-5 px-3.5 space-y-6">
      {/* ── SECTION 1: VIEWS ── */}
      <div className="space-y-1">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
          Views
        </div>

        <button
          onClick={() => onSelectView('map-view')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeView === 'map-view'
              ? 'text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          style={{ backgroundColor: activeView === 'map-view' ? '#3F8432' : undefined }}
        >
          <MapIcon size={17} className={activeView === 'map-view' ? 'text-white' : 'text-gray-500'} />
          <span className="flex-1 text-left">Map view</span>
        </button>

        <button
          onClick={() => onSelectView('analytics')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeView === 'analytics'
              ? 'text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          style={{ backgroundColor: activeView === 'analytics' ? '#3F8432' : undefined }}
        >
          <BarChart3 size={17} className={activeView === 'analytics' ? 'text-white' : 'text-gray-500'} />
          <span className="flex-1 text-left">Analytics</span>
        </button>
      </div>

      {/* ── SECTION 2: MAP LAYERS (shown when Map View is active) ── */}
      {activeView === 'map-view' && (
        <>
          <div className="space-y-1 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Suitability Layers
              </span>
              <span className="text-[10px] font-mono text-gray-400 font-semibold">
                30 m PIXELS
              </span>
            </div>

            <div className="space-y-1">
              {availableLayers.map((key) => {
                const active = selectedLayer === key;
                const info = FARMER_LAYER_EXPLANATIONS[key] || {};
                const icon = LAYER_ICONS[key] || <Layers size={15} />;
                const label = info.label || key.replace(/_/g, ' ');

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectLayer(key)}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
                      active
                        ? 'bg-green-50 text-green-800 border border-green-200 shadow-2xs font-bold'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={active ? 'text-green-700' : 'text-gray-400'}>
                        {icon}
                      </span>
                      <span className="truncate">{label}</span>
                    </div>

                    {info.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-sm font-mono shrink-0 ${
                          active
                            ? 'bg-green-700 text-white font-bold'
                            : 'bg-gray-100 text-gray-500 font-normal'
                        }`}
                      >
                        {info.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── SECTION 3: MAP TOOLS ── */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3">
              Map Tools
            </div>

            {/* Opacity Slider */}
            <div className="px-3 py-2 bg-gray-50 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-gray-700">
                <span className="flex items-center gap-1.5">
                  <Sliders size={13} className="text-gray-400" />
                  Layer Opacity
                </span>
                <span className="font-mono text-gray-500 font-semibold">{Math.round(layerOpacity * 100)}%</span>
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

            {/* Overlay toggle */}
            <button
              type="button"
              onClick={onToggleOverlay}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showOverlay
                  ? 'bg-white border-green-200 text-green-800'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              <span className="flex items-center gap-2">
                {showOverlay ? <Eye size={14} className="text-green-700" /> : <EyeOff size={14} />}
                Show Raster Overlay
              </span>
              <span className={`w-2 h-2 rounded-full ${showOverlay ? 'bg-green-600' : 'bg-gray-300'}`} />
            </button>

            {/* Basemap selector */}
            <div className="px-3 py-2 bg-gray-50 rounded-xl space-y-1.5">
              <label className="text-xs font-medium text-gray-700 block">Basemap</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onChangeBasemap('satellite')}
                  className={`py-1.5 px-2 rounded-lg transition-all ${
                    basemap === 'satellite'
                      ? 'bg-white text-green-700 shadow-xs border border-green-200 font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Satellite
                </button>
                <button
                  type="button"
                  onClick={() => onChangeBasemap('street')}
                  className={`py-1.5 px-2 rounded-lg transition-all ${
                    basemap === 'street'
                      ? 'bg-white text-green-700 shadow-xs border border-green-200 font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Street / Topo
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
