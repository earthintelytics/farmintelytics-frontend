// A panel that slides up from the bottom of the phone (language, menu). White, with a light veil
// over the page behind; tapping the veil or "Close" shuts it.
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { btnQuiet } from './ui';

export default function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-white/80" />
      <div className="relative bg-white border-t border-[var(--border-light)] rounded-t-2xl max-h-[85dvh] overflow-y-auto px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-display text-lg font-semibold text-[var(--text-main)]">{title}</h2>
          <button type="button" onClick={onClose} className={`${btnQuiet} px-3`} aria-label="Close"><X size={22} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
