import { useState } from 'react';
import { Info, X } from 'lucide-react';

/**
 * The (i) at the top of a window where a decision is made. A click opens a plain explanation
 * of each choice in the window. `help` is { intro?, items: [[what, meaning], ...] }.
 */
export function useModalHelp(help) {
  const [open, setOpen] = useState(false);
  if (!help) return { button: null, panel: null };
  const button = (
    <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="What does this mean?" title="What does this mean?"
      className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border text-gray-500 hover:text-gray-900 hover:border-gray-400 ${open ? 'border-green-600 text-green-700' : 'border-gray-300'}`}>
      <Info size={15} />
    </button>
  );
  const panel = open ? (
    <div role="note" className="relative rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
      <button type="button" onClick={() => setOpen(false)} aria-label="Close the explanation" className="absolute top-2 right-2 p-1 rounded text-sky-700 hover:text-sky-950"><X size={14} /></button>
      {help.intro && (
        <>
          <p className="text-xs font-semibold text-sky-800 pr-6">What this is for</p>
          <p className="pr-6 mt-0.5">{help.intro}</p>
        </>
      )}
      {help.items?.length > 0 && (
        <>
        <p className="text-xs font-semibold text-sky-800 mt-3">What each part does</p>
        <dl className="space-y-1.5 pr-4 mt-1">
          {help.items.map(([what, meaning]) => (
            <div key={what}><dt className="inline font-semibold">{what}: </dt><dd className="inline">{meaning}</dd></div>
          ))}
        </dl>
        </>
      )}
    </div>
  ) : null;
  return { button, panel };
}
