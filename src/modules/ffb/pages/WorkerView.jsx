import { getRole } from '../utils/access';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { EstateOptions } from '../components/EstateOptions';
import { WORKER_ICON, FFB_ICON, WEIGHT_ICON, DURATION_ICON, APPROVED_ICON } from '../utils/icons';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { fmtDateTime, fmtStatusBadge, fmtAbbrev } from '../utils/formatters';
import { API } from '../services/api';
import { Search, User, Cpu, MapPin, Truck, RotateCcw, Lock, Columns, ChevronDown, FileDown } from 'lucide-react';
import { scrollPageTop } from '../utils/scroll';
import { approvalSplit } from '../utils/reconStatus';
import StatCards from '../components/StatCards';
import ExportColumnsModal from '../components/ExportColumnsModal';

const ICONS = {
  worker: <img src={WORKER_ICON} alt="Worker" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />,
  ffb: <img src={FFB_ICON} alt="FFB" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />,
  weight: <img src={WEIGHT_ICON} alt="Weight" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />,
  cpu: <Cpu size={18} />,
  clock: <img src={DURATION_ICON} alt="Duration" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />,
  check: <img src={APPROVED_ICON} alt="Approved" style={{ width: '72px', height: '72px', objectFit: 'contain' }} />,
  search: <Search size={14} />,
  field: <MapPin size={12} />,
  truck: <Truck size={12} />,
};


function formatWeightCell(weight) {
  if (weight == null || Number.isNaN(Number(weight))) return '—';
  return Number(weight).toLocaleString('en-NG', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Column definitions for Harvester workers (Cutter + Carrier on one record)
const HARVESTER_COLS = [
  {
    key: 'date', header: 'Date', defaultVisible: true, filterKey: 'date',
    thClass: '', tdClass: 'worker-cell worker-cell--datetime',
    render: row => fmtDateTime(row.created_at)
  },
  {
    key: 'plot', header: 'Plot', defaultVisible: true, filterKey: 'plot',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => row.plot_id || '—'
  },
  {
    key: 'worker_id', header: 'Cutter ID', defaultVisible: true, filterKey: 'worker_id',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => row.worker_id
  },
  {
    key: 'worker_name', header: 'Cutter Name', defaultVisible: false, filterKey: 'worker_name', isName: true,
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 400 },
    render: row => row.worker_name || '—'
  },
  {
    key: 'carrier_id', header: 'Carrier ID', defaultVisible: true, filterKey: 'carrier_id',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => (!row.carrier_id || row.carrier_id === row.worker_id ? row.worker_id : row.carrier_id)
  },
  {
    key: 'carried_by', header: 'Carrier Name', defaultVisible: false, filterKey: 'carried_by', isName: true,
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 400 },
    render: row => {
      const selfCarried = !row.carrier_id || row.carrier_id === row.worker_id;
      return selfCarried
        ? <>{row.worker_name || '—'} <span style={{ fontSize: '11px', color: '#0f172a' }}>(self)</span></>
        : (row.carrier_name || '—');
    }
  },
  {
    key: 'contractor', header: 'Contractor', defaultVisible: true, filterKey: 'contractor',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 400 },
    render: row => row.contractor || '—'
  },
  {
    key: 'ai_count', header: 'FFB (AI)', defaultVisible: true, filterKey: 'ai_count', isNum: true,
    thClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 500, color: 'var(--clr-brand-primary)' },
    render: row => (row.ai_count ?? 0).toLocaleString('en-NG')
  },
  {
    key: 'manual_count', header: 'Reported FFB', defaultVisible: true, filterKey: 'manual_count', isNum: true,
    thClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 400 },
    render: row => (row.manual_count ?? 0).toLocaleString('en-NG')
  },
  {
    key: 'rotten', header: 'Rotten', defaultVisible: true, filterKey: 'rotten', isNum: true,
    thClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 400 },
    render: row => row.rotten_count ?? 0
  },
  {
    key: 'unripe', header: 'Unripe', defaultVisible: true, filterKey: 'unripe', isNum: true,
    thClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 400 },
    render: row => row.unripe_count ?? 0
  },
  {
    key: 'difference', header: 'Difference', defaultVisible: true, filterKey: 'difference', isNum: true,
    thClass: 'worker-cell--num', thStyle: { textAlign: 'center' },
    render: row => {
      const diff = Math.abs(row.difference || 0);
      const diffColor = diff > 10 ? '#be123c' : diff > 2 ? '#92400e' : 'var(--clr-brand-primary)';
      return (
        <span style={{ color: diffColor, fontWeight: 500 }}>
          {row.difference > 0 ? `+${row.difference}` : row.difference}
        </span>
      );
    },
    tdClass: 'worker-cell worker-cell--num', tdStyle: { textAlign: 'center' }
  },
  {
    key: 'recorder_name', header: 'Harvester Role ID', defaultVisible: false, filterKey: 'recorder_name',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => <span title={row.recorder_name || ''}>{row.recorder_id || '—'}</span>
  },
  {
    key: 'loader', header: 'Loading Role ID', defaultVisible: false, filterKey: 'loader',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => <span title={row.loader_name || ''}>{row.loader_id || '—'}</span>
  },
  {
    key: 'approval_status', header: 'Status', defaultVisible: true, filterKey: 'approval_status',
    thClass: '', tdClass: 'worker-cell',
    render: row => <span dangerouslySetInnerHTML={{ __html: fmtStatusBadge(row.approval_status) }} />
  },
];

