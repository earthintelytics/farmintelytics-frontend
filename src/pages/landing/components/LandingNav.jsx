import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingNav = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src="/farmintelytics-logo.png"
              alt="FarmIntelytics"
              className="h-9 w-9 object-contain"
              width="36"
              height="36"
            />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              FarmIntelytics
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button onClick={() => navigate('/privacy')} className="hover:text-slate-900 transition-colors">
              Privacy
            </button>
            <button onClick={() => navigate('/trust')} className="hover:text-slate-900 transition-colors">
              Trust Center
            </button>
            <button onClick={() => navigate('/legal')} className="hover:text-slate-900 transition-colors">
              Legal
            </button>
            <button onClick={() => navigate('/docs')} className="hover:text-slate-900 transition-colors">
              Docs
            </button>
            <button onClick={() => navigate('/contact')} className="hover:text-slate-900 transition-colors">
              Contact
            </button>
          </nav>
        </div>

        <div>
          <button
            id="top-nav-sign-in"
            onClick={() => navigate('/login')}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all active:scale-[0.98]"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};

export default LandingNav;
