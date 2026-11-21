import { getRole, getUserEmail } from '../utils/access';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { EstateOptions } from '../components/EstateOptions';
import { PLOT_ICON, FFB_ICON, WEIGHT_ICON, ROTTEN_ICON, UNRIPE_ICON } from '../utils/icons';
import { exportFileName } from '../utils/exportName';
import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { fmtAbbrev, fmtDayShort, fmtNumber } from '../utils/formatters';
import { Map as MapIcon, TrendingUp, Scale, AlertCircle, CheckCircle2, Search, Download, RotateCcw, X, Layers, Zap, Lock } from 'lucide-react';
import { API } from '../services/api';
import { CONFIG } from '../config';
import { BunchWeightView } from './BunchWeightView';

import { Bar, Line } from 'react-chartjs-2';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler
} from 'chart.js';
import { scrollPageTop } from '../utils/scroll';
import ExportColumnsModal from '../components/ExportColumnsModal';

const PLOT_EXPORT_COLS = [
  { key: 'date', header: 'Date' },
  { key: 'plot_id', header: 'Plot ID' },
  { key: 'harvCount', header: 'Harvested FFB' },
  { key: 'harvAi', header: 'Harvest AI Count' },
  { key: 'loadCount', header: 'Loaded FFB' },
  { key: 'loadAi', header: 'Loaded AI Count' },
  { key: 'rotten', header: 'Rotten Bunches' },
  { key: 'unripe', header: 'Unripe Bunches' },
  { key: 'harvWeight', header: 'Harvest Weight (kg)' },
  { key: 'loadWeight', header: 'Load Weight (kg)' },
  { key: 'duration', header: 'Duration (hrs)' },
  { key: 'status', header: 'Status' },
];

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ChartTitle,
  ChartTooltip,
  ChartLegend,
  Filler
);

const ICONS = {
  plot: <MapIcon size={24} />,
  ffb: <Layers size={24} />,
  weight: <Scale size={24} />,
  unripe: <AlertCircle size={24} />,
  rotten: <AlertCircle size={24} />,
  check: <CheckCircle2 size={24} />,
  search: <Search size={14} />,
};

