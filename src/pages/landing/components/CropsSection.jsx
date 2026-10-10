import React from 'react';
import { Sprout } from 'lucide-react';

export const SUPPORTED_CROPS = [
  { name: 'Oil Palm', tag: 'rs-oil_palm', code: 'S1 Optimized' },
  { name: 'Rubber', tag: 'rs-rubber', code: 'SAR & Optical' },
  { name: 'Cocoa', tag: 'rs-cocoa', code: 'Canopy Density' },
  { name: 'Cashew', tag: 'rs-cashew', code: 'Tree Vigor' },
  { name: 'Rice', tag: 'rs-rice', code: 'Water Moisture' },
  { name: 'Maize', tag: 'rs-maize', code: 'Biomass Index' },
  { name: 'Cassava', tag: 'rs-cassava', code: 'Soil Drainage' },
  { name: 'Sugarcane', tag: 'rs-sugarcane', code: 'Yield Forecast' },
];

const CropsSection = () => {
  return (
    <section id="crops" className="py-20 bg-[#0c101d] border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-widest text-blue-400 uppercase bg-blue-950/60 px-3.5 py-1.5 rounded-full border border-blue-800/50">
            Agronomic Engines
          </span>
          <h2 className="text-3xl font-bold font-display text-white mt-3">
            8 Calibrated Crop Ecosystems
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Custom biophysical parameter thresholds, growth stages, and remote sensing health index curves.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
          {SUPPORTED_CROPS.map((c) => (
            <div
              key={c.tag}
              className="bg-[#121828] border border-slate-800 rounded-xl p-4 text-center select-none"
            >
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-300">
                <Sprout size={20} className="text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-white truncate">{c.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono mt-1">{c.code}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CropsSection;
