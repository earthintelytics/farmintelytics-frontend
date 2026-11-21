import { useMemo } from 'react';
import { FFB_ICON, WEIGHT_ICON, PLOT_ICON } from '../utils/icons';
import { useAppContext } from '../context/AppContext';
import { fmtAbbrev } from '../utils/formatters';
import { TrendingUp, Sparkles, Package, Scale, Map, Search, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { EstateOptions } from '../components/EstateOptions';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function YieldView() {
  const { plotTrends, plotPredictions, filters, updateFilters, resetFilters } = useAppContext();
  
  const data = useMemo(() => {
    // 1. Process Historical Data
    const timeline = (plotPredictions.historical || []).map(p => ({
        date: p.date,
        ffb: p.ffb || 0,
        weight: p.weight || 0
    }));

    // 2. Process Predictions
    const futureData = (plotPredictions.predictions || []).map(p => ({
        date: p.date,
        ffb: p.ffb || 0,
        weight: p.weight || 0
    }));

    // 3. Totals (from plotTrends for accurate filtered cards)
    let totalFFB = 0;
    let totalWeight = 0;
    const plotCount = new Set();
    (plotTrends.items || plotTrends || []).forEach(p => {
        totalFFB += (p.total_harvested_count || 0);
        totalWeight += (p.total_weight_kg || 0);
        if (p.plot_id) plotCount.add(p.plot_id);
    });

    return {
      timeline,
      futureData,
      plotCount: plotCount.size,
      totalFFB, totalWeight
    };
  }, [plotPredictions, plotTrends]);

  const uniquePlotIds = useMemo(() => Array.from(new Set((plotTrends.items || plotTrends || []).map(p => p.plot_id))).sort(), [plotTrends]);

  const dayLabel = (d) => String(d).slice(5).replace('-', '/');   // 2026-10-12 -> 10/12 (history and forecast alike)
  const labels = [...data.timeline.map(d => dayLabel(d.date)), ...data.futureData.map(d => dayLabel(d.date))];
  const historyDays = plotPredictions.history_days ?? data.timeline.length;
  const minDays = plotPredictions.min_history_days ?? 7;
  const forecastReady = plotPredictions.forecast_ready ?? data.futureData.length > 0;

  const ffbChartData = {
    labels,
    datasets: [
      {
        label: 'FFB Bunches (AI)',
        data: [...data.timeline.map(d => d.ffb), ...data.futureData.map(d => d.ffb)],
        borderColor: '#034321',
        backgroundColor: 'rgba(3, 67, 33, 0.05)',
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.4,
        fill: true,
        segment: {
          borderDash: ctx => ctx.p0DataIndex >= data.timeline.length - 1 ? [8, 4] : undefined,
          borderColor: ctx => ctx.p0DataIndex >= data.timeline.length - 1 ? 'rgba(3, 67, 33, 0.4)' : '#034321'
        }
      }
    ]
  };

  const lfChartData = {
    labels,
    datasets: [
      {
        label: 'Loose Fruit (kg)',
        data: [...data.timeline.map(d => d.weight), ...data.futureData.map(d => d.weight)],
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.05)',
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.4,
        fill: true,
        segment: {
          borderDash: ctx => ctx.p0DataIndex >= data.timeline.length - 1 ? [8, 4] : undefined,
          borderColor: ctx => ctx.p0DataIndex >= data.timeline.length - 1 ? 'rgba(249, 115, 22, 0.4)' : '#f97316'
        }
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} ${ctx.dataIndex >= data.timeline.length ? '(ESTIMATED)' : ''}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#0f172a', font: { size: 11, weight: 700 } } },
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11, weight: 800 } } }
    }
  };

  return (
    <div className="view-container yield-view view-fade-in" style={{ padding: '32px', fontFamily: "'Roboto', sans-serif" }}>
      <div className="view-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="view-title" style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TrendingUp size={32} color="#034321" />
            Yield Trends & Predictions
          </h1>
          <p className="view-subtitle" style={{ fontSize: '15px', opacity: 0.5 }}>Strategic production forecasting for FFB Bunches and Loose Fruit collections.</p>
        </div>
      </div>

      {data.timeline.length === 0 ? (
        <div style={{ marginBottom: '24px', padding: '16px 20px', background: '#F8FAFC', borderRadius: '12px', color: '#0f172a', fontWeight: 600 }}>
          No harvest records match these filters. Change the dates or the estate, or press Reset.
        </div>
      ) : !forecastReady ? (
        <div style={{ marginBottom: '24px', padding: '16px 20px', background: '#FFFBEB', borderRadius: '12px', color: '#92400E', fontWeight: 600 }}>
          No forecast yet. A forecast needs at least {minDays} days with harvest records and this view has {historyDays}. The lines below show what was harvested so far.
        </div>
      ) : (
        <div style={{ marginBottom: '24px', fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
          The dashed part is an estimate for the next 7 days: a straight line fitted on the latest 28 days with records. Treat it as a guide, not a promise.
        </div>
      )}

      <div className="intelligence-filter-bar" style={{
        marginBottom: '32px', padding: '24px', background: 'white',
        borderRadius: '16px', display: 'flex', gap: '24px', alignItems: 'flex-end',
        boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0'
      }}>
        <div className="filter-group" style={{ width: '180px' }}>
          <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', display: 'block', marginBottom: '8px' }}>Estate</label>
          <select className="select-input" style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, padding: '0 12px' }} value={filters.estate || ''} onChange={(e) => updateFilters({ estate: e.target.value || null })}>
            <EstateOptions allLabel="All Regions" />
          </select>
        </div>

        <div className="filter-group" style={{ flex: 1 }}>
          <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', display: 'block', marginBottom: '8px' }}>Plot Search</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input
              type="search"
              list="yield-plot-list"
              className="search-input"
              style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, paddingLeft: '40px', fontSize: '14px' }}
              placeholder="Find plot..."
              value={filters.search}
              onChange={e => updateFilters({ search: e.target.value })}
            />
            <datalist id="yield-plot-list">
              {uniquePlotIds.map(pid => <option key={pid} value={pid} />)}
            </datalist>
          </div>
        </div>

        <div className="filter-group">
          <label style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', display: 'block', marginBottom: '8px' }}>Timeline Window</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '13px', fontSize: '10px', fontWeight: 900, opacity: 0.3, zIndex: 1 }}>FROM</span>
              <input
                type="date"
                style={{ height: '40px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px 0 40px', fontWeight: 700, fontSize: '13px' }}
                value={filters.dateRange.from || ''}
                onChange={e => updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value || null } })}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '10px', top: '13px', fontSize: '10px', fontWeight: 900, opacity: 0.3, zIndex: 1 }}>TO</span>
              <input
                type="date"
                style={{ height: '40px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px 0 40px', fontWeight: 700, fontSize: '13px' }}
                value={filters.dateRange.to || ''}
                onChange={e => updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value || null } })}
              />
            </div>
            <button className="btn btn--outline" onClick={resetFilters} style={{ height: '40px', borderRadius: '8px', fontWeight: 900, padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <RotateCcw size={16} /> RESET
            </button>
          </div>
        </div>
      </div>

      <div className="worker-kpi-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div className="wkpi-card">
          <div className="wkpi-card__inner">
            <div className="wkpi-icon">
              <img src={FFB_ICON} alt="FFB" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div className="wkpi-value">{fmtAbbrev(data.totalFFB)}</div>
              <div className="wkpi-label">FFB Bunches (AI) Collected</div>
              <div className="wkpi-sub" style={{ fontSize: '10px', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>HARVESTED BUNCHES CAPTURED</div>
            </div>
          </div>
        </div>
        <div className="wkpi-card">
          <div className="wkpi-card__inner">
            <div className="wkpi-icon">
              <img src={WEIGHT_ICON} alt="Weight" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div className="wkpi-value">{fmtAbbrev(data.totalWeight)}</div>
              <div className="wkpi-label">Loose Fruit (kg) Collected</div>
              <div className="wkpi-sub" style={{ fontSize: '10px', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>TOTAL COLLECTION WEIGHT</div>
            </div>
          </div>
        </div>
        <div className="wkpi-card">
          <div className="wkpi-card__inner">
            <div className="wkpi-icon">
              <img src={PLOT_ICON} alt="Plot" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div className="wkpi-value">{data.plotCount}</div>
              <div className="wkpi-label">Active Harvest Plots</div>
              <div className="wkpi-sub" style={{ fontSize: '10px', opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', marginTop: '2px' }}>LOCATIONS WITH ACTIVE HARVESTING</div>
            </div>
          </div>
        </div>
      </div>

      <div className="forecasting-stack" style={{ display: 'grid', gridTemplateRows: 'repeat(2, 400px)', gap: '32px' }}>
        <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={22} color="#034321" />
                FFB Production & Prediction Trend
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.5, marginTop: '2px' }}>Real-time bunches tracked vs. Estimated Future Data (Dashed).</p>
            </div>
          </div>
          <div style={{ height: '280px' }}>
            <Line data={ffbChartData} options={chartOptions} />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Scale size={22} color="#f97316" />
                Loose Fruit Collection & Prediction Trend
              </h3>
              <p style={{ fontSize: '14px', opacity: 0.5, marginTop: '2px' }}>Consolidated loose fruit weight tracked vs. Estimated Future Data (Dashed).</p>
            </div>
          </div>
          <div style={{ height: '280px' }}>
            <Line data={lfChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
