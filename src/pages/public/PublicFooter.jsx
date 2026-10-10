import React from 'react';
import { useNavigate } from 'react-router-dom';

const PublicFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-white text-slate-600 text-xs py-10 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src="/farmintelytics-logo.png" alt="FarmIntelytics" className="h-6 w-6 object-contain" width="24" height="24" />
          <span className="font-semibold text-slate-900">FarmIntelytics Online</span>
          <span className="text-slate-400">© {new Date().getFullYear()} FarmIntelytics / Earthintelytics</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-slate-600">
          <button onClick={() => navigate('/privacy')} className="hover:text-slate-900 transition-colors">Privacy Policy</button>
          <button onClick={() => navigate('/trust')} className="hover:text-slate-900 transition-colors">Trust Center</button>
          <button onClick={() => navigate('/legal')} className="hover:text-slate-900 transition-colors">Legal & Licensing</button>
          <button onClick={() => navigate('/docs')} className="hover:text-slate-900 transition-colors">API Docs</button>
          <button onClick={() => navigate('/contact')} className="hover:text-slate-900 transition-colors">Contact Support</button>
          <button onClick={() => navigate('/admin-engine')} className="text-slate-400 hover:text-slate-700 transition-colors">Admin Engine</button>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
