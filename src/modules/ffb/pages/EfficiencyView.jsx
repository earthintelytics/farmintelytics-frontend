import { useRefreshTick } from '../hooks/useRefreshTick';
import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { fmtNumber, fmtAbbrev } from '../utils/formatters';
import { Trophy, Truck, Users, TrendingUp, Award, Shield, Building2, ClipboardCheck, Search, ChevronRight, Filter } from 'lucide-react';
import { API } from '../services/api';

const EMPTY_RANKS = { cutters: [], pickers: [], harvesting_clerks: [], loading_clerks: [], contractors: [] };

export function EfficiencyView() {
  const { filters } = useAppContext();
  const refreshTick = useRefreshTick(); // top-bar Refresh reloads this page's data
  const [activeTab, setActiveTab] = useState('harvesters');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setLoading] = useState(false);
  const [ranks, setRanks] = useState(EMPTY_RANKS);

  // Pagination states for all tables
  const [currentPageHarvester, setCurrentPageHarvester] = useState(1);
  const [currentPagePicker, setCurrentPagePicker] = useState(1);
  const [currentPageLoader, setCurrentPageLoader] = useState(1);
  const [currentPageRecorder, setCurrentPageRecorder] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Reset page numbers on filters/search/tab changes
  useEffect(() => {
    setCurrentPageHarvester(1);
    setCurrentPagePicker(1);
    setCurrentPageLoader(1);
    setCurrentPageRecorder(1);
  }, [filters, searchQuery, activeTab]);

  // Ranks are counted on the server from every harvest and loading record (no paging cut-off).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    API.fetchEfficiencyRanks(filters)
      .then(res => { if (alive) setRanks(res || EMPTY_RANKS); })
      .catch(err => console.error('Failed to fetch efficiency data', err))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filters, refreshTick]);

  const analytics = useMemo(() => ({
    topHC: ranks.harvesting_clerks[0],
    topLC: ranks.loading_clerks[0],
    topHarv: ranks.cutters[0],
    topPick: ranks.pickers[0],
    topCont: ranks.contractors[0],
    lClerks: ranks.loading_clerks,
    hClerks: ranks.harvesting_clerks,
    harvesters: ranks.cutters,
    pickers: ranks.pickers,
    contractors: ranks.contractors,
  }), [ranks]);

  const TABS = [
    { id: 'harvesters', label: 'Cutter Rank', icon: Users },
    { id: 'pickers', label: 'Picker Rank', icon: TrendingUp },
    { id: 'loaders', label: 'Loading Clerk Rank', icon: Truck },
    { id: 'recorders', label: 'Harvesting Clerk Rank', icon: ClipboardCheck },
    { id: 'contractors', label: 'Contractor Efficiency', icon: Building2 },
  ];

  // eslint-disable-next-line no-unused-vars
  const LeaderCard = ({ item, title, icon: IconComponent, color, metricLabel, value, subLabel, subValue, isContractor, tabId }) => {
    if (!item) return null;
    return (
      <div className={`perf-card perf-card--${color}`} onClick={() => setActiveTab(tabId)} style={{ cursor: 'pointer' }}>
        <div className="perf-card__header">
          <div className="perf-card__icon"><IconComponent size={20} /></div>
          <div className="perf-card__badge">ELITE RANK</div>
        </div>
        <div className="perf-card__body">
          <div className="perf-card__title">{title}</div>
          <div className="perf-card__name" title={item.name}>{item.name}</div>
          <div className="perf-card__id">{isContractor ? `${item.records} OPS` : item.id}</div>
        </div>
        <div className="perf-card__footer">
          <div className="perf-stat">
            <div className="perf-stat__val">{value != null ? fmtAbbrev(value) : '0'}</div>
            <div className="perf-stat__lbl">{metricLabel}</div>
          </div>
          <div className="perf-stat">
            <div className="perf-stat__val">{subValue != null ? fmtNumber(subValue) : '0'}</div>
            <div className="perf-stat__lbl">{subLabel}</div>
          </div>
          <div className="perf-card__action">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    );
  };

  const filteredHarvesters = analytics.harvesters.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredPickers = analytics.pickers.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Harvester Pagination Calculations
  const totalPagesHarvester = Math.max(1, Math.ceil(filteredHarvesters.length / pageSize));
  const activePageHarvester = currentPageHarvester > totalPagesHarvester ? totalPagesHarvester : currentPageHarvester;
  const pageNumbersHarvester = useMemo(() => {
    const pages = [];
    let startPage = Math.max(1, activePageHarvester - 2);
    let endPage = Math.min(totalPagesHarvester, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return { pages, startPage, endPage };
  }, [activePageHarvester, totalPagesHarvester]);

  const paginatedHarvesters = useMemo(() => {
    return filteredHarvesters.slice((activePageHarvester - 1) * pageSize, activePageHarvester * pageSize);
  }, [filteredHarvesters, activePageHarvester, pageSize]);

  // Picker Pagination Calculations
  const totalPagesPicker = Math.max(1, Math.ceil(filteredPickers.length / pageSize));
  const activePagePicker = currentPagePicker > totalPagesPicker ? totalPagesPicker : currentPagePicker;
  const pageNumbersPicker = useMemo(() => {
    const pages = [];
    let startPage = Math.max(1, activePagePicker - 2);
    let endPage = Math.min(totalPagesPicker, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return { pages, startPage, endPage };
  }, [activePagePicker, totalPagesPicker]);

  const paginatedPickers = useMemo(() => {
    return filteredPickers.slice((activePagePicker - 1) * pageSize, activePagePicker * pageSize);
  }, [filteredPickers, activePagePicker, pageSize]);

  const filteredLoaders = useMemo(() => {
    return analytics.lClerks.filter(w =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(w.id).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [analytics.lClerks, searchQuery]);

  const filteredRecorders = useMemo(() => {
    return analytics.hClerks.filter(w =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(w.id).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [analytics.hClerks, searchQuery]);

  // Loader Pagination Calculations
  const totalPagesLoader = Math.max(1, Math.ceil(filteredLoaders.length / pageSize));
  const activePageLoader = currentPageLoader > totalPagesLoader ? totalPagesLoader : currentPageLoader;
  const pageNumbersLoader = useMemo(() => {
    const pages = [];
    let startPage = Math.max(1, activePageLoader - 2);
    let endPage = Math.min(totalPagesLoader, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return { pages, startPage, endPage };
  }, [activePageLoader, totalPagesLoader]);

  const paginatedLoaders = useMemo(() => {
    return filteredLoaders.slice((activePageLoader - 1) * pageSize, activePageLoader * pageSize);
  }, [filteredLoaders, activePageLoader, pageSize]);

  // Recorder Pagination Calculations
  const totalPagesRecorder = Math.max(1, Math.ceil(filteredRecorders.length / pageSize));
  const activePageRecorder = currentPageRecorder > totalPagesRecorder ? totalPagesRecorder : currentPageRecorder;
  const pageNumbersRecorder = useMemo(() => {
    const pages = [];
    let startPage = Math.max(1, activePageRecorder - 2);
    let endPage = Math.min(totalPagesRecorder, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return { pages, startPage, endPage };
  }, [activePageRecorder, totalPagesRecorder]);

  const paginatedRecorders = useMemo(() => {
    return filteredRecorders.slice((activePageRecorder - 1) * pageSize, activePageRecorder * pageSize);
  }, [filteredRecorders, activePageRecorder, pageSize]);

  return (
    <div className="view-container view-fade-in efficiency-view" style={{ padding: '40px 0' }}>
      <div className="board-wrapper" style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 32px' }}>
        
        {/* --- Header Section --- */}
        <div className="view-header" style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--clr-brand-primary)', padding: '16px', borderRadius: '12px', color: 'white', boxShadow: '0 12px 24px -8px rgba(3, 67, 33, 0.4)' }}>
              <Award size={32} />
            </div>
            <div>
              <h1 className="view-title" style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '-0.03em' }}>Operational Efficiency Board</h1>
              <p className="view-subtitle" style={{ fontSize: '16px', opacity: 0.7 }}>Tracking workforce excellence and operational density across Earthintelytics.</p>
            </div>
          </div>
          
          <div className="tab-navigation">
            {TABS.map(tab => (
              <button 
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* --- Sub-Page: Cutter Rank --- */}
        {activeTab === 'harvesters' && (
          <div className="tab-content view-fade-in">
            <div className="sub-page-header" style={{ marginBottom: '16px' }}>
              <div className="search-bar">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search cutters by name or ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="results-count">{filteredHarvesters.length} Cutters Indexed</div>
            </div>

            {/* Entries selector bar */}
            <div className="table-entries-bar" style={{ marginBottom: '16px' }}>
              <div className="table-entries-bar__left">
                Show
                <select 
                  value={pageSize} 
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPageHarvester(1);
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
                Showing {filteredHarvesters.length === 0 ? 0 : (activePageHarvester - 1) * pageSize + 1} to {Math.min(filteredHarvesters.length, activePageHarvester * pageSize)} of {filteredHarvesters.length.toLocaleString()} entries
              </div>
            </div>

            {/* Standard Styled Table */}
            <div className="plot-table-shell">
              <table className="plot-records-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rank</th>
                    <th>Cutter Name</th>
                    <th>Employee ID</th>
                    <th className="plot-cell--num">FFB Bunches (AI)</th>
                    <th className="plot-cell--num">Operations</th>
                    <th className="plot-cell--num">Avg Bunches/Op</th>
                    <th style={{ textAlign: 'center' }}>Performance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHarvesters.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="plot-empty-state">No cutter records match the search.</td>
                    </tr>
                  ) : (
                    paginatedHarvesters.map((w, i) => {
                      const actualIdx = (activePageHarvester - 1) * pageSize + i;
                      return (
                        <tr key={w.id} className="plot-row">
                          <td className="plot-cell" style={{ fontWeight: 800 }}>{actualIdx + 1}</td>
                          <td className="plot-cell" style={{ fontWeight: 800, color: '#0f172a' }}>{w.name}</td>
                          <td className="plot-cell">{w.id}</td>
                          <td className="plot-cell plot-cell--num" style={{ color: 'var(--clr-brand-primary)', fontWeight: 800 }}>{fmtNumber(w.bunches)}</td>
                          <td className="plot-cell plot-cell--num" style={{ fontWeight: 700 }}>{w.ops}</td>
                          <td className="plot-cell plot-cell--num" style={{ fontWeight: 700 }}>{(w.bunches / (w.ops || 1)).toFixed(1)}</td>
                          <td className="plot-cell" style={{ textAlign: 'center' }}>
                            <span className={`delta-pill ${w.bunches > 100 ? 'delta-pill--low' : 'delta-pill--medium'}`} style={{ color: w.bunches > 100 ? '#3F8432' : '#475569', fontWeight: 800 }}>
                              {w.bunches > 100 ? 'EXCEPTIONAL' : 'STANDARD'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="table-pagination-bar">
              <div className="table-pagination-bar__info">
                Showing {filteredHarvesters.length === 0 ? 0 : (activePageHarvester - 1) * pageSize + 1} to {Math.min(filteredHarvesters.length, activePageHarvester * pageSize)} of {filteredHarvesters.length.toLocaleString()} entries
              </div>
              <div className="table-pagination-bar__controls">
                <button
                  className="pg-btn"
                  disabled={activePageHarvester === 1}
                  onClick={() => setCurrentPageHarvester(Math.max(1, activePageHarvester - 1))}
                >
                  Previous
                </button>
                {pageNumbersHarvester.startPage > 1 && (
                  <>
                    <button
                      className={`pg-btn ${activePageHarvester === 1 ? 'pg-btn--active' : ''}`}
                      onClick={() => setCurrentPageHarvester(1)}
                    >
                      1
                    </button>
                    {pageNumbersHarvester.startPage > 2 && <span className="pg-ellipsis">...</span>}
                  </>
                )}
                {pageNumbersHarvester.pages.map(p => (
                  <button
                    key={p}
                    className={`pg-btn ${activePageHarvester === p ? 'pg-btn--active' : ''}`}
                    onClick={() => setCurrentPageHarvester(p)}
                  >
                    {p}
                  </button>
                ))}
                {pageNumbersHarvester.endPage < totalPagesHarvester && (
                  <>
                    {pageNumbersHarvester.endPage < totalPagesHarvester - 1 && <span className="pg-ellipsis">...</span>}
                    <button
                      className={`pg-btn ${activePageHarvester === totalPagesHarvester ? 'pg-btn--active' : ''}`}
                      onClick={() => setCurrentPageHarvester(totalPagesHarvester)}
                    >
                      {totalPagesHarvester}
                    </button>
                  </>
                )}
                <button
                  className="pg-btn"
                  disabled={activePageHarvester === totalPagesHarvester}
                  onClick={() => setCurrentPageHarvester(Math.min(totalPagesHarvester, activePageHarvester + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Sub-Page: Picker Rank --- */}
        {activeTab === 'pickers' && (
          <div className="tab-content view-fade-in">
             <div className="sub-page-header" style={{ marginBottom: '16px' }}>
              <div className="search-bar">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search pickers by name or ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="results-count">{filteredPickers.length} Pickers Indexed</div>
            </div>

            {/* Entries selector bar */}
            <div className="table-entries-bar" style={{ marginBottom: '16px' }}>
              <div className="table-entries-bar__left">
                Show
                <select 
                  value={pageSize} 
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPagePicker(1);
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
                Showing {filteredPickers.length === 0 ? 0 : (activePagePicker - 1) * pageSize + 1} to {Math.min(filteredPickers.length, activePagePicker * pageSize)} of {filteredPickers.length.toLocaleString()} entries
              </div>
            </div>

            {/* Standard Styled Table */}
            <div className="plot-table-shell">
              <table className="plot-records-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rank</th>
                    <th>Picker Name</th>
                    <th>Employee ID</th>
                    <th className="plot-cell--num">Loose Fruit (KG)</th>
                    <th className="plot-cell--num">Operations</th>
                    <th className="plot-cell--num">Avg KG/Op</th>
                    <th style={{ textAlign: 'center' }}>Performance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPickers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="plot-empty-state">No picker records match the search.</td>
                    </tr>
                  ) : (
                    paginatedPickers.map((w, i) => {
                      const actualIdx = (activePagePicker - 1) * pageSize + i;
                      return (
                        <tr key={w.id} className="plot-row">
                          <td className="plot-cell" style={{ fontWeight: 800 }}>{actualIdx + 1}</td>
                          <td className="plot-cell" style={{ fontWeight: 800, color: '#0f172a' }}>{w.name}</td>
                          <td className="plot-cell">{w.id}</td>
                          <td className="plot-cell plot-cell--num" style={{ color: '#3b82f6', fontWeight: 800 }}>{fmtNumber(w.weight)} kg</td>
                          <td className="plot-cell plot-cell--num" style={{ fontWeight: 700 }}>{w.ops}</td>
                          <td className="plot-cell plot-cell--num" style={{ fontWeight: 700 }}>{(w.weight / (w.ops || 1)).toFixed(1)}</td>
                          <td className="plot-cell" style={{ textAlign: 'center' }}>
                            <span className={`delta-pill ${w.weight > 200 ? 'delta-pill--low' : 'delta-pill--medium'}`} style={{ color: w.weight > 200 ? '#1d4ed8' : '#475569', fontWeight: 800 }}>
                              {w.weight > 200 ? 'HIGH YIELD' : 'CONSISTENT'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="table-pagination-bar">
              <div className="table-pagination-bar__info">
                Showing {filteredPickers.length === 0 ? 0 : (activePagePicker - 1) * pageSize + 1} to {Math.min(filteredPickers.length, activePagePicker * pageSize)} of {filteredPickers.length.toLocaleString()} entries
              </div>
              <div className="table-pagination-bar__controls">
                <button
                  className="pg-btn"
                  disabled={activePagePicker === 1}
                  onClick={() => setCurrentPagePicker(Math.max(1, activePagePicker - 1))}
                >
                  Previous
                </button>
                {pageNumbersPicker.startPage > 1 && (
                  <>
                    <button
                      className={`pg-btn ${activePagePicker === 1 ? 'pg-btn--active' : ''}`}
                      onClick={() => setCurrentPagePicker(1)}
                    >
                      1
                    </button>
                    {pageNumbersPicker.startPage > 2 && <span className="pg-ellipsis">...</span>}
                  </>
                )}
                {pageNumbersPicker.pages.map(p => (
                  <button
                    key={p}
                    className={`pg-btn ${activePagePicker === p ? 'pg-btn--active' : ''}`}
                    onClick={() => setCurrentPagePicker(p)}
                  >
                    {p}
                  </button>
                ))}
                {pageNumbersPicker.endPage < totalPagesPicker && (
                  <>
                    {pageNumbersPicker.endPage < totalPagesPicker - 1 && <span className="pg-ellipsis">...</span>}
                    <button
                      className={`pg-btn ${activePagePicker === totalPagesPicker ? 'pg-btn--active' : ''}`}
                      onClick={() => setCurrentPagePicker(totalPagesPicker)}
                    >
                      {totalPagesPicker}
                    </button>
                  </>
                )}
                <button
                  className="pg-btn"
                  disabled={activePagePicker === totalPagesPicker}
                  onClick={() => setCurrentPagePicker(Math.min(totalPagesPicker, activePagePicker + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Sub-Page: Loading Clerk Rank --- */}
        {activeTab === 'loaders' && (
          <div className="tab-content view-fade-in">
            <div className="sub-page-header" style={{ marginBottom: '16px' }}>
              <div className="search-bar">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search loading clerks by name or ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="results-count">{filteredLoaders.length} Loading Clerks Indexed</div>
            </div>

            {/* Entries selector bar */}
            <div className="table-entries-bar" style={{ marginBottom: '16px' }}>
              <div className="table-entries-bar__left">
                Show
                <select 
                  value={pageSize} 
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPageLoader(1);
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
                Showing {filteredLoaders.length === 0 ? 0 : (activePageLoader - 1) * pageSize + 1} to {Math.min(filteredLoaders.length, activePageLoader * pageSize)} of {filteredLoaders.length.toLocaleString()} entries
              </div>
            </div>

            {/* Standard Styled Table */}
            <div className="plot-table-shell">
              <table className="plot-records-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rank</th>
                    <th>Name / Employee ID</th>
                    <th className="plot-cell--num">Plots Covered</th>
                    <th className="plot-cell--num">Total Bunches</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLoaders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="plot-empty-state">No loading clerk records found.</td>
                    </tr>
                  ) : (
                    paginatedLoaders.map((w, i) => {
                      const actualIdx = (activePageLoader - 1) * pageSize + i;
                      return (
                        <tr key={w.id} className="plot-row">
                          <td className="plot-cell" style={{ fontWeight: 800 }}>{actualIdx + 1}</td>
                          <td className="plot-cell">
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{w.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{w.id}</div>
                          </td>
                          <td className="plot-cell plot-cell--num" style={{ fontWeight: 900, color: 'var(--clr-brand-secondary)' }}>{w.plotCount}</td>
                          <td className="plot-cell plot-cell--num" style={{ fontWeight: 750 }}>{fmtNumber(w.bunches)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="table-pagination-bar">
              <div className="table-pagination-bar__info">
                Showing {filteredLoaders.length === 0 ? 0 : (activePageLoader - 1) * pageSize + 1} to {Math.min(filteredLoaders.length, activePageLoader * pageSize)} of {filteredLoaders.length.toLocaleString()} entries
              </div>
              <div className="table-pagination-bar__controls">
                <button
                  className="pg-btn"
                  disabled={activePageLoader === 1}
                  onClick={() => setCurrentPageLoader(Math.max(1, activePageLoader - 1))}
                >
                  Previous
                </button>
                {pageNumbersLoader.startPage > 1 && (
                  <>
                    <button
                      className={`pg-btn ${activePageLoader === 1 ? 'pg-btn--active' : ''}`}
                      onClick={() => setCurrentPageLoader(1)}
                    >
                      1
                    </button>
                    {pageNumbersLoader.startPage > 2 && <span className="pg-ellipsis">...</span>}
                  </>
                )}
                {pageNumbersLoader.pages.map(p => (
                  <button
                    key={p}
                    className={`pg-btn ${activePageLoader === p ? 'pg-btn--active' : ''}`}
                    onClick={() => setCurrentPageLoader(p)}
                  >
                    {p}
                  </button>
                ))}
                {pageNumbersLoader.endPage < totalPagesLoader && (
                  <>
                    {pageNumbersLoader.endPage < totalPagesLoader - 1 && <span className="pg-ellipsis">...</span>}
                    <button
                      className={`pg-btn ${activePageLoader === totalPagesLoader ? 'pg-btn--active' : ''}`}
                      onClick={() => setCurrentPageLoader(totalPagesLoader)}
                    >
                      {totalPagesLoader}
                    </button>
                  </>
                )}
                <button
                  className="pg-btn"
                  disabled={activePageLoader === totalPagesLoader}
                  onClick={() => setCurrentPageLoader(Math.min(totalPagesLoader, activePageLoader + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Sub-Page: Harvesting Clerk Rank --- */}
        {activeTab === 'recorders' && (
          <div className="tab-content view-fade-in">
            <div className="sub-page-header" style={{ marginBottom: '16px' }}>
              <div className="search-bar">
                <Search size={18} />
                <input 
                  type="text" 
                  placeholder="Search harvesting clerks by name or ID..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="results-count">{filteredRecorders.length} Harvesting Clerks Indexed</div>
            </div>

            {/* Entries selector bar */}
            <div className="table-entries-bar" style={{ marginBottom: '16px' }}>
              <div className="table-entries-bar__left">
                Show
                <select 
                  value={pageSize} 
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPageRecorder(1);
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
                Showing {filteredRecorders.length === 0 ? 0 : (activePageRecorder - 1) * pageSize + 1} to {Math.min(filteredRecorders.length, activePageRecorder * pageSize)} of {filteredRecorders.length.toLocaleString()} entries
              </div>
            </div>

            {/* Standard Styled Table */}
            <div className="plot-table-shell">
              <table className="plot-records-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Rank</th>
                    <th>Name / Employee ID</th>
                    <th className="plot-cell--num">Operations Rec.</th>
                    <th className="plot-cell--num">Plots Monitored</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecorders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="plot-empty-state">No harvesting clerk records found.</td>
                    </tr>
                  ) : (
                    paginatedRecorders.map((w, i) => {
                      const actualIdx = (activePageRecorder - 1) * pageSize + i;
                      return (
                        <tr key={w.id} className="plot-row">
                          <td className="plot-cell" style={{ fontWeight: 800 }}>{actualIdx + 1}</td>
                          <td className="plot-cell">
                            <div style={{ fontWeight: 800, color: '#1e293b' }}>{w.name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{w.id}</div>
                          </td>
                          <td className="plot-cell plot-cell--num" style={{ fontWeight: 900, color: 'var(--clr-brand-primary)' }}>{w.ops}</td>
                          <td className="plot-cell plot-cell--num" style={{ fontWeight: 750 }}>{w.plotCount}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="table-pagination-bar">
              <div className="table-pagination-bar__info">
                Showing {filteredRecorders.length === 0 ? 0 : (activePageRecorder - 1) * pageSize + 1} to {Math.min(filteredRecorders.length, activePageRecorder * pageSize)} of {filteredRecorders.length.toLocaleString()} entries
              </div>
              <div className="table-pagination-bar__controls">
                <button
                  className="pg-btn"
                  disabled={activePageRecorder === 1}
                  onClick={() => setCurrentPageRecorder(Math.max(1, activePageRecorder - 1))}
                >
                  Previous
                </button>
                {pageNumbersRecorder.startPage > 1 && (
                  <>
                    <button
                      className={`pg-btn ${activePageRecorder === 1 ? 'pg-btn--active' : ''}`}
                      onClick={() => setCurrentPageRecorder(1)}
                    >
                      1
                    </button>
                    {pageNumbersRecorder.startPage > 2 && <span className="pg-ellipsis">...</span>}
                  </>
                )}
                {pageNumbersRecorder.pages.map(p => (
                  <button
                    key={p}
                    className={`pg-btn ${activePageRecorder === p ? 'pg-btn--active' : ''}`}
                    onClick={() => setCurrentPageRecorder(p)}
                  >
                    {p}
                  </button>
                ))}
                {pageNumbersRecorder.endPage < totalPagesRecorder && (
                  <>
                    {pageNumbersRecorder.endPage < totalPagesRecorder - 1 && <span className="pg-ellipsis">...</span>}
                    <button
                      className={`pg-btn ${activePageRecorder === totalPagesRecorder ? 'pg-btn--active' : ''}`}
                      onClick={() => setCurrentPageRecorder(totalPagesRecorder)}
                    >
                      {totalPagesRecorder}
                    </button>
                  </>
                )}
                <button
                  className="pg-btn"
                  disabled={activePageRecorder === totalPagesRecorder}
                  onClick={() => setCurrentPageRecorder(Math.min(totalPagesRecorder, activePageRecorder + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Sub-Page: Contractors --- */}
        {activeTab === 'contractors' && (
          <div className="tab-content view-fade-in">
             <div className="plot-table-shell">
                <table className="plot-records-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Rank</th>
                      <th>Contractor Entity</th>
                      <th className="plot-cell--num">Resource Pool</th>
                      <th className="plot-cell--num">Total Records</th>
                      <th className="plot-cell--num">FFB Bunches (AI)</th>
                      <th className="plot-cell--num">Loose Fruit (KG)</th>
                      <th style={{ textAlign: 'right', paddingRight: '24px' }}>Bunch Intensity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.contractors.map((c, i) => (
                      <tr key={c.name} className="plot-row">
                        <td className="plot-cell" style={{ fontWeight: 800 }}>{i + 1}</td>
                        <td className="plot-cell">
                          <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 700 }}>CONTRACTOR PARTNER</div>
                        </td>
                        <td className="plot-cell plot-cell--num" style={{ fontWeight: 700 }}>{c.workerCount} Active Staff</td>
                        <td className="plot-cell plot-cell--num" style={{ fontWeight: 700 }}>{c.records.toLocaleString()} Recs</td>
                        <td className="plot-cell plot-cell--num" style={{ color: 'var(--clr-brand-primary)', fontWeight: 900, fontSize: '16px' }}>{fmtNumber(c.bunches)}</td>
                        <td className="plot-cell plot-cell--num" style={{ color: '#3b82f6', fontWeight: 900, fontSize: '16px' }}>{fmtNumber(c.weight)} kg</td>
                        <td className="plot-cell" style={{ textAlign: 'right', paddingRight: '24px' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{Math.round(c.bunches / (c.records || 1))} B/Ops</div>
                            <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, (c.bunches / 10000) * 100)}%`, height: '100%', background: 'var(--clr-brand-primary)' }}></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        )}

        <style>{`
        .tab-navigation { display: flex; gap: 12px; background: #f1f5f9; padding: 6px; border-radius: 14px; border: 1px solid #e2e8f0; }
        .tab-btn { display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 800; color: #64748b; transition: all 0.2s; background: transparent; border: none; cursor: pointer; }
        .tab-btn:hover { color: #0f172a; background: rgba(255,255,255,0.5); }
        .tab-btn--active { background: white; color: var(--clr-brand-primary); box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08); }
        
        .sub-page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 20px 32px; background: white; border-radius: 16px; border: 1px solid #e2e8f0; }
        .search-bar { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 0 16px; border-radius: 12px; width: 400px; border: 1px solid #e2e8f0; }
        .search-bar input { border: none; background: transparent; height: 48px; width: 100%; font-size: 15px; font-weight: 600; color: #0f172a; outline: none; }
        .results-count { font-size: 13px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .rank-grid { background: white; border-radius: 24px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.02); }
        .sub-section-title { font-size: 18px; font-weight: 900; color: #0f172a; margin-bottom: 24px; padding-left: 16px; border-left: 4px solid var(--clr-brand-primary); }

        .perf-card {
           background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; gap: 16px; transition: border-color 0.2s ease, box-shadow 0.2s ease; position: relative; overflow: hidden;
        }
        .perf-card:hover { border-color: #CBD5E1; box-shadow: 0 2px 4px 0 rgba(0,0,0,0.06); }
        .perf-card::after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 4px; opacity: 0.8; }
        .perf-card--green::after { background: var(--clr-brand-primary); }
        .perf-card--orange::after { background: var(--clr-brand-secondary); }
        .perf-card--blue::after { background: #3b82f6; }
        .perf-card--teal::after { background: #0d9488; }
        .perf-card--indigo::after { background: #6366f1; }
        .perf-card__header { display: flex; justify-content: space-between; align-items: center; }
        .perf-card__icon { padding: 12px; background: #f8fafc; border-radius: 12px; color: #1e293b; display: flex; align-items: center; justify-content: center; }
        .perf-card__badge { font-size: 9px; font-weight: 900; background: #0f172a; color: white; padding: 5px 10px; border-radius: 40px; letter-spacing: 0.1em; }
        .perf-card__title { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
        .perf-card__name { font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .perf-card__id { font-size: 13px; font-weight: 700; color: #94a3b8; }
        .perf-card__footer { display: flex; align-items: center; gap: 24px; padding-top: 20px; border-top: 1px solid #f1f5f9; margin-top: auto; position: relative; }
        .perf-card__action { margin-left: auto; color: #cbd5e1; transition: color 0.2s; }
        .perf-card:hover .perf-card__action { color: var(--clr-brand-primary); }
        .perf-stat { display: flex; flex-direction: column; }
        .perf-stat__val { font-size: 20px; font-weight: 900; color: #0f172a; }
        .perf-stat__lbl { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        
        .perf-section { background: white; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.01); }
        .perf-section__header { padding: 24px 32px; background: #fafafa; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .perf-section__title { font-size: 18px; font-weight: 900; display: flex; align-items: center; gap: 12px; color: #0f172a; }
        .section-link { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 800; color: var(--clr-brand-primary); background: transparent; border: none; cursor: pointer; }
        .section-link:hover { text-decoration: underline; }

        .perf-table { width: 100%; border-collapse: collapse; }
        .perf-table th { font-size: 11px; font-weight: 900; color: #94a3b8; padding: 0 0 16px 0; text-align: left; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; }
        .perf-table td { padding: 16px 4px; vertical-align: middle; }
        .perf-table--large td { padding: 24px 8px; }
        
        .rank-row:hover { background: #f8fafc; }
        .perf-row-elegant { border-bottom: 1px solid #f8fafc; transition: all 0.2s; }
        .perf-row-elegant:hover { background: #f8fafc; }
        
        .status-pill { padding: 6px 12px; border-radius: 40px; font-size: 11px; font-weight: 900; border: 1px solid #e2e8f0; color: #64748b; }
        .status-pill--high { border-color: var(--clr-brand-primary); color: var(--clr-brand-primary); background: rgba(3, 67, 33, 0.05); }
        
        .rank-idx { width: 28px; height: 28px; background: #f1f5f9; color: #64748b; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: 900; font-size: 12px; }
        .rank-idx--top-1 { background: #fef3c7; color: #92400e; }
        .rank-idx--top-2 { background: #f1f5f9; color: #475569; }
        .rank-idx--top-3 { background: #fff7ed; color: #c2410c; }
        .rank-idx--large { width: 40px; height: 40px; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-weight: 900; font-size: 16px; }
        
        .perf-name--sm { font-size: 15px; font-weight: 800; color: #1e293b; line-height: 1.2; }
        .perf-uid--sm { font-size: 12px; font-weight: 600; color: #94a3b8; }
        .perf-sub-label { font-size: 11px; font-weight: 900; color: #475569; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; }
      `}</style>
      </div>
    </div>
  );
}

