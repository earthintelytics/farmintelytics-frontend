import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Layers,
  FileDown,
  Sparkles,
  Send,
  Clock,
  AlertTriangle,
  Shield,
  Compass,
} from 'lucide-react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchPublicSuitability, askPublicSuitabilityAi, publicReportPdfUrl } from '../../../services/suitabilityApi';
import { CLASSES, classLabel, cropName } from '../suitabilityLabels';

const LAYER_LABELS = {
  final_class: 'Final Suitability Class',
  elevation: 'Elevation (30 m DEM)',
  slope: 'Slope & Terrain',
  rainfall: 'Annual Rainfall',
  dry_season: 'Dry Season Duration',
  temperature: 'Mean Temperature',
  soil_ph: 'Soil pH (0-30 cm)',
  flood_frequency: 'Flood Inundation Risk',
  distance_to_water: 'Distance to Permanent Water',
  land_cover: 'Land Cover Classification',
  forest_loss: 'EUDR Deforestation Exclusion (Post-2020)',
  forest_2020: 'Forest Baseline 2020',
  protected_exclusion: 'Protected Conservation Reserve (WDPA)',
};

function Fit({ geometry }) {
  const map = useMap();
  useEffect(() => {
    if (!geometry) return;
    try {
      const b = L.geoJSON(geometry).getBounds();
      if (b.isValid()) {
        map.fitBounds(b, { padding: [24, 24], maxZoom: 16 });
      }
    } catch {
      // ignore
    }
  }, [geometry, map]);
  return null;
}

const ha = (v) => (v != null ? `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })} ha` : '—');
const pct = (part, total) => (total > 0 && part != null ? `${Math.round((Number(part) / total) * 100)}%` : '0%');

