import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { fmtDate, fmtRole, fmtDateTime, fmtStatusBadge, fmtNumber } from '../utils/formatters';
import { Search } from 'lucide-react';

export function HistoryView() {
  const { filteredData, filters, updateFilters, resetFilters } = useAppContext();

  const groupedOps = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const groups = {};
    sorted.forEach(op => {
      const key = op.created_at ? op.created_at.slice(0, 10) : 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(op);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredData]);

  return (
    <div className="view-container view-fade-in" style={{ padding: '32px' }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">Work History</h1>
          <p className="view-subtitle">Chronological log of all plantation activities</p>
        </div>
      </div>

      <div className="filter-bar" style={{ display:'flex', gap:'12px', alignItems:'center', background:'white', padding:'16px 20px', borderRadius:'12px', border:'1px solid var(--border-subtle)', marginBottom:'24px' }}>
        <div className="filter-bar__search" style={{ flex: 1, position:'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Search size={14} /></span>
          <input
            type="search"
            className="search-input"
            style={{ paddingLeft: '32px', width: '100%', height: '38px' }}
            placeholder="Search worker ID, plot ID…"
            value={filters.search}
            onChange={e => updateFilters({ search: e.target.value })}
          />
        </div>
        <input type="date" className="date-input" style={{ width: '150px', height: '38px' }} value={filters.dateRange.from || ''} onChange={e => updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value || null } })} />
        <input type="date" className="date-input" style={{ width: '150px', height: '38px' }} value={filters.dateRange.to || ''} onChange={e => updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value || null } })} />
        <button className="btn btn--ghost btn--sm" style={{ fontWeight: 500, color: 'var(--clr-brand-secondary)' }} onClick={resetFilters}>Clear</button>
      </div>

      <div style={{ marginBottom: '20px', fontWeight: 500, fontSize: '13px', color: 'var(--text-muted)' }}>
        {filteredData.length} activities
      </div>

      <div className="history-timeline">
        {groupedOps.length === 0 ? (
          <div className="worker-empty-state"><p>No history records found</p></div>
        ) : (
          groupedOps.map(([dateKey, items]) => (
            <div key={dateKey} className="timeline-group" style={{ marginBottom: '32px' }}>
              <div className="timeline-date-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span className="timeline-date-dot" style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--clr-brand-primary)' }}></span>
                <span className="timeline-date-label" style={{ fontWeight: 500, fontSize: '15px', color: 'var(--text-main)' }}>{fmtDate(dateKey)}</span>
                <span className="timeline-date-count" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>{items.length} activities</span>
              </div>
              
              <div className="timeline-items" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '6px', borderLeft: '2px solid var(--border-subtle)', marginLeft: '5px' }}>
                {items.map(op => (
                  <div key={op.id} className="timeline-item" style={{ position: 'relative', paddingLeft: '24px' }}>
                    <div className="timeline-content" style={{ background: 'white', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', boxShadow: 'var(--shadow-panel)' }}>
                      <div className="timeline-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span className="timeline-role" style={{ fontWeight: 500, fontSize: '13px', color: 'var(--clr-brand-primary)', textTransform: 'capitalize' }}>{fmtRole(op.role)}</span>
                        <span className="timeline-time" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>{fmtDateTime(op.created_at)}</span>
                        <div dangerouslySetInnerHTML={{ __html: fmtStatusBadge(op.data_status) }} />
                      </div>
                      
                      <div className="timeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px' }}>
                        <div className="timeline-field">
                          <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Plot</div>
                          <div style={{ fontWeight: 500, fontSize: '13px' }}>Block {op.plot_id || '—'}</div>
                        </div>
                        <div className="timeline-field">
                          <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Harvester</div>
                          <div style={{ fontWeight: 500, fontSize: '13px' }}>{op.worker_id || '—'}</div>
                        </div>
                        <div className="timeline-field">
                          <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Count</div>
                          <div style={{ fontWeight: 500, fontSize: '13px' }}>{fmtNumber(op.total_count)}</div>
                        </div>
                        <div className="timeline-field">
                          <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Weight</div>
                          <div style={{ fontWeight: 500, fontSize: '13px' }}>{fmtNumber(op.weight_kg)} kg</div>
                        </div>
                        <div className="timeline-field">
                          <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Damaged</div>
                          <div style={{ fontWeight: 500, fontSize: '13px', color: op.rotten_count > 0 ? 'var(--clr-error)' : 'inherit' }}>{fmtNumber(op.rotten_count)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
