import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Mail, Smartphone } from 'lucide-react';
import { appHref, useBuddyApp } from './useBuddyApp';

/**
 * The footer of every public page: who we are, the services, the company pages, developers, the app, and the
 * small print. Soft green, plain words; links only to pages that exist.
 */
const COLUMNS = [
  { title: 'Services', links: [['Crop health and growth', '/docs'], ['Water and weather', '/docs'], ['EUDR deforestation check', '/docs'], ['Land suitability', '/docs'], ['Farmer groups', '/docs']] },
  { title: 'Company', links: [['Trust centre', '/trust'], ['Policies', '/policies'], ['Guide', '/docs'], ['Contact', '/contact']] },
  { title: 'Developers', links: [['API reference', '/public-api/v1/redoc', true], ['Try it in Swagger', '/public-api/v1/docs', true], ['Developer guide', '/developers']] },
];

const LandingFooter = () => {
  const navigate = useNavigate();
  const app = useBuddyApp();
  const go = (to, external) => (external ? window.open(to, '_blank', 'noopener') : navigate(to));
  return (
    <footer className="shrink-0 bg-[#F5FAF3] border-t border-[#E3EFDF] text-gray-700">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <img src="/farmintelytics-mark.png" alt="" className="h-10 w-10 object-contain" />
            <span className="font-display text-lg font-bold tracking-tight text-gray-900">FarmIntelytics</span>
          </button>
          <p className="mt-4 text-sm leading-relaxed max-w-xs text-gray-600">
            Satellite insight for farms, estates and co-operatives, in plain words. Built by Earthintelytics.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8EBD3] bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 hover:bg-[#EEF6EC]">
              <Mail size={14} />Talk to us
            </button>
            {app && (
              <a href={appHref(app)} download
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8EBD3] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--brand-primary-dark)] hover:bg-[#EEF6EC]">
                <Smartphone size={14} />Get the app
              </a>
            )}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="text-sm font-semibold text-gray-900">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([label, to, external]) => (
                <li key={label}>
                  <button type="button" onClick={() => go(to, external)} className="inline-flex items-center gap-1 text-left text-gray-600 hover:text-[var(--brand-primary)] transition-colors">
                    {label}{external && <ArrowUpRight size={13} />}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-[#E3EFDF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs text-gray-500">
          <span>© {new Date().getFullYear()} FarmIntelytics, a product of Earthintelytics. All rights reserved.</span>
          <span>Contains modified Copernicus Sentinel data · Imagery © Esri, Maxar, Earthstar Geographics</span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
