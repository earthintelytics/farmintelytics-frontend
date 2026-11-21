import { useState, useEffect } from 'react';
import { usePageScroll } from '../hooks/usePageScroll';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CONFIG } from '../config';
import { fmtRole, fmtNumber, fmtStatusBadge, fmtDateTime } from '../utils/formatters';

export function Table({ type = 'individual', data = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const topRef = usePageScroll(currentPage);
  const pageSize = CONFIG.PAGE_SIZE;

  // Reset page when data changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [data]);

  const COLS_INDIVIDUAL = [
    { key: 'worker_name', label: 'Worker Name',   render: (v, op) => <strong dangerouslySetInnerHTML={{__html: v || op.worker_id}}></strong> },
    { key: 'role',        label: 'Role',          render: v => <span className={`role-badge role-badge--${(v || '').toLowerCase().replace(' ', '-')}`}>{fmtRole(v)}</span> },
    { key: 'team',        label: 'Team',          render: v => v || '—' },
    { key: 'contractor',  label: 'Contractor',    render: v => v || '—' },
    { key: 'plot_id',     label: 'Plot',          render: v => v || '—' },
    { key: 'total_count', label: 'Count',         render: (v, op) => fmtNumber(v || op.weight_kg) },
    { key: 'ai_count',    label: 'AI Count',      render: v => fmtNumber(v) },
    { key: 'data_status', label: 'Status',        render: v => <span dangerouslySetInnerHTML={{__html: fmtStatusBadge(v)}}></span> },
    { key: 'created_at',  label: 'Date',          render: v => fmtDateTime(v) },
  ];

  const COLS_PLOT = [
    { key: 'plot_id',            label: 'Plot ID',      render: v => <strong>{v}</strong> },
    { key: 'total_harvest_count', label: 'Harvested',    render: v => fmtNumber(v) },
    { key: 'total_ai_count',      label: 'AI Count',     render: v => fmtNumber(v) },
    { key: 'total_rotten',        label: 'Rotten',       render: v => v || 0 },
    { key: 'total_weight_kg',     label: 'Verified Wgt', render: v => fmtNumber(v) },
    { key: 'harvesters_count',    label: 'Harvesters',   render: v => v || 0 },
    { key: 'status',              label: 'Verified',     render: v => <span dangerouslySetInnerHTML={{__html: fmtStatusBadge(v === 'APPROVED' ? 'valid' : v === 'REJECTED' ? 'error' : 'warning')}}></span> },
    { key: 'comment',             label: 'Supervisor Note', render: v => <span className="tbl-note" title={v || ''}>{v || '—'}</span> },
  ];

  const cols = type === 'plots' ? COLS_PLOT : COLS_INDIVIDUAL;

  const totalPages = Math.ceil(data.length / pageSize);
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPaginationLinks = () => {
    if (totalPages <= 1) return [];
    const pages = [];
    const delta = 2;
    const left = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    if (left > 1) { pages.push(1); if (left > 2) pages.push('...'); }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages) { if (right < totalPages - 1) pages.push('...'); pages.push(totalPages); }
    return pages;
  };

  return (
    <div ref={topRef}>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {cols.map((col, i) => (
                <th key={i}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr><td colSpan={cols.length} className="tbl-empty">No records found</td></tr>
            ) : (
              paginatedData.map((row, rI) => {
                const statusStr = row.status === 'APPROVED' ? 'valid' : row.status === 'REJECTED' ? 'error' : (row.data_status || 'warning');
                return (
                  <tr key={rI} className={`tbl-row tbl-row--${statusStr}`}>
                    {cols.map((col, cI) => (
                      <td key={cI}>{col.render(row[col.key], row)}</td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <div className="page-info">
            Showing <span className="page-info-bold">{Math.min((currentPage - 1) * pageSize + 1, data.length)}</span> to <span className="page-info-bold">{Math.min(currentPage * pageSize, data.length)}</span> of <span className="page-info-bold">{data.length}</span> results
          </div>
          <div className="page-controls">
            <button className="page-nav" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}>
              <ChevronLeft size={18} />
            </button>
            <div className="page-links">
              {getPaginationLinks().map((p, i) => p === '...' ? (
                <span key={i} className="page-ellipsis">...</span>
              ) : (
                <button key={i} className={`page-link ${p === currentPage ? 'page-link--active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
              ))}
            </div>
            <button className="page-nav" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
