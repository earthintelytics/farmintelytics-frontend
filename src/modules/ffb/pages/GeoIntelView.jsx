import { MapFullscreenButton } from '../components/MapFullscreenButton';
import { getEstateScope } from '../utils/access';
import { EstateOptions } from '../components/EstateOptions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from '../utils/portalRouter';
import { GeoJSON, LayersControl, MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ExternalLink, RotateCcw, Search, X, FileDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { CONFIG } from '../config';
import { API } from '../services/api';
import { fmtDate, fmtDateTime } from '../utils/formatters';
import { plotIdOf, siteIdOf, estateNameOf } from '../utils/estates';
import { RECON_STATUS_TEXT, downloadReconciliationCsv, RECONCILIATION_EXPORT_COLS } from '../utils/reconciliationCsv';
import ExportColumnsModal from '../components/ExportColumnsModal';
import { useFillToBottom } from '../utils/useFillToBottom';
import { RECON_STATUS } from '../utils/reconStatus';
import { PlotHarvestHistory } from '../components/PlotHarvestHistory';
import StatCards from '../components/StatCards';

const { BaseLayer, Overlay } = LayersControl;

/**
 * Geospatial Intelligence: one plot map, two views of it.
 *  - Harvest interval: was each plot harvested in the period (planning).
 *  - Reconciliation:   does harvested match loaded, per plot (control; was a tab in the Approval Center).
 * Filters (location, period, plot search) are shared; clicking a plot opens its details panel.
 */
const LENSES = [
  { key: 'interval', label: 'Harvest interval', subtitle: 'Plots harvested in the period and plots still waiting. Click a plot for its approved harvest history.' },
  { key: 'reconciliation', label: 'Reconciliation', subtitle: 'Harvested vs loaded, plot by plot (bunches and picker kg). Click a plot to open its records.' },
];

// Reconciliation colours, in priority order (a plot shows its most serious status).
const RECON = [
  { key: 'DISCREPANCY', ...RECON_STATUS.DISCREPANCY, fill: 0.45 },
  { key: 'REJECTED', ...RECON_STATUS.REJECTED, fill: 0.35 },
  { key: 'WAITING_FOR_LOADER', ...RECON_STATUS.WAITING_FOR_LOADER, fill: 0.3 },
  { key: 'WAITING_FOR_RECORDER', ...RECON_STATUS.WAITING_FOR_RECORDER, fill: 0.3 },
  { key: 'RECONCILED', ...RECON_STATUS.RECONCILED, fill: 0.3 },
];
const RECON_BY_KEY = Object.fromEntries(RECON.map(r => [r.key, r]));

const PERIODS = [
  ['1', 'Daily Cycle (24h)'], ['3', '3-Day Cycle'], ['7', 'Last 7 Days'], ['14', 'Last 14 Days'],
  ['20', 'Last 20 Days'], ['30', 'Last 30 Days'], ['custom', 'Custom Filter...'],
];

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null);

/** Keeps plot labels readable: hidden when zoomed out, reports the zoom level. */
function ZoomWatcher({ onZoom }) {
  const map = useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  useEffect(() => { onZoom(map.getZoom()); }, [map, onZoom]);
  return null;
}

/**
 * Moves the map: to a searched/selected plot; back to the start on Reset View; and after any filter
 * change (location, period, Show, legend statuses) to the plots that filter leaves in focus; not on a view switch.
 * A filter zoom waits until that filter's data has loaded, so it fits the real result.
 */
