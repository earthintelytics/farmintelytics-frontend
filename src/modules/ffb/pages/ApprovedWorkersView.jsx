import { getRole, getUserEmail } from '../utils/access';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { WORKER_ICON, FFB_ICON, WEIGHT_ICON, UNRIPE_ICON, ROTTEN_ICON } from '../utils/icons';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  UserCheck, Search, Calendar, Grid, Users, ShieldAlert,
  RotateCcw, Download, ChevronLeft, ChevronRight, Truck, User,
  Columns, ChevronDown, Lock, X
} from 'lucide-react';
import { API } from '../services/api';
import { CONFIG } from '../config';
import { fmtDate, fmtNumber } from '../utils/formatters';
import { scrollPageTop } from '../utils/scroll';
import ExportColumnsModal from '../components/ExportColumnsModal';

// Column definitions for Harvester workers (Cutter + Carrier on one record)
const HARVESTER_COLS = [
  {
    key: 'date', header: 'Date', defaultVisible: true, filterKey: 'date',
    tdClass: 'worker-cell worker-cell--datetime',
    render: row => fmtDate(row.created_at)
  },
  {
    key: 'plot', header: 'Plot', defaultVisible: true, filterKey: 'plot',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500, color: 'var(--clr-brand-primary)' },
    render: row => row.h_plot_id
  },
  {
    key: 'worker_id', header: 'Cutter ID', defaultVisible: true, filterKey: 'worker_id',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => row.h_worker_id
  },
  {
    key: 'worker_name', header: 'Cutter Name', defaultVisible: false, filterKey: 'worker_name', isName: true,
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => row.worker_name
  },
  {
    key: 'carrier_id', header: 'Carrier ID', defaultVisible: true, filterKey: 'carrier_id',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => (!row.carrier_id || row.carrier_id === row.h_worker_id ? row.h_worker_id : row.carrier_id)
  },
  {
    key: 'carrier_name', header: 'Carrier Name', defaultVisible: false, filterKey: 'carried_by', isName: true,
    tdClass: 'worker-cell', tdStyle: { fontWeight: 600 },
    render: row => {
      const selfCarried = !row.carrier_id || row.carrier_id === row.h_worker_id;
      return selfCarried
        ? <>{row.worker_name} <span style={{ fontSize: '11px', color: '#0f172a' }}>(self)</span></>
        : (row.carrier_name || '—');
    }
  },
  {
    key: 'contractor', header: 'Contractor', defaultVisible: true, filterKey: 'contractor',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 600 },
    render: row => row.contractor
  },
  {
    key: 'total_count', header: 'Total Count', defaultVisible: true, filterKey: 'total_count',
    numClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 500 },
    render: row => (
      <span title={row.count_source ? `${row.count_source === 'typed' ? 'Typed' : 'AI'} count confirmed (typed ${row.h_total_count}, AI ${row.h_ai_detected_count})` : undefined}>
        {fmtNumber(row.pay_count ?? row.h_total_count)}
      </span>
    )
  },
  {
    key: 'rotten', header: 'Rotten FFB', defaultVisible: true, filterKey: 'rotten',
    numClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 500, color: '#dc2626' },
    render: row => fmtNumber(row.h_rotten_count)
  },
  {
    key: 'unripe', header: 'Unripe FFB', defaultVisible: true, filterKey: 'unripe',
    numClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 500, color: '#d97706' },
    render: row => fmtNumber(row.h_unripe_count)
  },
  {
    key: 'harv_clerk', header: 'Harv. Clerk ID', defaultVisible: false, filterKey: 'recorder_name',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => <span title={row.recorder_name || ''}>{row.harvesting_clerk_id || '—'}</span>
  },
  {
    key: 'loading_clerk', header: 'Loading Clerk ID', defaultVisible: false, filterKey: 'loader_name',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => <span title={row.loader_name || ''}>{row.loader_id || '—'}</span>
  },
];

