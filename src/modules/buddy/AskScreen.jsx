// Ask: the main screen. A talk with the farm advisor; type, or tap the microphone and speak: the words
// are typed into the box as they are heard, and the farmer checks them and presses send. Each answer is
// shown and read aloud where the phone has a voice for the language.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SendHorizontal } from 'lucide-react';
import ChatBubble from './ChatBubble';
import MicButton from './MicButton';
import { useListen } from './useListen';
import { readAloudNote } from './useReadAloud';
import { btnPrimary, inputBox, muted } from './ui';

export default function AskScreen({ chat, language, voice, person, photo }) {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = location.state?.prefill || '';
  const [text, setText] = useState(prefill);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  // What was said goes into the box (after anything already typed); it is sent only with the send button.
  const listen = useListen({ language, onText: (heard) => setText((t) => (t.trim() ? `${t.trimEnd()} ` : '') + heard) });
  const shown = listen.listening && listen.heard ? (text.trim() ? `${text.trimEnd()} ` : '') + listen.heard : text;

  // "Ask about this" from an alert opens here with the question written in; the farmer sends it.
  useEffect(() => {
    if (!prefill) return;
    inputRef.current?.focus();
    navigate(location.pathname, { replace: true, state: null });
  }, [prefill, navigate, location.pathname]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [chat.messages.length, chat.busy]);

  const send = (e) => {
    e?.preventDefault();
    if (!text.trim() || chat.busy) return;
    voice.stop();
    chat.ask(text);
    setText('');
  };

  const note = readAloudNote(voice.availability(language), language);

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-4" aria-live="polite">
        {chat.messages.length === 0 && (
          <div className="space-y-3 pt-1">
            {photo && <img src={photo} alt="" className="w-full h-40 object-cover rounded-2xl border border-[var(--border-light)]" />}
            <h2 className="font-display text-xl font-semibold">{person ? `Hello, ${person}. ` : ''}Ask about your farm</h2>
            <p className={`text-base ${muted}`}>
              Type your question{listen.supported ? ', or tap the button below and speak' : ''}. The answer is shown in {language.label}{note ? '' : ' and read aloud'}.
            </p>
            {note && <p className={`text-[15px] ${muted}`}>{note}</p>}
          </div>
        )}
        {chat.messages.map((m) => <ChatBubble key={m.id} message={m} voice={voice} onRetry={chat.retry} />)}
        {chat.busy && <p className={`text-base ${muted}`} role="status">The advisor is thinking…</p>}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 border-t border-[var(--border-light)] bg-white px-4 pt-3 pb-3 space-y-3">
        {listen.listening && !listen.heard && <p className="text-base min-h-[24px]" role="status">Speak now…</p>}
        {!listen.listening && listen.error && <p className="text-[15px] text-[var(--status-critical)]" role="alert">{listen.error}</p>}
        <form onSubmit={send} className="flex items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">Your question</span>
            <textarea ref={inputRef} rows={2} value={shown} readOnly={listen.listening} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
              placeholder="Type your question" className={`${inputBox} resize-none max-h-32`} />
          </label>
          <button type="submit" disabled={!text.trim() || chat.busy || listen.listening} className={`${btnPrimary} px-4 shrink-0`} aria-label="Send">
            <SendHorizontal size={22} aria-hidden="true" />
          </button>
        </form>
        {listen.supported && <MicButton listen={listen} disabled={chat.busy} onBeforeStart={voice.stop} />}
      </div>
    </>
  );
}
