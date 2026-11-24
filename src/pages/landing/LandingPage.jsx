import LandingNav from './components/LandingNav';
import HeroSection from './components/HeroSection';
import PhotoStrip from './components/PhotoStrip';
import LandingStory from './components/LandingStory';
import LandingFooter from './components/LandingFooter';

/** Public front page: the satellite hero, farm photos, the people it is for, how it flows, what it does, who uses it, the API.
 * The Buddy app is offered by "Get the app" in the menu and the hero (a direct download). */
const LandingPage = () => (
  <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
    <LandingNav />
    <HeroSection />
    <PhotoStrip />
    <LandingStory />
    <LandingFooter />
  </div>
);

export default LandingPage;
