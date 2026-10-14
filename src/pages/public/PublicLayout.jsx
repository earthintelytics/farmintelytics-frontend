import LandingNav from '../landing/components/LandingNav';
import LandingFooter from '../landing/components/LandingFooter';
import { GLOSSARY, slug } from './publicGlossary';

/**
 * Frame for every public page: the landing header and footer, white page, one readable column.
 * With `aside`, the page uses the full width: text on the left, a side panel on the right
 * (below the text on phones).
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
          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 max-w-3xl">{children}</div>
            <aside className="lg:sticky lg:top-24 self-start space-y-8">{aside}</aside>
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

/** Side panel for public pages: links to the sections of the page, and the glossary of plain terms. */
export function PageAside({ sections = [], glossary = GLOSSARY }) {
  return (
    <>
      {sections.length > 0 && (
        <nav aria-label="On this page" className="rounded-2xl border border-gray-200 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">On this page</p>
          <ul className="mt-3 space-y-2">
            {sections.map((t) => (
              <li key={t}><a href={`#${slug(t)}`} className="text-sm text-gray-700 hover:text-[var(--brand-primary)]">{t}</a></li>
            ))}
          </ul>
        </nav>
      )}
      {glossary.length > 0 && (
        <div className="rounded-2xl border border-gray-200 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Glossary</p>
          <dl className="mt-3 space-y-3">
            {glossary.map(([term, meaning]) => (
              <div key={term}>
                <dt className="text-sm font-semibold text-gray-900">{term}</dt>
                <dd className="text-sm text-gray-600 leading-snug mt-0.5">{meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </>
  );
}
