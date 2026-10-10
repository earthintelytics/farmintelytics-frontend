import React from 'react';
import { Activity, Layers, ShieldCheck, Sprout } from 'lucide-react';

export const PLATFORM_CAPABILITIES = [
  {
    id: 'telemetry',
    icon: Activity,
    badge: 'Earth Observation',
    title: 'Multispectral Crop Telemetry',
    desc: 'Automated Sentinel-2 optical and Sentinel-1 SAR radar analytics. Calibrated NDVI, NDMI, EVI, CVI, and DPRVI indices at 10m spatial resolution.',
  },
  {
    id: 'suitability',
    icon: Layers,
    badge: 'FAO Biophysical Engine',
    title: 'Crop Suitability & Land Evaluation',
    desc: 'Multi-criteria agro-ecological zoning across 8 crops. Automated climate normals (CHIRPS & ERA5), Copernicus DEM slope, SoilGrids 250m, and WDPA gates.',
  },
  {
    id: 'eudr',
    icon: ShieldCheck,
    badge: 'Regulatory Compliance',
    title: 'EUDR Deforestation Verification',
    desc: 'Automated 2020 baseline forest overlap auditing, post-cutoff forest disturbance checks, and boardroom-ready audit compliance packs.',
  },
  {
    id: 'smallholder',
    icon: Sprout,
    badge: 'Field Operations',
    title: 'Smallholder & Parcel Intelligence',
    desc: 'GeoJSON spatial boundary management, farmer group registries, IPCC Tier 1 carbon biomass estimation, and mobile field forms.',
  },
];

const CapabilitiesSection = () => {
  return (
    <section id="capabilities" className="py-24 bg-[#0e1322] border-b border-slate-800 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/60 px-3.5 py-1.5 rounded-full border border-emerald-800/50">
            Core Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-display text-white mt-4">
            High-Precision Agricultural Geospatial Intelligence
          </h2>
          <p className="text-slate-400 mt-3 text-sm sm:text-base">
            End-to-end analytical pipeline backed by physics-based satellite sensors, automated climate modeling, and verifiable compliance records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLATFORM_CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.id}
                className="bg-[#131b2e] border border-slate-800 rounded-2xl p-7 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-950/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400">
                      <Icon size={24} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md">
                      {cap.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold font-display text-white mb-2.5">
                    {cap.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CapabilitiesSection;
