import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeCanvas from './GlobeCanvas';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section id="hero" className="relative overflow-hidden bg-[#0c101d] min-h-[680px] lg:min-h-[750px] flex items-center justify-center border-b border-slate-800">
      <GlobeCanvas />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center">
        {/* Platform Center Icon Badge */}
        <div className="mb-6 relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-emerald-500 rounded-3xl blur-md opacity-40 animate-pulse-slow" />
          <div className="relative w-20 h-20 rounded-2xl bg-[#131b2e] border border-blue-400/30 shadow-2xl flex items-center justify-center p-3">
            <img
              src="/farmintelytics-logo.png"
              alt="FarmIntelytics"
              className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]"
            />
          </div>
        </div>

        {/* Title and Branding */}
        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-3">
          FarmIntelytics
        </h1>
        <p className="text-xl sm:text-2xl font-medium text-emerald-400 mb-6 tracking-wide">
          Powered by Earthintelytics
        </p>

        {/* Description */}
        <p className="max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed font-normal mb-10">
          Connect plantations, satellite constellations, and agronomic data using interactive earth observation.
          Monitor crop health, verify EUDR deforestation compliance, and evaluate land suitability across global agricultural frontiers.
        </p>

        {/* Central Primary Sign In Button */}
        <button
          id="hero-primary-sign-in"
          onClick={() => navigate('/login')}
          className="px-12 py-4 rounded-xl text-base font-bold text-slate-950 bg-white hover:bg-slate-100 shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          Sign in
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
