import { ArrowLeft, FileDown, Layers, FileText, Sparkles, Share2, Compass } from 'lucide-react';
import { StatusPill } from '../../../components/page/PageKit';
import { cropName, runStatus, isFinished } from '../suitabilityLabels';

export default function SuitabilityHeader({
  run,
  activeTopTab,
  onSelectTopTab,
  onBack,
  onOpenShare,
  onDownloadReport,
  pdfBusy,
}) {
  const [statusLabel, statusTone] = runStatus(run?.status);
  const done = isFinished(run?.status) && run?.status !== 'failed';
  const crop = cropName(run?.crop);

  return (
    <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-8 z-[100] shadow-sm shrink-0">
      {/* Brand & Run Identity */}
      <div className="flex items-center gap-4 lg:gap-6">
        <button
          onClick={onBack}
          title="Back to all analyses"
          className="p-2 hover:bg-gray-100 rounded-xl transition-all border border-gray-200 text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft size={17} />
        </button>

        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-green-700 text-white shadow-xs">
            <Compass size={21} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-gray-900 leading-none flex items-center gap-2">
              {crop} Suitability Analysis
              {run?.variant && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  {run.variant}
                </span>
              )}
            </h1>
            <p className="text-xs font-medium mt-1 leading-none text-gray-500">
              {[
                run?.company_name || run?.company_id || 'Estate Analysis',
                run?.total_area_ha ? `${Number(run.total_area_ha).toLocaleString()} ha` : null,
                run?.irrigated ? 'Irrigated' : 'Rain-fed',
                run?.resolution_m ? `${run.resolution_m} m pixels` : '30 m pixels',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
      </div>

      {/* Center Top Tabs */}
      <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'assessment', label: 'Assessment', icon: <Layers size={15} /> },
          { id: 'report', label: 'Report', icon: <FileText size={15} /> },
          { id: 'ai-assistant', label: 'AI Advisor', icon: <Sparkles size={15} /> },
        ].map((tab) => {
          const active = activeTopTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTopTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                active
                  ? 'bg-white text-green-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <StatusPill tone={statusTone}>
          {statusLabel}
          {!isFinished(run?.status) && run?.progress != null ? ` · ${run.progress}%` : ''}
        </StatusPill>

        {done && (
          <>
            <button
              type="button"
              onClick={onOpenShare}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-xs"
            >
              <Share2 size={14} className="text-green-700" />
              <span>Share with client</span>
            </button>

            <button
              type="button"
              onClick={onDownloadReport}
              disabled={pdfBusy}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-green-700 text-white hover:bg-green-800 transition-all shadow-xs disabled:opacity-50"
            >
              <FileDown size={14} />
              <span>{pdfBusy ? 'Preparing…' : 'PDF Report'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
