import { Map as MapIcon, BarChart3, BookOpen, Sparkles, Share2 } from 'lucide-react';

/**
 * Clean navigation sidebar for Suitability Assessment.
 * Displays clean navigation tabs:
 * 1. Suitability Analysis (analytics)
 * 2. Map view (map-view)
 * 3. Glossary & Method (glossary)
 * 4. AI Advisor (ai-assistant)
 * And Share with client button.
 */
export default function SuitabilitySidebar({
  activeView = 'analytics',
  onSelectView,
  onOpenShare,
}) {
  const tabs = [
    {
      id: 'analytics',
      label: 'Suitability Analysis',
      icon: BarChart3,
    },
    {
      id: 'map-view',
      label: 'Map view',
      icon: MapIcon,
    },
    {
      id: 'glossary',
      label: 'Glossary & Guide',
      icon: BookOpen,
    },
    {
      id: 'ai-assistant',
      label: 'AI Advisor',
      icon: Sparkles,
    },
  ];

  return (
    <aside className="w-full md:w-56 lg:w-60 bg-white border-b md:border-b-0 md:border-r border-gray-100 flex md:flex-col justify-between gap-2 z-30 shadow-xs shrink-0 overflow-x-auto md:overflow-x-visible md:overflow-y-auto py-2 md:py-5 px-3 [scrollbar-width:none]">
      {/* ── MAIN NAVIGATION ── */}
      <div className="flex md:block gap-1 md:space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectView && onSelectView(tab.id)}
              className={`md:w-full shrink-0 flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={{ backgroundColor: isActive ? '#3F8432' : undefined }}
            >
              <Icon
                size={17}
                className={isActive ? 'text-white' : 'text-gray-500'}
              />
              <span className="md:flex-1 text-left">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── SHARE WITH CLIENT ── */}
      {onOpenShare && (
        <div className="shrink-0 md:pt-3 md:border-t border-gray-100">
          <button
            type="button"
            onClick={onOpenShare}
            className="md:w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap text-gray-700 bg-gray-50 hover:bg-green-50 hover:text-green-800 border border-gray-200 transition-all text-left shadow-2xs group"
          >
            <Share2 size={16} className="text-green-700 group-hover:scale-110 transition-transform" />
            <span className="flex-1">Share with client</span>
          </button>
        </div>
      )}
    </aside>
  );
}