// Column definitions for Loose Fruit Picker workers
const PICKER_COLS = [
  {
    key: 'date', header: 'Date', defaultVisible: true, filterKey: 'date',
    thClass: '', tdClass: 'worker-cell worker-cell--datetime',
    render: row => fmtDateTime(row.created_at)
  },
  {
    key: 'plot', header: 'Plot', defaultVisible: true, filterKey: 'plot',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => row.plot_id || '—'
  },
  {
    key: 'worker_id', header: 'Picker ID', defaultVisible: true, filterKey: 'worker_id',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => row.worker_id
  },
  {
    key: 'worker_name', header: 'Picker Name', defaultVisible: false, filterKey: 'worker_name', isName: true,
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 400 },
    render: row => row.worker_name || '—'
  },
  {
    key: 'contractor', header: 'Contractor', defaultVisible: true, filterKey: 'contractor',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 400 },
    render: row => row.contractor || '—'
  },
  {
    key: 'weight', header: 'Weight (kg)', defaultVisible: true, filterKey: 'weight', isNum: true,
    thClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 500 },
    render: row => formatWeightCell(row.weight_kg)
  },
  {
    key: 'recorder_name', header: 'Harvester Role ID', defaultVisible: false, filterKey: 'recorder_name',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => <span title={row.recorder_name || ''}>{row.recorder_id || '—'}</span>
  },
  {
    key: 'loader', header: 'Loading Role ID', defaultVisible: false, filterKey: 'loader',
    thClass: '', tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => <span title={row.loader_name || ''}>{row.loader_id || '—'}</span>
  },
  {
    key: 'approval_status', header: 'Status', defaultVisible: true, filterKey: 'approval_status',
    thClass: '', tdClass: 'worker-cell',
    render: row => <span dangerouslySetInnerHTML={{ __html: fmtStatusBadge(row.approval_status) }} />
  },
];

const STORAGE_KEY = 'fi_ffb_worker_view_visible_cols_v1';

const getDefaultCols = () => ({
  harvester: HARVESTER_COLS.filter(c => c.defaultVisible).map(c => c.key),
  picker: PICKER_COLS.filter(c => c.defaultVisible).map(c => c.key),
});

