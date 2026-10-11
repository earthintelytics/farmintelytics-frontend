import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeCanvas from './GlobeCanvas';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section id="hero" className="relative overflow-hidden bg-[#070b14] min-h-[calc(100vh-120px)] flex-1 flex items-center justify-center border-b border-slate-800">
      {/* Pristine Background Image - 100% Free of Words & Labels */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center opacity-90 z-0"
        style={{ backgroundImage: "url('/hero-clean-panoramic-v4.jpg?v=4')" }}
      />

      {/* Cinematic Gradient Overlays for High Contrast & Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/50 to-[#070b14]/70 z-0 pointer-events-none" />

      {/* Live Animated Radar Telemetry Canvas */}
      <GlobeCanvas />

      {/* Hero Content with Mobile-Optimized Spacing & Typography */}
      <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-24 text-center flex flex-col items-center w-full">
        {/* FarmIntelytics Logo - Straight Clean Edges & Tight White Area */}
        <div className="mb-4 sm:mb-6">
          <div className="inline-block p-1 sm:p-1.5 bg-white rounded-none shadow-[0_12px_36px_rgba(0,0,0,0.7)] border border-white/25 transform hover:scale-105 transition-transform duration-300">
            <img
              src="/farmintelytics-logo.png?v=7"
              alt="FarmIntelytics"
              className="w-20 sm:w-28 h-auto object-contain rounded-none block"
            />
          </div>
        </div>

        {/* Title and Branding - Responsive Font Scaling */}
        <h1 className="font-display text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white mb-2 sm:mb-3 drop-shadow-md">
          FarmIntelytics
        </h1>
        <p className="text-base sm:text-xl lg:text-2xl font-semibold text-emerald-400 mb-4 sm:mb-6 tracking-wide drop-shadow">
          Powered by Earthintelytics
        </p>

        {/* Description - Farmer-Friendly, Plain English */}
        <p className="max-w-2xl text-xs sm:text-base lg:text-lg text-slate-200 leading-relaxed font-normal mb-8 sm:mb-10 drop-shadow px-2 sm:px-0">
          Real-time satellite intelligence for farms, estates, and agricultural lands. Track crop health and growth, get smart irrigation and moisture advice, verify EUDR deforestation compliance, and evaluate land suitability, all in one clear, easy-to-use platform.
        </p>

        {/* Central Primary Sign In Button - Mobile Friendly Touch Target */}
        <button
          id="hero-primary-sign-in"
          onClick={() => navigate('/login')}
          className="w-full max-w-xs sm:w-auto px-8 sm:px-12 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base font-bold text-slate-950 bg-white hover:bg-slate-100 shadow-[0_0_35px_rgba(255,255,255,0.35)] hover:shadow-[0_0_45px_rgba(255,255,255,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          Sign in
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
