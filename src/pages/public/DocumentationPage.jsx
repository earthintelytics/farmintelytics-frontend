import React, { useState } from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { BookMarked, Code2, Terminal, Layers, Sprout, CheckCircle2, ChevronRight } from 'lucide-react';

const DocumentationPage = () => {
  const [selectedSection, setSelectedSection] = useState('suitability');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <PublicHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex-1 w-full">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="md:w-64 shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Documentation</p>
              <button
                onClick={() => setSelectedSection('suitability')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${selectedSection === 'suitability' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>FAO Suitability Engine</span>
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setSelectedSection('indices')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${selectedSection === 'indices' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>Vegetation & SAR Indices</span>
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setSelectedSection('eudr')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${selectedSection === 'eudr' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>EUDR Deforestation Audit</span>
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setSelectedSection('api')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${selectedSection === 'api' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>REST API & Tile Endpoints</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm">
            {selectedSection === 'suitability' && (
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Methodology</span>
                <h1 className="text-2xl font-bold font-display text-slate-900 mt-1 mb-4">FAO Land Evaluation Framework</h1>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  FarmIntelytics implements the standard Food and Agriculture Organization (FAO) Framework for Land Evaluation. Every plot is scored across 9 biophysical criteria into four discrete suitability classes:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                    <span className="font-bold text-emerald-900 text-lg">S1</span>
                    <p className="text-[11px] font-semibold text-emerald-700">Highly Suitable</p>
                  </div>
                  <div className="p-3 rounded-lg bg-lime-50 border border-lime-200 text-center">
                    <span className="font-bold text-lime-900 text-lg">S2</span>
                    <p className="text-[11px] font-semibold text-lime-700">Moderately Suitable</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <span className="font-bold text-amber-900 text-lg">S3</span>
                    <p className="text-[11px] font-semibold text-amber-700">Marginally Suitable</p>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-center">
                    <span className="font-bold text-rose-900 text-lg">N</span>
                    <p className="text-[11px] font-semibold text-rose-700">Currently Not Suitable</p>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">9 Evaluated Biophysical Layers:</h3>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5">
                  <li><strong>Precipitation (mm/yr):</strong> CHIRPS 40-year daily rainfall model.</li>
                  <li><strong>Temperature Normals (°C):</strong> ERA5-Land surface thermal normals.</li>
                  <li><strong>Terrain Slope (degrees):</strong> Copernicus DEM GLO-30 elevation derivatives.</li>
                  <li><strong>Soil pH & Depth:</strong> ISRIC SoilGrids 250m multi-depth layer analysis.</li>
                  <li><strong>Soil Drainage & Texture:</strong> FAO HWSD & SoilGrids texture classes.</li>
                  <li><strong>Flood Risk & Water Buffer:</strong> JRC Global Surface Water distance gates.</li>
                  <li><strong>Conservation Exclusions:</strong> WDPA protected biosphere reserves.</li>
                </ul>
              </div>
            )}

            {selectedSection === 'indices' && (
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Earth Observation</span>
                <h1 className="text-2xl font-bold font-display text-slate-900 mt-1 mb-4">Spectral Vegetation & Radar Indices</h1>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Satellite telemetry is atmospherically corrected (L2A BOA reflectance) and calibrated into standard physical ranges:
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900">NDVI (Normalized Difference Vegetation Index)</h4>
                    <p className="text-xs text-slate-600 mt-1">Range: 0.0 to 0.85 &bull; Formula: (B8 - B4) / (B8 + B4). Measures photosynthetic vigor and canopy greenness.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900">NDMI (Normalized Difference Moisture Index)</h4>
                    <p className="text-xs text-slate-600 mt-1">Range: -0.2 to 0.6 &bull; Formula: (B8 - B11) / (B8 + B11). Evaluates canopy liquid water content and hydration stress.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900">DPRVI (Dual-Polarization Radar Vegetation Index)</h4>
                    <p className="text-xs text-slate-600 mt-1">Sentinel-1 C-band Synthetic Aperture Radar (SAR). Penetrates cloud cover to measure crop structure and biomass volume.</p>
                  </div>
                </div>
              </div>
            )}

            {selectedSection === 'eudr' && (
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Compliance</span>
                <h1 className="text-2xl font-bold font-display text-slate-900 mt-1 mb-4">EUDR Deforestation Verification Protocol</h1>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Compliant with EU Regulation 2023/1115 for forest-risk commodities (Oil palm, Cocoa, Rubber, Coffee, Soya, Cattle, Wood).
                </p>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                  <p><strong>Baseline Date:</strong> December 31, 2020 (JRC GFC 2020 map at 10m).</p>
                  <p><strong>Cutoff Verification:</strong> Automated forest canopy disturbance detection between 2020 and present.</p>
                  <p><strong>Audit Statement:</strong> Direct export of polygon GeoJSON with geolocation, area in hectares, and deforestation-free pass/review flag.</p>
                </div>
              </div>
            )}

            {selectedSection === 'api' && (
              <div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Integration</span>
                <h1 className="text-2xl font-bold font-display text-slate-900 mt-1 mb-4">REST API & Tile Layer Gateway</h1>
                <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-3 overflow-x-auto">
                  <p className="text-emerald-400"># Fetch crop suitability catalogue</p>
                  <p>GET /farmintelytics-engine/agromonitoring/suitability/catalogue/oil_palm</p>
                  <p className="text-emerald-400"># Stream Web-Mercator XYZ raster tile</p>
                  <p>GET /farmintelytics-engine/agromonitoring/tiles/{`{tenant}`}/{`{index}`}/{`{time_idx}`}/{`{z}`}/{`{x}`}/{`{y}`}.png</p>
                  <p className="text-emerald-400"># Download executive vector PDF report</p>
                  <p>GET /farmintelytics-engine/agromonitoring/reports/{`{report_id}`}/pdf</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default DocumentationPage;
