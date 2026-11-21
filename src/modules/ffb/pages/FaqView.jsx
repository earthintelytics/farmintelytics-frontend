import { useState } from 'react';
import { MessageCircleQuestion, ChevronDown, Search } from 'lucide-react';
import { FAQ } from '../utils/tutorial';

export function FaqView() {
  const [open, setOpen] = useState(0);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const items = FAQ.filter(f => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));

  return (
    <div className="view-container view-fade-in" style={{ padding: '32px', maxWidth: '900px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Help &rsaquo; Common Questions</div>
      <h1 className="view-title" style={{ fontSize: '26px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <MessageCircleQuestion size={28} style={{ color: '#3F8432' }} /> Common Questions
      </h1>
      <p className="view-subtitle" style={{ marginTop: '6px' }}>Short answers to what people ask most.</p>

      <div style={{ position: 'relative', margin: '24px 0' }}>
        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}><Search size={16} /></span>
        <input type="text" className="select-input" placeholder="Search the questions" value={query} onChange={e => setQuery(e.target.value)}
          style={{ width: '100%', height: '44px', border: '1px solid #cbd5e1', borderRadius: '10px', paddingLeft: '40px', fontSize: '14px', fontWeight: 600, boxSizing: 'border-box' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.length === 0 && <div style={{ color: '#0f172a', padding: '16px 0' }}>No question matches. Try another word, or ask the Super Admin.</div>}
        {items.map((f, n) => (
          <div key={f.q} style={{ border: '1px solid #E2E8F0', borderRadius: '12px', background: '#FFFFFF' }}>
            <button onClick={() => setOpen(open === n ? -1 : n)} aria-expanded={open === n}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 18px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '15px', fontWeight: 500, color: '#0F172A' }}>
              {f.q}
              <ChevronDown size={18} style={{ flex: '0 0 auto', transform: open === n ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {open === n && <div style={{ padding: '0 18px 16px', fontSize: '14px', lineHeight: 1.6, color: '#0f172a' }}>{f.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