export function PlotView() {
  const { filters, updateFilters, resetFilters } = useAppContext();
  const refreshTick = useRefreshTick(); // top-bar Refresh reloads this page's data
  const userRole = getRole();
  const isViewer = userRole === 'View';
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [plotStats, setPlotStats] = useState({ trend: [], table: [], cards: [], total: 0 });

  const [activeSubpage, setActiveSubpage] = useState('main');

  // Fetch Plot-Specific Analytics
  useEffect(() => {
    const fetchPlotData = async () => {

      try {
        // allSettled: one failed request no longer blanks the charts and table.
        const [trendRes, tableRes, cardRes] = (await Promise.allSettled([
          API.fetchPlotProductionTrend(filters),
          API.fetchPlotTable({ ...filters, page: currentPage, size: pageSize }),
          API.fetchPlotCards(filters)
        ])).map(r => (r.status === 'fulfilled' ? r.value : {}));
        setPlotStats({
          trend: trendRes.items || [],
          table: tableRes.items || [],
          cards: cardRes.items || [],
          total: tableRes.total || (tableRes.items?.length || 0)
        });
      } catch (err) {
        console.error('Failed to fetch plot stats', err);
      }
    };
    fetchPlotData();
  }, [filters, currentPage, pageSize, refreshTick]);


  const aggregatedMaster = useMemo(() => {
    return plotStats.table.map(row => ({
      ...row,
      date: row.date_from,
      harvCount: row.total_harvested_count,
      loadCount: row.total_loaded_count,
      rotten: row.total_rotten,
      unripe: 0, // Not explicitly in plot_table schema, use 0 or check if rotten includes it
      harvWeight: row.h_total_weight_kg,
      loadWeight: row.l_total_weight_kg,
      duration: 0, // Not in plot_table schema
      status: 'APPROVED' // Materialized table records are inherently approved
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [plotStats.table]);

  const filteredAgg = aggregatedMaster; // Filtering is done at backend now

  const totalPages = Math.max(1, Math.ceil((plotStats.total || filteredAgg.length) / pageSize));
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

  const paginatedAgg = filteredAgg;

  // Column header filters
  const [colFilters, setColFilters] = useState({});
  const updateColFilter = (key, value) => setColFilters(prev => ({ ...prev, [key]: value }));

  const filteredPaginatedAgg = useMemo(() => {
    return paginatedAgg.filter(row => {
      return Object.entries(colFilters).every(([key, val]) => {
        if (!val) return true;
        const q = val.toLowerCase();
        let cell = '';
        switch (key) {
          case 'date': cell = row.date || ''; break;
          case 'plot_id': cell = row.plot_id || ''; break;
          case 'harvCount': cell = String(row.harvCount ?? ''); break;
          case 'loadCount': cell = String(row.loadCount ?? ''); break;
          case 'rotten': cell = String(row.rotten ?? ''); break;
          case 'harvWeight': cell = String(row.harvWeight ?? ''); break;
          case 'loadWeight': cell = String(row.loadWeight ?? ''); break;
          case 'duration': cell = String(row.duration ?? ''); break;
          case 'difference': cell = String(Math.abs(row.difference ?? 0)); break;
          default: return true;
        }
        return cell.toLowerCase().includes(q);
      });
    });
  }, [paginatedAgg, colFilters]);

  const kpis = useMemo(() => {
    const approvedCards = plotStats.cards.filter(p => !p.approval_status || p.approval_status.toUpperCase() === 'APPROVED');
    const totalFFB = approvedCards.reduce((s, p) => s + (p.total_harvested_count || 0), 0);
    const totalWeight = approvedCards.reduce((s, p) => s + (p.total_harvested_weight || 0), 0);
    const totalRotten = approvedCards.reduce((s, p) => s + (p.total_rotten_count || 0), 0);
    const totalUnripe = approvedCards.reduce((s, p) => s + (p.total_unripe_count || 0), 0);
    const totalPlots = new Set(approvedCards.map(p => p.plot_id)).size; // cards are per plot and day

    return [
      { icon: PLOT_ICON, var: 'green', label: 'Operational Plots', value: totalPlots.toLocaleString('en-NG'), note: 'Active harvest Plots tracked' },
      { icon: FFB_ICON, var: 'blue', label: 'FFB Bunches (AI)', value: fmtAbbrev(totalFFB), note: 'Harvested bunches captured' },
      { icon: WEIGHT_ICON, var: 'orange', label: 'Gross Weight', value: fmtAbbrev(totalWeight), unit: 'kg', note: 'Loose fruit total weight' },
      { icon: ROTTEN_ICON, var: 'red', label: 'Rotten FFB', value: fmtAbbrev(totalRotten), note: 'Total rotten bunches flagged' },
      { icon: UNRIPE_ICON, var: 'teal', label: 'Unripe FFB', value: fmtAbbrev(totalUnripe), note: 'Premature harvest capture' },
    ];
  }, [plotStats.cards]);

  const barChartData = useMemo(() => {
    const subset = [...filteredAgg].sort((a, b) => b.harvCount - a.harvCount).slice(0, 20);
    return {
      labels: subset.map(p => p.plot_id),
      datasets: [
        { label: 'Harvested', data: subset.map(p => p.harvCount), backgroundColor: '#034321', borderRadius: 4, barThickness: 16 },
        { label: 'Loaded', data: subset.map(p => p.loadCount), backgroundColor: '#f97316', borderRadius: 4, barThickness: 16 },
      ]
    };
  }, [filteredAgg]);

  const lineChartData = useMemo(() => {
    // Aggregate by date to handle cases where multiple plots remain in the trend view
    const aggregated = (plotStats.trend || []).reduce((acc, d) => {
      const key = (d.date_from || d.date_to || '').split('T')[0];
      if (!key) return acc;
      if (!acc[key]) acc[key] = { date: key, total_harvested_count: 0 };
      acc[key].total_harvested_count += (d.total_harvested_count || 0);
      return acc;
    }, {});
    const data = Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

    return {
      labels: data.map(d => fmtDayShort(d.date)),
      datasets: [{
        label: 'Daily Production (FFB)',
        data: data.map(d => d.total_harvested_count),
        borderColor: '#034321',
        backgroundColor: 'rgba(3, 67, 33, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      }]
    };
  }, [plotStats.trend]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { boxWidth: 10, boxHeight: 10, color: '#0f172a', usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: 600 } }
      },
      tooltip: { backgroundColor: '#0f172a', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 10 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#0f172a', font: { size: 10, weight: 600 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.18)' }, ticks: { color: '#0f172a', font: { size: 10 } } }
    }
  };

  const uniquePlots = useMemo(() => {
    const s = new Set(aggregatedMaster.map(r => r.plot_id));
    return Array.from(s).sort();
  }, [aggregatedMaster]);

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleConfirmExport = (selectedKeys) => {
    const colMap = Object.fromEntries(PLOT_EXPORT_COLS.map(c => [c.key, c.header]));
    const headers = selectedKeys.map(k => colMap[k] || k);
    const rows = [
      headers.join(','),
      ...filteredAgg.map(row =>
        selectedKeys.map(k => {
          const val = row[k] ?? '';
          return typeof val === 'string' && /[",\n]/.test(val)
            ? `"${val.replace(/"/g, '""')}"`
            : JSON.stringify(val);
        }).join(',')
      )
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
    a.download = exportFileName('plot_analytics_plots');
    a.click();
  };

  // Row click details removed

  if (activeSubpage === 'bunch-weight') {
    return <BunchWeightView onBack={() => setActiveSubpage('main')} />;
  }

  return (
    <div className="view-container view-fade-in plot-view" style={{ padding: '32px', maxWidth: '100%', width: '100%' }}>
      <div className="view-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 className="view-title" style={{ margin: 0 }}>Plot Analytics Dashboard</h1>
            <p className="view-subtitle plot-view__subtitle" style={{ margin: '4px 0 0 0' }}>Daily plot-level aggregation for harvested and loaded volumes, quality signals, and verification status.</p>
          </div>
          <button 
            className="btn btn--outline"
            onClick={() => setActiveSubpage('bunch-weight')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 800,
              borderRadius: '10px',
              border: '1px solid var(--clr-brand-primary)',
              backgroundColor: 'transparent',
              color: 'var(--clr-brand-primary)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--clr-brand-primary)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--clr-brand-primary)';
            }}
          >
            <Scale size={16} />
            <span>Bunch Weight Audit</span>
          </button>
        </div>
      </div>

      {/* Unified 6-Item Single-Line Filter Bar */}
      <div className="analytics-filter-bar" style={{
        marginBottom: '24px', padding: '16px 20px', background: 'white',
        borderRadius: '12px', display: 'flex', flexWrap: 'nowrap', gap: '14px', alignItems: 'flex-end',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', width: '100%'
      }}>
        {/* 1. Search Plot */}
        <div className="filter-group" style={{ flex: '2 1 240px', minWidth: '180px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>Search Plot</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>{ICONS.search}</span>
            <input
              type="search"
              className="search-input"
              list="plot-suggestions"
              style={{ paddingLeft: '36px', height: '40px', borderRadius: '8px', width: '100%', fontSize: '13px', border: '1px solid #cbd5e1' }}
              placeholder="Search Plot ID (e.g. B3.2, EST1-A1.1)..."
              value={filters.search}
              onChange={e => updateFilters({ search: e.target.value })}
            />
            <datalist id="plot-suggestions">
              {uniquePlots.map(pid => <option key={pid} value={pid} />)}
            </datalist>
          </div>
        </div>

        {/* 2. Plantation Location */}
        <div className="filter-group" style={{ flex: '1.2 1 160px', minWidth: '140px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>Plantation Location</label>
          <select className="select-input" style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }} value={filters.estate || ''} onChange={(e) => updateFilters({ estate: e.target.value || null })}>
            <EstateOptions allLabel="All Farms" />
          </select>
        </div>

        {/* 3. Start Date */}
        <div className="filter-group" style={{ flex: '1 1 140px', minWidth: '130px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>Start Date</label>
          <input
            type="date"
            className="date-input"
            style={{ width: '100%', height: '40px', borderRadius: '8px', padding: '0 10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600 }}
            value={filters.dateRange.from || ''}
            onChange={e => updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value || null } })}
          />
        </div>

        {/* 4. End Date */}
        <div className="filter-group" style={{ flex: '1 1 140px', minWidth: '130px' }}>
          <label className="filter-label" style={{ marginBottom: '6px', display: 'block', fontSize: '11px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>End Date</label>
          <input
            type="date"
            className="date-input"
            style={{ width: '100%', height: '40px', borderRadius: '8px', padding: '0 10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600 }}
            value={filters.dateRange.to || ''}
            onChange={e => updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value || null } })}
          />
        </div>

        {/* 5. Reset Button */}
        <button 
          className="btn btn--outline" 
          onClick={resetFilters} 
          style={{ height: '40px', padding: '0 16px', fontWeight: 800, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <RotateCcw size={14} /> RESET
        </button>

        {/* 6. Export CSV Button */}
        <button 
          className="btn btn--primary" 
          onClick={isViewer ? undefined : () => setExportModalOpen(true)}
          disabled={isViewer}
          title={isViewer ? 'Viewer accounts cannot export CSV from the portal' : 'Export CSV'}
          style={{
            padding: '0 20px', height: '40px', fontWeight: 900, fontSize: '12px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', flexShrink: 0,
            background: isViewer ? '#94a3b8' : undefined,
            borderColor: isViewer ? '#94a3b8' : undefined,
            cursor: isViewer ? 'not-allowed' : 'pointer',
            opacity: isViewer ? 0.7 : 1,
            boxShadow: isViewer ? 'none' : '0 2px 8px rgba(3, 67, 33, 0.2)'
          }}
        >
          {isViewer ? <Lock size={15} /> : <Download size={15} />} EXPORT CSV
        </button>
      </div>

      <div className="worker-kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {kpis.map((kpi, i) => (
          <div key={i} className={`wkpi-card wkpi-card--${kpi.var}`}>
            <div className="wkpi-card__inner">
              {kpi.icon && (
                <div className="wkpi-icon">
                  {typeof kpi.icon === 'string' ? (
                    <img src={kpi.icon} alt={kpi.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    kpi.icon
                  )}
                </div>
              )}
              <div>
                <div className="wkpi-value">
                  {kpi.value}
                  {kpi.unit ? <span className="wkpi-unit">{kpi.unit}</span> : null}
                </div>
                <div className="wkpi-label">{kpi.label}</div>
                {kpi.note && <div className="wkpi-sub" style={{ fontSize: '10px', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>{kpi.note}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div className="chart-card">
          <div className="chart-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="chart-title">Production Trend</h2>
              <span className="chart-subtitle">Daily yield over last 14 reporting days</span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: '#034321', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Harvested</span>
              </div>
            </div>
          </div>
          <div className="chart-body" style={{ minHeight: '300px' }}>
            <Line data={lineChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="chart-title">Harvest vs Load Scale</h2>
              <span className="chart-subtitle">Plot-level reconciliation comparison</span>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: '#034321', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Harvested</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', background: '#f97316', borderRadius: '50%' }}></div>
                <span style={{ fontSize: '13px', fontWeight: 800 }}>Loaded</span>
              </div>
            </div>
          </div>
          <div className="chart-body" style={{ minHeight: '300px' }}>
            <Bar data={barChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
          </div>
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
          Showing {filteredAgg.length === 0 ? 0 : (activePage - 1) * pageSize + 1} to {Math.min(filteredAgg.length, activePage * pageSize)} of {filteredAgg.length.toLocaleString()} entries
        </div>
      </div>

      <div className="plot-table-shell">
        <div className="plot-table-scroll">
          <table className="plot-records-table" aria-label="Plot aggregate records">
            <thead>
              <tr>
                <th>Date<br/><input type="text" placeholder="Filter..." value={colFilters.date || ''} onChange={e => updateColFilter('date', e.target.value)} className="col-filter-input" /></th>
                <th>Plot ID<br/><input type="text" placeholder="Filter..." value={colFilters.plot_id || ''} onChange={e => updateColFilter('plot_id', e.target.value)} className="col-filter-input" /></th>
                <th className="plot-cell--num">Harvested FFB<br/><input type="text" placeholder="Filter..." value={colFilters.harvCount || ''} onChange={e => updateColFilter('harvCount', e.target.value)} className="col-filter-input" /></th>
                <th className="plot-cell--num">Loaded FFB<br/><input type="text" placeholder="Filter..." value={colFilters.loadCount || ''} onChange={e => updateColFilter('loadCount', e.target.value)} className="col-filter-input" /></th>
                <th className="plot-cell--num">Rotten<br/><input type="text" placeholder="Filter..." value={colFilters.rotten || ''} onChange={e => updateColFilter('rotten', e.target.value)} className="col-filter-input" /></th>
                <th className="plot-cell--num">Harvested Weight (kg)<br/><input type="text" placeholder="Filter..." value={colFilters.harvWeight || ''} onChange={e => updateColFilter('harvWeight', e.target.value)} className="col-filter-input" /></th>
                <th className="plot-cell--num">Loaded Weight (kg)<br/><input type="text" placeholder="Filter..." value={colFilters.loadWeight || ''} onChange={e => updateColFilter('loadWeight', e.target.value)} className="col-filter-input" /></th>
                <th className="plot-cell--num">Duration<br/><input type="text" placeholder="Filter..." value={colFilters.duration || ''} onChange={e => updateColFilter('duration', e.target.value)} className="col-filter-input" /></th>
                <th className="plot-cell--num" style={{ textAlign: 'center' }}>Difference<br/><input type="text" placeholder="Filter..." value={colFilters.difference || ''} onChange={e => updateColFilter('difference', e.target.value)} className="col-filter-input" /></th>
              </tr>
            </thead>
            <tbody>
              {filteredPaginatedAgg.length === 0 ? (
                <tr>
                  <td colSpan={9} className="plot-empty-state">No plot records match the current filters.</td>
                </tr>
              ) : (
                filteredPaginatedAgg.map((row, index) => {
                  const diff = Math.abs(row.difference ?? 0); // harvested - rotten - loaded (server rule)
                  let diffColor = '#000';
                  let diffBg = 'transparent';
                  let diffTone = 'neutral';
                  if (diff > 50) { diffColor = '#be123c'; diffBg = '#fff1f2'; diffTone = 'high'; }
                  else if (diff > 10) { diffColor = '#92400e'; diffBg = '#fef3c7'; diffTone = 'medium'; }
                  else { diffColor = '#034321'; diffBg = '#E8F2E5'; diffTone = 'low'; }

                  return (
                    <tr
                      key={`${row.date}_${row.plot_id}_${index}`}
                      className="plot-row"
                    >
                      <td className="plot-cell" style={{ color: '#000', fontSize: '14px' }}>{row.date}</td>
                      <td className="plot-cell"><span style={{ color: '#000', fontWeight: 900, fontSize: '16px' }}>{row.plot_id}</span></td>
                      <td className="plot-cell plot-cell--num" style={{ color: '#000', fontWeight: 900, fontSize: '16px' }}>{fmtNumber(row.harvCount)}</td>
                      <td className="plot-cell plot-cell--num" style={{ color: '#000', fontWeight: 800, fontSize: '16px' }}>{fmtNumber(row.loadCount)}</td>
                      <td className="plot-cell plot-cell--num" style={{ color: '#000', fontSize: '16px', fontWeight: 800 }}>{fmtNumber(row.rotten)}</td>
                      <td className="plot-cell plot-cell--num" style={{ color: '#000', fontWeight: 900, fontSize: '16px' }}>{fmtNumber(row.harvWeight)} kg</td>
                      <td className="plot-cell plot-cell--num" style={{ color: '#000', fontSize: '15px' }}>{fmtNumber(row.loadWeight)} kg</td>
                      <td className="plot-cell plot-cell--num" style={{ color: '#000', fontSize: '14px' }}>{fmtNumber(row.duration)} min</td>
                      <td className="plot-cell plot-cell--num" style={{ textAlign: 'center', background: diffBg, color: diffColor, fontWeight: 700 }}>
                        {diff}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-pagination-bar">
        <div className="table-pagination-bar__info">
          Showing {filteredAgg.length === 0 ? 0 : (activePage - 1) * pageSize + 1} to {Math.min(filteredAgg.length, activePage * pageSize)} of {filteredAgg.length.toLocaleString()} entries
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
        columns={PLOT_EXPORT_COLS}
        onExport={handleConfirmExport}
        isViewer={isViewer}
      />
    </div>
  );
}
