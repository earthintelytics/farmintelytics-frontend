import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PublicHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { path: '/privacy', label: 'Privacy' },
    { path: '/trust', label: 'Trust Center' },
    { path: '/legal', label: 'Legal' },
    { path: '/docs', label: 'Docs' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-1 bg-white rounded-lg shadow-sm border border-slate-200/80 flex items-center justify-center">
              <img
                src="/farmintelytics-logo.png?v=6"
                alt="FarmIntelytics"
                className="h-7 w-7 object-contain rounded"
                width="28"
                height="28"
              />
            </div>
            <span className="font-display text-base font-bold text-slate-900">
              FarmIntelytics
            </span>
          </div>

          <div className="hidden sm:block h-5 w-px bg-slate-200" />

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft size={14} /> Home
          </button>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600 mr-2">
            {links.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`transition-colors ${
                  location.pathname === link.path
                    ? 'text-emerald-700 font-bold'
                    : 'hover:text-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
