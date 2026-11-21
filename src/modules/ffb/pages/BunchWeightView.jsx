import { exportFileName } from '../utils/exportName';
import { useState, useMemo } from 'react';
import { usePageScroll } from '../hooks/usePageScroll';
import { Scale, MapPin, Calendar, RotateCcw, Download, Search, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { fmtNumber } from '../utils/formatters';
import { useAppContext } from '../context/AppContext';
import ExportColumnsModal from '../components/ExportColumnsModal';

const BUNCH_WEIGHT_EXPORT_COLS = [
  { key: 'date', header: 'Date' },
  { key: 'plotId', header: 'Plot ID' },
  { key: 'estate', header: 'Estate' },
  { key: 'batchNo', header: 'Batch No' },
  { key: 'totalBunches', header: 'Total Bunches' },
  { key: 'grossWeight', header: 'Gross Weight (kg)' },
  { key: 'avgWeight', header: 'Average Bunch Weight (kg)' },
  { key: 'grade', header: 'Quality Grade' },
  { key: 'estWeight', header: 'Est. Total Weight (Tonnes)' },
  { key: 'status', header: 'Status' },
];

// Premium Simulated Earthintelytics Bunch Weight Dataset
const BUNCH_WEIGHT_DATA = [
  { date: '2026-05-18', plotId: 'MA-01', estate: 'Main Estate', batchNo: 'B-260518-A', totalBunches: 124, grossWeight: 2356, avgWeight: 19.0, grade: 'Class A', status: 'Approved' },
  { date: '2026-05-18', plotId: 'MA-04', estate: 'Main Estate', batchNo: 'B-260518-B', totalBunches: 98, grossWeight: 1782, avgWeight: 18.2, grade: 'Class B', status: 'Approved' },
  { date: '2026-05-18', plotId: 'EX1-12', estate: 'Extension 1', batchNo: 'B-260518-C', totalBunches: 156, grossWeight: 3120, avgWeight: 20.0, grade: 'Class A', status: 'Approved' },
  { date: '2026-05-17', plotId: 'EX1-14', estate: 'Extension 1', batchNo: 'B-260517-A', totalBunches: 110, grossWeight: 1980, avgWeight: 18.0, grade: 'Class B', status: 'Approved' },
  { date: '2026-05-17', plotId: 'EX2-03', estate: 'Extension 2', batchNo: 'B-260517-B', totalBunches: 85, grossWeight: 1445, avgWeight: 17.0, grade: 'Class C', status: 'Pending' },
  { date: '2026-05-17', plotId: 'MA-02', estate: 'Main Estate', batchNo: 'B-260517-C', totalBunches: 142, grossWeight: 2840, avgWeight: 20.0, grade: 'Class A', status: 'Approved' },
  { date: '2026-05-16', plotId: 'MA-09', estate: 'Main Estate', batchNo: 'B-260516-A', totalBunches: 115, grossWeight: 2127, avgWeight: 18.5, grade: 'Class B', status: 'Approved' },
  { date: '2026-05-16', plotId: 'EX1-08', estate: 'Extension 1', batchNo: 'B-260516-B', totalBunches: 130, grossWeight: 2470, avgWeight: 19.0, grade: 'Class A', status: 'Approved' },
  { date: '2026-05-16', plotId: 'EX2-05', estate: 'Extension 2', batchNo: 'B-260516-C', totalBunches: 92, grossWeight: 1518, avgWeight: 16.5, grade: 'Class C', status: 'Pending' },
  { date: '2026-05-15', plotId: 'MA-05', estate: 'Main Estate', batchNo: 'B-260515-A', totalBunches: 165, grossWeight: 3382, avgWeight: 20.5, grade: 'Class A', status: 'Approved' },
  { date: '2026-05-15', plotId: 'EX1-15', estate: 'Extension 1', batchNo: 'B-260515-B', totalBunches: 104, grossWeight: 1924, avgWeight: 18.5, grade: 'Class B', status: 'Approved' },
  { date: '2026-05-15', plotId: 'EX2-01', estate: 'Extension 2', batchNo: 'B-260515-C', totalBunches: 78, grossWeight: 1287, avgWeight: 16.5, grade: 'Class C', status: 'Approved' },
  { date: '2026-05-14', plotId: 'MA-07', estate: 'Main Estate', batchNo: 'B-260514-A', totalBunches: 138, grossWeight: 2691, avgWeight: 19.5, grade: 'Class A', status: 'Approved' },
  { date: '2026-05-14', plotId: 'EX1-10', estate: 'Extension 1', batchNo: 'B-260514-B', totalBunches: 122, grossWeight: 2257, avgWeight: 18.5, grade: 'Class B', status: 'Approved' },
];

export function BunchWeightView({ onBack }) {
  const { userRole } = useAppContext();
  const isViewer = userRole === 'View';
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [estate, setEstate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  usePageScroll(currentPage, { page: true });
  const [pageSize, setPageSize] = useState(10);

  // Reset Filters Handler
  const handleReset = () => {
    setEstate('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Dynamic Filtering Logic
  const filteredData = useMemo(() => {
    return BUNCH_WEIGHT_DATA.filter(row => {
      const matchEstate = estate ? row.estate === estate : true;
      const matchSearch = searchQuery ? row.plotId.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      const matchStart = startDate ? row.date >= startDate : true;
      const matchEnd = endDate ? row.date <= endDate : true;
      return matchEstate && matchSearch && matchStart && matchEnd;
    });
  }, [estate, searchQuery, startDate, endDate]);



  // Unique plot IDs for suggestions
  const uniquePlotIds = useMemo(() => {
    return Array.from(new Set(BUNCH_WEIGHT_DATA.map(r => r.plotId))).sort();
  }, []);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const pageNumbers = useMemo(() => {
    const pages = [];
    let startPage = Math.max(1, activePage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return { pages, startPage, endPage };
  }, [activePage, totalPages]);
  
  const paginatedData = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [activePage, filteredData, pageSize]);

  // Column header filters
  const [colFilters, setColFilters] = useState({});
  const updateColFilter = (key, value) => setColFilters(prev => ({ ...prev, [key]: value }));

  const filteredPaginatedData = useMemo(() => {
    return paginatedData.filter(row => {
      return Object.entries(colFilters).every(([key, val]) => {
        if (!val) return true;
        const q = val.toLowerCase();
        let cell = '';
        switch (key) {
          case 'date': cell = row.date || ''; break;
          case 'plotId': cell = row.plotId || ''; break;
          case 'estate': cell = row.estate || ''; break;
          case 'totalBunches': cell = String(row.totalBunches ?? ''); break;
          case 'avgWeight': cell = String(row.avgWeight ?? ''); break;
          case 'totalWeight': cell = String((row.totalBunches * row.avgWeight / 1000).toFixed(2)); break;
          default: return true;
        }
        return cell.toLowerCase().includes(q);
      });
    });
  }, [paginatedData, colFilters]);

  // CSV Export Handler
  const handleConfirmExport = (selectedKeys) => {
    // Quote values that contain a comma, quote or line break so columns never shift
    const cell = (v) => { const t = v == null ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const colMap = Object.fromEntries(BUNCH_WEIGHT_EXPORT_COLS.map(c => [c.key, c.header]));
    const headers = selectedKeys.map(k => colMap[k] || k);
    const rows = [
      headers.join(','),
      ...filteredData.map(row =>
        selectedKeys.map(k => {
          let val = row[k];
          if (k === 'estWeight') {
            val = (row.totalBunches * row.avgWeight / 1000).toFixed(2);
          }
          return cell(val ?? '');
        }).join(',')
      )
    ];

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = exportFileName('bunch_weight');
    a.click();
  };

  return (
    <div className="view-container view-fade-in bunch-weight-view" style={{ padding: '32px', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="view-header" style={{ marginBottom: '24px' }}>
        <div>
          {onBack && (
            <button 
              onClick={onBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: 'none',
                color: '#0f172a',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '8px',
                padding: 0
              }}
            >
              ← Back to Plot Analytics
            </button>
          )}
          <h1 className="view-title" style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '6px' }}>Bunch Weight Audit</h1>
          <p className="view-subtitle" style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>Precision tracking of FFB mass, plot density, and crop yield classification metrics.</p>
        </div>
      </div>

      {/* Spacious Premium Filter Bar */}
      <div className="map-filter-orchestrator" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-end', gap: '16px', marginBottom: '24px', padding: '16px', background: '#ffffff', border: '1px solid var(--border-soft)', borderRadius: '12px' }}>
        {/* Estate / Location Filter */}
        <div className="filter-group" style={{ flex: '1.2', minWidth: '160px' }}>
          <label className="filter-label" style={{ fontSize: '11px', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Plantation Location</label>
          <select className="select-input" value={estate} onChange={e => setEstate(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
            <option value="">All Farms</option>
            <option value="Main Estate">Main Estate</option>
            <option value="Extension 1">Extension 1</option>
            <option value="Extension 2">Extension 2</option>
          </select>
        </div>

        {/* Search Plot ID Filter */}
        <div className="filter-group" style={{ flex: '1.5', minWidth: '180px' }}>
          <label className="filter-label" style={{ fontSize: '11px', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Search Plot</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}><Search size={16} /></span>
            <input
              type="text"
              list="plot-ids"
              className="select-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="e.g. MA-01"
              style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', paddingLeft: '36px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}
            />
            <datalist id="plot-ids">
              {uniquePlotIds.map(id => <option key={id} value={id} />)}
            </datalist>
          </div>
        </div>

        {/* Start Date */}
        <div className="filter-group" style={{ flex: '1', minWidth: '130px' }}>
          <label className="filter-label" style={{ fontSize: '11px', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Start Date</label>
          <input
            type="date"
            className="select-input"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}
          />
        </div>

        {/* End Date */}
        <div className="filter-group" style={{ flex: '1', minWidth: '130px' }}>
          <label className="filter-label" style={{ fontSize: '11px', fontWeight: 750, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>End Date</label>
          <input
            type="date"
            className="select-input"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}
          />
        </div>

        {/* Buttons Action Group */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn--outline" onClick={handleReset} style={{ height: '42px', minWidth: '100px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
            <RotateCcw size={15} /> Reset
          </button>
          <button 
            className="btn btn--primary" 
            onClick={isViewer ? undefined : () => setExportModalOpen(true)}
            disabled={isViewer}
            title={isViewer ? 'Viewer accounts cannot export CSV from the portal' : 'Select columns to export CSV'}
            style={{
              height: '42px', minWidth: '140px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px',
              background: isViewer ? '#94a3b8' : undefined,
              borderColor: isViewer ? '#94a3b8' : undefined,
              cursor: isViewer ? 'not-allowed' : 'pointer',
              opacity: isViewer ? 0.7 : 1
            }}
          >
            {isViewer ? <Lock size={15} /> : <Download size={15} />} Export CSV
          </button>
        </div>
      </div>

      {/* Entries selector and info bar */}
      <div className="table-entries-bar">
        <div className="table-entries-bar__left">
          Show
          <select 
            value={pageSize} 
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          entries
        </div>
        <div className="table-entries-bar__right">
          Showing {filteredData.length === 0 ? 0 : (activePage - 1) * pageSize + 1} to {Math.min(filteredData.length, activePage * pageSize)} of {filteredData.length.toLocaleString()} entries
        </div>
      </div>

      {/* Table Container */}
      <div className="plot-table-shell">
        <table className="plot-records-table">
          <thead>
            <tr>
              <th>Date<br/><input type="text" placeholder="Filter..." value={colFilters.date || ''} onChange={e => updateColFilter('date', e.target.value)} className="col-filter-input" /></th>
              <th>Plot ID<br/><input type="text" placeholder="Filter..." value={colFilters.plotId || ''} onChange={e => updateColFilter('plotId', e.target.value)} className="col-filter-input" /></th>
              <th>Estate<br/><input type="text" placeholder="Filter..." value={colFilters.estate || ''} onChange={e => updateColFilter('estate', e.target.value)} className="col-filter-input" /></th>
              <th className="plot-cell--num">Total Bunches<br/><input type="text" placeholder="Filter..." value={colFilters.totalBunches || ''} onChange={e => updateColFilter('totalBunches', e.target.value)} className="col-filter-input" /></th>
              <th className="plot-cell--num">Avg Bunch Weight<br/><input type="text" placeholder="Filter..." value={colFilters.avgWeight || ''} onChange={e => updateColFilter('avgWeight', e.target.value)} className="col-filter-input" /></th>
              <th className="plot-cell--num">Estimate Total Weight (Tonnes)<br/><input type="text" placeholder="Filter..." value={colFilters.totalWeight || ''} onChange={e => updateColFilter('totalWeight', e.target.value)} className="col-filter-input" /></th>
            </tr>
          </thead>
          <tbody>
            {filteredPaginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="plot-empty-state">No bunch weight records match the current filters.</td>
              </tr>
            ) : (
              filteredPaginatedData.map((row, idx) => (
                <tr key={idx} className="plot-row">
                  <td className="plot-cell" style={{ fontSize: '13.5px' }}>{row.date}</td>
                  <td className="plot-cell" style={{ color: 'var(--clr-brand-primary)', fontWeight: 800 }}>{row.plotId}</td>
                  <td className="plot-cell">{row.estate}</td>
                  <td className="plot-cell plot-cell--num" style={{ fontWeight: 700 }}>{fmtNumber(row.totalBunches)}</td>
                  <td className="plot-cell plot-cell--num" style={{ color: '#f97316', fontWeight: 800 }}>{row.avgWeight} kg</td>
                  <td className="plot-cell plot-cell--num" style={{ color: '#1e3a8a', fontWeight: 800 }}>{(row.totalBunches * row.avgWeight / 1000).toFixed(2)} t</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Premium Pagination Footer */}
      <div className="table-pagination-bar">
        <div className="table-pagination-bar__info">
          Showing {filteredData.length === 0 ? 0 : (activePage - 1) * pageSize + 1} to {Math.min(filteredData.length, activePage * pageSize)} of {filteredData.length.toLocaleString()} entries
        </div>
        <div className="table-pagination-bar__controls">
          <button
            className="pg-btn"
            disabled={activePage === 1}
            onClick={() => {
              setCurrentPage(Math.max(1, activePage - 1));
            }}
          >
            Previous
          </button>

          {pageNumbers.startPage > 1 && (
            <>
              <button
                className={`pg-btn ${activePage === 1 ? 'pg-btn--active' : ''}`}
                onClick={() => { setCurrentPage(1); }}
              >
                1
              </button>
              {pageNumbers.startPage > 2 && <span className="pg-ellipsis">...</span>}
            </>
          )}

          {pageNumbers.pages.map(p => (
            <button
              key={p}
              className={`pg-btn ${activePage === p ? 'pg-btn--active' : ''}`}
              onClick={() => { setCurrentPage(p); }}
            >
              {p}
            </button>
          ))}

          {pageNumbers.endPage < totalPages && (
            <>
              {pageNumbers.endPage < totalPages - 1 && <span className="pg-ellipsis">...</span>}
              <button
                className={`pg-btn ${activePage === totalPages ? 'pg-btn--active' : ''}`}
                onClick={() => { setCurrentPage(totalPages); }}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            className="pg-btn"
            disabled={activePage === totalPages}
            onClick={() => {
              setCurrentPage(Math.min(totalPages, activePage + 1));
            }}
          >
            Next
          </button>
        </div>
      </div>
      <ExportColumnsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        columns={BUNCH_WEIGHT_EXPORT_COLS}
        onExport={handleConfirmExport}
        isViewer={isViewer}
      />
    </div>
  );
}
