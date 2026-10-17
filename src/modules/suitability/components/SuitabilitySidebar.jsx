import { Map as MapIcon, BarChart3, Columns, Share2 } from 'lucide-react';

/**
 * Clean navigation sidebar for Suitability Assessment matching Screenshot 1 (DashboardChrome pattern).
 * Displays 'Main' navigation group (Analytics & Map view) with identical styling, active green pill (#3F8432),
 * and clean tools.
 */
export default function SuitabilitySidebar({
  activeView = 'analytics',
  onSelectView,
  onOpenShare,
}) {
  return (
    <aside className="w-56 lg:w-60 bg-white border-r border-gray-100 flex flex-col z-30 shadow-xs shrink-0 overflow-y-auto py-5 px-3 space-y-6">
      {/* ── MAIN (Matches Screenshot 1) ── */}
      <div className="space-y-1">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
          Main
        </div>

        <button
          type="button"
          onClick={() => onSelectView && onSelectView('analytics')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeView === 'analytics'
              ? 'text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          style={{ backgroundColor: activeView === 'analytics' ? '#3F8432' : undefined }}
        >
          <BarChart3
            size={17}
            className={activeView === 'analytics' ? 'text-white' : 'text-gray-500'}
          />
          <span className="flex-1 text-left">Analytics</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView && onSelectView('map-view')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeView === 'map-view'
              ? 'text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          style={{ backgroundColor: activeView === 'map-view' ? '#3F8432' : undefined }}
        >
          <MapIcon
            size={17}
            className={activeView === 'map-view' ? 'text-white' : 'text-gray-500'}
          />
          <span className="flex-1 text-left">Map view</span>
        </button>
      </div>

      {/* ── TOOLS (Matches Screenshot 1) ── */}
      <div className="space-y-1 pt-2 border-t border-gray-100">
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
          Tools
        </div>

        <button
          type="button"
          onClick={() => onSelectView && onSelectView('analytics')}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <Columns size={17} className="text-gray-500" />
            <span>Class breakdown</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        </button>
      </div>

      {/* ── ACTIONS ── */}
      {onOpenShare && (
        <div className="space-y-1 pt-2 border-t border-gray-100">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Share
          </div>

          <button
            type="button"
            onClick={onOpenShare}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all text-left"
          >
            <Share2 size={17} className="text-green-700" />
            <span>Share with client</span>
          </button>
        </div>
      )}
    </aside>
  );
}