export function WorkerView() {
  const { filters, updateFilters, resetFilters, currentPage, setCurrentPage } = useAppContext();
  const refreshTick = useRefreshTick(); // top-bar Refresh reloads this page's data
  const userRole = getRole();
  const isViewer = userRole === 'View';
  const [workerStats, setWorkerStats] = useState({ cards: [], table: [], total: 0 });
  const [loading, setLoading] = useState(false);
  // Harvester Workers (cutter + carrier on one row) or Picker Workers
  const [roleTab, setRoleTab] = useState('harvester');

  // Column Visibility State for Table
  const [visibleCols, setVisibleCols] = useState(() => {
    const defaults = getDefaultCols();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const sanitize = (list, allList) => {
          const s = new Set(Array.isArray(list) ? list : []);
          if (isViewer) {
            allList.forEach(c => { if (c.isName) s.delete(c.key); });
          }
          return s.size > 0 ? s : new Set(allList.filter(c => c.defaultVisible).map(c => c.key));
        };
        return {
          harvester: sanitize(parsed.harvester, HARVESTER_COLS),
          picker: sanitize(parsed.picker, PICKER_COLS),
        };
      }
    } catch { /* optional: ignore and keep the default */ }
    return {
      harvester: new Set(defaults.harvester),
      picker: new Set(defaults.picker),
    };
  });

  const [colDropdownOpen, setColDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportSelectedCols, setExportSelectedCols] = useState(new Set());

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colDropdownRef.current && !colDropdownRef.current.contains(e.target)) {
        setColDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allCols = roleTab === 'picker' ? PICKER_COLS : HARVESTER_COLS;
  const activeCols = useMemo(() => {
    const current = visibleCols[roleTab] || new Set();
    return allCols.filter(c => current.has(c.key));
  }, [allCols, visibleCols, roleTab]);

  const toggleColumn = (key, isName) => {
    if (isName && isViewer) return;
    setVisibleCols(prev => {
      const current = new Set(prev[roleTab] || []);
      if (current.has(key)) {
        if (current.size <= 1) return prev;
        current.delete(key);
      } else {
        current.add(key);
      }
      const next = { ...prev, [roleTab]: current };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          harvester: Array.from(next.harvester),
          picker: Array.from(next.picker),
        }));
      } catch { /* optional: ignore and keep the default */ }
      return next;
    });
  };

  const resetToDefaultCols = () => {
    const def = getDefaultCols();
    const next = {
      harvester: new Set(def.harvester),
      picker: new Set(def.picker),
    };
    setVisibleCols(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        harvester: Array.from(next.harvester),
        picker: Array.from(next.picker),
      }));
    } catch { /* optional: ignore and keep the default */ }
  };

  const showAllCols = () => {
    const next = {
      harvester: new Set(HARVESTER_COLS.filter(c => !(c.isName && isViewer)).map(c => c.key)),
      picker: new Set(PICKER_COLS.filter(c => !(c.isName && isViewer)).map(c => c.key)),
    };
    setVisibleCols(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        harvester: Array.from(next.harvester),
        picker: Array.from(next.picker),
      }));
    } catch { /* optional: ignore and keep the default */ }
  };

  // Open Export Modal pre-populated with visible columns
  const openExportModal = () => {
    const current = visibleCols[roleTab] || new Set();
    setExportSelectedCols(new Set(current));
    setExportModalOpen(true);
  };





  const handleConfirmExport = () => {
    const csvCols = [];
    if (exportSelectedCols.has('date')) csvCols.push('date');
    if (exportSelectedCols.has('plot')) csvCols.push('plot');
    if (exportSelectedCols.has('worker_id')) csvCols.push('worker_id');
    if (exportSelectedCols.has('worker_name')) csvCols.push('worker_name');
    if (roleTab === 'harvester') {
      if (exportSelectedCols.has('carrier_id')) csvCols.push('carrier_id');
      if (exportSelectedCols.has('carried_by')) csvCols.push('carried_by');
    }
    if (exportSelectedCols.has('contractor')) csvCols.push('contractor');
    if (exportSelectedCols.has('ai_count')) csvCols.push('ai_count');
    if (exportSelectedCols.has('manual_count')) csvCols.push('typed_count');
    if (exportSelectedCols.has('rotten')) csvCols.push('rotten');
    if (exportSelectedCols.has('unripe')) csvCols.push('unripe');
    if (exportSelectedCols.has('difference')) csvCols.push('difference');
    if (exportSelectedCols.has('weight')) csvCols.push('weight');
    if (exportSelectedCols.has('recorder_name')) csvCols.push('harv_clerk');
    if (exportSelectedCols.has('loader')) csvCols.push('loading_clerk');
    if (exportSelectedCols.has('approval_status')) csvCols.push('status');

    window.location.href = API.workersExportUrl(filters, 'all', csvCols.length > 0 ? csvCols : null);
    setExportModalOpen(false);
  };

  const [pageSize, setPageSize] = useState(50);
  const totalPages = Math.max(1, Math.ceil(workerStats.total / pageSize));
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

  // Fetch Worker-Specific Analytics
  useEffect(() => {
    const fetchWorkerData = async () => {
      setLoading(true);
      try {
        const [cardsRes, tableRes] = (await Promise.allSettled([
          API.fetchWorkerCards({ ...filters, page: 1, size: 100 }),
          API.fetchWorkerTable({ ...filters, role_group: roleTab, page: activePage, size: pageSize })
        ])).map(r => (r.status === 'fulfilled' ? r.value : {}));

        setWorkerStats({
          cards: cardsRes.items || [],
          table: tableRes.items || [],
          total: tableRes.total || (tableRes.items?.length || 0)
        });
      } catch (err) {
        console.error('Failed to fetch worker stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkerData();
  }, [filters, activePage, pageSize, roleTab, refreshTick]);

  const paginatedData = useMemo(() => {
    return workerStats.table.map(row => ({
      ...row,
      worker_id: row.h_worker_id,
      worker_name: row.h_worker_name,
      role: row.h_worker_role,
      manual_count: row.total_manual_count,
      ai_count: row.total_ai_detected,
      loaded_count: row.total_loaded_count,
      rotten_count: row.total_rotten,
      unripe_count: row.total_unripe,
      weight_kg: row.total_loose_fruit,
      difference: row.typed_vs_ai ?? 0,
      created_at: row.first_record_at || row.date_from,
      recorder_name: row.recorder_name,
      recorder_id: row.harvesting_clerk_id,
      loader_name: row.loading_clerk_name,
      loader_id: row.loading_clerk_id,
      carrier_id: row.carrier_id,
      carrier_name: row.carrier_name,
      carried_by: row.carried_by,
      harvest_role: row.harvest_role,
      approval_status: row.approval_status
    }));
  }, [workerStats.table]);

  // Column header filters
  const [colFilters, setColFilters] = useState({});
  const updateColFilter = (key, value) => setColFilters(prev => ({ ...prev, [key]: value }));
  const clearColFilters = () => setColFilters({});

  const filteredPaginatedData = useMemo(() => {
    return paginatedData.filter(row => {
      return Object.entries(colFilters).every(([key, val]) => {
        if (!val) return true;
        const q = val.toLowerCase();
        let cell;
        switch (key) {
          case 'date': cell = fmtDateTime(row.created_at) || ''; break;
          case 'worker_id': cell = String(row.worker_id || ''); break;
          case 'worker_name': cell = row.worker_name || ''; break;
          case 'harvest_role': cell = row.harvest_role || ''; break;
          case 'contractor': cell = row.contractor || ''; break;
          case 'plot': cell = row.plot_id || ''; break;
          case 'recorder_name': cell = `${row.recorder_name || ''} ${row.recorder_id || ''}`; break;
          case 'carried_by': cell = `${row.carrier_name || ''} ${row.carried_by || ''}`; break;
          case 'carrier_id': cell = row.carrier_id || ''; break;
          case 'loader': cell = `${row.loader_name || ''} ${row.loader_id || ''}`; break;
          case 'ai_count': cell = String(row.ai_count ?? ''); break;
          case 'manual_count': cell = String(row.manual_count ?? ''); break;
          case 'rotten': cell = String(row.rotten_count ?? ''); break;
          case 'unripe': cell = String(row.unripe_count ?? ''); break;
          case 'weight': cell = String(row.weight_kg ?? ''); break;
          case 'difference': cell = String(row.difference ?? ''); break;
          case 'approval_status': cell = row.approval_status || ''; break;
          default: return true;
        }
        return cell.toLowerCase().includes(q);
      });
    });
  }, [paginatedData, colFilters]);

  const kpis = useMemo(() => {
    const cards = workerStats.cards;
    const totalRecords = cards.reduce((s, c) => s + (c.total_records || 0), 0);
    const recs = approvalSplit(cards, c => c.total_records);
    const ffb = approvalSplit(cards, c => c.total_harvested_count);
    const kg = approvalSplit(cards, c => (c.h_total_weight_kg || 0) + (c.l_total_weight_kg || 0));
    const plotDays = cards.reduce((s, c) => s + (c.plot_days || 0), 0);
    const plotMinutes = cards.reduce((s, c) => s + (c.plot_minutes ?? c.duration ?? 0), 0);
    const avgDuration = plotDays > 0 ? Math.round(plotMinutes / plotDays) : 0;
    const avgApprRate = totalRecords > 0 ? Math.min(100, Math.round((recs.approved / totalRecords) * 100)) : 0;

    const n = (v) => v.toLocaleString('en-NG');
    const GREEN = '#3F8432', AMBER = '#b45309', SLATE = '#475569';
    return [
      { label: 'Approved Records', value: n(recs.approved), color: GREEN },
      { label: 'Approved FFB', value: n(ffb.approved), color: GREEN },
      { label: 'Approved Loose Fruit', value: fmtAbbrev(kg.approved), unit: 'kg', color: GREEN },
      { label: 'Approved Rate', value: avgApprRate, unit: '%', color: GREEN },
      { label: 'Not Approved Records', value: n(recs.notApproved), color: AMBER, title: 'Pending, rejected or any status other than approved' },
      { label: 'Not Approved FFB', value: n(ffb.notApproved), color: AMBER, title: 'Pending, rejected or any status other than approved' },
      { label: 'Not Approved Loose Fruit', value: fmtAbbrev(kg.notApproved), unit: 'kg', color: AMBER, title: 'Pending, rejected or any status other than approved' },
      { label: 'Average Duration', value: avgDuration, unit: 'min', color: SLATE, title: 'Field time per plot' },
    ];
  }, [workerStats.cards]);

  const handleClearAll = () => {
    resetFilters();
    clearColFilters();
    setCurrentPage(1);
  };

  return (
    <div className="view-container view-fade-in worker-view" style={{ padding: '32px', maxWidth: '100%', width: '100%' }}>
      {/* Top Header */}
      <div className="view-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="view-title" style={{ margin: 0, fontSize: '28px', fontWeight: 500, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={26} strokeWidth={1.5} color="var(--clr-brand-primary)" />
            Workers Performance
          </h1>
          <p className="view-subtitle worker-view__subtitle" style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#0f172a' }}>
            Daily field performance records, bunch counts, and weight verifications for Harvester, Picker, and Carrier teams.
          </p>
        </div>
      </div>

      {/* Unified 6-Item Single-Line Filter Bar */}
      <div className="analytics-filter-bar" style={{
        marginBottom: '24px', padding: '16px 20px', background: 'white',
        borderRadius: '12px', display: 'flex', flexWrap: 'nowrap', gap: '14px', alignItems: 'flex-end',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', width: '100%'
      }}>
        {/* 1. Search Worker / Carrier / Plot */}
        <div className="filter-group" style={{ flex: '2 1 240px', minWidth: '180px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>
            Search Worker
          </label>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>{ICONS.search}</span>
            <input
              type="search"
              className="search-input"
              style={{ paddingLeft: '36px', height: '40px', borderRadius: '8px', width: '100%', fontSize: '13px', border: '1px solid #cbd5e1' }}
              placeholder="Search Worker ID, Name, Plot..."
              value={filters.search || ''}
              onChange={e => {
                updateFilters({ search: e.target.value });
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* 2. Plantation Location */}
        <div className="filter-group" style={{ flex: '1.2 1 160px', minWidth: '140px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>
            Plantation Location
          </label>
          <select 
            className="select-input" 
            style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 500 }} 
            value={filters.estate || ''} 
            onChange={(e) => { updateFilters({ estate: e.target.value || null }); setCurrentPage(1); }}
          >
            <EstateOptions allLabel="All Plantations" />
          </select>
        </div>

        {/* 3. Validation Status */}
        <div className="filter-group" style={{ flex: '1.1 1 130px', minWidth: '120px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>
            Validation Status
          </label>
          <select 
            className="select-input" 
            style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 500 }} 
            value={filters.status || ''} 
            onChange={e => { updateFilters({ status: e.target.value || null }); setCurrentPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="not_approved">Not approved</option>
          </select>
        </div>

        {/* 4. Start Date */}
        <div className="filter-group" style={{ flex: '1 1 140px', minWidth: '130px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>
            Start Date
          </label>
          <input 
            type="date" 
            className="date-input" 
            style={{ width: '100%', height: '40px', borderRadius: '8px', padding: '0 10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 400 }} 
            value={filters.dateRange?.from || ''} 
            onChange={e => { updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value } }); setCurrentPage(1); }} 
          />
        </div>

        {/* 5. End Date */}
        <div className="filter-group" style={{ flex: '1 1 140px', minWidth: '130px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>
            End Date
          </label>
          <input 
            type="date" 
            className="date-input" 
            style={{ width: '100%', height: '40px', borderRadius: '8px', padding: '0 10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 400 }} 
            value={filters.dateRange?.to || ''} 
            onChange={e => { updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value } }); setCurrentPage(1); }} 
          />
        </div>

        {/* 6. Reset Button */}
        <button 
          className="btn btn--outline" 
          style={{ height: '40px', padding: '0 16px', fontWeight: 500, borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0 }} 
          onClick={handleClearAll}
        >
          <RotateCcw size={14} /> RESET
        </button>

        {/* 7. Export Button (Opens Column Selection Popup) */}
        {isViewer ? (
          <button 
            type="button"
            className="btn btn--primary"
            disabled
            title="Viewer accounts cannot export CSV from the portal"
            style={{
              height: '40px', padding: '0 18px', fontWeight: 500, fontSize: '12px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0,
              background: '#94a3b8', borderColor: '#94a3b8', cursor: 'not-allowed', opacity: 0.7
            }}
          >
            <FileDown size={15} /> Export CSV
          </button>
        ) : (
          <button 
            type="button"
            className="btn btn--primary" 
            onClick={openExportModal}
            title="Select columns to export CSV"
            style={{
              height: '40px', padding: '0 18px', fontWeight: 500, fontSize: '12px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0,
              cursor: 'pointer'
            }}
          >
            <FileDown size={15} /> Export CSV
          </button>
        )}
      </div>

      {/* KPI Cards Strip */}
      <StatCards items={kpis} fixed />

      {/* Role Group Navigation Tabs + Column Visibility Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div role="tablist" style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {[
            { key: 'harvester', label: 'Harvester Workers (Cutter & Carrier)' },
            { key: 'picker', label: 'Loose Fruit Picker Workers' }
          ].map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={roleTab === key}
              onClick={() => { setRoleTab(key); setCurrentPage(1); }}
              style={{
                border: 'none',
                borderRadius: '7px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                background: roleTab === key ? 'var(--clr-brand-primary)' : 'transparent',
                color: roleTab === key ? '#FFFFFF' : '#475569'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Object.values(colFilters).some(Boolean) && (
            <button
              onClick={clearColFilters}
              className="btn btn--outline"
              style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', height: '38px', color: '#b45309' }}
            >
              Clear Column Filters
            </button>
          )}

          {/* Column Visibility Dropdown */}
          <div className="col-toggle-wrapper" ref={colDropdownRef}>
            <button
              type="button"
              className={`col-toggle-btn ${colDropdownOpen ? 'col-toggle-btn--active' : ''}`}
              onClick={() => setColDropdownOpen(prev => !prev)}
              aria-expanded={colDropdownOpen}
              title="Choose which columns appear on table"
            >
              <Columns size={16} />
              <span>Columns ({activeCols.length}/{allCols.length})</span>
              <ChevronDown size={14} style={{ transform: colDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {colDropdownOpen && (
              <div className="col-toggle-dropdown">
                <div className="col-toggle-header">
                  <span>Display Columns</span>
                  <span>{activeCols.length} of {allCols.length} active</span>
                </div>
                <div className="col-toggle-list">
                  {allCols.map(col => {
                    const isChecked = visibleCols[roleTab]?.has(col.key);
                    const isRestricted = col.isName && isViewer;
                    return (
                      <label
                        key={col.key}
                        className={`col-toggle-item ${isRestricted ? 'col-toggle-item--disabled' : ''}`}
                        title={isRestricted ? 'Viewer accounts cannot add worker names' : undefined}
                        onClick={e => {
                          if (isRestricted) {
                            e.preventDefault();
                            return;
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          className="col-toggle-checkbox"
                          checked={isRestricted ? false : isChecked}
                          disabled={isRestricted}
                          onChange={() => toggleColumn(col.key, col.isName)}
                        />
                        <span style={{ flex: 1 }}>{col.header}</span>
                        {isRestricted && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                            <Lock size={11} /> Locked
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="col-toggle-footer">
                  <button type="button" className="col-toggle-footer-btn" onClick={resetToDefaultCols}>
                    Reset Defaults
                  </button>
                  <button type="button" className="col-toggle-footer-btn" onClick={showAllCols}>
                    Show All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Entries Bar */}
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
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={75}>75</option>
            <option value={100}>100</option>
          </select>
          entries
        </div>
        <div className="table-entries-bar__right">
          Showing {workerStats.total === 0 ? 0 : (activePage - 1) * pageSize + 1} to {Math.min(workerStats.total, activePage * pageSize)} of {workerStats.total.toLocaleString()} entries
        </div>
      </div>

      {/* Worker Records Table */}
      <div className="worker-table-shell" style={{ marginTop: '0' }}>
        <div className="worker-table-scroll">
          <table className="worker-records-table" aria-label="Worker operational records">
            <thead>
              <tr>
                {activeCols.map(col => (
                  <th key={col.key} className={col.thClass || ''} style={col.thStyle || {}}>
                    {col.header}<br />
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={colFilters[col.filterKey] || ''}
                      onChange={e => updateColFilter(col.filterKey, e.target.value)}
                      className="col-filter-input"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPaginatedData.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, activeCols.length)} className="worker-empty-state">
                    {loading ? 'Fetching Data...' : `No ${roleTab === 'picker' ? 'picker' : 'harvester'} records match the current filters.`}
                  </td>
                </tr>
              ) : (
                filteredPaginatedData.map(op => (
                  <tr key={op.id} className="worker-row">
                    {activeCols.map(col => (
                      <td
                        key={col.key}
                        className={col.tdClass || 'worker-cell'}
                        style={typeof col.tdStyle === 'function' ? col.tdStyle(op) : (col.tdStyle || {})}
                      >
                        {col.render(op)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="table-pagination-bar" style={{ marginTop: '16px' }}>
        <div className="table-pagination-bar__info">
          Showing {workerStats.total === 0 ? 0 : (activePage - 1) * pageSize + 1} to {Math.min(workerStats.total, activePage * pageSize)} of {workerStats.total.toLocaleString()} entries
        </div>
        <div className="table-pagination-bar__controls">
          <button
            className="pg-btn"
            disabled={activePage === 1}
            onClick={() => {
              setCurrentPage(Math.max(1, activePage - 1));
              scrollPageTop();
            }}
          >
            Previous
          </button>

          {pageNumbers.startPage > 1 && (
            <>
              <button
                className={`pg-btn ${activePage === 1 ? 'pg-btn--active' : ''}`}
                onClick={() => { setCurrentPage(1); scrollPageTop(); }}
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
              onClick={() => { setCurrentPage(p); scrollPageTop(); }}
            >
              {p}
            </button>
          ))}

          {pageNumbers.endPage < totalPages && (
            <>
              {pageNumbers.endPage < totalPages - 1 && <span className="pg-ellipsis">...</span>}
              <button
                className={`pg-btn ${activePage === totalPages ? 'pg-btn--active' : ''}`}
                onClick={() => { setCurrentPage(totalPages); scrollPageTop(); }}
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
              scrollPageTop();
            }}
          >
            Next
          </button>
        </div>
      </div>

      <ExportColumnsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        columns={allCols}
        tableVisibleKeys={activeCols.map(c => c.key)}
        onExport={handleConfirmExport}
        isViewer={isViewer}
      />

    </div>
  );
}
