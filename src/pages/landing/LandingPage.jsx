import React from 'react';
import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import CapabilitiesSection from './components/CapabilitiesSection';
import CropsSection from './components/CropsSection';
import EudrBanner from './components/EudrBanner';
import LandingFooter from './components/LandingFooter';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Top Header Navigation Bar ────────────────────────────────────────── */}
      <LandingNav />

      {/* ── Main Hero Section with Constellation 3D Globe ───────────────────── */}
      <HeroSection />

      {/* ── Capabilities & 4 Core Geospatial Pillars ─────────────────────────── */}
      <CapabilitiesSection />

      {/* ── Supported 8 Calibrated Crop Ecosystems ──────────────────────────── */}
      <CropsSection />

      {/* ── EUDR Deforestation Compliance Banner ────────────────────────────── */}
      <EudrBanner />

      {/* ── Bottom Global Footer Bar ─────────────────────────────────────────── */}
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
