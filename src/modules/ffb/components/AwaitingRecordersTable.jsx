import { fmtDate, fmtTime } from '../utils/formatters';
import { useMemo, useState } from 'react';
import { usePageScroll } from '../hooks/usePageScroll';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { reconStatus } from '../utils/reconStatus';

const PAGE_SIZE = 10;
const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => String(b.work_date).localeCompare(String(a.work_date)) },
  waiting: { label: 'Waiting longest', fn: (a, b) => String(a.last_load_time || a.work_date).localeCompare(String(b.last_load_time || b.work_date)) },
  amount: { label: 'Most loaded', fn: (a, b) => (b.mode === 'picker' ? b.loader_weight - a.loader_weight : b.loader_count - a.loader_count) }
};
const TABS = [['harvester', 'Harvester'], ['picker', 'Picker']];
// "a, b" -> ['a', 'b']. Recorders are the harvesting (recording) clerks, not the loading clerks.
const ids = (list) => String(list || '').split(',').map(x => x.trim()).filter(Boolean);

// Open button colour = the plot's status colour (same as the map and the summary cards).
const openColour = (status) => reconStatus(status).color;

function waitingFor(iso) {
  if (!iso) return '—';
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

/**
 * Plot-days where the loading clerk has synced but no harvest record exists yet.
 * Harvester (bunches) and Picker (kg) work are separate tabs; 10 rows per page.
 */
export function AwaitingRecordersTable({ rows, onOpen }) {
  const [tab, setTab] = useState('harvester');
  const [page, setPage] = useState(1);
  const topRef = usePageScroll(page);
  const [sort, setSort] = useState('newest');

  const counts = useMemo(() => ({
    harvester: rows.filter(r => r.mode !== 'picker').length,
    picker: rows.filter(r => r.mode === 'picker').length
  }), [rows]);
  const sorted = useMemo(
    () => rows.filter(r => (tab === 'picker') === (r.mode === 'picker')).sort(SORTS[sort].fn),
    [rows, tab, sort]
  );
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const picker = tab === 'picker';

  const td = { padding: '12px 14px', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', color: '#0f172a' };
  const th = { padding: '10px 14px', fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap', background: '#FFFFFF', border: '1px solid #e2e8f0' };
  const num = { textAlign: 'right' };

  return (
    <div ref={topRef} style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px' }}>
        <div role="tablist" style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#FFFFFF' }}>
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => { setTab(key); setPage(1); }}
              style={{
                border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                background: tab === key ? 'var(--clr-brand-primary)' : 'transparent',
                color: tab === key ? '#FFFFFF' : '#334155'
              }}
            >
              {label} <span style={{ opacity: 0.8, fontWeight: 600 }}>({counts[key]})</span>
            </button>
          ))}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0f172a' }}>
          Sort
          <select className="select-input" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} style={{ height: '34px', borderRadius: '8px', fontSize: '13px' }}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #e2e8f0' }}>
          <thead>
            <tr>
              <th style={th}>Plot</th>
              <th style={th}>Date</th>
              <th style={{ ...th, ...num }} title="Recorded by the harvesting clerks">{picker ? 'Kg harvested' : 'Harvested'}</th>
              {!picker && <th style={{ ...th, ...num }}>Rotten</th>}
              {!picker && <th style={{ ...th, ...num }}>Unripe</th>}
              <th style={{ ...th, ...num }} title="Recorded by the loading clerks">{picker ? 'Kg loaded' : 'Loaded'}</th>
              <th style={{ ...th, ...num }} title="Harvesting clerk records (one per scan). Only the bunch totals have to balance, not the number of scans.">Harvest records</th>
              <th style={{ ...th, ...num }} title="Loading clerk records (one per scan).">Load records</th>
              <th style={th}>Harv. Clerk ID</th>
              <th style={th}>Loading Clerk ID</th>
              <th style={th}>Last load</th>
              <th style={th}>Waiting</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={picker ? 11 : 13} style={{ ...td, textAlign: 'center', color: '#0f172a', padding: '24px' }}>No records match the current filters.</td></tr>
            ) : shown.map(p => (
              <tr key={`${p.plot_id}-${p.work_date}-${p.mode}`} onClick={() => onOpen(p.plot_id, p.work_date)} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }} onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                <td style={{ ...td, fontWeight: 500, color: '#0f172a' }}>{p.plot_id}</td>
                <td style={td}>{fmtDate(p.work_date)}</td>
                <td style={{ ...td, ...num, fontWeight: 500, color: '#3F8432' }}>{picker ? `${p.harvester_weight ?? 0} kg` : (p.harvester_count ?? 0)}</td>
                {!picker && <td style={{ ...td, ...num, color: '#b91c1c' }}>{p.harvester_rotten ?? 0}</td>}
                {!picker && <td style={{ ...td, ...num, color: '#b45309' }}>{p.harvester_unripe ?? 0}</td>}
                <td style={{ ...td, ...num, fontWeight: 500, color: '#1d4ed8' }}>{picker ? `${p.loader_weight ?? 0} kg` : (p.loader_count ?? 0)}</td>
                <td style={{ ...td, ...num }}>{p.harvester_records ?? 0}</td>
                <td style={{ ...td, ...num }}>{p.loader_records ?? (p.loads || 0)}</td>
                {/* Clerk ID lists wrap so the Open button stays on screen */}
                <td style={{ ...td, whiteSpace: 'normal', minWidth: '120px' }}>{ids(p.harvesting_clerk_ids).join(', ') || '—'}</td>
                <td style={{ ...td, whiteSpace: 'normal', minWidth: '120px' }}>{ids(p.loading_clerk_ids).join(', ') || '—'}</td>
                <td style={td}>{fmtTime(p.last_load_time)}</td>
                <td style={td}>{waitingFor(p.last_load_time)}</td>
                <td style={{ ...td, padding: '8px 10px' }}>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onOpen(p.plot_id, p.work_date); }}
                    style={{ width: '100%', minWidth: '110px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: openColour(p.status), color: '#FFFFFF', border: 'none', borderRadius: '999px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
                  >
                    Open <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '10px', fontSize: '12px', color: '#0f172a' }}>
        <span>{sorted.length ? `${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, sorted.length)} of ${sorted.length}` : '0 of 0'}</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <button className="pg-btn" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
          <span>Page {current} of {pages}</span>
          <button className="pg-btn" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}
