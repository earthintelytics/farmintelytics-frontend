import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import LandingFooter from './components/LandingFooter';

/** Public front page: white, plain words, sign in. */
const LandingPage = () => (
  <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
    <LandingNav />
    <HeroSection />
    <LandingFooter />
  </div>
);

export default LandingPage;
