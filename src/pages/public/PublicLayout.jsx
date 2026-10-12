import LandingNav from '../landing/components/LandingNav';
import LandingFooter from '../landing/components/LandingFooter';

/** Frame for every public page: the landing header and footer, white page, one readable column. */
export default function PublicLayout({ eyebrow, title, intro, children, wide = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      <LandingNav />
      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {eyebrow && <p className="text-sm font-medium text-[var(--brand-primary)]">{eyebrow}</p>}
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">{title}</h1>
        {intro && <p className="text-base text-gray-600 mt-4 leading-relaxed max-w-2xl">{intro}</p>}
        <div className="mt-10">{children}</div>
      </main>
      <LandingFooter />
    </div>
  );
}

/** A titled block of plain text used by the public pages. */
export function Section({ title, children }) {
  return (
    <section className="py-6 border-t border-gray-100 first:border-t-0 first:pt-0">
      <h2 className="font-display text-xl font-semibold text-gray-900">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}
