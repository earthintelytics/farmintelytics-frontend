/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getEstateScope } from '../utils/access';
import { API } from '../services/api';
import { extractEstates } from '../utils/estates';
import { getDataStatus, computeDiscrepancy } from '../utils/helpers';
import { VIEWS } from '../utils/constants';

const AppContext = createContext();

export function AppProvider({ children, tenantSlug, tenantMeta: initialMeta, orgs = [], onSelectTenant }) {
  const [operations, setOperations] = useState([]);
  const [plotData, setPlotData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [tenantMeta, setTenantMeta] = useState(initialMeta || null);
  const [filteredData, setFilteredData] = useState([]);
  const [plotTrends, setPlotTrends] = useState([]);
  const [plotPredictions, setPlotPredictions] = useState({ historical: [], predictions: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    role: null,
    plot: null,
    team: null,
    activity: null,
    dateRange: { from: null, to: null },
    search: '',
    status: null,
    estate: getEstateScope() || null,
    contractor: null,
  });

  // Synchronize active tenant slug immediately before child effects run
  if (tenantSlug !== undefined) {
    API.setActiveTenant(tenantSlug || '');
  }

  useEffect(() => {
    setTenantMeta(initialMeta || null);
  }, [initialMeta]);

  useEffect(() => {
    let active = true;
    API.fetchSettings()
      .then((s) => {
        if (active && s) setTenantMeta(s);
      })
      .catch(() => { });
    API.fetchGeoJSON()
      .then((data) => {
        if (active) setGeoData(data);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, [tenantSlug]);

  const { list: estates, byName: estateMap } = useMemo(() => extractEstates(geoData), [geoData]);

  useEffect(() => {
    let filtered = [...operations];
    if (filters.role) {
      filtered = filtered.filter((o) => (o.role || '').toLowerCase() === filters.role.toLowerCase());
    }
    if (filters.activity) {
      if (filters.activity === 'loading') filtered = filtered.filter((o) => o.source_table === 'loading_clerk_record');
      else if (filters.activity === 'harvesting') filtered = filtered.filter((o) => o.source_table === 'harvesting_clerk_record');
    }
    if (filters.plot) filtered = filtered.filter((o) => o.plot_id === filters.plot);
    if (filters.status) filtered = filtered.filter((o) => o.data_status === filters.status);
    if (filters.estate) filtered = filtered.filter((o) => !o.estate || o.estate === filters.estate);
    if (filters.contractor) filtered = filtered.filter((o) => o.contractor === filters.contractor);
    if (filters.dateRange?.from) {
      const f = new Date(filters.dateRange.from);
      filtered = filtered.filter((o) => new Date(o.created_at) >= f);
    }
    if (filters.dateRange?.to) {
      const t = new Date(filters.dateRange.to);
      t.setHours(23, 59, 59, 999);
      filtered = filtered.filter((o) => new Date(o.created_at) <= t);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          (o.plot_id || '').toLowerCase().includes(q) ||
          (o.worker_id || '').toLowerCase().includes(q) ||
          (o.worker_name || '').toLowerCase().includes(q) ||
          (o.role || '').toLowerCase().includes(q) ||
          (o.team || '').toLowerCase().includes(q),
      );
    }
    setFilteredData(filtered);
    setCurrentPage(1);
  }, [filters, operations]);

  const [totals, setTotals] = useState({ individual: 0, plots: 0, employees: 0 });
  const loadSeq = useRef(0);

  const fetchInitialData = useCallback(
    async (currentFilters = {}) => {
      const seq = ++loadSeq.current;
      setLoading(true);
      setError(null);
      try {
        const [{ individual, plots, employees: emps }, plotT, plotP] = await Promise.all([
          API.fetchAllAnalytics(currentFilters),
          API.fetchPlotProductionTrend(currentFilters),
          API.fetchProductionPredictions(currentFilters),
        ]);
        if (seq !== loadSeq.current) return;
        setOperations(
          (individual.items || []).map((op) => ({
            ...op,
            data_status: op.data_status || getDataStatus(op),
            discrepancy: computeDiscrepancy(op),
          })),
        );
        setPlotData(
          (plots.items || []).map((p) => ({
            ...p,
            data_status: p.data_status || getDataStatus(p),
          })),
        );
        setPlotTrends(plotT.items || plotT || []);
        setPlotPredictions(plotP || { historical: [], predictions: [] });
        setEmployees(emps.items || []);
        setTotals({
          individual: individual.total || 0,
          plots: plots.total || 0,
          employees: emps.total || 0,
        });
      } catch (err) {
        if (seq !== loadSeq.current) return;
        setError(err.message);
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    },
    [tenantSlug], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInitialData({ ...filters, page: currentPage });
    }, 250);
    return () => clearTimeout(handler);
  }, [filters, currentPage, fetchInitialData]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      role: null,
      plot: null,
      team: null,
      activity: null,
      dateRange: { from: null, to: null },
      search: '',
      status: null,
      estate: getEstateScope() || null,
      contractor: null,
    });
  }, []);

  const value = useMemo(
    () => ({
      operations,
      plotData,
      employees,
      filteredData,
      plotTrends,
      plotPredictions,
      totals,
      loading,
      error,
      currentView,
      setCurrentView,
      currentPage,
      setCurrentPage,
      filters,
      updateFilters,
      resetFilters,
      geoData,
      estates,
      estateMap,
      tenantSlug,
      tenantMeta,
      orgs,
      onSelectTenant,
      refreshData: fetchInitialData,
    }),
    [
      operations,
      plotData,
      employees,
      filteredData,
      plotTrends,
      plotPredictions,
      totals,
      loading,
      error,
      currentView,
      currentPage,
      filters,
      updateFilters,
      resetFilters,
      geoData,
      estates,
      estateMap,
      tenantSlug,
      tenantMeta,
      orgs,
      onSelectTenant,
      fetchInitialData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within an AppProvider');
  return ctx;
}
