import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';

/**
 * "How this works": a plain guide at the top of a page, closed by default, opened with one click.
 * `guide` is { title?, intro?, sections: [{ title, points: [text | [what, meaning]] }], example?: { title, lines: [text] } }.
 */
export default function GuidePanel({ guide, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!guide) return null;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left">
        <BookOpen size={18} className="text-[var(--brand-primary,#15803d)] shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block font-display text-base font-semibold text-gray-900">{guide.title || 'How this works'}</span>
          {guide.intro && <span className="block text-sm text-gray-500 mt-0.5">{guide.intro}</span>}
        </span>
        <span className="text-sm font-semibold text-gray-600 shrink-0 hidden sm:inline">{open ? 'Hide' : 'Read'}</span>
        <ChevronDown size={18} className={`text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-6">
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {guide.sections.map((s, i) => (
              <section key={s.title}>
                <h4 className="text-sm font-semibold text-gray-900"><span className="font-mono text-gray-400 mr-2">{i + 1}</span>{s.title}</h4>
                <ul className="mt-2 space-y-1.5 text-sm text-gray-700 leading-relaxed">
                  {s.points.map((p) => (
                    <li key={Array.isArray(p) ? p[0] : p} className="pl-3 border-l-2 border-gray-100">
                      {Array.isArray(p) ? <><span className="font-semibold text-gray-900">{p[0]}: </span>{p[1]}</> : p}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {guide.example && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-xs font-semibold text-gray-500">{guide.example.title}</p>
              <ol className="mt-1.5 space-y-1 text-sm text-gray-800 list-decimal pl-5">
                {guide.example.lines.map((l) => <li key={l}>{l}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
