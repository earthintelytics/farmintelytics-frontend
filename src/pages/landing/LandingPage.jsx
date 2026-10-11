import React from 'react';
import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import LandingFooter from './components/LandingFooter';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Top Header Navigation Bar ────────────────────────────────────────── */}
      <LandingNav />

      {/* ── Main Panoramic Hero Section ──────────────────────────────────────── */}
      <HeroSection />

      {/* ── Bottom Global Footer Bar ─────────────────────────────────────────── */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
