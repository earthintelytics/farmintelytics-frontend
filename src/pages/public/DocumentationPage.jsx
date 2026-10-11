import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { 
  Sprout, 
  Droplets, 
  ShieldCheck, 
  FileText, 
  Compass, 
  CloudSun, 
  CheckCircle2,
  ChevronRight,
  Terminal,
  Code2,
  Layers,
  Satellite,
  Download,
  Search,
  Crosshair,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Eye,
  Sliders,
  Check,
  Smartphone
} from 'lucide-react';

/* ─── REAL FARMINTELYTICS DASHBOARD VIEWS ────────────────────────────────────────── */

// 1. Real Crop Health Dashboard View
const RealCropHealthDashboardView = () => {
  const [activeLayer, setActiveLayer] = useState('ndvi');

  return (
    <div className="border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
      {/* Top Chrome Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <Satellite size={17} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Oil Palm Monitoring</span>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-700/60 px-2 py-0.5 rounded text-[10px] font-mono">
                LIVE TELEMETRY
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Okomu Oil Palm Company Plc &bull; Main Estate Block 14-B (42.8 ha)</p>
          </div>
        </div>

        {/* Top Nav Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg text-[11px]">
          <span className="px-3 py-1 bg-emerald-600 text-white font-semibold rounded shadow-sm">Monitor</span>
          <span className="px-3 py-1 text-slate-400 hover:text-white cursor-pointer">Reports</span>
          <span className="px-3 py-1 text-slate-400 hover:text-white cursor-pointer">Verification</span>
          <span className="px-3 py-1 text-slate-400 hover:text-white cursor-pointer">Assistant</span>
        </div>
      </div>

      {/* Sub-header Controls */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-500 uppercase">Index Layer:</span>
          <button
            onClick={() => setActiveLayer('ndvi')}
            className={`px-2.5 py-1 font-semibold rounded transition-colors ${
              activeLayer === 'ndvi' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            NDVI Vegetative Index
          </button>
          <button
            onClick={() => setActiveLayer('evi')}
            className={`px-2.5 py-1 font-semibold rounded transition-colors ${
              activeLayer === 'evi' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            EVI Canopy Vigour
          </button>
          <button
            onClick={() => setActiveLayer('ndre')}
            className={`px-2.5 py-1 font-semibold rounded transition-colors ${
              activeLayer === 'ndre' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            NDRE Chlorophyll
          </button>
        </div>
        <div className="text-slate-500 font-mono text-[11px]">
          🛰️ Sentinel-2 L2A &bull; Cloud: 0.0% &bull; Pass: Today
        </div>
      </div>

      {/* Main Interactive Map & Telemetry Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[300px]">
        {/* Map Visualization Canvas */}
        <div className="md:col-span-8 bg-[#0b1320] relative flex items-center justify-center p-6 overflow-hidden">
          {/* Simulated Satellite Image & Polygons */}
          <svg className="w-full h-64 drop-shadow-lg" viewBox="0 0 500 280">
            {/* Background Grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="500" height="280" fill="#0d1b2a" />
            <rect width="500" height="280" fill="url(#grid)" />

            {/* Farm Parcel 1: Healthy Vigorous (Green) */}
            <polygon 
              points="60,40 240,30 260,150 70,160" 
              fill={activeLayer === 'ndvi' ? 'rgba(34, 197, 94, 0.55)' : 'rgba(16, 185, 129, 0.55)'} 
              stroke="#22c55e" 
              strokeWidth="2.5" 
            />
            <text x="140" y="95" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">Plot P1 (18.4 ha)</text>
            <text x="140" y="115" fill="#86efac" fontSize="10" fontFamily="monospace" textAnchor="middle">NDVI: 0.81 (Vigorous)</text>

            {/* Farm Parcel 2: Good Canopy (Emerald) */}
            <polygon 
              points="260,30 440,50 420,180 250,150" 
              fill={activeLayer === 'ndvi' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(5, 150, 105, 0.5)'} 
              stroke="#10b981" 
              strokeWidth="2.5" 
            />
            <text x="340" y="105" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">Plot P2 (16.2 ha)</text>
            <text x="340" y="125" fill="#a7f3d0" fontSize="10" fontFamily="monospace" textAnchor="middle">NDVI: 0.76 (Healthy)</text>

            {/* Farm Parcel 3: Sector with Stress Alert (Amber) */}
            <polygon 
              points="100,180 380,180 340,250 80,240" 
              fill="rgba(234, 179, 8, 0.5)" 
              stroke="#eab308" 
              strokeWidth="2.5" 
            />
            <text x="220" y="210" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle">Plot P3 &bull; Sector C-2 (8.2 ha)</text>
            <text x="220" y="228" fill="#fef08a" fontSize="10" fontFamily="monospace" textAnchor="middle">NDVI: 0.54 (Mild Stress Alert)</text>
          </svg>

          {/* Floating Map Legend */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-700/80 p-2.5 rounded text-[10px] text-slate-300">
            <span className="font-bold text-white block mb-1">Vegetation Vigor Index</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-2 bg-emerald-500 inline-block"></span>
              <span>&gt; 0.70 Vigorous</span>
              <span className="w-3 h-2 bg-lime-500 inline-block"></span>
              <span>0.55 - 0.70 Healthy</span>
              <span className="w-3 h-2 bg-amber-500 inline-block"></span>
              <span>&lt; 0.55 Attention</span>
            </div>
          </div>
        </div>

        {/* Live Metrics & Telemetry Feed */}
        <div className="md:col-span-4 p-4 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col justify-between space-y-3">
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-2">Estate Telemetry</h4>
            
            <div className="space-y-2">
              <div className="bg-white p-2.5 border border-slate-200 rounded">
                <span className="text-[10px] text-slate-500 block">Mean Parcel Health</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xl font-bold font-mono text-emerald-700">0.78</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+4.2% vs last pass</span>
                </div>
              </div>

              <div className="bg-white p-2.5 border border-slate-200 rounded">
                <span className="text-[10px] text-slate-500 block">Canopy Coverage</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xl font-bold font-mono text-slate-900">91.4%</span>
                  <span className="text-[10px] text-slate-500">Dense Foliage</span>
                </div>
              </div>

              <div className="bg-white p-2.5 border border-slate-200 rounded">
                <span className="text-[10px] text-slate-500 block">Active Farm Area</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-xl font-bold font-mono text-slate-900">42.8 ha</span>
                  <span className="text-[10px] text-slate-500">3 Calibrated Blocks</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
            <div className="flex items-center gap-1.5 font-bold mb-0.5">
              <AlertTriangle size={13} className="text-amber-600" />
              <span>Targeted Action Recommended</span>
            </div>
            <p className="text-[10px] text-amber-800 leading-tight">
              Sector C-2 displays minor nutrient lag. Apply nitrogen top-dressing before next rainfall.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Real Water & Soil Moisture Radar View
const RealIrrigationRadarView = () => {
  return (
    <div className="border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center shrink-0">
            <Droplets size={17} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Sentinel-1 Radar Moisture Watch</span>
              <span className="bg-sky-950 text-sky-400 border border-sky-700/60 px-2 py-0.5 rounded text-[10px] font-mono">
                ALL-WEATHER C-BAND SAR
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Cloud & Rain Penetrating Subsoil & Canopy Moisture Matrix</p>
          </div>
        </div>
        <span className="text-emerald-400 font-mono text-xs">Radar Sync: Active</span>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border-b border-slate-200">
        <div className="bg-white p-3 border border-slate-200 rounded">
          <span className="text-[10px] text-slate-500 block">Root-Zone Soil Moisture</span>
          <div className="text-2xl font-bold font-mono text-sky-700 mt-1">24.6%</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Field Capacity: Optimal (22-28%)</p>
        </div>

        <div className="bg-white p-3 border border-slate-200 rounded">
          <span className="text-[10px] text-slate-500 block">Canopy Water Index (NDWI)</span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">0.64</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Hydration: Healthy Turgor</p>
        </div>

        <div className="bg-white p-3 border border-slate-200 rounded">
          <span className="text-[10px] text-slate-500 block">Daily Evapotranspiration</span>
          <div className="text-2xl font-bold font-mono text-slate-800 mt-1">4.1 mm</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Moderate Water Consumption</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-sky-50/70 border border-sky-200 p-3.5 rounded text-sky-950">
          <h4 className="font-bold text-xs flex items-center gap-2 mb-1">
            <CheckCircle2 size={15} className="text-sky-600" />
            Smart Irrigation Advisory: Defer Next Cycle by 48 Hours
          </h4>
          <p className="text-xs text-sky-900 leading-relaxed">
            Subsoil moisture reserves are currently optimal across 88% of parcel boundaries. Postponing pump operation saves approximately 420 kWh of diesel pumping energy without any crop moisture stress.
          </p>
        </div>
      </div>
    </div>
  );
};

// 3. Real EUDR Passport View
const RealEudrPassportView = () => {
  return (
    <div className="border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 font-display">EUDR Passport</h3>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
              REGULATION (EU) 2023/1115
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            For each member: where the land is and whether forest was cleared after 31 December 2020.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 text-xs">
          <Download size={14} />
          Export parcels (GeoJSON)
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200">
        <div className="bg-white p-3 border border-slate-200 rounded">
          <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold text-[10px]">
            Deforestation-free
          </span>
          <p className="font-mono text-xl font-bold text-slate-900 mt-2">218</p>
        </div>

        <div className="bg-white p-3 border border-slate-200 rounded">
          <span className="inline-block bg-sky-50 text-sky-700 px-2 py-0.5 rounded font-bold text-[10px]">
            Zero Encroachment
          </span>
          <p className="font-mono text-xl font-bold text-slate-900 mt-2">218</p>
        </div>

        <div className="bg-white p-3 border border-slate-200 rounded">
          <span className="inline-block bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold text-[10px]">
            At Risk
          </span>
          <p className="font-mono text-xl font-bold text-slate-900 mt-2">0</p>
        </div>

        <div className="bg-white p-3 border border-slate-200 rounded">
          <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold text-[10px]">
            Not Checked
          </span>
          <p className="font-mono text-xl font-bold text-slate-900 mt-2">0</p>
        </div>
      </div>

      {/* Member Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
            <tr>
              <th className="px-4 py-2.5">Member</th>
              <th className="px-4 py-2.5">Cooperative Group</th>
              <th className="px-4 py-2.5">Parcels</th>
              <th className="px-4 py-2.5">Area</th>
              <th className="px-4 py-2.5">EUDR Audit Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3">
                <span className="font-bold text-slate-900 block">Samuel Mensah</span>
                <span className="text-[10px] text-slate-400 font-mono">NG-EDO-00456</span>
              </td>
              <td className="px-4 py-3 text-slate-600">Ovia Cocoa Growers Union</td>
              <td className="px-4 py-3 font-mono">3</td>
              <td className="px-4 py-3 font-mono">4.20 ha</td>
              <td className="px-4 py-3">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-[10px]">
                  ✓ Deforestation-free (PASSED)
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <span className="font-bold text-slate-900 block">Amina Bello</span>
                <span className="text-[10px] text-slate-400 font-mono">NG-EDO-00457</span>
              </td>
              <td className="px-4 py-3 text-slate-600">Ovia Cocoa Growers Union</td>
              <td className="px-4 py-3 font-mono">2</td>
              <td className="px-4 py-3 font-mono">6.80 ha</td>
              <td className="px-4 py-3">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-[10px]">
                  ✓ Deforestation-free (PASSED)
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-3">
                <span className="font-bold text-slate-900 block">Emmanuel Okoro</span>
                <span className="text-[10px] text-slate-400 font-mono">NG-EDO-00458</span>
              </td>
              <td className="px-4 py-3 text-slate-600">Benin River Valley Cooperative</td>
              <td className="px-4 py-3 font-mono">4</td>
              <td className="px-4 py-3 font-mono">9.15 ha</td>
              <td className="px-4 py-3">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded text-[10px]">
                  ✓ Deforestation-free (PASSED)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 4. Real Land Suitability Studio View
const RealSuitabilityStudioView = () => {
  const calibratedCrops = [
    { name: 'Oil Palm', score: '92%', class: 'S1 - Highly Suitable', area: '4,200 ha', tone: 'text-emerald-700 bg-emerald-50' },
    { name: 'Cocoa', score: '88%', class: 'S1 - Highly Suitable', area: '3,850 ha', tone: 'text-emerald-700 bg-emerald-50' },
    { name: 'Cashew', score: '85%', class: 'S1 - Highly Suitable', area: '2,900 ha', tone: 'text-emerald-700 bg-emerald-50' },
    { name: 'Rubber', score: '82%', class: 'S2 - Moderately Suitable', area: '1,800 ha', tone: 'text-lime-700 bg-lime-50' },
    { name: 'Cassava', score: '96%', class: 'S1 - Highly Suitable', area: '5,100 ha', tone: 'text-emerald-700 bg-emerald-50' },
    { name: 'Maize', score: '89%', class: 'S1 - Highly Suitable', area: '3,400 ha', tone: 'text-emerald-700 bg-emerald-50' },
    { name: 'Rice', score: '79%', class: 'S2 - Moderately Suitable', area: '1,200 ha', tone: 'text-lime-700 bg-lime-50' },
    { name: 'Sugarcane', score: '86%', class: 'S1 - Highly Suitable', area: '2,100 ha', tone: 'text-emerald-700 bg-emerald-50' },
  ];

  return (
    <div className="border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
      <div className="p-4 sm:p-5 border-b border-slate-200">
        <h3 className="text-base font-bold text-slate-900 font-display">Where each crop fits</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Rainfall, temperature, terrain, soil and flooding are scored; forest and protected land are excluded.
        </p>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50">
        {calibratedCrops.map((c) => (
          <div key={c.name} className="bg-white border border-slate-200 p-3 rounded space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">{c.name}</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{c.score}</span>
            </div>
            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${c.tone}`}>
              {c.class}
            </span>
            <p className="text-[10px] text-slate-400">Total mapped: {c.area}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// 5. Real Smallholder Field Scouting View
const RealSmallholderFieldScoutView = () => {
  return (
    <div className="border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">Field</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Open a parcel on the farm to see its history, record a visit or update it.
            </p>
          </div>
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
            <Check size={12} className="text-emerald-600" />
            0 pending updates &bull; All synced
          </span>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg">
          <Search size={14} className="text-slate-400" />
          <input placeholder="Member, group or crop" className="w-full text-xs outline-none bg-transparent" readOnly value="Ovia Cocoa" />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold">
          <Crosshair size={14} className="text-emerald-600" />
          <span>Nearest</span>
        </button>
      </div>

      <div className="p-4 space-y-2.5">
        <div className="border border-slate-200 p-3 rounded-lg hover:border-emerald-500 transition-colors bg-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-bold text-slate-900 text-xs block">Samuel Mensah's farm</span>
              <span className="text-[11px] text-slate-500">Cocoa &bull; Ovia Cocoa Growers Union &bull; 4.2 ha</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
              0.4 km away
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Last scout visit: 12 Oct 2026</span>
            <span className="text-emerald-600 font-semibold">Boundary mapped (14 GPS pts)</span>
          </div>
        </div>

        <div className="border border-slate-200 p-3 rounded-lg hover:border-emerald-500 transition-colors bg-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-bold text-slate-900 text-xs block">Amina Bello's farm</span>
              <span className="text-[11px] text-slate-500">Oil Palm &bull; Ovia Cocoa Growers Union &bull; 6.8 ha</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
              1.2 km away
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>Last scout visit: 10 Oct 2026</span>
            <span className="text-emerald-600 font-semibold">Boundary mapped (18 GPS pts)</span>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ─── MAIN DOCUMENTATION PAGE ────────────────────────────────────────────────────── */

const DocumentationPage = () => {
  const [searchParams] = useSearchParams();
  const requestedTopic = searchParams.get('topic') || searchParams.get('section');
  const [selectedTopic, setSelectedTopic] = useState(requestedTopic || 'api');

  // Toggle between Real Dashboard vs Operational Scene with Black Professionals
  const [viewModes, setViewModes] = useState({
    'how-it-works': 'dashboard',
    'crop-health': 'dashboard',
    'irrigation': 'dashboard',
    'suitability': 'dashboard',
    'eudr': 'dashboard',
    'reports': 'dashboard',
    'api': 'dashboard'
  });

  const setMode = (topic, mode) => {
    setViewModes((prev) => ({ ...prev, [topic]: mode }));
  };

  const topics = [
    { id: 'api', label: 'REST API & Tile Endpoints', icon: Terminal },
    { id: 'how-it-works', label: 'How FarmIntelytics Works', icon: Compass },
    { id: 'crop-health', label: 'Crop Health & Growth', icon: Sprout },
    { id: 'irrigation', label: 'Water & Moisture Advice', icon: Droplets },
    { id: 'suitability', label: 'Land Suitability Guide', icon: CloudSun },
    { id: 'eudr', label: 'Deforestation & Export Proof', icon: ShieldCheck },
    { id: 'reports', label: 'Reports & Farmer Records', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <PublicHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
        {/* Header Introduction */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            Platform Guide & API Knowledge Center
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Explore plain-English workflow guides, real platform dashboard views, and developer REST API integration standards for FarmIntelytics.
          </p>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Quick Navigation Menu */}
          <aside className="md:col-span-4 bg-white border border-slate-200 p-3 shadow-sm space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
              Topic Guide
            </p>
            {topics.map((t) => {
              const Icon = t.icon;
              const active = selectedTopic === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t.id)}
                  className={`w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-900 border-l-4 border-emerald-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={active ? 'text-emerald-700' : 'text-slate-400'} />
                    <span>{t.label}</span>
                  </div>
                  <ChevronRight size={14} className={active ? 'text-emerald-700' : 'text-slate-300'} />
                </button>
              );
            })}

            <div className="mt-4 pt-4 border-t border-slate-100 px-3 pb-2 text-[11px] text-slate-500 leading-relaxed">
              Need dedicated API keys or assistance onboarding your estate? Contact our technical team anytime.
            </div>
          </aside>

          {/* Main Informational Body */}
          <section className="md:col-span-8 bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
            {/* 1. REST API & INTEGRATION */}
            {selectedTopic === 'api' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    REST API & System Integration
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Connect FarmIntelytics data pipelines into your existing farm management software, enterprise ERP (SAP, Odoo), mobile apps, or GIS mapping platforms.
                  </p>
                </div>

                {/* Dashboard Integration View Illustration */}
                <div className="border border-slate-200 bg-slate-900 overflow-hidden shadow-sm">
                  <img 
                    src="/docs-assets/hero_panoramic_clean.jpg?v=8" 
                    alt="FarmIntelytics Dashboard Telemetry Pipeline" 
                    className="w-full h-48 sm:h-56 object-cover opacity-90"
                  />
                  <div className="p-3 bg-slate-900 text-slate-300 text-[11px] flex items-center justify-between">
                    <span>📡 Live Sentinel-1 SAR & Sentinel-2 Earth Observation Tile Gateway</span>
                    <span className="text-emerald-400 font-mono">200 OK &bull; 99.9% SLA</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Code2 size={16} className="text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">Standard REST API Endpoints</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      All endpoints use standard JSON formatting and secure API token authorization header (<code>Authorization: Bearer &lt;API_KEY&gt;</code>).
                    </p>
                    <div className="bg-slate-900 text-slate-100 p-3.5 font-mono text-xs space-y-2 overflow-x-auto border border-slate-700">
                      <div>
                        <span className="text-emerald-400 font-bold">GET</span> <span className="text-slate-300">/api/v1/parcels</span>
                        <p className="text-slate-400 text-[11px] font-sans"># Retrieve registered farm boundaries, polygons, and acreages</p>
                      </div>
                      <div className="pt-1 border-t border-slate-800">
                        <span className="text-emerald-400 font-bold">GET</span> <span className="text-slate-300">/api/v1/monitoring/health/&#123;parcel_id&#125;</span>
                        <p className="text-slate-400 text-[11px] font-sans"># Query current vegetative health, moisture levels, and anomaly flags</p>
                      </div>
                      <div className="pt-1 border-t border-slate-800">
                        <span className="text-emerald-400 font-bold">GET</span> <span className="text-slate-300">/api/v1/compliance/eudr/&#123;parcel_id&#125;</span>
                        <p className="text-slate-400 text-[11px] font-sans"># Fetch automated 2020 cutoff deforestation audit result and pass certificate</p>
                      </div>
                      <div className="pt-1 border-t border-slate-800">
                        <span className="text-sky-400 font-bold">POST</span> <span className="text-slate-300">/api/v1/reports/export</span>
                        <p className="text-slate-400 text-[11px] font-sans"># Generate and download high-resolution vector PDF compliance dossiers</p>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">GIS & Map Tile Streaming (XYZ)</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Stream live all-weather radar and satellite overlay layers directly into QGIS, ArcGIS, Mapbox, or Leaflet mapping applications:
                    </p>
                    <div className="bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto border border-slate-700">
                      <span className="text-emerald-400">https://</span>tiles.farmintelytics.com/v1/&#123;tenant&#125;/&#123;layer&#125;/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                  <strong>Developer Credentials:</strong> API access keys and webhook configurations are provisioned through your organization portal dashboard. Enterprise subscriptions include dedicated developer support.
                </div>
              </div>
            )}

            {/* 2. HOW IT WORKS */}
            {selectedTopic === 'how-it-works' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    How FarmIntelytics Works for You
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    You do not need specialized GIS knowledge or technical remote sensing expertise to use FarmIntelytics. The system simplifies space satellite data into clear everyday farming insights.
                  </p>
                </div>

                {/* View Switcher: Real FarmIntelytics Dashboard vs Operational Scene */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Display:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setMode('how-it-works', 'dashboard')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['how-it-works'] === 'dashboard'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      💻 Real FarmIntelytics Dashboard
                    </button>
                    <button
                      onClick={() => setMode('how-it-works', 'scene')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['how-it-works'] === 'scene'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      📸 Field Operations Scene
                    </button>
                  </div>
                </div>

                {/* Content based on switcher */}
                {viewModes['how-it-works'] === 'dashboard' ? (
                  <RealCropHealthDashboardView />
                ) : (
                  <div className="border border-slate-200 overflow-hidden shadow-sm">
                    <img 
                      src="/docs-assets/docs_agronomist_dashboard.jpg?v=8" 
                      alt="Dr. Adebayo in the field with Sentinel telemetry" 
                      className="w-full h-56 sm:h-72 object-cover"
                    />
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                      <strong>Field Operation:</strong> Dr. Adebayo monitoring crop health and vegetative index in the plantation using real-time satellite telemetry on a field tablet.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase">Step 1</span>
                    <h3 className="text-sm font-bold text-slate-900">Locate Your Farmland</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Simply draw your farm boundary on our map or upload your coordinates. Works for smallholder farms and large estates.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase">Step 2</span>
                    <h3 className="text-sm font-bold text-slate-900">Automatic Satellite Watch</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Constellations scan your farm continuously. Special radar waves see through clouds, fog, and rain so you never miss a day.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <span className="text-xs font-bold text-emerald-700 uppercase">Step 3</span>
                    <h3 className="text-sm font-bold text-slate-900">Take Fast Action</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Receive straightforward color-coded updates: green for vigorous crops, yellow for moisture stress, and red for problem spots.
                    </p>
                  </div>
                </div>

                <div className="border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950 space-y-1">
                  <p className="font-bold">What makes FarmIntelytics different?</p>
                  <p className="text-slate-700 leading-relaxed">
                    Unlike standard optical photos that get blocked whenever clouds drift over tropical regions, FarmIntelytics uses cloud-penetrating radar telemetry to keep your farm monitored in all weather conditions.
                  </p>
                </div>
              </div>
            )}

            {/* 3. CROP HEALTH & GROWTH */}
            {selectedTopic === 'crop-health' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    Understanding Crop Health & Growth
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Satellites measure leaf vigor and canopy density across your entire farm, highlighting problem areas days before they become visible to the naked eye.
                  </p>
                </div>

                {/* View Switcher: Real FarmIntelytics Dashboard vs Operational Scene */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Display:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setMode('crop-health', 'dashboard')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['crop-health'] === 'dashboard'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      💻 Real FarmIntelytics Dashboard
                    </button>
                    <button
                      onClick={() => setMode('crop-health', 'scene')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['crop-health'] === 'scene'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      📸 Agronomist in Field
                    </button>
                  </div>
                </div>

                {/* Real FarmIntelytics Dashboard vs Field Scene */}
                {viewModes['crop-health'] === 'dashboard' ? (
                  <RealCropHealthDashboardView />
                ) : (
                  <div className="border border-slate-200 overflow-hidden shadow-sm">
                    <img 
                      src="/docs-assets/docs_agronomist_dashboard.jpg?v=8" 
                      alt="Dr. Adebayo in the field with Sentinel telemetry" 
                      className="w-full h-56 sm:h-72 object-cover"
                    />
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                      <strong>Lead Agronomist:</strong> Dr. Adebayo inspecting farm canopy vigor directly on the plantation with live FarmIntelytics satellite NDVI intelligence.
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="border border-slate-200 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-emerald-600 inline-block"></span>
                      <h3 className="text-sm font-bold text-slate-900">Vigorous & Thriving (Green)</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Leaves are dense, well-hydrated, and actively growing. Your crops are absorbing nutrients effectively and developing strong yields.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-amber-500 inline-block"></span>
                      <h3 className="text-sm font-bold text-slate-900">Attention Needed (Yellow)</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Mild growth slowdown. This typically indicates initial nutrient shortage, localized weed pressure, or minor water stress.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-rose-600 inline-block"></span>
                      <h3 className="text-sm font-bold text-slate-900">Critical Crop Stress (Red)</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sharp decline in foliage health. Dispatch field scouts immediately to investigate pest infestation, severe drought, or disease outbreaks.
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 p-4">
                  <strong>Practical Tip:</strong> Use the parcel map on your mobile phone when walking the fields. Walk straight to the red and yellow zones to save time and apply fertilizer or treatment exactly where needed.
                </div>
              </div>
            )}

            {/* 4. WATER & MOISTURE ADVICE */}
            {selectedTopic === 'irrigation' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    Smart Water & Irrigation Management
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Over-watering wastes expensive fuel and washes away fertilizer, while under-watering stunts crop yields. FarmIntelytics measures moisture levels in both the soil and plant canopy.
                  </p>
                </div>

                {/* View Switcher: Real FarmIntelytics Dashboard vs Operational Scene */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Display:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setMode('irrigation', 'dashboard')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['irrigation'] === 'dashboard'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      💻 Real Moisture Dashboard
                    </button>
                    <button
                      onClick={() => setMode('irrigation', 'scene')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['irrigation'] === 'scene'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      📸 Water Engineer at Canal
                    </button>
                  </div>
                </div>

                {viewModes['irrigation'] === 'dashboard' ? (
                  <RealIrrigationRadarView />
                ) : (
                  <div className="border border-slate-200 overflow-hidden shadow-sm">
                    <img 
                      src="/docs-assets/docs_irrigation_radar.jpg?v=8" 
                      alt="Water Engineer monitoring irrigation telemetry by canal" 
                      className="w-full h-56 sm:h-72 object-cover"
                    />
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                      <strong>Irrigation Operations:</strong> Precision water engineer tracking all-weather Sentinel-1 radar moisture and canopy water indices by the farm irrigation channel.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">When to Irrigate</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The system alerts you when canopy moisture drops below optimal levels, advising you to schedule watering before the plants show signs of wilting.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">Detecting Waterlogging</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Standing water can rot crop roots. The platform highlights saturated low-lying parcels after heavy rainfall so you can clear drainage channels.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                  <strong>Water Saving Benefit:</strong> Estates and commercial farms using satellite moisture tracking report up to 25% savings on pumping fuel and irrigation costs by watering only when crops truly need it.
                </div>
              </div>
            )}

            {/* 5. LAND SUITABILITY GUIDE */}
            {selectedTopic === 'suitability' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    Land Suitability & Crop Matching
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Before investing capital into planting, expanding, or acquiring farmland, FarmIntelytics checks whether the climate, soil, and terrain are ideal for your chosen crop.
                  </p>
                </div>

                {/* View Switcher: Real FarmIntelytics Dashboard vs Operational Scene */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Display:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setMode('suitability', 'dashboard')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['suitability'] === 'dashboard'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      💻 Real Suitability Studio
                    </button>
                    <button
                      onClick={() => setMode('suitability', 'scene')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['suitability'] === 'scene'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      📸 Executive Boardroom
                    </button>
                  </div>
                </div>

                {viewModes['suitability'] === 'dashboard' ? (
                  <RealSuitabilityStudioView />
                ) : (
                  <div className="border border-slate-200 overflow-hidden shadow-sm">
                    <img 
                      src="/docs-assets/docs_suitability_boardroom.jpg?v=8" 
                      alt="Agribusiness leadership evaluating land suitability in boardroom" 
                      className="w-full h-56 sm:h-72 object-cover"
                    />
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                      <strong>Investment Evaluation:</strong> Executive corporate leadership and agronomic advisors in Abuja assessing suitability heatmaps and soil fertility across 8 tropical crops.
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 border border-slate-200 bg-slate-50">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700">
                      <strong>Rainfall & Weather:</strong> Checks if long-term rainfall and temperatures match what the crop needs across all seasons.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-slate-200 bg-slate-50">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700">
                      <strong>Soil Texture & Acidity (pH):</strong> Evaluates if the soil depth and composition can support healthy root systems.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 border border-slate-200 bg-slate-50">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-700">
                      <strong>Hills & Terrain Slope:</strong> Identifies steep slopes prone to soil erosion or flat plains prone to seasonal floods.
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 p-4">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">Supported Calibrated Crops</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Calibrated specifically for tropical agriculture: <strong>Oil Palm, Cocoa, Rubber, Cashew, Rice, Maize, Cassava, and Sugarcane</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* 6. EUDR DEFORESTATION & EXPORT PROOF */}
            {selectedTopic === 'eudr' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    EUDR Deforestation Compliance & Export Proof
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Under international market regulations (including the European Union Deforestation Regulation), exporters of cocoa, oil palm, rubber, and coffee must prove their harvests did not cause deforestation.
                  </p>
                </div>

                {/* View Switcher: Real FarmIntelytics Dashboard vs Operational Scene */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Display:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setMode('eudr', 'dashboard')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['eudr'] === 'dashboard'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      💻 Real EUDR Passport View
                    </button>
                    <button
                      onClick={() => setMode('eudr', 'scene')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['eudr'] === 'scene'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      📸 Compliance Command Center
                    </button>
                  </div>
                </div>

                {viewModes['eudr'] === 'dashboard' ? (
                  <RealEudrPassportView />
                ) : (
                  <div className="border border-slate-200 overflow-hidden shadow-sm">
                    <img 
                      src="/docs-assets/docs_eudr_command_center.jpg?v=8" 
                      alt="Corporate EUDR Deforestation Verification Command Center" 
                      className="w-full h-56 sm:h-72 object-cover"
                    />
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                      <strong>Sustainability Command Center:</strong> Compliance Director Amina and GIS analyst verifying farm boundary overlays against the December 31, 2020 forest baseline.
                    </div>
                  </div>
                )}

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-4 border border-slate-200 bg-slate-50 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">December 31, 2020 Cutoff Audit</h3>
                    <p className="text-slate-600 leading-relaxed">
                      FarmIntelytics checks your farm boundary against official satellite forest maps from December 31, 2020. If your land was already farmland before the cutoff date, it passes automatically.
                    </p>
                  </div>

                  <div className="p-4 border border-slate-200 bg-slate-50 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">Protected Area Boundary Checks</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Ensures farm boundaries do not encroach into gazetted national parks, forest reserves, or protected wildlife areas.
                    </p>
                  </div>

                  <div className="p-4 border border-slate-200 bg-slate-50 space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm">Instant Due Diligence Dossier</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Export complete compliant verification packs with exact GPS boundary coordinates, proof certificates, and parcel IDs ready to submit to buyers and regulatory customs.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. REPORTS & FARMER RECORDS */}
            {selectedTopic === 'reports' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    Executive Reports & Smallholder Registry
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Turn complex satellite observations into boardroom-ready documents, smallholder polygon maps, and farmer certificates.
                  </p>
                </div>

                {/* View Switcher: Real FarmIntelytics Dashboard vs Operational Scene */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Visual Display:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setMode('reports', 'dashboard')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['reports'] === 'dashboard'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      💻 Real Smallholder Field View
                    </button>
                    <button
                      onClick={() => setMode('reports', 'scene')}
                      className={`px-3 py-1.5 font-bold rounded transition-colors ${
                        viewModes['reports'] === 'scene'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      📸 Cooperative Extension Field Agent
                    </button>
                  </div>
                </div>

                {viewModes['reports'] === 'dashboard' ? (
                  <RealSmallholderFieldScoutView />
                ) : (
                  <div className="border border-slate-200 overflow-hidden shadow-sm">
                    <img 
                      src="/docs-assets/docs_smallholder_mobile.jpg?v=8" 
                      alt="Field Extension Officer registering smallholder cocoa farmer" 
                      className="w-full h-56 sm:h-72 object-cover"
                    />
                    <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                      <strong>Community Extension:</strong> Agricultural field officer recording GPS parcel boundaries and tree inventories with a smallholder cocoa farmer on the mobile app.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 p-4 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">Print-Ready PDF Reports</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Download clean summary reports featuring high-resolution farm maps, health charts, moisture trends, and compliance seals. Perfect for banks, agricultural insurers, and auditors.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900">Smallholder Farmer Registry</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Keep organized digital records of individual farmer names, cooperative groups, parcel sizes in hectares, and historical harvest yields.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <strong>Data Privacy Guarantee:</strong> Your farm boundary data and crop yield records belong strictly to your organization. FarmIntelytics never sells, shares, or monetizes your private agricultural data.
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default DocumentationPage;
