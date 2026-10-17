import { useEffect, useState } from 'react';
import { fetchSuitabilityRun, generateReportPdf } from '../../../services/suitabilityApi';
import { fetchSuitabilityThresholds } from '../../../services/adminApi';
import { ErrorNote } from '../../../components/page/PageKit';
import { CROPS, isFinished } from '../suitabilityLabels';
import ShareModal from '../components/ShareModal';
import SuitabilityHeader from '../components/SuitabilityHeader';
import SuitabilitySidebar from '../components/SuitabilitySidebar';
import SuitabilityMapView from '../components/SuitabilityMapView';
import SuitabilityAnalyticsView from '../components/SuitabilityAnalyticsView';
import SuitabilityReportView from '../components/SuitabilityReportView';
import SuitabilityAiView from '../components/SuitabilityAiView';

const POLL_MS = 5000;

export default function RunResult({ runId, companyId, onBack }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');
  const [actions, setActions] = useState({});
  const [pdf, setPdf] = useState({ busy: false, msg: '' });
  const [shareOpen, setShareOpen] = useState(false);

  // Top Tabs: 'assessment' | 'report' | 'ai-assistant'
  const [activeTopTab, setActiveTopTab] = useState('assessment');

  // Left Sub-pages: 'analytics' | 'map-view'
  const [activeView, setActiveView] = useState('analytics');

  // Map state
  const [selectedLayer, setSelectedLayer] = useState('final_class');
  const [layerOpacity, setLayerOpacity] = useState(0.8);
  const [basemap, setBasemap] = useState('satellite');
  const [showOverlay, setShowOverlay] = useState(true);

  // Preloaded question for AI assistant
  const [aiQuestion, setAiQuestion] = useState('');

  // 1. Poll / load run result
  useEffect(() => {
    let live = true;
    let timer;
    const load = () =>
      fetchSuitabilityRun(runId)
        .then((r) => {
          if (!live) return;
          setRun(r);
          setError('');
          if (!isFinished(r.status)) timer = setTimeout(load, POLL_MS);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    load();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [runId]);

  // 2. Fetch thresholds & farmer actions
  useEffect(() => {
    if (!run?.crop) return undefined;
    let live = true;
    const admin = CROPS.find((c) => c.id === run.crop)?.admin || run.crop;
    fetchSuitabilityThresholds(admin, companyId)
      .then((d) => {
        if (live) setActions(d?.farmer_actions || {});
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [run?.crop, companyId]);

  // 3. Available layers list
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

  // 4. Download report action
  const handleDownloadReport = async () => {
    setPdf({ busy: true, msg: '' });
    try {
      const r = await generateReportPdf(runId);
      if (r?.pdf_url && r.status === 'ready') {
        window.open(r.pdf_url, '_blank', 'noopener');
      }
      setPdf({ busy: false, msg: r?.status === 'ready' ? '' : 'The report is being prepared.' });
    } catch (e) {
      setPdf({ busy: false, msg: e.message });
    }
  };

  // 5. Ask AI about a layer action
  const handleAskAiAboutLayer = (questionText) => {
    setAiQuestion(questionText);
    setActiveTopTab('ai-assistant');
  };

  if (error && !run) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4">
          <ErrorNote message={error} />
          <button
            onClick={onBack}
            className="w-full py-2.5 px-4 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to analyses
          </button>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-200">
          <div className="w-5 h-5 border-2 border-green-700 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-gray-700">Loading suitability evaluation…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden font-sans">
      {/* ── TOP HEADER (Dashboard Chrome) ── */}
      <SuitabilityHeader
        run={run}
        activeTopTab={activeTopTab}
        onSelectTopTab={setActiveTopTab}
        onBack={onBack}
        onOpenShare={() => setShareOpen(true)}
        onDownloadReport={handleDownloadReport}
        pdfBusy={pdf.busy}
      />

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTopTab === 'assessment' ? (
          <>
            {/* Left Sidebar (Views & 30m Layers) */}
            <SuitabilitySidebar
              activeView={activeView}
              onSelectView={setActiveView}
              availableLayers={availableLayers}
              selectedLayer={selectedLayer}
              onSelectLayer={setSelectedLayer}
              layerOpacity={layerOpacity}
              onChangeOpacity={setLayerOpacity}
              basemap={basemap}
              onChangeBasemap={setBasemap}
              showOverlay={showOverlay}
              onToggleOverlay={() => setShowOverlay(!showOverlay)}
            />

            {/* View Content (Map Studio or Analytics Hub) */}
            <main className="flex-1 h-full overflow-hidden relative flex flex-col">
              {activeView === 'map-view' ? (
                <SuitabilityMapView
                  run={run}
                  selectedLayer={selectedLayer}
                  availableLayers={availableLayers}
                  onSelectLayer={setSelectedLayer}
                  layerOpacity={layerOpacity}
                  basemap={basemap}
                  showOverlay={showOverlay}
                  onAskAiAboutLayer={handleAskAiAboutLayer}
                />
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <SuitabilityAnalyticsView
                    run={run}
                    actions={actions}
                    onAskAi={(q) => handleAskAiAboutLayer(q)}
                  />
                </div>
              )}
            </main>
          </>
        ) : activeTopTab === 'report' ? (
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <SuitabilityReportView
              run={run}
              onDownloadPdf={handleDownloadReport}
              pdfBusy={pdf.busy}
              pdfMsg={pdf.msg}
            />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <SuitabilityAiView run={run} preloadedQuestion={aiQuestion} />
          </main>
        )}
      </div>

      {/* ── SHARE WITH CLIENT MODAL ── */}
      {shareOpen && (
        <ShareModal
          runId={runId}
          companyId={companyId || run?.company_id || ''}
          cropName={run?.crop || 'Crop'}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
