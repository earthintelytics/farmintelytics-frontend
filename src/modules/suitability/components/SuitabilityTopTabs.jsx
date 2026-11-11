import { Layers, FileText, Sparkles } from 'lucide-react';

/**
 * The suitability result's three main tabs (Assessment, Report, AI Advisor), shared by the team's result page
 * and the client's share page. On a wide screen they sit in the middle of the header; on a phone they take a
 * full-width row of their own under it, so every part of the result can be reached.
 */
const TOP_TABS = [
  { id: 'assessment', label: 'Assessment', icon: Layers },
  { id: 'report', label: 'Report', icon: FileText },
  { id: 'ai-assistant', label: 'AI Advisor', icon: Sparkles },
];

export default function SuitabilityTopTabs({ value, onChange, labels = {} }) {
  return (
    <div className="order-last md:order-none w-full md:w-auto flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
      {TOP_TABS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              active ? 'bg-white text-green-700 shadow-xs' : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            <Icon size={15} />
            {labels[id] || label}
          </button>
        );
      })}
    </div>
  );
}
