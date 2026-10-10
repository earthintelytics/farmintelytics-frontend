import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

const EudrBanner = () => {
  return (
    <section id="compliance" className="py-20 bg-gradient-to-b from-[#0c101d] to-[#0a0d17] border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-950/40 via-[#131b2e] to-blue-950/40 border border-emerald-500/30 rounded-3xl p-8 sm:p-12 flex flex-col items-center text-center max-w-4xl mx-auto shadow-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-4">
            <ShieldCheck size={14} /> EU Deforestation Regulation (EUDR) Ready
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold font-display text-white mb-3">
            Full Chain-of-Custody & Deforestation Verification
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl mb-6">
            Audit polygon and parcel geometries against December 31, 2020 forest baselines. Automatically evaluate post-cutoff forest canopy loss, generate compliant diligence statements, and export verified geospatial evidence.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-400" /> JRC 2020 Baseline</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-400" /> ESA WorldCover 10m</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-400" /> WDPA Protected Zones</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EudrBanner;