function MapMover({ focusFeature, resetTick, fitKey, fitFeatures, placeKey, placeFeatures, ready, home }) {
  const map = useMap();
  const last = useRef({ focus: undefined, reset: resetTick, fitKey, place: placeKey });
  const placeChanged = useRef(false);
  const pendingFit = useRef(false);
  const opened = useRef(false);
  useEffect(() => {
    const prev = last.current;
    // Open centered on this estate (or all tenant plots on first boundary load).
    if (!opened.current && ready && placeFeatures.length) {
      opened.current = true;
      try { map.fitBounds(L.geoJSON({ type: 'FeatureCollection', features: placeFeatures }).getBounds(), { padding: [40, 40], maxZoom: 16 }); } catch { /* ignore */ }
    }
    if (fitKey !== prev.fitKey) pendingFit.current = true;
    if (placeKey !== prev.place) placeChanged.current = true;
    if (focusFeature && focusFeature !== prev.focus) {
      pendingFit.current = false;
      try { map.fitBounds(L.geoJSON(focusFeature).getBounds(), { padding: [120, 120], maxZoom: 17 }); } catch { /* ignore */ }
    } else if (resetTick !== prev.reset) {
      pendingFit.current = false;
      map.setView(home?.center || CONFIG.MAP.CENTER, home?.zoom || CONFIG.MAP.ZOOM);
    } else if (pendingFit.current && ready) {
      pendingFit.current = false;
      // Every dropdown behaves the same: zoom to the plots it lights up. When it lights none (e.g. Daily
      // with no harvest today) the map stays where it is, except after a new location: then its plots.
      const target = fitFeatures.length ? fitFeatures : (placeChanged.current ? placeFeatures : []);
      placeChanged.current = false;
      if (target.length) {
        try {
          map.flyToBounds(L.geoJSON({ type: 'FeatureCollection', features: target }).getBounds(),
            { padding: [40, 40], maxZoom: 16, duration: 0.8 });
        } catch { /* ignore */ }
      }
    }
    last.current = { focus: focusFeature, reset: resetTick, fitKey, place: placeKey };
  }, [map, focusFeature, resetTick, fitKey, fitFeatures, placeKey, placeFeatures, ready]);
  return null;
}

