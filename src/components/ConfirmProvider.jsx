import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * The app's confirm dialog: never the browser's own pop-up (owner's rule). Usage:
 *   const confirm = useConfirm();
 *   if (!(await confirm('Issue a new access code?'))) return;
 *   if (!(await confirm('Delete this analysis and its maps?', { typed: true, action: 'Delete' }))) return;
 * With `typed`, the person types a word shown on screen before the button works, so nothing is deleted by
 * a slip of the finger. Resolves true (confirmed) or false (cancelled, Escape, or a click outside).
 */
const WORDS = ['harvest', 'river', 'palm', 'cocoa', 'maize', 'season', 'field', 'rainfall', 'canopy', 'seedling', 'estate', 'meadow'];
const randomWord = () => `${WORDS[Math.floor(Math.random() * WORDS.length)]}${10 + Math.floor(Math.random() * 90)}`;

const ConfirmContext = createContext(null);

function ConfirmDialog({ request, onAnswer }) {
  const [typedText, setTypedText] = useState('');
  const input = useRef(null);
  const ready = !request.typed || typedText.trim().toLowerCase() === request.word;
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onAnswer(false); };
    window.addEventListener('keydown', onKey);
    input.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onAnswer]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/80 p-5" onClick={() => onAnswer(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="fi-confirm-text"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border ${request.typed ? 'bg-red-50 border-red-200 text-[var(--status-critical)]' : 'bg-amber-50 border-amber-200 text-[var(--status-warning)]'}`}>
            <AlertTriangle size={18} aria-hidden="true" />
          </span>
          <p id="fi-confirm-text" className="pt-1.5 text-sm font-semibold text-gray-900 leading-relaxed whitespace-pre-line">{request.message}</p>
        </div>
        {request.typed && (
          <label className="block space-y-2">
            <span className="text-sm text-gray-700">
              This cannot be undone. Type <span className="font-mono font-semibold text-gray-900 select-all">{request.word}</span> to confirm.
            </span>
            <input ref={input} value={typedText} onChange={(e) => setTypedText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && ready) onAnswer(true); }}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-lpignore="true" data-1p-ignore="true"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white font-mono text-sm text-gray-900 outline-none focus:border-[var(--status-critical)]"
              placeholder={request.word} aria-label={`Type ${request.word} to confirm`} />
          </label>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={() => onAnswer(false)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => ready && onAnswer(true)} disabled={!ready}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:bg-gray-200 disabled:text-gray-500 ${request.typed ? 'bg-[var(--status-critical)] hover:bg-red-700' : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]'}`}>
            {request.typed ? `Yes, ${(request.action || 'delete').toLowerCase()}` : (request.action || 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null); // { message, typed, action, word, resolve }
  const confirm = useCallback((message, opts = {}) => new Promise((resolve) => {
    setRequest({ message, typed: Boolean(opts.typed), action: opts.action, word: randomWord(), resolve });
  }), []);
  const answer = useCallback((ok) => {
    setRequest((r) => { r?.resolve(ok); return null; });
  }, []);
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmDialog key={request.word} request={request} onAnswer={answer} />}
    </ConfirmContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm() must be used inside <ConfirmProvider>');
  return ctx;
};
