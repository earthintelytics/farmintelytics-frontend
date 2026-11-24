/**
 * The GWON Assistant: ask about what the platform shows. The question goes with the page's own figures (states,
 * areas, climate, registry) to POST /public/platforms/gwon/ask, which answers from those figures only.
 */
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquareText, Send } from 'lucide-react';
import { API_BASE } from '../../services/apiBase';

const STARTERS = [
  'Which frontline state had the least rain this year compared with last year?',
  'Where should the Agency look first for drought stress on new plantings?',
  'How large are the frontline states, and which is the biggest?',
  'What does GWON need to report land cover change for the Results Framework?',
];

export default function Assistant({ facts, module, compact = false }) {
  const [q, setQ] = useState('');
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);

  const ask = async (question) => {
    const text = (question ?? q).trim();
    if (!text || busy) return;
    setBusy(true); setQ('');
    setLog((l) => [...l, { role: 'you', text }]);
    try {
      const res = await fetch(`${API_BASE}/public/platforms/gwon/ask`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, module, facts }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.message || 'The Assistant could not answer just now.');
      setLog((l) => [...l, { role: 'assistant', text: data.answer, follow: data.follow_ups || [] }]);
    } catch (e) {
      setLog((l) => [...l, { role: 'assistant', text: e.message, error: true }]);
    }
    setBusy(false);
  };

  const last = log[log.length - 1];
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white ${compact ? '' : 'min-h-[420px]'} flex flex-col`}>
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-[#ECFDF8] text-[#0F766E] flex items-center justify-center"><MessageSquareText size={16} /></span>
        <div>
          <p className="text-sm font-semibold text-gray-900">GWON Assistant</p>
          <p className="text-xs text-gray-500">Answers from the figures on this platform only, with where each comes from.</p>
        </div>
      </div>
      <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[520px]">
        {log.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {STARTERS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="text-left rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 hover:border-[#0F766E] hover:bg-[#F3FBF8]">{s}</button>
            ))}
          </div>
        )}
        {log.map((m, i) => (
          <div key={i} className={m.role === 'you' ? 'flex justify-end' : ''}>
            <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[92%] ${m.role === 'you' ? 'bg-[#0F766E] text-white' : m.error ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-gray-50 border border-gray-200 text-gray-800'}`}>
              {m.role === 'you' ? m.text : <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-gray-500">Reading the figures…</p>}
        {last?.follow?.length > 0 && !busy && (
          <div className="flex flex-wrap gap-2">
            {last.follow.map((f) => <button key={f} type="button" onClick={() => ask(f)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-[#0F766E]">{f}</button>)}
          </div>
        )}
      </div>
      <form className="p-3 border-t border-gray-100 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={600} placeholder="Ask about the frontline states, the climate or the registered sites"
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#0F766E]" />
        <button type="submit" disabled={busy || !q.trim()} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F766E] text-white text-sm font-semibold disabled:opacity-50"><Send size={15} /> Ask</button>
      </form>
    </div>
  );
}
