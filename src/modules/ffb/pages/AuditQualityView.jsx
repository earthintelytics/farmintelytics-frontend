import { useEffect, useState } from 'react';
import { ClipboardCheck, Users, AlertTriangle } from 'lucide-react';
import { API } from '../services/api';
import { fmtNumber } from '../utils/formatters';
import { getEstateScope } from '../utils/access';
import { EstateOptions } from '../components/EstateOptions';

const LEVEL = { high: { label: 'Needs training', bg: '#FEE2E2', fg: '#B91C1C' }, medium: { label: 'Needs a check', bg: '#FEF3C7', fg: '#B45309' }, watch: { label: 'Watch', bg: '#F1F5F9', fg: '#475569' }, ok: { label: 'Fine', bg: '#E8F2E5', fg: '#034321' } };

/** Recorders who often type a different count than the AI (bunches added by hand): who may need extra training. */
function RecorderCoaching() {
  const [days, setDays] = useState(30);
  const [estate, setEstate] = useState(getEstateScope());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    API.fetchRecorderPatterns({ days, estate, onlyFlagged: true })
      .then(d => { if (alive) { setData(d); setError(''); } })
      .catch(e => { if (alive) setError(e.message || 'Could not load.'); });
    return () => { alive = false; };
  }, [days, estate]);

  const rows = data?.recorders || [];
  const select = { height: '40px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600 };

  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Users size={24} style={{ color: '#034321' }} /> Recorders who may need extra training
          </h2>
          <p style={{ margin: '6px 0 0', color: '#0f172a', fontSize: '14px', maxWidth: '760px' }}>
            Every record has the count the AI made from the photo and the count the recorder typed. A recorder who often types a different count,
            or adds bunches by hand, may not be counting from the photo. This is a hint for you, not a decision.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select className="select-input" style={select} value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
          <select className="select-input" style={select} value={estate} onChange={e => setEstate(e.target.value)} disabled={!!getEstateScope()}>
            <EstateOptions allLabel="All Estates" />
          </select>
        </div>
      </div>

      {error && <div style={{ color: '#b91c1c', fontWeight: 700, marginBottom: '12px' }}>{error}</div>}
      {data && <div style={{ fontSize: '13px', color: '#0f172a', marginBottom: '12px' }}>
        <strong>{fmtNumber(data.flagged)}</strong> of {fmtNumber(data.checked)} recorders checked need training · All records counted, whatever their status. {data.rule}
      </div>}

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
          <thead>
            <tr style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a' }}>
              {['Recorder', 'Records compared', 'Typed different', 'Typed higher', 'Average difference', 'Result'].map(h => <th key={h} style={{ padding: '14px 16px' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#0f172a' }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '28px', textAlign: 'center', color: '#034321', fontWeight: 700 }}>No one needs extra training in this period.{data.checked === 0 ? ' (There are not enough records with both counts yet.)' : ''}</td></tr>
            ) : rows.map(r => {
              const l = LEVEL[r.level] || LEVEL.ok;
              return (
                <tr key={r.clerk_id} style={{ borderTop: '1px solid #f1f5f9', fontSize: '14px' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 800 }}>{r.clerk_name || '—'} <span style={{ color: '#0f172a', fontWeight: 600 }}>({r.clerk_id})</span></td>
                  <td style={{ padding: '14px 16px' }}>{fmtNumber(r.records)}</td>
                  <td style={{ padding: '14px 16px' }}>{fmtNumber(r.typed_differs)} ({Math.round(r.differs_share * 100)}%)</td>
                  <td style={{ padding: '14px 16px' }}>{fmtNumber(r.typed_higher)} ({Math.round(r.higher_share * 100)}%)</td>
                  <td style={{ padding: '14px 16px' }}>{r.avg_difference > 0 ? '+' : ''}{r.avg_difference}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '8px', background: l.bg, color: l.fg, fontWeight: 800, fontSize: '12px' }}>
                      {r.needs_training && <AlertTriangle size={12} />}{l.label}
                    </span>
                    {r.reason && <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '6px', maxWidth: '420px' }}>{r.reason}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AIQualityView() {
  return (
    <div className="view-container view-fade-in audit-quality-view" style={{ padding: '40px 0' }}>
      <div className="board-wrapper" style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 32px' }}>
        
        {/* --- Header Section --- */}
        <div className="view-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--clr-brand-primary)', padding: '16px', borderRadius: '12px', color: 'white', boxShadow: '0 12px 24px -8px rgba(3, 67, 33, 0.4)' }}>
              <ClipboardCheck size={32} />
            </div>
            <div>
              <h1 className="view-title" style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.03em', color: '#0f172a' }}>Audit Quality</h1>
              <p className="view-subtitle" style={{ fontSize: '16px', opacity: 0.7, color: '#0f172a' }}>Simulate, analyze, and audit operational data records.</p>
            </div>
          </div>
        </div>

        <RecorderCoaching />

        {/* Shown when nothing else is being audited */}
        <div className="audit-content-area" style={{ 
          background: 'white', 
          borderRadius: '24px', 
          border: '1px solid #e2e8f0', 
          padding: '48px 32px', 
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: '240px'
        }}>
          {/* Emptiness representation */}
          <div style={{ opacity: 0.25, marginBottom: '24px' }}>
            <ClipboardCheck size={72} style={{ color: 'var(--clr-brand-primary)' }} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>No Audits Active</h2>
          <p style={{ fontSize: '15px', color: '#0f172a', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            The audit pipeline is fully clear. Audit reports and records will appear here as they are processed.
          </p>
        </div>

      </div>
    </div>
  );
}
