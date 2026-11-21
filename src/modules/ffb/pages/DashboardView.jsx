import { useRefreshTick } from '../hooks/useRefreshTick';
import { EstateOptions } from '../components/EstateOptions';
import { FFB_ICON, WEIGHT_ICON, PLOT_ICON } from '../utils/icons';
import { useMemo, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ROLES } from '../utils/constants';
import { fmtDayShort, fmtNumber } from '../utils/formatters';
import { API } from '../services/api';
import { plotIdOf, siteIdOf, estateNameOf } from '../utils/estates';
import { Bar, Line } from 'react-chartjs-2';
import { RotateCcw } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export function DashboardView() {
  const { filters, updateFilters, resetFilters, geoData, estateMap } = useAppContext();
  const refreshTick = useRefreshTick();

  const [dashboardSummary, setDashboardSummary] = useState({ bunches: [], weight: [] });
  const [dashboardCards, setDashboardCards] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bunches, weight, cards] = await Promise.all([
          API.fetchHarvestedBunches(filters),
          API.fetchPickFruit(filters),
          API.fetchDashboardCards(filters),
        ]);
        setDashboardSummary({
          bunches: bunches.items || [],
          weight: weight.items || [],
        });
        setDashboardCards(cards.items || []);
      } catch (err) {
        console.error('Failed to fetch dashboard specialized data', err);
      }
    };
    fetchStats();
  }, [filters, refreshTick]);

  const totalPlotsCount = useMemo(() => {
    let features = geoData?.features;
    if (!features || !Array.isArray(features) || features.length === 0) {
      return 0;
    }
    if (filters.estate) {
      const estateId = estateMap?.[filters.estate]?.id;
      features = features.filter((f) => {
        const site = siteIdOf(f);
        const estName = estateNameOf(f);
        return (
          (estateId && site === estateId) ||
          estName.toLowerCase() === filters.estate.toLowerCase() ||
          estName.toLowerCase().includes(filters.estate.toLowerCase().replace(' estate', ''))
        );
      });
    }
    if (filters.plot) {
      features = features.filter((f) => {
        const pid = plotIdOf(f);
        const pnb = f.properties?.PlotNb;
        return (
          (pid && pid.toLowerCase().includes(filters.plot.toLowerCase())) ||
          (pnb && pnb.toLowerCase().includes(filters.plot.toLowerCase()))
        );
      });
    }
    const uniquePlotIds = new Set(
      features.map((f) => plotIdOf(f) || f.properties?.Plot_ID || f.properties?.PlotID || f.id).filter(Boolean),
    );
    return uniquePlotIds.size || features.length;
  }, [geoData, estateMap, filters.estate, filters.plot]);

  const kpis = useMemo(() => {
    const bunchesTotal = dashboardCards.reduce((s, o) => s + (o.total_harvested_count || 0), 0);
    const weightTotal = dashboardCards.reduce((s, o) => s + (o.total_weight_kg || 0), 0);
    const plotTotal = dashboardCards.reduce((s, o) => s + (o.total_plot || 0), 0);

    return [
      { id: 'kpi-bunches', title: 'Verified FFB Bunches', value: fmtNumber(bunchesTotal), sub: 'AI-counted bunches harvested', icon: FFB_ICON },
      { id: 'kpi-weight', title: 'Loose Fruit Tonnage', value: `${fmtNumber(weightTotal)} kg`, sub: 'Collected loose fruit weight', icon: WEIGHT_ICON },
      { id: 'kpi-plots', title: 'Active Harvest Blocks', value: fmtNumber(plotTotal), sub: 'Blocks with recorded output', icon: PLOT_ICON },
      { id: 'kpi-total-plots', title: 'Mapped Estate Blocks', value: fmtNumber(totalPlotsCount), sub: filters.estate || 'Total plantation coverage', icon: PLOT_ICON },
    ];
  }, [dashboardCards, totalPlotsCount, filters.estate]);

  const aggregatedBunches = useMemo(() => {
    const grouped = (dashboardSummary.bunches || []).reduce((acc, d) => {
      const key = (d.date_from || d.date_to || '').split('T')[0];
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = { date: key, total_harvested_count: 0, loaded_harvested: 0 };
      }
      acc[key].total_harvested_count += d.total_harvested_count || 0;
      acc[key].loaded_harvested += d.loaded_harvested || 0;
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
      acc[key].h_total_weight_kg += d.h_total_weight_kg || 0;
      acc[key].l_weight_kg += d.l_weight_kg || 0;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [dashboardSummary.weight]);

  const bunchesHistogram = useMemo(() => {
    const data = aggregatedBunches.slice(-14);
    return {
      labels: data.map((d) => fmtDayShort(d.date)),
      datasets: [
        {
          label: 'Bunches Harvested',
          data: data.map((d) => d.total_harvested_count),
          backgroundColor: '#3F8432',
          hoverBackgroundColor: '#2D6A2C',
          borderRadius: 4,
          barThickness: data.length > 20 ? 10 : 16,
        },
      ],
    };
  }, [aggregatedBunches]);

  const lineChartBunches = useMemo(() => {
    const data = aggregatedBunches.slice(-14);
    return {
      labels: data.map((d) => fmtDayShort(d.date)),
      datasets: [
        {
          label: 'Harvested',
          data: data.map((d) => d.total_harvested_count),
          borderColor: '#3F8432',
          backgroundColor: 'rgba(63, 132, 50, 0.08)',
          borderWidth: 1.75,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
        },
        {
          label: 'Loaded',
          data: data.map((d) => d.loaded_harvested),
          borderColor: '#D97706',
          backgroundColor: 'transparent',
          borderWidth: 1.75,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [aggregatedBunches]);

  const lineChartWeight = useMemo(() => {
    const data = aggregatedWeights.slice(-14);
    return {
      labels: data.map((d) => fmtDayShort(d.date)),
      datasets: [
        {
          label: 'Harvested Weight (kg)',
          data: data.map((d) => d.h_total_weight_kg),
          borderColor: '#3F8432',
          backgroundColor: 'rgba(63, 132, 50, 0.08)',
          borderWidth: 1.75,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
        },
        {
          label: 'Loaded Weight (kg)',
          data: data.map((d) => d.l_weight_kg),
          borderColor: '#D97706',
          backgroundColor: 'transparent',
          borderWidth: 1.75,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [aggregatedWeights]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        padding: 10,
        titleFont: { size: 12, weight: '500', family: 'Inter' },
        bodyFont: { size: 12, family: 'Inter' },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#F1F5F9' },
        border: { display: false },
        ticks: { font: { size: 11, weight: '400', family: 'Inter' }, color: '#64748B' },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 11, weight: '400', family: 'Inter' }, color: '#64748B' },
      },
    },
  };

  // Flat line swatch instead of circle dots
  const renderLegend = (items) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: '14px', height: '3px', backgroundColor: item.color, borderRadius: '2px', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap' }}>{item.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="view-container view-fade-in dashboard-view" style={{ padding: '24px var(--sp-8) var(--sp-8) var(--sp-8)' }}>
      {/* Editorial Header + Unified Filter Ribbon */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3F8432', marginBottom: '4px' }}>
            FarmIntelytics Harvest Suite
          </p>
          <h1 className="view-title" style={{ margin: 0 }}>Harvest Command Center</h1>
          <p className="view-subtitle" style={{ marginTop: '4px' }}>
            Estate-wide harvest output, AI bunch verification, and loose fruit tonnage
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: '10px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '10px 14px',
          }}
        >
          <div className="filter-group">
            <label className="filter-label" style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Estate / Farm</label>
            <select
              className="select-input"
              style={{ width: '168px', height: '36px', borderRadius: '8px', borderColor: '#E2E8F0', fontSize: '13px', fontWeight: 400 }}
              value={filters.estate || ''}
              onChange={(e) => updateFilters({ estate: e.target.value || null })}
            >
              <EstateOptions allLabel="All Estates" />
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Crew Role</label>
            <select
              className="select-input"
              style={{ width: '168px', height: '36px', borderRadius: '8px', borderColor: '#E2E8F0', fontSize: '13px', fontWeight: 400 }}
              value={filters.role || ''}
              onChange={(e) => updateFilters({ role: e.target.value || null })}
            >
              <option value="">All Roles</option>
              <option value={ROLES.CUTTER}>Harvester (Cutter)</option>
              <option value={ROLES.PICKER}>Loose Fruit Picker</option>
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>From Date</label>
            <input
              type="date"
              className="date-input"
              style={{ width: '142px', height: '36px', borderRadius: '8px', borderColor: '#E2E8F0', fontSize: '13px', fontWeight: 400 }}
              value={filters.dateRange.from || ''}
              onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value || null } })}
            />
          </div>
          <div className="filter-group">
            <label className="filter-label" style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>To Date</label>
            <input
              type="date"
              className="date-input"
              style={{ width: '142px', height: '36px', borderRadius: '8px', borderColor: '#E2E8F0', fontSize: '13px', fontWeight: 400 }}
              value={filters.dateRange.to || ''}
              onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value || null } })}
            />
          </div>
          <button
            className="btn btn--outline btn--sm"
            onClick={resetFilters}
            style={{ height: '36px', borderRadius: '8px', borderColor: '#CBD5E1', color: '#334155', fontWeight: 500 }}
          >
            <RotateCcw size={13} strokeWidth={1.5} style={{ marginRight: '5px' }} />
            Reset
          </button>
        </div>
      </div>

      {/* Unique Asymmetric Bento Grid */}
      <div className="dashboard-shell" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Row 1: Hero Histogram (Left 7fr) + 2x2 Thin KPI Bento Grid (Right 5fr) */}
        <div className="fi-bento-hero">
          <div className="chart-card" style={{ minHeight: '360px', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 className="chart-title" style={{ fontSize: '16px', fontWeight: 500 }}>Daily Harvest Volume</h2>
                <span className="chart-subtitle" style={{ fontSize: '12px', color: '#64748B', fontWeight: 400 }}>
                  Harvested bunch count across the latest 14 active days
                </span>
              </div>
              {renderLegend([{ label: 'Bunches Harvested', color: '#3F8432' }])}
            </div>
            <div className="chart-body" style={{ flex: 1, minHeight: '260px' }}>
              <Bar data={bunchesHistogram} options={commonOptions} />
            </div>
          </div>

          <div className="fi-bento-kpis">
            {kpis.map((k) => (
              <div
                key={k.id}
                className="wkpi-card dashboard-kpi-card"
                style={{
                  borderRadius: '10px',
                  padding: '18px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>{k.title}</span>
                  {k.icon && (
                    <div style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                      <img src={k.icon} alt={k.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="wkpi-value" style={{ fontSize: '26px', fontWeight: 500, color: '#0F172A', lineHeight: 1.15 }}>
                    {k.value}
                  </div>
                  {k.sub && (
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 400, marginTop: '4px' }}>
                      {k.sub}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Two Equal Comparative Curves */}
        <div className="fi-bento-trends">
          <div className="chart-card" style={{ minHeight: '360px', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 className="chart-title" style={{ fontSize: '16px', fontWeight: 500 }}>Harvest vs. Haulage Trend</h2>
                <span className="chart-subtitle" style={{ fontSize: '12px', color: '#64748B', fontWeight: 400 }}>
                  Field-harvested vs truck-loaded bunch comparison
                </span>
              </div>
              {renderLegend([
                { label: 'Harvested', color: '#3F8432' },
                { label: 'Loaded', color: '#D97706' },
              ])}
            </div>
            <div className="chart-body" style={{ flex: 1, minHeight: '260px' }}>
              <Line data={lineChartBunches} options={commonOptions} />
            </div>
          </div>

          <div className="chart-card" style={{ minHeight: '360px', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div className="chart-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h2 className="chart-title" style={{ fontSize: '16px', fontWeight: 500 }}>Loose Fruit Tonnage Trend</h2>
                <span className="chart-subtitle" style={{ fontSize: '12px', color: '#64748B', fontWeight: 400 }}>
                  Daily loose fruit harvested vs loaded weight (kg)
                </span>
              </div>
              {renderLegend([
                { label: 'Harvested', color: '#3F8432' },
                { label: 'Loaded', color: '#D97706' },
              ])}
            </div>
            <div className="chart-body" style={{ flex: 1, minHeight: '260px' }}>
              <Line data={lineChartWeight} options={commonOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
