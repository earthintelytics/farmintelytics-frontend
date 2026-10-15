import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import LandingNav from '../landing/components/LandingNav';
import LandingFooter from '../landing/components/LandingFooter';
import { GLOSSARY, slug } from './publicGlossary';

/**
 * Frame for every public page: the landing header and footer, white page, one readable column.
 * With `aside`, the page uses the full width: a side panel on the left (below the text on phones)
 * and the text on the right.
 */
export default function PublicLayout({ eyebrow, title, intro, children, wide = false, aside = null }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      <LandingNav />
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 ${wide || aside ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {eyebrow && <p className="text-sm font-medium text-[var(--brand-primary)]">{eyebrow}</p>}
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">{title}</h1>
        {intro && <p className="text-base text-gray-600 mt-4 leading-relaxed max-w-2xl">{intro}</p>}
        {aside ? (
          <div className="mt-10 grid gap-12 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="order-last lg:order-first lg:sticky lg:top-24 self-start space-y-6 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2">{aside}</aside>
            <div className="min-w-0 max-w-3xl">{children}</div>
          </div>
        ) : <div className="mt-10">{children}</div>}
      </main>
      <LandingFooter />
    </div>
  );
}

/** A titled block of plain text used by the public pages. */
export function Section({ title, children }) {
  return (
    <section id={slug(title)} className="py-6 border-t border-gray-100 first:border-t-0 first:pt-0 scroll-mt-24">
      <h2 className="font-display text-xl font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

/** Capsule buttons that switch between the sub-pages of a public page. */
export function CapsuleTabs({ tabs, active, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex p-1 rounded-full bg-gray-100 border border-gray-200">
      {tabs.map(({ id, label: text }) => (
        <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => onChange(id)}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${active === id ? 'bg-white text-gray-900 border border-gray-200' : 'text-gray-600 hover:text-gray-900 border border-transparent'}`}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** The section of the page in view, so the side panel can highlight it while reading. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] || null);
  const key = ids.join('|');
  useEffect(() => {
    const els = key.split('|').map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const seen = entries.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top);
      if (seen[0]) setActive(seen[0].target.id);
    }, { rootMargin: '-96px 0px -60% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [key]);
  return active;
}

/**
 * Side panel for public pages, on the left: the sections of the page (the one in view is
 * highlighted; a click scrolls to it) and the glossary (a click opens a term, with a link to the guide).
 */
export function PageAside({ sections = [], glossary = GLOSSARY }) {
  const ids = sections.map(slug);
  const active = useActiveSection(ids);
  const [open, setOpen] = useState(null);
  const go = (e, id) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', '#' + id);
  };
  return (
    <>
      {sections.length > 0 && (
        <nav aria-label="On this page">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-3">On this page</p>
          <ul className="mt-2 space-y-0.5 border-l border-gray-200">
            {sections.map((t, i) => {
              const on = active === ids[i];
              return (
                <li key={t}>
                  <a href={'#' + ids[i]} onClick={(e) => go(e, ids[i])} aria-current={on ? 'location' : undefined}
                    className={'-ml-px block border-l-2 pl-3 pr-2 py-1.5 text-sm transition-colors ' + (on ? 'border-[var(--brand-primary)] text-gray-900 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300')}>
                    {t}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      {glossary.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 px-3">Glossary</p>
          <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200">
            {glossary.map(([term, meaning, topic]) => {
              const isOpen = open === term;
              return (
                <li key={term}>
                  <button type="button" onClick={() => setOpen(isOpen ? null : term)} aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-[var(--bg-subtle)]">
                    {term}<ChevronDown size={15} className={'shrink-0 text-gray-400 transition-transform ' + (isOpen ? 'rotate-180' : '')} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 -mt-0.5">
                      <p className="text-sm text-gray-600 leading-snug">{meaning}</p>
                      {topic && <Link to={'/docs?topic=' + topic} className="mt-1.5 inline-block text-sm font-medium text-[var(--brand-primary)] hover:underline">Read more in the guide →</Link>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
