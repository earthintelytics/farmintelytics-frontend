import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Plus } from 'lucide-react';
import AiAnswer from './AiAnswer';
import AiAnswerActions from './AiAnswerActions';
import AiFollowUps from './AiFollowUps';
import AiThinking from './AiThinking';
import QuestionsICanAnswer from './QuestionsICanAnswer';

/**
 * The one chat every advisor uses (the crop dashboards' Assistant, the advisor app, the suitability AI): the
 * person's questions in grey on the right, answers across the full width with Copy / Save as PDF and the
 * next questions as buttons; "Questions I can answer" by topic; a question box that grows with its text.
 * Before the first question it shows `intro`, the questions by topic and `extra` (what-if cards).
 *
 * messages: [{ role: 'user' | 'assistant', text, followUps?, error? }]
 */
export default function AdvisorChat({
  messages, busy, onAsk, onNew, groups, suggestions, about = '', thinkingKind = 'farm',
  intro = null, extra = null, placeholder = 'Ask about your farm', hideInput = false, prefill = '',
}) {
  const [input, setInput] = useState(prefill || '');
  const [lastPrefill, setLastPrefill] = useState(prefill);
  const endRef = useRef(null);
  const boxRef = useRef(null);
  const empty = messages.length === 0;
  // A question handed in from elsewhere (an advisory's "Ask about this") goes into the box once.
  if (prefill !== lastPrefill) {
    setLastPrefill(prefill);
    if (prefill) setInput(prefill);
  }

  useEffect(() => { if (prefill) boxRef.current?.focus(); }, [prefill]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);
  useEffect(() => {  // grow the box with its text, up to a few lines
    const el = boxRef.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    onAsk(q);
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-white">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {empty ? (
            <div className="space-y-8 sm:pt-4">
              {intro}
              <QuestionsICanAnswer groups={groups} questions={suggestions} onAsk={send} disabled={busy} asList />
              {extra}
            </div>
          ) : messages.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-100 px-4 py-2.5 text-[15px] whitespace-pre-wrap break-words">{m.text}</div>
              </div>
            ) : (
              <div key={i} className="space-y-2 min-w-0">
                <div className={`text-[15px] leading-relaxed ${m.error ? 'text-red-700' : 'text-gray-900'}`}><AiAnswer text={m.text} /></div>
                {!m.error && <AiAnswerActions text={m.text} question={messages[i - 1]?.text} about={about} />}
                {i === messages.length - 1 && !busy && <AiFollowUps questions={m.followUps} onAsk={send} />}
              </div>
            )
          ))}
          {busy && <AiThinking kind={thinkingKind} />}
          <div ref={endRef} />
        </div>
      </div>

      {!hideInput && (
        <div className="shrink-0 border-t border-gray-100 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {!empty && <QuestionsICanAnswer groups={groups} questions={suggestions} onAsk={send} disabled={busy} />}
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 rounded-2xl border border-gray-300 px-3 py-2 focus-within:border-green-700">
              {!empty && onNew && (
                <button type="button" onClick={onNew} aria-label="New conversation" title="New conversation" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><Plus size={18} /></button>
              )}
              <textarea ref={boxRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 640px)').matches) { e.preventDefault(); send(); } }}
                placeholder={placeholder} aria-label="Your question"
                className="flex-1 min-w-0 resize-none bg-transparent outline-none text-[16px] py-1.5 max-h-40" />
              <button type="submit" disabled={!input.trim() || busy} aria-label="Send"
                className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center bg-[var(--brand-primary)] text-white disabled:bg-gray-200 disabled:text-gray-400"><ArrowUp size={18} /></button>
            </form>
            <p className="text-[11px] text-gray-400 mt-1.5 text-center">The advisor can be wrong. Check important decisions in the field.</p>
          </div>
        </div>
      )}
    </div>
  );
}
