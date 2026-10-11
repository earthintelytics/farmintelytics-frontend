import React, { useState } from 'react';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { 
  Sprout, 
  Droplets, 
  ShieldCheck, 
  FileText, 
  MapPin, 
  Compass, 
  CloudSun, 
  HelpCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

const DocumentationPage = () => {
  const [selectedTopic, setSelectedTopic] = useState('how-it-works');

  const topics = [
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
            Platform Guide & Knowledge Center
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            A plain-English guide to understanding how FarmIntelytics helps farmers, estate managers, and agribusinesses monitor crops, manage water, verify land, and make confident farming decisions.
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
              Need personalized onboarding for your cooperative or estate? Reach our team anytime via the Contact page.
            </div>
          </aside>

          {/* Main Informational Body */}
          <section className="md:col-span-8 bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
            {/* 1. HOW IT WORKS */}
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
                    Unlike standard satellite photos that get blocked whenever clouds drift over tropical regions, FarmIntelytics uses cloud-penetrating radar radar telemetry to keep your farm monitored in all weather conditions.
                  </p>
                </div>
              </div>
            )}

            {/* 2. CROP HEALTH & GROWTH */}
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

                <div className="space-y-3">
                  <div className="border border-slate-200 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-emerald-600 inline-block"></span>
                      <h4 className="text-sm font-bold text-slate-900">Vigorous & Thriving (Green)</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Leaves are dense, well-hydrated, and actively growing. Your crops are absorbing nutrients effectively and developing strong yields.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-amber-500 inline-block"></span>
                      <h4 className="text-sm font-bold text-slate-900">Attention Needed (Yellow)</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Mild growth slowdown. This typically indicates initial nutrient shortage, localized weed pressure, or minor water stress.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-rose-600 inline-block"></span>
                      <h4 className="text-sm font-bold text-slate-900">Critical Crop Stress (Red)</h4>
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

            {/* 3. IRRIGATION & MOISTURE ADVICE */}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">When to Irrigate</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      The system alerts you when canopy moisture drops below optimal levels, advising you to schedule watering before the plants show signs of wilting.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 bg-slate-50 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">Detecting Waterlogging</h4>
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

            {/* 4. LAND SUITABILITY GUIDE */}
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

            {/* 5. EUDR DEFORESTATION & EXPORT PROOF */}
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

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-4 border border-slate-200 bg-slate-50 space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">December 31, 2020 Cutoff Audit</h4>
                    <p className="text-slate-600 leading-relaxed">
                      FarmIntelytics checks your farm boundary against official satellite forest maps from December 31, 2020. If your land was already farmland before the cutoff date, it passes automatically.
                    </p>
                  </div>

                  <div className="p-4 border border-slate-200 bg-slate-50 space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">Protected Area Boundary Checks</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Ensures farm boundaries do not encroach into gazetted national parks, forest reserves, or protected wildlife areas.
                    </p>
                  </div>

                  <div className="p-4 border border-slate-200 bg-slate-50 space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">Instant Due Diligence Dossier</h4>
                    <p className="text-slate-600 leading-relaxed">
                      Export complete compliant verification packs with exact GPS boundary coordinates, proof certificates, and parcel IDs ready to submit to buyers and regulatory customs.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. REPORTS & FARMER RECORDS */}
            {selectedTopic === 'reports' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">
                    Executive Reports & Farmer Records
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Turn complex satellite observations into boardroom-ready documents and farmer certificates that anyone can review and file.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 p-4 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">Print-Ready PDF Reports</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Download clean summary reports featuring high-resolution farm maps, health charts, moisture trends, and compliance seals. Perfect for banks, agricultural insurers, and auditors.
                    </p>
                  </div>

                  <div className="border border-slate-200 p-4 space-y-2">
                    <h4 className="text-sm font-bold text-slate-900">Smallholder Farmer Registry</h4>
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
