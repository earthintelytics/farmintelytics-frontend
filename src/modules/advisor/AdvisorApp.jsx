import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUp, Bell, FileText, MessageSquare, Plus, Download, LogOut, RefreshCw } from 'lucide-react';
import { serviceCall } from '../../services/serviceClient';
import { API_BASE } from '../../services/apiBase';
import { tenantKey } from '../../services/session';
import { sessionTenant } from '../../routes/paths';

/**
 * Farm advisor: a phone-first expert for this one farm. Ask questions (answers come only from this
 * organisation's data), read its advisories, and make or download reports. No maps on purpose.
 */
const CHAT_KEY = 'fi_advisor_chat';
const readChat = () => { try { return JSON.parse(localStorage.getItem(tenantKey(CHAT_KEY)) || '[]'); } catch { return []; } };
const saveChat = (m) => { try { localStorage.setItem(tenantKey(CHAT_KEY), JSON.stringify(m.slice(-40))); } catch { /* storage unavailable */ } };

// Plain text with **bold**, "- " bullets and line breaks: no HTML is ever injected.
function RichText({ text }) {
  const blocks = String(text || '').split(/\n{2,}/);
  const inline = (s, k) => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={`${k}-${i}`}>{part.slice(2, -2)}</strong> : <span key={`${k}-${i}`}>{part}</span>);
  return blocks.map((b, bi) => {
    const lines = b.split('\n').filter(Boolean);
    if (lines.length && lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
      return <ul key={bi} className="list-disc pl-5 space-y-1">{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''), `${bi}-${li}`)}</li>)}</ul>;
    }
    return <p key={bi}>{lines.map((l, li) => <span key={li}>{inline(l.replace(/^#+\s*/, ''), `${bi}-${li}`)}{li < lines.length - 1 && <br />}</span>)}</p>;
  });
}

const TABS = [
  { id: 'ask', label: 'Ask', icon: MessageSquare },
  { id: 'advisories', label: 'Advisories', icon: Bell },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export default function AdvisorApp({ onBack, onSignOut }) {
  const [tab, setTab] = useState('ask');
  const [prefill, setPrefill] = useState('');
  const org = sessionTenant();
  return (
    <div className="h-[100dvh] flex flex-col bg-white text-gray-900">
      <header className="shrink-0 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Back to your services" className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"><ArrowLeft size={20} /></button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base font-semibold leading-tight">Farm advisor</h1>
            <p className="text-xs text-gray-500 truncate">Answers from {org ? `${org}'s` : 'your'} farm data only</p>
          </div>
          <nav className="hidden sm:flex gap-1" aria-label="Advisor sections">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === t.id ? 'bg-green-50 text-green-800' : 'text-gray-600 hover:bg-gray-100'}`}>{t.label}</button>
            ))}
          </nav>
          <button type="button" onClick={onSignOut} aria-label="Sign out" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        {tab === 'ask' && <AskTab prefill={prefill} onPrefillUsed={() => setPrefill('')} />}
        {tab === 'advisories' && <AdvisoriesTab onAsk={(q) => { setPrefill(q); setTab('ask'); }} />}
        {tab === 'reports' && <ReportsTab />}
      </main>

      {/* Phone: tabs at the bottom, within thumb reach */}
      <nav className="sm:hidden shrink-0 border-t border-gray-200 grid grid-cols-3 pb-[env(safe-area-inset-bottom)]" aria-label="Advisor sections">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium ${tab === id ? 'text-green-800' : 'text-gray-500'}`}>
            <Icon size={20} />{label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function AskTab({ prefill, onPrefillUsed }) {
  const [messages, setMessages] = useState(readChat);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const endRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    serviceCall('/advisor/suggestions').then((d) => setSuggestions(d?.suggestions || [])).catch(() => setSuggestions([]));
  }, []);
  useEffect(() => { saveChat(messages); endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);
  useEffect(() => {
    if (prefill) { setInput(prefill); onPrefillUsed(); boxRef.current?.focus(); }
  }, [prefill, onPrefillUsed]);
  useEffect(() => {  // grow the box with its text, up to a few lines
    const el = boxRef.current; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const send = useCallback(async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })).slice(-8);
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput(''); setBusy(true);
    try {
      const r = await serviceCall('/chat/ask', { method: 'POST', body: { message: q, history } });
      setMessages((m) => [...m, { role: 'assistant', content: r?.response || 'No answer came back.', sources: r?.sources || [] }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', error: true, content: e?.message && e.status ? `Could not answer: ${e.message}` : 'No connection. Your question is kept; try again when you are back online.' }]);
    } finally { setBusy(false); }
  }, [input, busy, messages]);

  const empty = messages.length === 0;
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {empty ? (
            <div className="pt-6 sm:pt-12 space-y-6">
              <div>
                <h2 className="font-display text-2xl font-semibold">Ask about your farm</h2>
                <p className="text-sm text-gray-500 mt-1">Crop condition, water, alerts, what to do this week. Answers use your farm's satellite readings, alerts, field visits and farm data, and say how recent they are.</p>
              </div>
              {suggestions.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)}
                      className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100">{s}</button>
                  ))}
                </div>
              )}
            </div>
          ) : messages.map((m, i) => (
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-100 px-4 py-2.5 text-[15px] whitespace-pre-wrap">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="space-y-2">
                <div className={`text-[15px] leading-relaxed space-y-3 ${m.error ? 'text-red-700' : 'text-gray-900'}`}><RichText text={m.content} /></div>
                {m.sources?.length > 0 && <p className="text-xs text-gray-400">From: {m.sources.join(' · ')}</p>}
              </div>
            )
          ))}
          {busy && <div className="flex gap-1 py-2" aria-label="Thinking"><span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" /><span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:120ms]" /><span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:240ms]" /></div>}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {!empty && suggestions.length > 0 && !busy && (
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:none]">
              {suggestions.slice(0, 4).map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50">{s}</button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 rounded-2xl border border-gray-300 px-3 py-2 focus-within:border-green-700">
            {!empty && (
              <button type="button" onClick={() => { setMessages([]); saveChat([]); }} aria-label="New conversation" title="New conversation" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><Plus size={18} /></button>
            )}
            <textarea ref={boxRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 640px)').matches) { e.preventDefault(); send(); } }}
              placeholder="Ask about your farm" aria-label="Your question"
              className="flex-1 resize-none bg-transparent outline-none text-[16px] py-1.5 max-h-40" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Send"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--brand-primary)] text-white disabled:bg-gray-200 disabled:text-gray-400"><ArrowUp size={18} /></button>
          </form>
          <p className="text-[11px] text-gray-400 mt-1.5 text-center">The advisor can be wrong. Check important decisions in the field.</p>
        </div>
      </div>
    </div>
  );
}