// Column definitions for Loose Fruit Picker workers
const PICKER_COLS = [
  {
    key: 'date', header: 'Date', defaultVisible: true, filterKey: 'date',
    tdClass: 'worker-cell worker-cell--datetime',
    render: row => fmtDate(row.created_at)
  },
  {
    key: 'plot', header: 'Plot', defaultVisible: true, filterKey: 'plot',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500, color: 'var(--clr-brand-primary)' },
    render: row => row.h_plot_id
  },
  {
    key: 'worker_id', header: 'Picker ID', defaultVisible: true, filterKey: 'worker_id',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => row.h_worker_id
  },
  {
    key: 'worker_name', header: 'Picker Name', defaultVisible: false, filterKey: 'worker_name', isName: true,
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => row.worker_name
  },
  {
    key: 'contractor', header: 'Contractor', defaultVisible: true, filterKey: 'contractor',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 600 },
    render: row => row.contractor
  },
  {
    key: 'weight', header: 'Weight (kg)', defaultVisible: true, filterKey: 'weight',
    numClass: 'worker-cell--num', tdClass: 'worker-cell worker-cell--num', tdStyle: { fontWeight: 500, color: '#7c3aed' },
    render: row => (row.h_weight_kg > 0 ? `${fmtNumber(row.h_weight_kg)} kg` : '—')
  },
  {
    key: 'harv_clerk', header: 'Harv. Clerk ID', defaultVisible: false, filterKey: 'recorder_name',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => <span title={row.recorder_name || ''}>{row.harvesting_clerk_id || '—'}</span>
  },
  {
    key: 'loading_clerk', header: 'Loading Clerk ID', defaultVisible: false, filterKey: 'loader_name',
    tdClass: 'worker-cell', tdStyle: { fontWeight: 500 },
    render: row => <span title={row.loader_name || ''}>{row.loader_id || '—'}</span>
  },
];

const STORAGE_KEY = 'fi_ffb_approved_visible_cols_v2';

const getDefaultCols = () => ({
  harvester: HARVESTER_COLS.filter(c => c.defaultVisible).map(c => c.key),
  picker: PICKER_COLS.filter(c => c.defaultVisible).map(c => c.key),
});

