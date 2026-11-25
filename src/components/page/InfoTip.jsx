/**
 * The (i) used across the portal: hover or focus it to read what a figure or control means. Keyboard reachable,
 * read by screen readers (aria-label), never hides the page behind it.
 */
import { Info } from 'lucide-react';

export default function InfoTip({ text, side = 'top', className = '' }) {
  const pos = side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';
  return (
    <span className={`relative inline-flex align-middle group ${className}`} tabIndex={0} aria-label={text}>
      <Info size={14} className="text-gray-400 group-hover:text-[var(--brand-primary)] group-focus:text-[var(--brand-primary)]" />
      <span role="tooltip"
        className={`pointer-events-none invisible group-hover:visible group-focus:visible absolute left-1/2 -translate-x-1/2 ${pos} w-64 rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-normal leading-relaxed text-gray-700 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity z-[1200]`}>
        {text}
      </span>
    </span>
  );
}
