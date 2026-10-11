import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-white text-slate-600 text-xs py-8 sm:py-10 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand Copyright */}
        <div className="flex items-center gap-3">
          <div className="p-0.5 bg-white rounded-none border border-slate-200 flex items-center justify-center">
            <img
              src="/farmintelytics-logo.png?v=7"
              alt="FarmIntelytics"
              className="h-5 w-auto object-contain rounded-none block"
            />
          </div>
          <span className="font-semibold text-slate-900">FarmIntelytics</span>
          <span className="text-slate-400">© {new Date().getFullYear()} FarmIntelytics / Earthintelytics</span>
        </div>

        {/* Footer Navigation Links with Mobile Touch Padding */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-medium text-slate-600">
          <button onClick={() => navigate('/privacy')} className="hover:text-emerald-700 transition-colors py-1">
            Privacy
          </button>
          <button onClick={() => navigate('/trust')} className="hover:text-emerald-700 transition-colors py-1">
            Trust Center
          </button>
          <button onClick={() => navigate('/legal')} className="hover:text-emerald-700 transition-colors py-1">
            Legal & Terms
          </button>
          <button onClick={() => navigate('/docs')} className="hover:text-emerald-700 transition-colors py-1">
            Documentation
          </button>
          <button onClick={() => navigate('/contact')} className="hover:text-emerald-700 transition-colors py-1">
            Contact Support
          </button>
          <button
            onClick={() => navigate('/admin-engine')}
            className="text-slate-400 hover:text-slate-700 transition-colors py-1"
          >
            Admin Engine
          </button>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
