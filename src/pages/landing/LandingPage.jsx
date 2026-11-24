import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import PhotoStrip from './components/PhotoStrip';
import LandingStory from './components/LandingStory';
import AppDownload from './components/AppDownload';
import LandingFooter from './components/LandingFooter';

/** Public front page: the satellite hero, the people it is for, how it flows, what it does, who uses it, the API, and the app. */
const LandingPage = () => (
  <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
    <LandingNav />
    <HeroSection />
    <PhotoStrip />
    <LandingStory />
    <AppDownload />
    <LandingFooter />
  </div>
);

export default LandingPage;
