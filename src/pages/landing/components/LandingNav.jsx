import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Smartphone, X } from 'lucide-react';
import { useBuddyApp } from './useBuddyApp';

const LandingNav = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const app = useBuddyApp();
  // "API" opens the Swagger reference, the API's default page (the developer guide is /developers).
  const openApiDocs = () => { setMobileMenuOpen(false); window.location.assign('/public-api/v1/docs'); };
  const goApp = () => {
    setMobileMenuOpen(false);
    const el = document.getElementById('get-the-app');
    if (el) { window.history.replaceState(null, '', '/#get-the-app'); el.scrollIntoView({ behavior: 'smooth' }); }
    else window.location.assign('/#get-the-app');
  };

  const handleNav = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 text-slate-800 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer" onClick={() => handleNav('/')}>
            <div className="p-0.5 bg-white rounded-none shadow-sm border border-slate-200/80 flex items-center justify-center">
              <img
                src="/farmintelytics-logo.png?v=7"
                alt="FarmIntelytics"
                className="h-7 sm:h-8 w-auto object-contain rounded-none block"
              />
            </div>
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900">
              FarmIntelytics
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button onClick={() => handleNav('/trust')} className="hover:text-[var(--brand-primary)] transition-colors">
              Trust centre
            </button>
            <button onClick={() => handleNav('/policies')} className="hover:text-[var(--brand-primary)] transition-colors">
              Policies
            </button>
            <button onClick={() => handleNav('/docs')} className="hover:text-[var(--brand-primary)] transition-colors">
              Guide
            </button>
            <button onClick={() => openApiDocs()} className="hover:text-[var(--brand-primary)] transition-colors">
              API
            </button>
            <button onClick={() => handleNav('/contact')} className="hover:text-[var(--brand-primary)] transition-colors">
              Contact
            </button>
          </nav>
        </div>

        {/* Right Section: Desktop Sign In & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {app && (
            <button type="button" onClick={goApp}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#D8EBD3] bg-[#EEF6EC] px-3.5 py-1.5 text-sm font-semibold text-[var(--brand-primary-dark)] hover:bg-[#E2F0DE] transition-colors">
              <Smartphone size={15} />Get the app
            </button>
          )}
          <button
            id="top-nav-sign-in"
            onClick={() => handleNav('/login')}
            className="text-sm font-semibold text-slate-800 hover:text-[var(--brand-primary)] transition-colors px-3 py-1.5 cursor-pointer bg-transparent border-0 active:scale-95"
          >
            Sign in
          </button>

          {/* Mobile Hamburger Button */}
          <button
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded focus:outline-none transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 pt-2 pb-4 ">
          <nav className="flex flex-col space-y-1 text-sm font-medium text-slate-700">
            <button
              onClick={() => handleNav('/trust')}
              className="text-left py-2.5 px-3 hover:bg-slate-50 hover:text-[var(--brand-primary)] rounded transition-colors"
            >
              Trust centre
            </button>
            <button
              onClick={() => handleNav('/policies')}
              className="text-left py-2.5 px-3 hover:bg-slate-50 hover:text-[var(--brand-primary)] rounded transition-colors"
            >
              Policies
            </button>
            <button
              onClick={() => handleNav('/docs')}
              className="text-left py-2.5 px-3 hover:bg-slate-50 hover:text-[var(--brand-primary)] rounded transition-colors"
            >
              Guide
            </button>
            <button
              onClick={() => openApiDocs()}
              className="text-left py-2.5 px-3 hover:bg-slate-50 hover:text-[var(--brand-primary)] rounded transition-colors"
            >
              API
            </button>
            <button
              onClick={() => handleNav('/contact')}
              className="text-left py-2.5 px-3 hover:bg-slate-50 hover:text-[var(--brand-primary)] rounded transition-colors"
            >
              Contact
            </button>
            {app && (
              <button onClick={goApp} className="text-left py-2.5 px-3 rounded inline-flex items-center gap-2 font-semibold text-[var(--brand-primary-dark)] hover:bg-[#EEF6EC]">
                <Smartphone size={16} />Get the app
              </button>
            )}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => handleNav('/login')}
                className="w-full text-center py-2.5 px-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-bold rounded shadow-sm transition-colors"
              >
                Sign in
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default LandingNav;