export function ApprovedWorkersView() {
  const [loading, setLoading] = useState(false);
  const refreshTick = useRefreshTick(); // top-bar Refresh reloads this page's data
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  // Harvester Workers (cutter + carrier on one row) or Picker Workers
  const [roleTab, setRoleTab] = useState('harvester');

  // Role permissions
  const userRole = getRole();
  const isViewer = userRole === 'View';

  // Column visibility state
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.harvester && parsed.picker) {
          return {
            harvester: new Set(parsed.harvester),
            picker: new Set(parsed.picker),
          };
        }
      }
    } catch (e) { }
    const def = getDefaultCols();
    return {
      harvester: new Set(def.harvester),
      picker: new Set(def.picker),
    };
  });

  // Persist column visibility
  useEffect(() => {
    try {
      const toSave = {
        harvester: Array.from(visibleCols.harvester),
        picker: Array.from(visibleCols.picker),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) { }
  }, [visibleCols]);

  // Dropdown states & click outside
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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setColDropdownOpen(false);
        setExportModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Compute active columns for current tab (excluding name columns for Viewers)
  const activeCols = useMemo(() => {
    const registry = roleTab === 'picker' ? PICKER_COLS : HARVESTER_COLS;
    const currentSet = visibleCols[roleTab] || new Set();
    return registry.filter(col => {
      if (col.isName && isViewer) return false;
      return currentSet.has(col.key);
    });
  }, [roleTab, visibleCols, isViewer]);

  const toggleColumn = (key, isName) => {
    if (isName && isViewer) return;
    setVisibleCols(prev => {
      const currentSet = new Set(prev[roleTab]);
      if (currentSet.has(key)) {
        if (currentSet.size <= 1) return prev; // Keep at least one column visible
        currentSet.delete(key);
      } else {
        currentSet.add(key);
      }
      return { ...prev, [roleTab]: currentSet };
    });
  };

  const resetToDefaultCols = () => {
    const def = getDefaultCols();
    setVisibleCols(prev => ({
      ...prev,
      [roleTab]: new Set(def[roleTab])
    }));
  };

  const showAllCols = () => {
    const registry = roleTab === 'picker' ? PICKER_COLS : HARVESTER_COLS;
    const allowedKeys = registry
      .filter(col => !(col.isName && isViewer))
      .map(col => col.key);
    setVisibleCols(prev => ({
      ...prev,
      [roleTab]: new Set(allowedKeys)
    }));
  };

  // Column header filters
  const [colFilters, setColFilters] = useState({});
  const updateColFilter = (key, value) => setColFilters(prev => ({ ...prev, [key]: value }));

  const filteredRecords = useMemo(() => {
    return records.filter(row => {
      return Object.entries(colFilters).every(([key, val]) => {
        if (!val) return true;
        const q = val.toLowerCase();
        let cell = '';
        switch (key) {
          case 'date': cell = fmtDate(row.created_at) || ''; break;
          case 'worker_id': cell = String(row.h_worker_id || ''); break;
          case 'worker_name': cell = row.worker_name || ''; break;
          case 'role': cell = row.h_worker_role || ''; break;
          case 'harvest_role': cell = row.harvest_role || ''; break;
          case 'plot': cell = row.h_plot_id || ''; break;
          case 'team': cell = row.team || ''; break;
          case 'contractor': cell = row.contractor || ''; break;
          case 'recorder_name': cell = `${row.recorder_name || ''} ${row.harvesting_clerk_id || ''}`; break;
          case 'carried_by': cell = `${row.carrier_name || ''} ${row.carried_by || ''}`; break;
          case 'carrier_id': cell = row.carrier_id || ''; break;
          case 'loader_name': cell = `${row.loader_id || ''} ${row.loader_name || ''}`; break;
          case 'total_count': cell = String(row.pay_count ?? row.h_total_count ?? ''); break;
          case 'rotten': cell = String(row.h_rotten_count ?? ''); break;
          case 'unripe': cell = String(row.h_unripe_count ?? ''); break;
          case 'weight': cell = String(row.h_weight_kg ?? ''); break;
          default: return true;
        }
        return cell.toLowerCase().includes(q);
      });
    });
  }, [records, colFilters]);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    plot: '',
    team: '',
    contractor: '',
    from: '',
    to: ''
  });

  // KPI Metrics (Aggregated from fetched page metadata or simulated totals)
  const [kpis, setKpis] = useState({
    totalApproved: 0,
    totalCountFFB: 0,
    totalWeight: 0
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const pageNumbers = useMemo(() => {
    const pages = [];
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return { pages, startPage, endPage };
  }, [currentPage, totalPages]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.fetchApprovedWorkers({
        plot: filters.plot || undefined,
        team: filters.team || undefined,
        contractor: filters.contractor || undefined,
        dateRange: { from: filters.from, to: filters.to },
        search: filters.search || undefined,
        role_group: roleTab,
        page: currentPage,
        size: pageSize
      });

      setRecords(res.items || []);
      setTotalCount(res.total || 0);

    } catch (err) {
      console.error('Failed to load approved workers records', err);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, pageSize, roleTab, refreshTick]);

  // Cards: exact totals over every approved record matching the filters (both tabs).
  useEffect(() => {
    API.fetchApprovedWorkersSummary({
      plot: filters.plot, team: filters.team, contractor: filters.contractor,
      dateRange: { from: filters.from, to: filters.to }, search: filters.search
    }).then(r => setKpis({
      totalApproved: r?.approved_records || 0,
      totalCountFFB: r?.bunches || 0,
      totalWeight: r?.loose_fruit_kg || 0,
      totalUnripe: r?.unripe_ffb || 0,
      totalRotten: r?.rotten_ffb || 0
    })).catch(err => console.error('Failed to load approved totals', err));
  }, [filters, refreshTick]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, refreshTick]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReset = () => {
    setFilters({
      search: '',
      plot: '',
      team: '',
      contractor: '',
      from: '',
      to: ''
    });
    setCurrentPage(1);
  };

  // Open Export Modal pre-populated with visible columns
  const openExportModal = () => {
    const current = visibleCols[roleTab] || new Set();
    setExportSelectedCols(new Set(current));
    setExportModalOpen(true);
  };

  const toggleExportCol = (key) => {
    setExportSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllExportCols = () => {
    const registry = roleTab === 'picker' ? PICKER_COLS : HARVESTER_COLS;
    const next = new Set(registry.filter(c => !(c.isName && isViewer)).map(c => c.key));
    setExportSelectedCols(next);
  };

  const matchVisibleExportCols = () => {
    const current = visibleCols[roleTab] || new Set();
    setExportSelectedCols(new Set(current));
  };

  const clearAllExportCols = () => {
    setExportSelectedCols(new Set());
  };

  const handleConfirmExport = () => {
    if (isViewer) return;
    const csvCols = [];
    if (exportSelectedCols.has('date')) csvCols.push('date');
    if (exportSelectedCols.has('plot')) csvCols.push('plot');
    if (exportSelectedCols.has('worker_id') || exportSelectedCols.has('carrier_id')) {
      csvCols.push('worker_id');
      csvCols.push('role');
    }
    if (exportSelectedCols.has('worker_name') || exportSelectedCols.has('carrier_name')) {
      csvCols.push('worker_name');
    }
    if (exportSelectedCols.has('contractor')) csvCols.push('contractor');
    if (exportSelectedCols.has('total_count')) csvCols.push('total_count');
    if (exportSelectedCols.has('rotten')) csvCols.push('rotten');
    if (exportSelectedCols.has('unripe')) csvCols.push('unripe');
    if (exportSelectedCols.has('weight')) csvCols.push('weight');
    if (exportSelectedCols.has('harv_clerk')) csvCols.push('harv_clerk');
    if (exportSelectedCols.has('loading_clerk')) csvCols.push('loading_clerk');

    window.location.href = API.workersExportUrl({
      plot: filters.plot, team: filters.team, contractor: filters.contractor, search: filters.search,
      dateRange: { from: filters.from, to: filters.to }
    }, 'approved', csvCols.length > 0 ? csvCols : null);
    setExportModalOpen(false);
  };

  return (
    <div className="view-container view-fade-in approved-workers-view" style={{ padding: '32px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="view-title" style={{ fontSize: '26px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={26} strokeWidth={1.5} style={{ color: '#3F8432' }} /> Approved Crew Ledger
          </h1>
          <p className="view-subtitle" style={{ color: 'var(--text-muted)' }}>Historical register of all successfully approved and matched harvesting records.</p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="worker-kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Approved Batches */}
        <div className="wkpi-card" style={{ minHeight: '140px', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
          <div className="wkpi-card__inner" style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={WORKER_ICON} alt="Approved Batches" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '38px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>{fmtNumber(kpis.totalApproved)}</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>APPROVED BATCHES</div>
            </div>
          </div>
        </div>

        {/* Harvested Bunches */}
        <div className="wkpi-card" style={{ minHeight: '140px', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
          <div className="wkpi-card__inner" style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={FFB_ICON} alt="Harvested Bunches" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '38px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>
                {fmtNumber(kpis.totalCountFFB)} <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>FFB</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>HARVESTED BUNCHES</div>
            </div>
          </div>
        </div>

        {/* Loose Fruit Weight */}
        <div className="wkpi-card" style={{ minHeight: '140px', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
          <div className="wkpi-card__inner" style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={WEIGHT_ICON} alt="Loose Fruit" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '38px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>
                {fmtNumber(Number(kpis.totalWeight).toFixed(1))} <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>KG</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>LOOSE FRUIT WEIGHT</div>
            </div>
          </div>
        </div>

        {/* Unripe FFB */}
        <div className="wkpi-card" style={{ minHeight: '140px', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
          <div className="wkpi-card__inner" style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={UNRIPE_ICON} alt="Unripe FFB" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '38px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>
                {fmtNumber(kpis.totalUnripe || 0)} <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>FFB</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>UNRIPE FFB</div>
            </div>
          </div>
        </div>

        {/* Rotten FFB */}
        <div className="wkpi-card" style={{ minHeight: '140px', padding: '24px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
          <div className="wkpi-card__inner" style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={ROTTEN_ICON} alt="Rotten FFB" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '38px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>
                {fmtNumber(kpis.totalRotten || 0)} <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>FFB</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '6px' }}>ROTTEN FFB</div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacious Premium Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px', padding: '20px', marginBottom: '24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px' }}>

        {/* Search */}
        <div style={{ flex: '1.5', minWidth: '200px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Search Worker / Role</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}><Search size={16} /></span>
            <input
              type="text"
              className="select-input"
              placeholder="e.g. John Cutter"
              style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', paddingLeft: '36px', fontSize: '14px', fontWeight: 600 }}
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        {/* Plot ID */}
        <div style={{ flex: '1', minWidth: '130px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Plot ID</label>
          <input
            type="text"
            className="select-input"
            placeholder="e.g. EST1-A1.1"
            style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600 }}
            value={filters.plot}
            onChange={e => setFilters({ ...filters, plot: e.target.value })}
          />
        </div>

        {/* Team */}
        <div style={{ flex: '1', minWidth: '130px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Team</label>
          <input
            type="text"
            className="select-input"
            placeholder="e.g. Team A"
            style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600 }}
            value={filters.team}
            onChange={e => setFilters({ ...filters, team: e.target.value })}
          />
        </div>

        {/* Contractor */}
        <div style={{ flex: '1', minWidth: '140px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Contractor</label>
          <input
            type="text"
            className="select-input"
            placeholder="e.g. Direct Workforce"
            style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600 }}
            value={filters.contractor}
            onChange={e => setFilters({ ...filters, contractor: e.target.value })}
          />
        </div>

        {/* Start Date */}
        <div style={{ flex: '0.8', minWidth: '130px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>Start Date</label>
          <input
            type="date"
            className="select-input"
            style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600 }}
            value={filters.from}
            onChange={e => setFilters({ ...filters, from: e.target.value })}
          />
        </div>

        {/* End Date */}
        <div style={{ flex: '0.8', minWidth: '130px' }}>
          <label style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>End Date</label>
          <input
            type="date"
            className="select-input"
            style={{ width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600 }}
            value={filters.to}
            onChange={e => setFilters({ ...filters, to: e.target.value })}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', minWidth: '220px', alignItems: 'center' }}>
          <button className="btn btn--outline" onClick={handleReset} style={{ height: '42px', flex: 1, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '10px' }}>
            <RotateCcw size={15} /> Reset
          </button>

          {isViewer ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled
              title="Viewer accounts cannot export CSV from the portal"
              style={{
                height: '42px', flex: 1.2, fontWeight: 500, fontSize: '12px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: '#94a3b8', borderColor: '#94a3b8', cursor: 'not-allowed', opacity: 0.7
              }}
            >
              <Lock size={15} /> Export CSV
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={openExportModal}
              title="Select columns to export CSV"
              style={{
                height: '42px', flex: 1.2, fontWeight: 500, fontSize: '12px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Download size={15} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Column Visibility Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div role="tablist" style={{ display: 'inline-flex', gap: '4px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#FFFFFF' }}>
          {[['harvester', 'Harvester Workers'], ['picker', 'Picker Workers']].map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={roleTab === key}
              onClick={() => { setRoleTab(key); setCurrentPage(1); }}
              style={{
                border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                background: roleTab === key ? 'var(--clr-brand-primary)' : 'transparent',
                color: roleTab === key ? '#FFFFFF' : '#334155'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Column Visibility Dropdown */}
        <div className="col-toggle-wrapper" ref={colDropdownRef}>
          <button
            type="button"
            className={`col-toggle-btn ${colDropdownOpen ? 'col-toggle-btn--active' : ''}`}
            onClick={() => setColDropdownOpen(prev => !prev)}
            aria-expanded={colDropdownOpen}
            title="Choose which columns appear on table and CSV export"
          >
            <Columns size={16} />
            <span>Columns ({activeCols.length}/{(roleTab === 'picker' ? PICKER_COLS : HARVESTER_COLS).length})</span>
            <ChevronDown size={14} style={{ transform: colDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {colDropdownOpen && (
            <div className="col-toggle-dropdown">
              <div className="col-toggle-header">
                <span>Display Columns</span>
                <span>{activeCols.length} of {(roleTab === 'picker' ? PICKER_COLS : HARVESTER_COLS).length} active</span>
              </div>
              <div className="col-toggle-list">
                {(roleTab === 'picker' ? PICKER_COLS : HARVESTER_COLS).map(col => {
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
                <button
                  type="button"
                  className="col-toggle-footer-btn"
                  onClick={resetToDefaultCols}
                  title="Restore default visible columns"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  className="col-toggle-footer-btn"
                  onClick={showAllCols}
                  title={isViewer ? 'Show all allowed columns' : 'Show all columns'}
                >
                  Show All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
          Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(totalCount, currentPage * pageSize)} of {totalCount.toLocaleString()} entries
        </div>
      </div>

      {/* Table Container */}
      <div className="worker-table-shell" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Only show the loader on first load; refreshes update the table in place. */}
        {loading && records.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: '12px', padding: '40px' }}>
            <div className="loader-spinner"></div>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>Fetching Data...</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="worker-records-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr>
                  {activeCols.map(col => (
                    <th
                      key={col.key}
                      className={col.numClass || ''}
                      style={col.key === 'plot' ? { color: 'var(--clr-brand-primary)' } : undefined}
                    >
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
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={activeCols.length || 1} className="worker-empty-state">
                      No approved {roleTab === 'picker' ? 'picker' : 'harvester'} records match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((row) => (
                    <tr key={row.id} className="worker-row">
                      {activeCols.map(col => (
                        <td
                          key={col.key}
                          className={col.tdClass || 'worker-cell'}
                          style={col.tdStyle}
                        >
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="table-pagination-bar">
        <div className="table-pagination-bar__info">
          Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(totalCount, currentPage * pageSize)} of {totalCount.toLocaleString()} entries
        </div>
        <div className="table-pagination-bar__controls">
          <button
            className="pg-btn"
            disabled={currentPage === 1}
            onClick={() => {
              setCurrentPage(Math.max(1, currentPage - 1));
              scrollPageTop();
            }}
          >
            Previous
          </button>

          {pageNumbers.startPage > 1 && (
            <>
              <button
                className={`pg-btn ${currentPage === 1 ? 'pg-btn--active' : ''}`}
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
              className={`pg-btn ${currentPage === p ? 'pg-btn--active' : ''}`}
              onClick={() => { setCurrentPage(p); scrollPageTop(); }}
            >
              {p}
            </button>
          ))}

          {pageNumbers.endPage < totalPages && (
            <>
              {pageNumbers.endPage < totalPages - 1 && <span className="pg-ellipsis">...</span>}
              <button
                className={`pg-btn ${currentPage === totalPages ? 'pg-btn--active' : ''}`}
                onClick={() => { setCurrentPage(totalPages); scrollPageTop(); }}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            className="pg-btn"
            disabled={currentPage === totalPages}
            onClick={() => {
              setCurrentPage(Math.min(totalPages, currentPage + 1));
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
        columns={roleTab === 'picker' ? PICKER_COLS : HARVESTER_COLS}
        tableVisibleKeys={activeCols.map(c => c.key)}
        onExport={handleConfirmExport}
        isViewer={isViewer}
      />
    </div>
  );
}