const SEVERITY = { Critical: ['Act now', 'border-red-200 bg-red-50 text-red-800'], Warning: ['Watch', 'border-amber-200 bg-amber-50 text-amber-800'] };

function AdvisoriesTab({ onAsk }) {
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    serviceCall('/alerts').then((d) => setFeed(Array.isArray(d) ? d : d?.feed || [])).catch((e) => { setFeed([]); setError(e?.message || 'Could not load advisories'); });
  }, []);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect
  const ordered = useMemo(() => [...(feed || [])].sort((a, b) => (a.severity === 'Critical' ? 0 : 1) - (b.severity === 'Critical' ? 0 : 1)), [feed]);
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Advisories</h2>
            <p className="text-sm text-gray-500 mt-1">What needs attention on the farm, most urgent first.</p>
          </div>
          <button type="button" onClick={load} aria-label="Refresh" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"><RefreshCw size={18} /></button>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {feed === null ? <p className="text-sm text-gray-500">Loading…</p> : ordered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium">Nothing needs attention right now.</p>
            <p className="text-sm text-gray-500 mt-1">Advisories appear here when a satellite run finds a problem in a block.</p>
          </div>
        ) : ordered.map((a) => {
          const [label, cls] = SEVERITY[a.severity] || ['Note', 'border-gray-200 bg-gray-50 text-gray-700'];
          return (
            <article key={a.alert_id || `${a.plot_id}-${a.type}`} className="rounded-xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
                <span className="text-sm font-semibold">{a.type}</span>
                <span className="text-xs text-gray-500 ml-auto">{a.timestamp ? new Date(a.timestamp).toLocaleDateString() : ''}</span>
              </div>
              <p className="text-sm text-gray-700">{a.message}</p>
              <button type="button" onClick={() => onAsk(`What should I do about "${a.type}" in block ${a.plot_id}?`)}
                className="text-sm font-medium text-green-800 hover:underline">Ask the advisor about this</button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

async function downloadPdf(id, title) {
  const res = await fetch(`${API_BASE}/reports/${encodeURIComponent(id)}/pdf`, { headers: { Authorization: `Bearer ${localStorage.getItem('fi_token') || ''}` } });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = `${(title || 'farm-report').replace(/[^\w-]+/g, '-')}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function ReportsTab() {
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => {
    serviceCall('/reports').then((d) => setList(Array.isArray(d) ? d : d?.items || d?.reports || [])).catch(() => setList([]));
  }, []);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect
  const create = async () => {
    setBusy(true); setMsg('');
    try {
      await serviceCall('/reports', { method: 'POST', body: { type: 'monthly', scope: { level: 'organisation' } } });
      setMsg('Report ready.'); load();
    } catch (e) { setMsg(e?.message || 'Could not make the report.'); } finally { setBusy(false); }
  };
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold">Reports</h2>
          <p className="text-sm text-gray-500 mt-1">A short farm report from your latest data, ready to share as a PDF.</p>
        </div>
        <button type="button" onClick={create} disabled={busy}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-60">
          <FileText size={16} />{busy ? 'Making the report…' : "Make this month's report"}
        </button>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
        {list === null ? <p className="text-sm text-gray-500">Loading…</p> : list.length === 0 ? (
          <p className="text-sm text-gray-500">No reports yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
            {list.map((r) => (
              <li key={r.report_id || r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.title || 'Farm report'}</p>
                  <p className="text-xs text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : r.period?.from ? `${r.period.from} – ${r.period.to}` : ''}</p>
                </div>
                <button type="button" onClick={() => downloadPdf(r.report_id || r.id, r.title).catch((e) => setMsg(e.message))}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"><Download size={15} />PDF</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
