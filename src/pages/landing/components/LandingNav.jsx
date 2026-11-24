import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Smartphone, X } from 'lucide-react';
import { paths, sessionTenant } from '../../../routes/paths';
import { hasValidTeamToken } from '../../../services/session';

const LandingNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // The menu item of the page in view is green (desktop: with a green underline; phone: a green row).
  const on = (path) => pathname === path || pathname.startsWith(`${path}/`);
  const deskCls = (path) => `py-1 border-b-2 transition-colors ${on(path) ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] font-semibold' : 'border-transparent hover:text-[var(--brand-primary)]'}`;
  const mobCls = (path) => `text-left py-2.5 px-3 rounded transition-colors ${on(path) ? 'bg-[#EEF6EC] text-[var(--brand-primary-dark)] font-semibold' : 'hover:bg-slate-50 hover:text-[var(--brand-primary)]'}`;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // "Sign in" takes someone already signed in on this browser straight to their dashboard.
  const tenant = sessionTenant();
  const home = tenant ? paths.orgHub(tenant) : hasValidTeamToken() ? paths.teamHub : null;

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
            <img src="/farmintelytics-mark.png" alt="" className="h-8 w-8 sm:h-9 sm:w-9 object-contain block" />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900">
              FarmIntelytics
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button onClick={() => handleNav('/trust')} aria-current={on('/trust') ? 'page' : undefined} className={deskCls('/trust')}>
              Trust centre
            </button>
            <button onClick={() => handleNav('/policies')} aria-current={on('/policies') ? 'page' : undefined} className={deskCls('/policies')}>
              Policies
            </button>
            <button onClick={() => handleNav('/docs')} aria-current={on('/docs') ? 'page' : undefined} className={deskCls('/docs')}>
              Guide
            </button>
            <button onClick={() => handleNav('/pricing')} aria-current={on('/pricing') ? 'page' : undefined} className={deskCls('/pricing')}>
              Pricing
            </button>
            <button onClick={() => handleNav('/developers')} aria-current={on('/developers') ? 'page' : undefined} className={deskCls('/developers')}>
              Developers
            </button>
            <button onClick={() => handleNav('/contact')} aria-current={on('/contact') ? 'page' : undefined} className={deskCls('/contact')}>
              Contact
            </button>
          </nav>
        </div>

        {/* Right Section: Desktop Sign In & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {(
            <a href="/app" onClick={(e) => { e.preventDefault(); handleNav('/app'); }}
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-semibold transition-colors ${on('/app') ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white' : 'border-[#D8EBD3] bg-[#EEF6EC] text-[var(--brand-primary-dark)] hover:bg-[#E2F0DE]'}`}>
              <Smartphone size={15} />Get the app
            </a>
          )}
          <button
            id="top-nav-sign-in"
            onClick={() => handleNav(home || '/login')}
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
              aria-current={on('/trust') ? 'page' : undefined}
              className={mobCls('/trust')}
            >
              Trust centre
            </button>
            <button
              onClick={() => handleNav('/policies')}
              aria-current={on('/policies') ? 'page' : undefined}
              className={mobCls('/policies')}
            >
              Policies
            </button>
            <button
              onClick={() => handleNav('/docs')}
              aria-current={on('/docs') ? 'page' : undefined}
              className={mobCls('/docs')}
            >
              Guide
            </button>
            <button
              onClick={() => handleNav('/pricing')}
              aria-current={on('/pricing') ? 'page' : undefined}
              className={mobCls('/pricing')}
            >
              Pricing
            </button>
            <button
              onClick={() => handleNav('/developers')}
              aria-current={on('/developers') ? 'page' : undefined}
              className={mobCls('/developers')}
            >
              Developers
            </button>
            <button
              onClick={() => handleNav('/contact')}
              aria-current={on('/contact') ? 'page' : undefined}
              className={mobCls('/contact')}
            >
              Contact
            </button>
            {(
              <a href="/app" onClick={(e) => { e.preventDefault(); handleNav('/app'); }} className="text-left py-2.5 px-3 rounded inline-flex items-center gap-2 font-semibold text-[var(--brand-primary-dark)] hover:bg-[#EEF6EC]">
                <Smartphone size={16} />Get the app
              </a>
            )}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => handleNav(home || '/login')}
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
