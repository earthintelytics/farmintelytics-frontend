import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Compass, Layers, FileText, Sparkles, FileDown } from 'lucide-react';
import { fetchPublicSuitability, publicReportPdfUrl } from '../../../services/suitabilityApi';
import { StatusPill } from '../../../components/page/PageKit';
import { cropName } from '../suitabilityLabels';
import SuitabilitySidebar from '../components/SuitabilitySidebar';
import SuitabilityMapView from '../components/SuitabilityMapView';
import SuitabilityAnalyticsView from '../components/SuitabilityAnalyticsView';
import SuitabilityReportView from '../components/SuitabilityReportView';
import SuitabilityAiView from '../components/SuitabilityAiView';

export const PublicSuitabilitySharePage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Top Tabs: 'assessment' | 'report' | 'ai-assistant'
  const [activeTopTab, setActiveTopTab] = useState('assessment');

  // Left Sub-pages: 'map-view' | 'analytics'
  const [activeView, setActiveView] = useState('map-view');

  // Map settings
  const [selectedLayer, setSelectedLayer] = useState('final_class');
  const [layerOpacity, setLayerOpacity] = useState(0.8);
  const [basemap, setBasemap] = useState('satellite');
  const [showOverlay, setShowOverlay] = useState(true);

  const [aiQuestion, setAiQuestion] = useState('');

  useEffect(() => {
    let live = true;
    fetchPublicSuitability(token)
      .then((res) => {
        if (!live) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (!live) return;
        setError(err.message || 'This share link could not be opened.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-gray-800 font-sans">
        <div className="w-12 h-12 border-4 border-green-700/20 border-t-green-700 rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold tracking-tight">Loading Land Suitability Evaluation…</h2>
        <p className="text-gray-500 text-xs mt-1">Retrieving 30 m earth observation layers and telemetry</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-3xl p-8 shadow-xl space-y-4">
          <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto text-red-600">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Link Expired or Invalid</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            {error || 'This link is no longer valid or has reached its expiration date.'}
          </p>
          <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400">
            Please contact the FarmIntelytics team or your agricultural advisor to request an updated access link.
          </div>
        </div>
      </div>
    );
  }

  const { share, result } = data;
  const crop = cropName(result?.crop);
  const runWithToken = {
    ...result,
    share_token: token,
  };

  // Compute available layers
  const availableLayers = (() => {
    const set = new Set();
    set.add('final_class');
    (result.layers || []).forEach((l) => set.add(l));
    if (result.tiles?.factors) {
      Object.keys(result.tiles.factors).forEach((k) => set.add(k));
    }
    const list = Array.from(set).filter((k) => k !== 'final_class');
    return ['final_class', ...list];
  })();

  const handleDownloadPdf = () => {
    const url = publicReportPdfUrl(token);
    window.open(url, '_blank', 'noopener');
  };

  const handleAskAiAboutLayer = (questionText) => {
    setAiQuestion(questionText);
    setActiveTopTab('ai-assistant');
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden font-sans">
      {/* ── TOP HEADER (Dashboard Chrome) ── */}
      <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-8 z-[100] shadow-sm shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-green-700 text-white shadow-xs">
            <Compass size={21} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-gray-900 leading-none flex items-center gap-2">
              {crop} Suitability Analysis
              {result?.variant && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  {result.variant}
                </span>
              )}
            </h1>
            <p className="text-xs font-medium mt-1 leading-none text-gray-500">
              {[
                share?.client_name ? `Prepared for ${share.client_name}` : 'Client Dossier',
                result?.total_area_ha ? `${Number(result.total_area_ha).toLocaleString()} ha` : null,
                `Access expires in ${share?.days_left ?? 14} days`,
                '30 m pixels',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        {/* Center Top Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'assessment', label: 'Assessment', icon: <Layers size={15} /> },
            { id: 'report', label: 'Report', icon: <FileText size={15} /> },
            {
              id: 'ai-assistant',
              label: `AI Advisor (${share?.ai_left_today ?? 10} left today)`,
              icon: <Sparkles size={15} />,
            },
          ].map((tab) => {
            const active = activeTopTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTopTab(tab.id)}
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
          <StatusPill tone="good">Verified Evaluation</StatusPill>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-green-700 text-white hover:bg-green-800 transition-all shadow-xs"
          >
            <FileDown size={14} />
            <span>PDF Report</span>
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE CONTAINER ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTopTab === 'assessment' ? (
          <>
            {/* Left Sidebar */}
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
                  run={runWithToken}
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
                    run={runWithToken}
                    actions={{}}
                    onAskAi={(q) => handleAskAiAboutLayer(q)}
                  />
                </div>
              )}
            </main>
          </>
        ) : activeTopTab === 'report' ? (
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <SuitabilityReportView
              run={runWithToken}
              onDownloadPdf={handleDownloadPdf}
              pdfBusy={false}
              pdfMsg=""
            />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <SuitabilityAiView run={runWithToken} preloadedQuestion={aiQuestion} />
          </main>
        )}
      </div>
    </div>
  );
};