export const PublicSuitabilitySharePage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState('final_class');

  // AI chat state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [aiError, setAiError] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [aiLeft, setAiLeft] = useState(0);

  useEffect(() => {
    let live = true;
    fetchPublicSuitability(token)
      .then((res) => {
        if (!live) return;
        setData(res);
        setAiLeft(res.share?.ai_left_today ?? 0);
        setError(null);
      })
      .catch((err) => {
        if (!live) return;
        setError(err.message || 'This share link could not be opened.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => { live = false; };
  }, [token]);

  const handleAsk = async (e) => {
    e?.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    if (aiLeft <= 0) {
      setAiError("You have reached today's question limit on this link. You can ask more tomorrow.");
      return;
    }

    setAsking(true);
    setAiError('');
    const userMsg = { role: 'user', text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setChatLog((prev) => [...prev, userMsg]);
    setQuestion('');

    try {
      const res = await askPublicSuitabilityAi(token, q);
      const aiMsg = {
        role: 'assistant',
        text: res.answer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatLog((prev) => [...prev, aiMsg]);
      if (res.ai_left_today != null) setAiLeft(res.ai_left_today);
    } catch (err) {
      setAiError(err?.message || 'The AI assistant could not answer at this moment.');
    } finally {
      setAsking(false);
    }
  };

  const handleQuickAsk = (qText) => {
    setQuestion(qText);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-semibold tracking-wide">Loading Land Suitability Evaluation…</h2>
        <p className="text-slate-400 text-sm mt-1">Retrieving 30 m earth observation layers and telemetry</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-14 h-14 bg-red-950/80 border border-red-800/60 rounded-2xl flex items-center justify-center mx-auto text-red-400">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">Access Unavailable</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {error || 'This link is no longer valid or has expired.'}
          </p>
          <div className="pt-4 border-t border-slate-800 text-xs text-slate-500">
            Please contact the FarmIntelytics team or your land advisor to request an updated access link.
          </div>
        </div>
      </div>
    );
  }

  const { share, result } = data;
  const isExpiringSoon = share.days_left <= 2;
  const totalArea = Number(result.total_area_ha) || Object.values(result.classes_area_ha || {}).reduce((a, b) => a + Number(b || 0), 0) || 0;

  // Available layers
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

  const currentTileUrl = selectedLayer === 'final_class'
    ? result.tiles?.result || result.tiles?.factors?.final_class || null
    : result.tiles?.factors?.[selectedLayer] || null;

  const currentLegend = result.factor_legends?.[selectedLayer] || result.layer_legends?.[selectedLayer];

  const onEachField = (feature, layer) => {
    const p = feature.properties || {};
    const title = p.name || p.field_id || 'Field Boundary';
    const cls = p.overall_class ? classLabel(p.overall_class) : 'Assessed';
    const area = p.area_ha != null ? `${p.area_ha} ha` : '';
    const limits = (p.limiting_factors || []).join(', ');
    const measured = p.measured || {};

    const measuredRows = Object.entries(measured)
      .map(([k, v]) => `<div style="display:flex; justify-content:space-between; gap:12px; font-size:11px; color:#475569;"><span>${k.replace(/_/g, ' ')}</span><span style="font-weight:600; color:#0f172a;">${v}</span></div>`)
      .join('');

    const html = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; color: #0f172a; min-width: 170px;">
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 2px; color: #064e3b;">${title}</div>
        <div style="font-weight: 600; color: #334155; margin-bottom: 6px;">${cls}${area ? ` · ${area}` : ''}</div>
        ${limits ? `<div style="background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:4px 6px; border-radius:6px; font-size:11px; margin-bottom:6px;"><strong>Limits:</strong> ${limits}</div>` : ''}
        ${measuredRows ? `<div style="border-top:1px solid #e2e8f0; padding-top:4px;">${measuredRows}</div>` : ''}
      </div>
    `;
    layer.bindPopup(html);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Compass size={20} />
            </div>
            <div>
              <span className="font-display font-bold text-base tracking-tight text-white block">
                EarthIntelytics
              </span>
              <span className="text-[10px] tracking-wider uppercase text-emerald-400 font-semibold block">
                Executive Land Intelligence
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              isExpiringSoon
                ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                : 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
            }`}>
              <Clock size={13} />
              <span>{share.days_left} {share.days_left === 1 ? 'day' : 'days'} access remaining</span>
            </div>

            <a
              href={publicReportPdfUrl(token)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition-all"
            >
              <FileDown size={15} />
              <span>Download PDF Report</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-850 rounded-3xl border border-slate-800 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
              <Shield size={13} />
              30 m Resolution · Verified EO Analytics
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {share.client_name ? `${share.client_name} — ` : ''}Land Suitability Assessment
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
              High-resolution biophysical and terrain analysis evaluating soil depth, pH, climate, elevation,
              slope, flood risks, and environmental compliance for <strong className="text-white">{cropName(result.crop)}</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span><strong>Assessed Area:</strong> {ha(totalArea)}</span>
              <span><strong>Strictness:</strong> {result.strictness || 'Standard'}</span>
              <span><strong>Hydrology:</strong> {result.irrigated ? 'Irrigated' : 'Rain-fed'}</span>
              <span><strong>Evaluation Date:</strong> {new Date(result.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Classes Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CLASSES.map((c) => {
            const area = Number(result.classes_area_ha?.[c.key] || 0);
            const percent = pct(area, totalArea);
            return (
              <div
                key={c.key}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
                    {c.label}
                  </span>
                  <span className={`w-3 h-3 rounded-full ${c.bar}`} />
                </div>
                <div className="mt-3">
                  <span className="font-mono text-2xl sm:text-3xl font-bold text-white block">
                    {ha(area)}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    {percent} of total surveyed land
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Studio Map View */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-0">
          {/* Layer Selector Bar */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers size={17} className="text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Suitability Raster Overlays (30 m)
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
              {availableLayers.map((key) => {
                const active = selectedLayer === key;
                const label = LAYER_LABELS[key] || key.replace(/_/g, ' ');
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedLayer(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      active
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div className="h-[520px] relative bg-slate-950">
            <MapContainer center={[0, 0]} zoom={2} className="h-full w-full">
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Esri World Imagery"
              />
              {currentTileUrl && (
                <TileLayer
                  key={`${selectedLayer}-${currentTileUrl}`}
                  url={currentTileUrl}
                  opacity={0.82}
                />
              )}
              {result.fields_geojson && (
                <GeoJSON
                  key={`client-fields-${selectedLayer}`}
                  data={result.fields_geojson}
                  style={{ color: '#ffffff', weight: 2.5, fillOpacity: 0.05 }}
                  onEachFeature={onEachField}
                />
              )}
              {result.fields_geojson && <Fit geometry={result.fields_geojson} />}
            </MapContainer>
          </div>

          {/* Dynamic Map Legend Bar */}
          {currentLegend?.kind === 'ramp' ? (
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-semibold text-slate-200">
                {LAYER_LABELS[selectedLayer] || selectedLayer} ({currentLegend.unit || 'm'})
              </span>
              <div className="flex items-center gap-3 w-full sm:max-w-md">
                <span className="text-xs font-mono text-slate-400">{currentLegend.edges?.[0] != null ? `${currentLegend.edges[0]} ${currentLegend.unit || 'm'}` : 'Min'}</span>
                <div
                  className="flex-1 h-3 rounded-full shadow-inner"
                  style={{ background: `linear-gradient(to right, ${(currentLegend.colours || []).join(', ')})` }}
                />
                <span className="text-xs font-mono text-slate-400">{currentLegend.edges?.[currentLegend.edges.length - 1] != null ? `${currentLegend.edges[currentLegend.edges.length - 1]} ${currentLegend.unit || 'm'}` : 'Max'}</span>
              </div>
            </div>
          ) : currentLegend?.kind === 'categories' ? (
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-200 block">
                {LAYER_LABELS[selectedLayer] || selectedLayer} (ESA WorldCover 30 m)
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {Object.entries(currentLegend.items || {}).map(([name, col]) => (
                  <span key={name} className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: col }} />
                    <span className="text-slate-300 capitalize">{name.replace(/_/g, ' ')}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : currentLegend?.kind === 'exclusion' ? (
            <div className="p-4 bg-red-950/40 border-t border-red-900/60 flex items-center gap-3 text-xs text-red-300">
              <span className="w-4 h-4 rounded-sm bg-red-600 flex-shrink-0" />
              <span><strong>Environmental & Legal Exclusion:</strong> {currentLegend.meaning}</span>
            </div>
          ) : currentLegend?.items?.length ? (
            <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-200 block">
                {currentLegend.name || LAYER_LABELS[selectedLayer] || selectedLayer}
              </span>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                {currentLegend.items.map((item, idx) => (
                  <span key={item.class || idx} className="inline-flex items-center gap-1.5 text-slate-300">
                    <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color || '#2e7d32' }} />
                    <span className="font-medium text-white">{item.label || item.class}</span>
                    {item.range && <span className="font-mono text-slate-400 text-[11px]">({item.range})</span>}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-4 text-xs">
              {CLASSES.map((c) => (
                <span key={c.key} className="inline-flex items-center gap-1.5 text-slate-300">
                  <span className={`w-3.5 h-3.5 rounded-sm ${c.bar}`} />
                  <span className="font-medium text-white">{c.label}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* AI Agronomic Intelligence Assistant Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
                <Sparkles size={15} />
                Natural Language Land Intelligence
              </div>
              <h3 className="font-display text-2xl font-bold text-white">
                Ask AI About This Analysis
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Inquire about limiting factors, soil pH remediation, moisture regimes, or conservation exclusions.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">
              <span>{aiLeft} questions remaining today</span>
            </div>
          </div>

          {/* Quick preset questions */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 block font-medium">Suggested queries:</span>
            <div className="flex flex-wrap gap-2">
              {[
                `Why are certain parcels classified as N for ${cropName(result.crop)}?`,
                'What are the soil pH and slope limitations observed?',
                'Can irrigation or drainage improve suitability for the S2/S3 parcels?',
                'Are any parts of the field excluded by EUDR deforestation rules?'
              ].map((qText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickAsk(qText)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 transition-colors text-left"
                >
                  {qText}
                </button>
              ))}
            </div>
          </div>

          {/* Chat history display */}
          {chatLog.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80">
              {chatLog.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-700 text-white font-medium'
                        : 'bg-slate-800 text-slate-200 border border-slate-700 whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
              {asking && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 p-2">
                  <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing satellite telemetry and crop requirements…</span>
                </div>
              )}
            </div>
          )}

          {aiError && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs">
              {aiError}
            </div>
          )}

          {/* Chat input box */}
          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={asking || aiLeft <= 0}
              placeholder={aiLeft > 0 ? "Ask a question about this land suitability assessment…" : "Today's question limit reached"}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={asking || !question.trim() || aiLeft <= 0}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Send size={15} />
              <span>Ask</span>
            </button>
          </form>
        </div>

        {/* Data Sources and Methodology */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <h4 className="font-display text-lg font-semibold text-white">
            Earth Observation Sources & Methodology
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
            This land suitability analysis is performed according to the Food and Agriculture Organization (FAO) Framework
            for Land Evaluation. All continuous biophysical variables (elevation, slope, precipitation, temperature,
            soil chemistry, and flood recurrence) are derived from verified satellite constellations and processed
            at a uniform 30 m resolution.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {[
              { name: 'Copernicus DEM GLO-30', role: 'Digital Elevation Model & Slope Analysis (30 m)' },
              { name: 'NASA POWER Agro-Climatology', role: 'Long-term Monthly Rainfall & Temperature Means' },
              { name: 'ESA WorldCover 2021 & 2020', role: 'Global Land Cover & EUDR Baseline Classification' },
              { name: 'Global Forest Change (Hansen/UMD)', role: 'Annual Tree Canopy Loss Telemetry' },
              { name: 'JRC Global Surface Water', role: 'Historical Flood Frequency & Permanent Water Distance' },
              { name: 'ISRIC SoilGrids 2.0', role: 'Soil pH and Subsurface Characteristics' },
            ].map((src, idx) => (
              <div key={idx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="font-semibold text-xs text-white block">{src.name}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{src.role}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        Powered by EarthIntelytics Engine · Confidential Land Evaluation Assessment
      </footer>
    </div>
  );
};

export default PublicSuitabilitySharePage;