export function GeoIntelView() {
  const { geoData, userRole, estateMap } = useAppContext();
  const isViewer = userRole === 'View';
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const lens = LENSES.some(l => l.key === params.get('lens')) ? params.get('lens') : 'interval';
  const setLens = (key) => setParams(prev => { const p = new URLSearchParams(prev); p.set('lens', key); return p; }, { replace: true });

  // ── Shared filters ───────────────────────────────────────────────────────
  const [estate, setEstate] = useState(getEstateScope());
  const [period, setPeriod] = useState('7');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plotQuery, setPlotQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [shownStatuses, setShownStatuses] = useState(() => new Set(RECON.map(r => r.key)));
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [focusFeature, setFocusFeature] = useState(null);
  const [resetTick, setResetTick] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [zoom, setZoom] = useState(CONFIG.MAP.ZOOM);
  const handleConfirmExport = (selectedKeys) => {
    downloadReconciliationCsv(exportRows, selectedKeys);
  };

  const dateRange = useMemo(() => {
    if (period === 'custom') return { from: startDate || null, to: endDate || null };
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - parseInt(period, 10));
    return { from: isoDay(from), to: isoDay(to) };
  }, [period, startDate, endDate]);

  // ── Data ────────────────────────────────────────────────────────────────
  const [harvestInRange, setHarvestInRange] = useState(null); // last harvest within the period
  const [harvestEver, setHarvestEver] = useState(null);       // last harvest ever (for "overdue")
  const [recon, setRecon] = useState(null);                   // plot-days, bunches + picker kg
  const requestKey = `${dateRange.from}|${dateRange.to}|${refreshTick}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    const bump = () => setRefreshTick(t => t + 1);
    window.addEventListener('ffb:refresh', bump);
    return () => window.removeEventListener('ffb:refresh', bump);
  }, []);

  useEffect(() => {
    let active = true;
    const q = { dateRange };
    Promise.all([
      API.fetchPlotsHarvestStatus({ date_from: dateRange.from, date_to: dateRange.to }).catch(() => []),
      API.fetchPlotsHarvestStatus({}).catch(() => []),
      API.fetchPlotExceptions(q).catch(() => []),
      API.fetchPlotExceptions({ ...q, mode: 'picker' }).catch(() => []),
    ]).then(([inRange, ever, harv, pick]) => {
      if (!active) return;
      setHarvestInRange(Array.isArray(inRange) ? inRange : []);
      setHarvestEver(Array.isArray(ever) ? ever : []);
      setRecon([...(harv || []).map(p => ({ ...p, mode: p.mode || 'harvester' })), ...(pick || []).map(p => ({ ...p, mode: 'picker' }))]);
    }).finally(() => { if (active) setLoadedKey(requestKey); });
    return () => { active = false; };
  }, [dateRange, refreshTick, requestKey]);

  const lastInRange = useMemo(() => {
    const m = new Map();
    (harvestInRange || []).filter(p => p.last_harvested_at).forEach(p => {
      if (p.plot_id) m.set(p.plot_id, p.last_harvested_at);
      if (p.plot_number) m.set(p.plot_number, p.last_harvested_at);
      if (p.plot_id && p.plot_id.includes('-')) {
        m.set(p.plot_id.split('-')[1], p.last_harvested_at);
      }
    });
    return m;
  }, [harvestInRange]);

  const lastEver = useMemo(() => {
    const m = new Map();
    (harvestEver || []).filter(p => p.last_harvested_at).forEach(p => {
      if (p.plot_id) m.set(p.plot_id, p.last_harvested_at);
      if (p.plot_number) m.set(p.plot_number, p.last_harvested_at);
      if (p.plot_id && p.plot_id.includes('-')) {
        m.set(p.plot_id.split('-')[1], p.last_harvested_at);
      }
    });
    return m;
  }, [harvestEver]);

  const reconRows = useMemo(() => recon || [], [recon]);
  const reconByPlot = useMemo(() => {
    const m = new Map();
    reconRows.forEach(p => {
      if (!p.plot_id) return;
      const ids = [p.plot_id];
      if (p.plot_id.includes('-')) ids.push(p.plot_id.split('-')[1]);
      ids.forEach(id => {
        if (!m.has(id)) m.set(id, []);
        m.get(id).push(p);
      });
    });
    m.forEach(rows => rows.sort((a, b) => String(b.work_date).localeCompare(String(a.work_date))));
    return m;
  }, [reconRows]);

  const estateId = estate ? estateMap?.[estate]?.id : null;
  const inEstate = useCallback((plotId, feature) => !estate || (feature ? (siteIdOf(feature) === estateId || estateNameOf(feature) === estate) : String(plotId).startsWith(estateId || estate)), [estate, estateId]);
  // Plots of the chosen location (the six cards count these, whatever "Show" is set to).
  const locationFeatures = useMemo(() => (geoData?.features || []).filter(f => plotIdOf(f) && inEstate(plotIdOf(f), f)), [geoData, inEstate]);
  // Plots drawn on the map. "Show" narrows them to what matters in the current view:
  //  - Harvest interval: plots harvested in the period.
  //  - Reconciliation:   plots with harvesting or loading records in the period.
  const features = useMemo(() => locationFeatures.filter(f => {
    if (!activeOnly) return true;
    const id = plotIdOf(f);
    return lens === 'interval' ? lastInRange.has(id) : reconByPlot.has(id);
  }), [locationFeatures, activeOnly, lens, lastInRange, reconByPlot]);
  const featureById = useMemo(() => new Map((geoData?.features || []).map(f => [plotIdOf(f), f])), [geoData]);
  // What a filter change zooms to: the plots that light up in this view (harvested in the period, or
  // with records in a status the legend shows); if none, every plot drawn. Only the dropdowns and the
  // legend move the map: switching view (Harvest Interval / Reconciliation) keeps the map where it is.
  const fitKey = [estate, activeOnly, dateRange.from, dateRange.to, [...shownStatuses].sort().join(',')].join('|');
  const fitFeatures = useMemo(() => {
    const lit = features.filter(f => {
      const id = plotIdOf(f);
      return lens === 'interval' ? lastInRange.has(id) : (reconByPlot.get(id) || []).some(r => shownStatuses.has(r.status));
    });
    return lit; // nothing lit: no zoom (see MapMover)
  }, [features, lens, lastInRange, reconByPlot, shownStatuses]);

  /** Most serious reconciliation status of a plot (only among the statuses shown, if asked). */
  const worstStatus = useCallback((plotId, onlyShown) => {
    const rows = (reconByPlot.get(plotId) || []).filter(r => !onlyShown || shownStatuses.has(r.status));
    return RECON.find(s => rows.some(r => r.status === s.key)) || null;
  }, [reconByPlot, shownStatuses]);
  const reconStatusOf = useCallback((plotId) => worstStatus(plotId, true), [worstStatus]);

  // ── Counts for the header cards (location filter applied) ────────────────
  const counts = useMemo(() => {
    const ids = [...new Set(locationFeatures.map(plotIdOf))]; // a plot ID drawn twice in the map file counts once
    const c = { harvested: 0, notHarvested: 0, recon: Object.fromEntries(RECON.map(r => [r.key, 0])) };
    ids.forEach(id => {
      if (lastInRange.has(id)) c.harvested += 1; else c.notHarvested += 1;
      const s = worstStatus(id, false);
      if (s) c.recon[s.key] += 1;
    });
    return c;
  }, [locationFeatures, lastInRange, worstStatus]);

  // ── Plot styling per view ────────────────────────────────────────────────
  const styleFor = useCallback((feature) => {
    const id = plotIdOf(feature);
    const selected = id === selectedPlot;
    let color = 'rgba(255,255,255,0.45)', fillColor = '#ffffff', fillOpacity = 0.03, weight = 1;
    if (lens === 'interval') {
      const harvested = lastInRange.has(id);
      color = harvested ? '#3F8432' : '#dc2626';
      fillColor = harvested ? '#5AA041' : '#f87171';
      fillOpacity = harvested ? 0.3 : 0.15;
      weight = 2;
    } else {
      const s = reconStatusOf(id);
      if (s) { color = s.color; fillColor = s.color; fillOpacity = s.fill; weight = 2; }
    }
    return {
      color: selected ? '#1d4ed8' : color,
      weight: selected ? 4 : weight,
      fillColor,
      fillOpacity,
      dashArray: selected || zoom >= 16 ? '0' : '3',
    };
  }, [lens, lastInRange, reconStatusOf, selectedPlot, zoom]);

  const showLabels = zoom >= 15;
  const plotLayersRef = useRef(new Map());

  const onEachPlot = useCallback((feature, layer) => {
    const id = plotIdOf(feature);
    if (!id) return;
    plotLayersRef.current.set(id, layer);
    if (showLabels) {
      const block = feature.properties?.CodeBloc;
      layer.bindTooltip(`<div style="font-weight: 500;font-size:11px;">${id}${block ? ` (${block})` : ''}</div>`, {
        permanent: true, direction: 'center', className: 'plot-label-tooltip',
      });
    }
    layer.on('click', () => { setSelectedPlot(id); setFocusFeature(null); });
  }, [showLabels]);

  // Update styles directly on plot selection for instant response without re-mounting the layer tree
  useEffect(() => {
    plotLayersRef.current.forEach((layer, pid) => {
      const feat = featureById.get(pid);
      if (feat && layer.setStyle) {
        try { layer.setStyle(styleFor(feat)); } catch { /* optional: ignore and keep the default */ }
      }
    });
  }, [selectedPlot, styleFor, featureById]);

  const geoKey = [lens, estateId, activeOnly, features.length, showLabels, [...shownStatuses].sort().join(','), lastInRange.size, (recon || []).length,
    (recon || []).map(r => r.status[0]).join(''), lastEver.size, zoom >= 16].join('|');

  // ── Plot search ──────────────────────────────────────────────────────────
  const findPlot = (e) => {
    e?.preventDefault?.();
    const q = plotQuery.trim().toUpperCase();
    if (!q) return;
    const hit = (geoData?.features || []).find(f => String(plotIdOf(f)).toUpperCase() === q)
      || (geoData?.features || []).find(f => String(plotIdOf(f)).toUpperCase().endsWith(`-${q}`))
      || (geoData?.features || []).find(f => String(plotIdOf(f)).toUpperCase().includes(q));
    if (hit) { setSelectedPlot(plotIdOf(hit)); setFocusFeature(hit); } else { setSelectedPlot(`?${plotQuery.trim()}`); }
  };

  const resetAll = () => {
    setEstate(getEstateScope()); setPeriod('7'); setStartDate(''); setEndDate(''); setPlotQuery('');
    setActiveOnly(false);
    setShownStatuses(new Set(RECON.map(r => r.key))); setSelectedPlot(null); setFocusFeature(null);
    setResetTick(t => t + 1);
  };

  const shownIds = useMemo(() => new Set(features.map(plotIdOf)), [features]);
  const exportRows = useMemo(() => reconRows
    .filter(r => shownIds.has(r.plot_id))
    .filter(r => lens !== 'reconciliation' || shownStatuses.has(r.status))
    .sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)) || String(a.plot_id).localeCompare(String(b.plot_id))),
  [reconRows, shownIds, lens, shownStatuses]);

  const envelopeRef = useRef(null);
  useFillToBottom(envelopeRef);

  // ── Six KPI cards (square), always shown; a click switches to the view the card belongs to ──
  const KPIS = [
    { label: 'Harvested', value: counts.harvested, color: '#3F8432', lens: 'interval' },
    { label: 'No Harvest', value: counts.notHarvested, color: '#dc2626', lens: 'interval' },
    { label: RECON_STATUS.RECONCILED.label, value: counts.recon.RECONCILED, color: RECON_STATUS.RECONCILED.dark, lens: 'reconciliation' },
    { label: RECON_STATUS.DISCREPANCY.label, value: counts.recon.DISCREPANCY, color: RECON_STATUS.DISCREPANCY.color, lens: 'reconciliation' },
    { label: RECON_STATUS.WAITING_FOR_LOADER.label, value: counts.recon.WAITING_FOR_LOADER, color: RECON_STATUS.WAITING_FOR_LOADER.dark, lens: 'reconciliation' },
    { label: RECON_STATUS.REJECTED.label, value: counts.recon.REJECTED, color: RECON_STATUS.REJECTED.dark, lens: 'reconciliation' },
    { label: RECON_STATUS.WAITING_FOR_RECORDER.label, value: counts.recon.WAITING_FOR_RECORDER, color: RECON_STATUS.WAITING_FOR_RECORDER.dark, lens: 'reconciliation' },
  ];

  const selectedFeature = selectedPlot && !selectedPlot.startsWith('?') ? featureById.get(selectedPlot) : null;
  const inputStyle = { width: '100%', height: '42px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 400, color: '#0f172a' };

  return (
    <div className="view-container view-fade-in map-view geo-intel" style={{ padding: '20px 32px 0', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="view-title">Geospatial Intelligence</h1>
          <p className="view-subtitle">Plot-by-plot map of the estate: when each plot was last harvested, and whether harvested bunches and picker kg match what was loaded.</p>
        </div>
        {/* View switch, beside the title (keeps the filters on one line and the map tall) */}
        <div role="tablist" aria-label="Map view" className="geo-intel__lenses" style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', flexWrap: 'wrap', height: '42px', boxSizing: 'border-box' }}>
          {LENSES.map(l => (
            <button key={l.key} type="button" role="tab" aria-selected={lens === l.key} onClick={() => setLens(l.key)} title={l.subtitle}
              style={{ border: 'none', borderRadius: '9px', padding: '0 14px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                background: lens === l.key ? 'white' : 'transparent', color: lens === l.key ? '#3F8432' : '#64748b',
                boxShadow: lens === l.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              {l.label}
            </button>
          ))}
        </div>

      </div>

      {/* Counts only: clicking a card does not change the view or filter anything (use the tabs above). */}
      <StatCards className="geo-intel__kpis" items={KPIS} loading={recon === null} />

      {/* Shared filters */}
      <div className="map-filter-orchestrator" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '12px', marginBottom: '12px', padding: '12px 16px', background: 'var(--surface-1)', border: '1px solid var(--border-soft)', borderRadius: '12px' }}>
        <div className="filter-group" style={{ flex: '1 1 180px' }}>
          <label className="filter-label">Plantation Location</label>
          <select className="select-input" value={estate} onChange={e => setEstate(e.target.value)} style={inputStyle}>
            <EstateOptions />
          </select>
        </div>
        <div className="filter-group" style={{ flex: '1 1 190px' }}>
          <label className="filter-label">Period</label>
          <select className="select-input" value={period} onChange={e => setPeriod(e.target.value)} style={inputStyle}>
            {PERIODS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        {period === 'custom' && (
          <>
            <div className="filter-group" style={{ flex: '1 1 150px' }}>
              <label className="filter-label">Start Date</label>
              <input type="date" className="select-input" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div className="filter-group" style={{ flex: '1 1 150px' }}>
              <label className="filter-label">End Date</label>
              <input type="date" className="select-input" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
            </div>
          </>
        )}
        <div className="filter-group" style={{ flex: '1 1 170px' }}>
          <label className="filter-label">Show</label>
          <select className="select-input" value={activeOnly ? 'active' : 'all'} onChange={e => setActiveOnly(e.target.value === 'active')} style={inputStyle}>
            <option value="all">All plots</option>
            <option value="active">{lens === 'interval' ? 'Harvested plots' : 'Plots with records'}</option>
          </select>
        </div>
        <form className="filter-group" style={{ flex: '1 1 200px' }} onSubmit={findPlot}>
          <label className="filter-label">Find Plot</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
            <input className="select-input" value={plotQuery} onChange={e => setPlotQuery(e.target.value)} placeholder="e.g. B3.3" aria-label="Find plot"
              style={{ ...inputStyle, paddingLeft: '34px' }} />
          </div>
        </form>
        <button type="button" className="btn btn--outline" onClick={resetAll} style={{ height: '42px', whiteSpace: 'nowrap' }}>
          <RotateCcw size={14} style={{ marginRight: '6px' }} /> Reset
        </button>
        {lens !== 'interval' && (
          <button 
            type="button" 
            className="btn btn--primary" 
            onClick={isViewer ? undefined : () => setExportModalOpen(true)} 
            disabled={!exportRows.length || isViewer}
            title={isViewer ? 'Viewer accounts cannot export CSV from the portal' : (exportRows.length ? `${exportRows.length} plot-day rows` : 'Nothing to export for this period')}
            style={{ 
              height: '42px', whiteSpace: 'nowrap', 
              background: isViewer ? '#94a3b8' : '#3F8432', 
              borderColor: isViewer ? '#94a3b8' : '#3F8432', 
              cursor: isViewer ? 'not-allowed' : 'pointer',
              opacity: isViewer ? 0.7 : 1,
              fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: '6px'
            }}
          >
            <FileDown size={15} /> Export CSV
          </button>
        )}
      </div>

      <div ref={envelopeRef} className="map-canvas-envelope geo-intel__map" data-plots={features.length} style={{ position: 'relative', borderRadius: 0 }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', pointerEvents: 'none' }}>
            <div className="loader-spinner" style={{ margin: 0 }} />
            <span style={{ fontWeight: 500, color: 'var(--clr-brand-primary)' }}>Loading plots...</span>
          </div>
        )}

        <MapContainer preferCanvas center={estateMap?.[getEstateScope()]?.center || CONFIG.MAP.CENTER} zoom={estateMap?.[getEstateScope()]?.zoom || CONFIG.MAP.ZOOM} maxZoom={CONFIG.MAP.MAX_ZOOM} zoomControl={false}
          style={{ height: '100%', width: '100%', background: '#f8fafc' }}>
          <ZoomWatcher onZoom={setZoom} />
          <MapFullscreenButton />
          <MapMover focusFeature={focusFeature} resetTick={resetTick} fitKey={fitKey} fitFeatures={fitFeatures}
            placeKey={estate} placeFeatures={features} ready={!loading}
            home={estateMap?.[getEstateScope()]} openOnPlace={!!getEstateScope()} />
          <LayersControl position="bottomleft" collapsed={false}>
            <BaseLayer checked name="Satellite Imagery">
              <TileLayer url={CONFIG.MAP.SAT_TILE_URL} attribution={CONFIG.MAP.SAT_ATTRIBUTION} maxZoom={CONFIG.MAP.MAX_ZOOM} maxNativeZoom={20} />
            </BaseLayer>
            <BaseLayer name="Street Map">
              <TileLayer url={CONFIG.MAP.TILE_URL} attribution={CONFIG.MAP.TILE_ATTRIBUTION} maxZoom={CONFIG.MAP.MAX_ZOOM} maxNativeZoom={19} />
            </BaseLayer>
            {features.length > 0 && (
              <Overlay checked name="PLOTS">
                <GeoJSON key={geoKey} data={{ type: 'FeatureCollection', features }} style={styleFor} onEachFeature={onEachPlot} />
              </Overlay>
            )}
          </LayersControl>
          <ZoomControl position="bottomright" />
        </MapContainer>

        {/* Legend (the reconciliation legend doubles as a status filter) */}
        <div className="geo-intel__legend" style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1000, background: 'white', border: '1px solid #e2e8f0',
          borderRadius: 0, padding: '8px 10px', fontSize: '12px', fontWeight: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: '240px' }}>
          <div style={{ fontSize: '10px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            {lens === 'reconciliation' ? 'Show status' : 'Legend'}
          </div>
          {lens === 'interval' && [['#5AA041', '#3F8432', 'Harvested in period'], ['#f87171', '#dc2626', 'No harvest in period']].map(([fill, stroke, t]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: 0, background: fill, border: `1.5px solid ${stroke}`, flexShrink: 0 }} />{t}
            </div>
          ))}
          {lens === 'reconciliation' && RECON.map(s => {
            const on = shownStatuses.has(s.key);
            return (
              <button key={s.key} type="button" aria-pressed={on} title={on ? `Hide ${s.label}` : `Show ${s.label}`}
                onClick={() => setShownStatuses(prev => { const n = new Set(prev); if (n.has(s.key)) n.delete(s.key); else n.add(s.key); return n; })}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: '3px 0', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 500, color: on ? '#0f172a' : '#94a3b8', textAlign: 'left', width: '100%' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: 0, flexShrink: 0, background: on ? s.color : 'transparent', border: `2px solid ${s.color}` }} />
                <span style={{ textDecoration: on ? 'none' : 'line-through' }}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {selectedPlot && (
          <PlotPanel
            lens={lens}
            plotId={selectedPlot.startsWith('?') ? null : selectedPlot}
            query={selectedPlot.startsWith('?') ? selectedPlot.slice(1) : null}
            feature={selectedFeature}
            lastEver={lastEver.get(selectedPlot)}
            harvestedInPeriod={lastInRange.has(selectedPlot)}
            rows={reconByPlot.get(selectedPlot) || []}
            onClose={() => { setSelectedPlot(null); setFocusFeature(null); }}
            onOpen={(row) => navigate(`/approval?plot=${encodeURIComponent(row.plot_id)}&date=${encodeURIComponent(row.work_date)}`)}
          />
        )}
      </div>
      <ExportColumnsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        columns={RECONCILIATION_EXPORT_COLS}
        onExport={handleConfirmExport}
        isViewer={isViewer}
      />
    </div>
  );
}

/** Details of one plot: harvest timing and every plot-day of the period, with a link to its records. */
/** Details of one plot. Harvest interval: when it was harvested and its harvest history.
 *  Reconciliation: harvested vs loaded for each plot-day of the period, with a link to its records. */
function PlotPanel({ lens, plotId, query, feature, lastEver, harvestedInPeriod, rows, onClose, onOpen }) {
  const p = feature?.properties || {};
  const ago = daysAgo(lastEver);
  return (
    <aside className="geo-intel__panel" aria-label={plotId ? `Plot ${plotId}` : 'Plot not found'}
      style={{ position: 'absolute', top: '64px', right: '12px', maxHeight: 'calc(100% - 76px)', width: 'min(360px, calc(100% - 24px))', zIndex: 1001, // below the full-screen button; as tall as its content
        background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,0.18)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', background: 'white', color: '#0f172a', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 500, overflowWrap: 'anywhere' }}>{plotId ? `Plot ${plotId}` : `No plot matches "${query}"`}</div>
          {plotId && (
            <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '2px' }}>
              Block {p.CodeBloc || '—'} · {p.AreaHa ? `${p.AreaHa} ha` : 'area —'}{p.YOP ? ` · planted ${p.YOP}` : ''}
            </div>
          )}
        </div>
        <button type="button" onClick={onClose} aria-label="Close plot details"
          style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0f172a', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {plotId && (
        <div style={{ padding: '14px 16px', overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lens === 'interval' && (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>Last harvested</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', marginTop: '4px' }}>{lastEver ? fmtDateTime(lastEver) : 'Never recorded'}</div>
              {ago !== null && <div style={{ fontSize: '12px', color: '#0f172a' }}>{ago === 0 ? 'today' : `${ago} day${ago === 1 ? '' : 's'} ago`}</div>}
            </div>
            <div style={{ background: harvestedInPeriod ? '#F3F8EF' : '#fff1f2', border: `1px solid ${harvestedInPeriod ? '#5AA041' : '#fca5a5'}`, borderRadius: '10px', padding: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase' }}>This period</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: harvestedInPeriod ? '#3F8432' : '#b91c1c', marginTop: '4px' }}>
                {harvestedInPeriod ? 'Harvested' : 'No harvest'}
              </div>
            </div>
          </div>

          <PlotHarvestHistory key={plotId} plotId={plotId} />
          </>)}

          {lens === 'reconciliation' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Harvested vs loaded ({rows.length} plot-day{rows.length === 1 ? '' : 's'})
            </div>
            {rows.length === 0 && <div style={{ fontSize: '13px', color: '#0f172a' }}>No harvest or loading recorded in this period.</div>}
            {rows.map(r => {
              const kg = r.mode === 'picker';
              const s = RECON_BY_KEY[r.status];
              return (
                <div key={`${r.work_date}-${r.mode}`} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '13px' }}>{fmtDate(r.work_date)} · {kg ? 'Picker' : 'Harvester'}</strong>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: s?.color || '#475569', border: `1px solid ${s?.color || '#cbd5e1'}`, borderRadius: '999px', padding: '2px 8px' }}>
                      {RECON_STATUS_TEXT[r.status] || r.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '6px' }}>
                    Harvested <b>{kg ? `${r.harvester_weight} kg` : r.harvester_count}</b> · Loaded <b>{kg ? `${r.loader_weight} kg` : r.loader_count}</b>
                    {!kg && r.harvester_rotten ? <> · Rotten <b>{r.harvester_rotten}</b></> : null}
                  </div>
                  <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '2px', overflowWrap: 'anywhere' }}>
                    Harvester Role: {r.harvesting_clerk_ids || '—'} · Loading Role: {r.loading_clerk_ids || '—'}
                  </div>
                  <button type="button" onClick={() => onOpen(r)}
                    style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', border: 'none', background: '#3F8432', color: 'white',
                      borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
                    Open in Approval Center <ExternalLink size={13} />
                  </button>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </aside>
  );
}
