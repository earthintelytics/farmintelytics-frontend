import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeCanvas from './GlobeCanvas';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section id="hero" className="relative overflow-hidden bg-[#070b14] flex-1 min-h-0 flex items-center justify-center border-b border-slate-800">
      {/* Pristine Background Image - 100% Free of Words & Labels */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center opacity-90 z-0"
        style={{ backgroundImage: "url('/hero-clean-panoramic-v4.jpg?v=4')" }}
      />

      {/* Cinematic Gradient Overlays for High Contrast & Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/50 to-[#070b14]/70 z-0 pointer-events-none" />

      {/* Live Animated Radar Telemetry Canvas */}
      <GlobeCanvas />

      {/* Hero Content - Perfectly Balanced to Fit in 1 Viewport */}
      <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 text-center flex flex-col items-center w-full my-auto">
        {/* FarmIntelytics Logo - Straight Clean Edges & Tight White Area */}
        <div className="mb-2 sm:mb-3">
          <div className="inline-block p-1 bg-white rounded-none shadow-[0_8px_24px_rgba(0,0,0,0.7)] border border-white/25 transform hover:scale-105 transition-transform duration-300">
            <img
              src="/farmintelytics-logo.png?v=7"
              alt="FarmIntelytics"
              className="w-16 sm:w-20 h-auto object-contain rounded-none block"
            />
          </div>
        </div>

        {/* Title and Branding */}
        <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-1 drop-shadow-md">
          FarmIntelytics
        </h1>
        <p className="text-xs sm:text-base font-semibold text-emerald-400 mb-2 sm:mb-3 tracking-wide drop-shadow">
          Powered by Earthintelytics
        </p>

        {/* Description - Farmer-Friendly, Plain English */}
        <p className="max-w-2xl text-xs sm:text-sm text-slate-200 leading-relaxed font-normal mb-4 sm:mb-6 drop-shadow px-2 sm:px-0">
          Real-time satellite intelligence for farms, estates, and agricultural lands. Track crop health and growth, get smart irrigation and moisture advice, verify EUDR deforestation compliance, and evaluate land suitability, all in one clear, easy-to-use platform.
        </p>

        {/* Central Primary Sign In Button */}
        <button
          id="hero-primary-sign-in"
          onClick={() => navigate('/login')}
          className="w-full max-w-xs sm:w-auto px-8 sm:px-10 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-white hover:bg-slate-100 shadow-[0_0_30px_rgba(255,255,255,0.35)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          Sign in
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
