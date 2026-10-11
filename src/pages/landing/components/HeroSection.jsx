import React from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeCanvas from './GlobeCanvas';

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section id="hero" className="relative overflow-hidden bg-[#070b14] min-h-[calc(100vh-140px)] flex-1 flex items-center justify-center border-b border-slate-800">
      {/* Pristine Background Image - 100% Free of Words & Labels */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center opacity-90 z-0"
        style={{ backgroundImage: "url('/hero-clean-panoramic-v4.jpg?v=4')" }}
      />

      {/* Cinematic Gradient Overlays for High Contrast & Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/40 to-[#070b14]/60 z-0 pointer-events-none" />

      {/* Live Animated Radar Telemetry Canvas */}
      <GlobeCanvas />

      {/* Hero Content */}
      <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center flex flex-col items-center">
        {/* FarmIntelytics Logo with Crisp White Background */}
        <div className="mb-6">
          <div className="inline-block p-2.5 sm:p-3 bg-white rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] border border-white/30 transform hover:scale-105 transition-transform duration-300">
            <img
              src="/farmintelytics-logo.png?v=6"
              alt="FarmIntelytics"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-xl"
              width="96"
              height="96"
            />
          </div>
        </div>

        {/* Title and Branding */}
        <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-3 drop-shadow-md">
          FarmIntelytics
        </h1>
        <p className="text-xl sm:text-2xl font-semibold text-emerald-400 mb-6 tracking-wide drop-shadow">
          Powered by Earthintelytics
        </p>

        {/* Description */}
        <p className="max-w-2xl text-base sm:text-lg text-slate-200 leading-relaxed font-normal mb-10 drop-shadow">
          Real-time satellite intelligence for farms, estates, and agricultural lands. Track crop health and growth, get smart irrigation and moisture advice, verify EUDR deforestation compliance, and evaluate land suitability, all in one clear, easy-to-use platform.
        </p>

        {/* Central Primary Sign In Button */}
        <button
          id="hero-primary-sign-in"
          onClick={() => navigate('/login')}
          className="px-12 py-4 rounded-xl text-base font-bold text-slate-950 bg-white hover:bg-slate-100 shadow-[0_0_35px_rgba(255,255,255,0.35)] hover:shadow-[0_0_45px_rgba(255,255,255,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          Sign in
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
