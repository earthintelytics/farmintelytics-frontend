import { useNavigate } from 'react-router-dom';

const LandingFooter = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-white text-slate-600 text-xs py-2 sm:py-3 border-t border-gray-200 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
        {/* Brand Copyright */}
        <div className="flex items-center gap-2.5">
          <div className="p-0.5 bg-white rounded-none border border-slate-200 flex items-center justify-center">
            <img
              src="/farmintelytics-logo.png?v=7"
              alt="FarmIntelytics"
              className="h-4 sm:h-5 w-auto object-contain rounded-none block"
            />
          </div>
          <span className="font-semibold text-slate-900 text-[11px] sm:text-xs">FarmIntelytics</span>
          <span className="text-slate-400 text-[11px]">© {new Date().getFullYear()} FarmIntelytics / Earthintelytics</span>
        </div>

        {/* Footer Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-medium text-slate-600 text-[11px] sm:text-xs">
          <button onClick={() => navigate('/privacy')} className="hover:text-[var(--brand-primary)] transition-colors">
            Privacy
          </button>
          <button onClick={() => navigate('/trust')} className="hover:text-[var(--brand-primary)] transition-colors">
            Trust centre
          </button>
          <button onClick={() => navigate('/legal')} className="hover:text-[var(--brand-primary)] transition-colors">
            Legal and terms
          </button>
          <button onClick={() => navigate('/docs?topic=api')} className="hover:text-[var(--brand-primary)] transition-colors">
            API docs
          </button>
          <button onClick={() => navigate('/contact')} className="hover:text-[var(--brand-primary)] transition-colors">
            Contact
          </button>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
