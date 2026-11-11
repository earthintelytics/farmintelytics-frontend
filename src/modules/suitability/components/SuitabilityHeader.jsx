import { ArrowLeft, Compass, Trash2 } from 'lucide-react';
import SuitabilityTopTabs from './SuitabilityTopTabs';
import { cropName } from '../suitabilityLabels';

export default function SuitabilityHeader({
  run,
  activeTopTab,
  onSelectTopTab,
  onBack,
  selectedAreaId = '',
  onSelectArea,
  onDeleteRun,
  deleting = false,
}) {
  const crop = cropName(run?.crop);
  const fields = run?.fields || [];

  return (
    <header className="md:h-[72px] bg-white border-b border-gray-100 flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 md:py-0 md:px-6 lg:px-8 z-[100] shadow-sm shrink-0">
      {/* Brand & Run Identity */}
      <div className="flex items-center gap-3 lg:gap-6 min-w-0">
        <button
          onClick={onBack}
          title="Back to all analyses"
          className="p-2 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={17} />
        </button>

        <div className="flex items-center gap-3.5 min-w-0">
          <div className="hidden sm:flex w-11 h-11 rounded-xl items-center justify-center bg-green-700 text-white shadow-xs">
            <Compass size={21} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-gray-900 leading-tight flex flex-wrap items-center gap-2">
              {crop} Suitability Analysis
              {run?.variant && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  {run.variant}
                </span>
              )}
            </h1>
          </div>
        </div>
      </div>

      {/* Main tabs: mid-header on a wide screen, their own row on a phone */}
      <SuitabilityTopTabs value={activeTopTab} onChange={onSelectTopTab} />

      {/* Right Controls: Area selector & Delete run action */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {fields.length > 0 && onSelectArea && (
          <select
            value={selectedAreaId}
            onChange={(e) => onSelectArea(e.target.value)}
            className="max-w-[10rem] md:max-w-none bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:border-green-600 cursor-pointer shadow-2xs"
            title="Filter by specific plot/block"
          >
            <option value="">All Areas ({fields.length} plots · {Math.round(Number(run?.total_area_ha || 0)).toLocaleString()} ha)</option>
            {fields.map((f) => {
              const fid = String(f.field_id || f.id || '');
              const name = f.name || f.field_id || f.id || 'Plot';
              const ha = f.area_ha ? `${Number(f.area_ha).toFixed(1)} ha` : '';
              const cls = f.overall_class ? ` [${f.overall_class}]` : '';
              return (
                <option key={fid} value={fid}>
                  {name} {cls} {ha ? `(${ha})` : ''}
                </option>
              );
            })}
          </select>
        )}

        {onDeleteRun && (
          <button
            type="button"
            onClick={onDeleteRun}
            disabled={deleting}
            title="Delete this analysis run and artifacts"
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
