import { useRefreshTick } from '../hooks/useRefreshTick';
import { EstateOptions } from '../components/EstateOptions';
import { FFB_ICON, WEIGHT_ICON, PLOT_ICON } from '../utils/icons';
import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ROLES, STATUSES } from '../utils/constants';
import { fmtDayShort, fmtNumber } from '../utils/formatters';
import { API } from '../services/api';
import { plotIdOf, siteIdOf, estateNameOf } from '../utils/estates';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { RotateCcw, Zap, Loader2, CheckCircle2, X } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function DashboardView() {
  const { filters, updateFilters, resetFilters, geoData, estateMap } = useAppContext();
  const refreshTick = useRefreshTick(); // top-bar Refresh reloads this page's data

  const [dashboardSummary, setDashboardSummary] = useState({ bunches: [], weight: [] });
  const [dashboardCards, setDashboardCards] = useState([]);


  // Fetch Specialized Dashboard Data
  useEffect(() => {
    const fetchStats = async () => {

      try {
        const [bunches, weight, cards] = await Promise.all([
          API.fetchHarvestedBunches(filters),
          API.fetchPickFruit(filters),
          API.fetchDashboardCards(filters)
        ]);
        setDashboardSummary({
          bunches: bunches.items || [],
          weight: weight.items || []
        });
        setDashboardCards(cards.items || []);
      } catch (err) {
        console.error('Failed to fetch dashboard specialized data', err);
      }
    };
    fetchStats();
  }, [filters, refreshTick]);

  // Dynamic Total Plots from geojson: unique polygon ID count
  const totalPlotsCount = useMemo(() => {
    let features = geoData?.features;
    if (!features || !Array.isArray(features) || features.length === 0) {
      return 0;
    }
    if (filters.estate) {
      const estateId = estateMap?.[filters.estate]?.id;
      features = features.filter(f => {
        const site = siteIdOf(f);
        const estName = estateNameOf(f);
        return (estateId && site === estateId) ||
               estName.toLowerCase() === filters.estate.toLowerCase() ||
               estName.toLowerCase().includes(filters.estate.toLowerCase().replace(' estate', ''));
      });
    }
    if (filters.plot) {
      features = features.filter(f => {
        const pid = plotIdOf(f);
        const pnb = f.properties?.PlotNb;
        return (pid && pid.toLowerCase().includes(filters.plot.toLowerCase())) ||
               (pnb && pnb.toLowerCase().includes(filters.plot.toLowerCase()));
      });
    }
    const uniquePlotIds = new Set(
      features.map(f => plotIdOf(f) || f.properties?.Plot_ID || f.properties?.PlotID || f.id).filter(Boolean)
    );
    return uniquePlotIds.size || features.length;
  }, [geoData, estateMap, filters.estate, filters.plot]);

  // ── KPI Data (Powered by Materialized Dashboard Cards) ────────────────
  const kpis = useMemo(() => {
    // Aggregate cards if multiple are returned (e.g. if grouped by role/estate)
    const bunchesTotal = dashboardCards.reduce((s, o) => s + (o.total_harvested_count || 0), 0);
    const weightTotal = dashboardCards.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    const plotTotal = dashboardCards.reduce((s, o) => s + (o.total_plot || 0), 0);

    return [
      { id: 'kpi-bunches', title: 'FFB Bunches (AI)', value: fmtNumber(bunchesTotal), sub: 'Harvested bunches captured', accent: 'green', icon: FFB_ICON },
      { id: 'kpi-weight', title: 'Loose Fruit Weight', value: `${fmtNumber(weightTotal)} KG`, sub: 'Total collection weight', accent: 'orange', icon: WEIGHT_ICON },
      { id: 'kpi-plots', title: 'Harvested Plots', value: fmtNumber(plotTotal), sub: 'Locations with active harvesting', accent: 'green', icon: PLOT_ICON },
      { id: 'kpi-total-plots', title: 'Total Plots', value: fmtNumber(totalPlotsCount), sub: filters.estate || 'Plantation coverage', accent: 'orange', icon: PLOT_ICON },
    ];
  }, [dashboardCards, totalPlotsCount, filters.estate]);

  // ── Aggregated Data (Ensures unique dates for x-axis) ──────
  const aggregatedBunches = useMemo(() => {
    const grouped = (dashboardSummary.bunches || []).reduce((acc, d) => {
      const key = (d.date_from || d.date_to || '').split('T')[0];
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = { date: key, total_harvested_count: 0, loaded_harvested: 0 };
      }
      acc[key].total_harvested_count += (d.total_harvested_count || 0);
      acc[key].loaded_harvested += (d.loaded_harvested || 0);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [dashboardSummary.bunches]);

  const aggregatedWeights = useMemo(() => {
    const grouped = (dashboardSummary.weight || []).reduce((acc, d) => {
      const key = (d.date_from || d.date_to || '').split('T')[0];
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = { date: key, h_total_weight_kg: 0, l_weight_kg: 0 };
      }
      acc[key].h_total_weight_kg += (d.h_total_weight_kg || 0);
      acc[key].l_weight_kg += (d.l_weight_kg || 0);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [dashboardSummary.weight]);

  // ── Chart Data Mapping ──────
  const bunchesHistogram = useMemo(() => {
    const data = aggregatedBunches.slice(-14); // Keep it readable
    return {
      labels: data.map(d => fmtDayShort(d.date)),
      datasets: [{
        label: 'Bunches Harvested',
        data: data.map(d => d.total_harvested_count),
        backgroundColor: 'rgba(3, 67, 33, 0.8)',
        borderRadius: 6,
        barThickness: data.length > 20 ? 8 : 12,
      }]
    };
  }, [aggregatedBunches]);

  const lineChartBunches = useMemo(() => {
    const data = aggregatedBunches.slice(-14);
    return {
      labels: data.map(d => fmtDayShort(d.date)),
      datasets: [
        { label: 'Harvested', data: data.map(d => d.total_harvested_count), borderColor: '#034321', borderWidth: 2, tension: 0.32, pointRadius: 2, pointHoverRadius: 4, pointBackgroundColor: '#034321' },
        { label: 'Loaded', data: data.map(d => d.loaded_harvested), borderColor: '#F97316', borderWidth: 2, tension: 0.32, pointRadius: 2, pointHoverRadius: 4, pointBackgroundColor: '#F97316' }
      ]
    };
  }, [aggregatedBunches]);

  const lineChartWeight = useMemo(() => {
    const data = aggregatedWeights.slice(-14);
    return {
      labels: data.map(d => fmtDayShort(d.date)),
      datasets: [
        { label: 'Harvested Weight (kg)', data: data.map(d => d.h_total_weight_kg), borderColor: '#034321', backgroundColor: '#034321', borderWidth: 2, tension: 0.32, pointRadius: 2, pointHoverRadius: 4, pointStyle: 'rectRounded' },
        { label: 'Loaded Weight (kg)', data: data.map(d => d.l_weight_kg), borderColor: '#F97316', backgroundColor: '#F97316', borderWidth: 2, tension: 0.32, pointRadius: 2, pointHoverRadius: 4, pointStyle: 'circle' }
      ]
    };
  }, [aggregatedWeights]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        titleFont: { size: 12, weight: '600' },
        bodyFont: { size: 12 },
        cornerRadius: 8
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#e7eef7' },
        ticks: { font: { size: 11, weight: '500', family: 'Roboto' }, color: '#0f172a' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, weight: '500', family: 'Roboto' }, color: '#0f172a' }
      }
    }
  };

  const renderLegend = (items) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', backgroundColor: item.color, borderRadius: '50%' }}></div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="view-container view-fade-in dashboard-view" style={{ padding: '64px var(--sp-8) var(--sp-8) var(--sp-8)' }}>
      <div className="view-header">
        <div>
          <h1 className="view-title">Operations Dashboard</h1>
          <p className="view-subtitle">Executive insight into estate-wide harvesting and yield performance</p>
        </div>
        <div className="view-header-actions">
          <div className="filter-group">
            <label className="filter-label">Plantation Location</label>
            <select className="select-input" style={{ width: '180px', height: '40px', borderRadius: '8px' }} value={filters.estate || ''} onChange={(e) => updateFilters({ estate: e.target.value || null })}>
              <EstateOptions allLabel="All Farms" />
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Operation Focus</label>
            <select className="select-input" style={{ width: '180px', height: '40px', borderRadius: '8px' }} value={filters.role || ''} onChange={(e) => updateFilters({ role: e.target.value || null })}>
              <option value="">Full Coverage</option>
              <option value={ROLES.CUTTER}>Harvester (Cutter)</option>
              <option value={ROLES.PICKER}>Loose Fruit Picker</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Start Date</label>
            <input type="date" className="date-input" style={{ width: '150px', height: '40px', borderRadius: '8px' }} value={filters.dateRange.from || ''} onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value || null } })} />
          </div>
          <div className="filter-group">
            <label className="filter-label">End Date</label>
            <input type="date" className="date-input" style={{ width: '150px', height: '40px', borderRadius: '8px' }} value={filters.dateRange.to || ''} onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value || null } })} />
          </div>
          <button className="btn btn--outline btn--sm" onClick={resetFilters} style={{ marginLeft: '12px', height: '40px', borderRadius: '8px' }}>
            <RotateCcw size={14} style={{ marginRight: '6px' }} />
            Reset All
          </button>
        </div>
      </div>

      <div className="dashboard-shell" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="worker-kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {kpis.map(k => (
            <div key={k.id} className="wkpi-card dashboard-kpi-card">
              <div className="wkpi-card__inner">
                {k.icon && (
                  <div className="wkpi-icon dashboard-kpi-icon">
                    <img src={k.icon} alt={k.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
                <div>
                  <div className="wkpi-value">{k.value}</div>
                  <div className="wkpi-label">{k.title}</div>
                  {k.sub && <div className="wkpi-sub" style={{ fontSize: '10px', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>{k.sub}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="chart-card chart-card--full" style={{ minHeight: '550px' }}>
          <div className="chart-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 className="chart-title">Bunches Histogram</h2>
              <span className="chart-subtitle">Direct timeseries of harvested bunches</span>
            </div>
            {renderLegend([{ label: 'Bunches Harvested', color: '#034321' }])}
          </div>
          <div className="chart-body" style={{ flex: 1 }}>
            <Bar data={bunchesHistogram} options={commonOptions} />
          </div>
        </div>

        <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          <div className="chart-card" style={{ minHeight: '480px' }}>
            <div className="chart-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="chart-title">Bunches Trend</h2>
                <span className="chart-subtitle">Harvest vs Loading comparison</span>
              </div>
              {renderLegend([
                { label: 'Harvested', color: '#034321' },
                { label: 'Loaded', color: '#F97316' }
              ])}
            </div>
            <div className="chart-body" style={{ flex: 1 }}>
              <Line data={lineChartBunches} options={commonOptions} />
            </div>
          </div>

          <div className="chart-card" style={{ minHeight: '480px' }}>
            <div className="chart-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="chart-title">Yield Weight Trend</h2>
                <span className="chart-subtitle">Total loose fruit weight (kg)</span>
              </div>
              {renderLegend([
                { label: 'Harvested', color: '#034321' },
                { label: 'Loaded', color: '#F97316', circle: true }
              ])}
            </div>
            <div className="chart-body" style={{ flex: 1 }}>
              <Line data={lineChartWeight} options={commonOptions} />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
