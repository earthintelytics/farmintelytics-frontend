import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import AppDownload from './components/AppDownload';
import LandingFooter from './components/LandingFooter';

/** Public front page: white, plain words, sign in, and the Farm Buddy app download. */
const LandingPage = () => (
  <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
    <LandingNav />
    <HeroSection />
    <AppDownload />
    <LandingFooter />
  </div>
);

export default LandingPage;
