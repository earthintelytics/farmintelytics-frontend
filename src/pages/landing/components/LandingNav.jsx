import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingNav = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-1 bg-white rounded-lg shadow-sm border border-slate-200/80 flex items-center justify-center">
              <img
                src="/farmintelytics-logo.png?v=6"
                alt="FarmIntelytics"
                className="h-8 w-8 object-contain rounded"
                width="32"
                height="32"
              />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              FarmIntelytics
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button onClick={() => navigate('/privacy')} className="hover:text-emerald-700 transition-colors">
              Privacy
            </button>
            <button onClick={() => navigate('/trust')} className="hover:text-emerald-700 transition-colors">
              Trust Center
            </button>
            <button onClick={() => navigate('/legal')} className="hover:text-emerald-700 transition-colors">
              Legal
            </button>
            <button onClick={() => navigate('/docs')} className="hover:text-emerald-700 transition-colors">
              Docs
            </button>
            <button onClick={() => navigate('/contact')} className="hover:text-emerald-700 transition-colors">
              Contact
            </button>
          </nav>
        </div>

        <div>
          <button
            id="top-nav-sign-in"
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-slate-800 hover:text-emerald-700 transition-colors px-3 py-1.5 cursor-pointer bg-transparent border-0 active:scale-95"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};

export default LandingNav;
