import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, BarController, Tooltip, Legend,
} from 'chart.js';
import { API } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, Tooltip, Legend);

const PRESETS = [['30', '30 days'], ['90', '90 days'], ['180', '6 months'], ['365', '1 year'], ['custom', 'Custom']];
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return isoDay(d); };
const WEEKLY_AFTER_DAYS = 120; // longer ranges are grouped by week so bars stay readable
const COLORS = { ripe: '#3F8432', unripe: '#f59e0b', rotten: '#b91c1c', kg: '#0891b2' };
const EMPTY = { harvested: 0, rotten: 0, unripe: 0, kg: 0, records: 0 };

/** Monday of the week containing [iso] (YYYY-MM-DD). */
function weekStart(iso) {
  const d = new Date(`${iso}T00:00:00`);
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return isoDay(d);
}

/**
 * One plot's approved harvest over time (approved harvesting clerk records only): bunches per day split
 * into ripe, unripe and rotten (the bar is the harvested count), and picker kg.
 * Long ranges are shown per week.
 */
export function PlotHarvestHistory({ plotId }) {
  const [preset, setPreset] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const range = useMemo(() => {
    const today = isoDay(new Date());
    if (preset !== 'custom') return { start: addDays(today, -parseInt(preset, 10)), end: today };
    return { start: from || addDays(to || today, -30), end: to || today };
  }, [preset, from, to]);
  const key = `${plotId}|${range.start}|${range.end}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const loading = loadedKey !== key;

  useEffect(() => {
    let active = true;
    API.fetchPlotHarvestHistory(plotId, range.start, range.end)
      .then(res => { if (active) { setData(res); setError(''); } })
      .catch(e => { if (active) { setData(null); setError(e.message || 'Could not load the history'); } })
      .finally(() => { if (active) setLoadedKey(key); });
    return () => { active = false; };
  }, [plotId, range.start, range.end, key]);

  const days = useMemo(() => data?.days || [], [data]);
  const spanDays = Math.round((new Date(range.end) - new Date(range.start)) / 86400000);
  const weekly = spanDays > WEEKLY_AFTER_DAYS;

  // Every day (or week) of the range, including empty ones, so gaps between harvests show.
  const series = useMemo(() => {
    const byKey = new Map();
    days.forEach(d => {
      const k = weekly ? weekStart(d.date) : d.date;
      const cur = byKey.get(k) || { ...EMPTY };
      cur.harvested += d.harvested; cur.rotten += d.rotten; cur.unripe += d.unripe; cur.kg += d.picker_kg; cur.records += d.records;
      byKey.set(k, cur);
    });
    const keys = [];
    for (let k = weekly ? weekStart(range.start) : range.start; k <= range.end; k = addDays(k, weekly ? 7 : 1)) keys.push(k);
    return keys.map(k => ({ key: k, ...(byKey.get(k) || EMPTY) }));
  }, [days, weekly, range.start, range.end]);

  const summary = useMemo(() => {
    const sum = (f) => days.reduce((a, d) => a + d[f], 0);
    const harvestDays = days.filter(d => d.harvested > 0 || d.picker_kg > 0).map(d => d.date);
    const gaps = harvestDays.slice(1).map((d, i) => Math.round((new Date(d) - new Date(harvestDays[i])) / 86400000));
    return {
      harvested: sum('harvested'), rotten: sum('rotten'), unripe: sum('unripe'),
      kg: Math.round(sum('picker_kg') * 10) / 10,
      harvestDays: harvestDays.length,
      avgGap: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
    };
  }, [days]);

  const label = (k) => {
    const d = new Date(`${k}T00:00:00`);
    const txt = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    return weekly ? `wk ${txt}` : txt;
  };
  const hasBunches = summary.harvested > 0;
  const hasKg = summary.kg > 0;
  const labels = series.map(s => label(s.key));
  const bunchData = {
    labels,
    datasets: [
      { label: 'Ripe', data: series.map(s => Math.max(0, s.harvested - s.rotten - s.unripe)), backgroundColor: COLORS.ripe, stack: 'h' },
      { label: 'Unripe', data: series.map(s => s.unripe), backgroundColor: COLORS.unripe, stack: 'h' },
      { label: 'Rotten', data: series.map(s => s.rotten), backgroundColor: COLORS.rotten, stack: 'h' },
    ],
  };
  const kgData = { labels, datasets: [{ label: 'Picker kg', data: series.map(s => Math.round(s.kg * 10) / 10), backgroundColor: COLORS.kg }] };
  const options = (stacked, footer) => ({
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
      tooltip: { callbacks: { footer } },
    },
    scales: {
      x: { stacked, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { size: 10 } } },
      y: { stacked, beginAtZero: true, suggestedMax: 5, ticks: { precision: 0, font: { size: 10 } } },
    },
  });
  const bunchFooter = (items) => {
    const s = series[items[0]?.dataIndex];
    return s ? `Harvested: ${s.harvested} bunches` : '';
  };
  const inputStyle = { height: '32px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0 8px', fontSize: '12px', fontWeight: 600, color: '#0f172a', minWidth: 0, background: 'white' };

  return (
    <div className="plot-harvest-history">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Approved harvest{weekly ? ' (per week)' : ''}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Approved harvesting clerk records only</div>
        </div>
        <select aria-label="History range" value={preset} onChange={e => setPreset(e.target.value)} style={inputStyle}>
          {PRESETS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </div>
      {preset === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
          <input type="date" aria-label="History from" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} style={inputStyle} />
          <input type="date" aria-label="History to" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} style={inputStyle} />
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: '12px', color: '#0f172a', padding: '18px 0' }}>Loading…</div>
      ) : error ? (
        <div style={{ fontSize: '12px', color: '#b91c1c', padding: '12px 0' }}>{error}</div>
      ) : days.length === 0 ? (
        <div style={{ border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '18px 14px', textAlign: 'center', color: '#0f172a', fontSize: '12px', fontWeight: 600 }}>
          No approved harvest for this plot in this range.
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Records waiting for approval are not counted. Try a longer range.</div>
        </div>
      ) : (
        <>
          {hasBunches && (
            <div style={{ height: '190px', position: 'relative' }}>
              <Bar data={bunchData} options={options(true, bunchFooter)} aria-label="Approved bunches per day: ripe, unripe and rotten" />
            </div>
          )}
          {hasKg && (
            <div style={{ height: '120px', position: 'relative', marginTop: '8px' }}>
              <Bar data={kgData} options={options(false)} aria-label="Approved picker kg per day" />
            </div>
          )}

        </>
      )}
    </div>
  );
}
