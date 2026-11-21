import { RECON_STATUS, reconStatus, PAIR_STATUS, statusMatches } from '../utils/reconStatus';
import { StatusFilter } from '../components/StatusFilter';
import { MapFullscreenButton } from '../components/MapFullscreenButton';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { useEffect, useMemo, useState, useCallback, memo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap, FeatureGroup, GeoJSON, ZoomControl, useMapEvents } from 'react-leaflet';
import { useAppContext } from '../context/AppContext';
import { CONFIG } from '../config';
import { ROLES } from '../utils/constants';
import { Search, Zap, X, Calendar, RotateCcw } from 'lucide-react';
import { fmtDateTime, fmtNumber } from '../utils/formatters';
import { bunchCount, countFlag } from '../utils/counts';
import { fmtPlatform, platformNumber } from '../utils/platform';
import { estateNameOf, siteIdOf } from '../utils/estates';
import { EstateOptions } from '../components/EstateOptions';
import { API } from '../services/api';
import { useFillToBottom } from '../utils/useFillToBottom';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

// Fix for default Leaflet icons in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const { BaseLayer, Overlay } = LayersControl;

const FILTER_FIT_WINDOW_MS = 8000; // after a filter change, the records that arrive next are zoomed to

const MapUpdater = memo(({ operations, isReady, currentEstate, hasTarget, geoData, resetTick, filterKey, focusTick, estateMap }) => {
  const map = useMap();
  const prevFocusRef = useRef(undefined);   // a Map Audit focus at opening also skips the fit
  const prevEstateRef = useRef();
  const prevHasTargetRef = useRef();
  const prevResetRef = useRef(resetTick);
  const prevFilterKeyRef = useRef(filterKey);
  const prevOpsRef = useRef(operations);
  const fitUntilRef = useRef(0);

  useEffect(() => { if (isReady) setTimeout(() => map.invalidateSize(), 250); }, [isReady, map]);

  useEffect(() => {
    // Only adjust map center/zoom if the filter values have actually changed!
    // Reset View always moves the map back, even when no filter changed (e.g. after zooming by hand).
    const resetClicked = resetTick !== prevResetRef.current;
    prevResetRef.current = resetTick;
    // Map Audit moves the map itself (PlatformFocus): don't zoom out to the records it filtered to.
    if (!resetClicked && focusTick && focusTick !== prevFocusRef.current) {
      prevFocusRef.current = focusTick;
      prevFilterKeyRef.current = filterKey;
      prevOpsRef.current = operations;
      prevEstateRef.current = currentEstate;
      prevHasTargetRef.current = hasTarget;
      fitUntilRef.current = 0;
      return;
    }
    prevFocusRef.current = focusTick;
    // Any filter change zooms to the records it shows, including the records that load right after it.
    const filterChanged = filterKey !== prevFilterKeyRef.current;
    prevFilterKeyRef.current = filterKey;
    if (filterChanged) fitUntilRef.current = Date.now() + FILTER_FIT_WINDOW_MS;
    const newRecords = operations !== prevOpsRef.current;
    prevOpsRef.current = operations;
    const fitToRecords = !resetClicked && (filterChanged || (newRecords && Date.now() < fitUntilRef.current));
    if (!resetClicked && !fitToRecords && currentEstate === prevEstateRef.current && hasTarget === prevHasTargetRef.current) {
      return;
    }

    prevEstateRef.current = currentEstate;
    prevHasTargetRef.current = hasTarget;

    if ((hasTarget || fitToRecords) && operations.length > 0) {
      const points = operations.filter(o => o.latitude && o.longitude);
      if (points.length > 0) {
        try {
          const bounds = L.latLngBounds(points.map(o => [o.latitude, o.longitude]));
          map.fitBounds(bounds, { padding: [100, 100], maxZoom: 17 });
          return;
        } catch { /* ignore */ }
      }
    }

    if (currentEstate && geoData && geoData.features) {
      const estateId = estateMap?.[currentEstate]?.id;
      const filteredFeatures = geoData.features.filter(f =>
        estateNameOf(f) === currentEstate || (estateId && siteIdOf(f) === estateId)
      );
      if (filteredFeatures.length > 0) {
        try {
          const geoJsonLayer = L.geoJSON({
            type: 'FeatureCollection',
            features: filteredFeatures
          });
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
            return;
          }
        } catch (e) {
          console.warn('Failed to fit bounds for estate features:', e);
        }
      }
    }

    if (currentEstate && estateMap?.[currentEstate]) {
      const { center, zoom } = estateMap[currentEstate];
      map.flyTo(center, zoom, { duration: 1.5 });
    } else if (geoData?.features?.length > 0) {
      try {
        const b = L.geoJSON(geoData).getBounds();
        if (b.isValid()) {
          map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
          return;
        }
      } catch { /* ignore */ }
      map.setView(CONFIG.MAP.CENTER, CONFIG.MAP.ZOOM);
    } else {
      map.setView(CONFIG.MAP.CENTER, CONFIG.MAP.ZOOM);
    }
  }, [operations, map, currentEstate, hasTarget, geoData, resetTick, filterKey, estateMap]);

  return null;
});

// Map Audit: the audited plot's platforms with their labels, the record's platform highlighted and zoomed to.
const PlatformFocus = memo(({ focus }) => {
  const map = useMap();
  const [platforms, setPlatforms] = useState(null);

  useEffect(() => {
    let active = true;
    setPlatforms(null);
    if (focus?.plot) API.fetchPlotPlatforms(focus.plot).then(fc => { if (active) setPlatforms(fc); }).catch(() => {});
    return () => { active = false; };
  }, [focus?.plot, focus?.t]);

  useEffect(() => {
    if (!focus) return;
    const cell = platforms?.features?.find(f => f.properties?.grid_cell_id === focus.platform);
    try {
      // Close in on the platform: two zoom levels past the view that fits it.
      if (cell) {
        const bounds = L.geoJSON(cell).getBounds();
        const zoom = Math.min(map.getBoundsZoom(bounds, false, L.point(320, 320)) + 2, map.getMaxZoom());
        map.setView(bounds.getCenter(), zoom, { animate: false });
      } else if (focus.lat && focus.lng) map.setView([focus.lat, focus.lng], Math.min(21, map.getMaxZoom()), { animate: false });
    } catch { /* ignore */ }
  }, [platforms, focus, map]);

  // Dynamic loading: only the platforms in (or just around) the visible part of the map are drawn, and their
  // number labels are made only when zoomed in close enough to read them. A plot has ~300 platforms; drawing
  // and labelling all of them at once made the map slow. The audited platform is always drawn and labelled.
  const [view, setView] = useState(() => ({ bounds: map.getBounds(), zoom: map.getZoom() }));
  useEffect(() => {
    const update = () => setView({ bounds: map.getBounds(), zoom: map.getZoom() });
    update();
    map.on('moveend', update);   // fires after pan and zoom, once the map stops
    return () => { map.off('moveend', update); };
  }, [map]);

  // Each platform's outline box, worked out once per plot (not on every move).
  const boxed = useMemo(() => (platforms?.features || []).map(f => {
    let box = null;
    try { box = L.geoJSON(f).getBounds(); } catch { /* bad shape: skip */ }
    return { f, box };
  }).filter(x => x.box && x.box.isValid()), [platforms]);

  const showLabels = view.zoom >= 18;
  const visible = useMemo(() => {
    if (!focus?.plot) return null;
    const area = view.bounds.pad(0.25);   // a margin, so platforms are already there when you pan a little
    const features = boxed.filter(({ f, box }) => f.properties?.grid_cell_id === focus.platform || area.intersects(box)).map(x => x.f);
    return { type: 'FeatureCollection', features };
  }, [boxed, view, focus]);

  if (!focus?.plot || !platforms || !visible) return null;
  const isFocus = (f) => f.properties?.grid_cell_id === focus.platform;
  const label = (f) => (isFocus(f) ? fmtPlatform(f.properties?.grid_cell_id) : platformNumber(f.properties?.grid_cell_id));
  const ids = visible.features.map(f => f.properties?.grid_cell_id).join(',');
  return (
    <GeoJSON
      key={`platforms-${focus.plot}-${focus.t}-${showLabels ? 'labels' : 'plain'}-${ids.length}-${ids.slice(0, 40)}-${ids.slice(-40)}`}
      data={visible}
      interactive={false}
      style={(f) => (isFocus(f)
        ? { color: '#facc15', weight: 3, fillColor: '#facc15', fillOpacity: 0.25 }
        : { color: '#ffffff', weight: 1, fillColor: '#ffffff', fillOpacity: 0.04 })}
      // Platforms are narrow: the others show their number (247), the audited one "Platform 248".
      onEachFeature={(f, layer) => {
        if (!showLabels && !isFocus(f)) return;   // zoomed out: no labels to build
        layer.bindTooltip(label(f), {
          permanent: true, direction: 'center', className: `platform-label${isFocus(f) ? ' platform-label--focus' : ''}`,
        });
      }}
    />
  );
});

const InternalMapHandler = memo(({ setShowLabels }) => {
  const map = useMapEvents({
    zoomend: (e) => {
      const zoom = e.target.getZoom();
      setShowLabels(zoom >= 16);
      if (zoom < 14) {
        map.getContainer().classList.add('hide-plot-labels');
      } else {
        map.getContainer().classList.remove('hide-plot-labels');
      }
    }
  });

  useEffect(() => {
    if (map) {
      if (map.getZoom() < 14) {
        map.getContainer().classList.add('hide-plot-labels');
      } else {
        map.getContainer().classList.remove('hide-plot-labels');
      }
    }
  }, [map]);

  return null;
});

// All capture points in ONE clustered layer on ONE canvas: with a canvas per layer the top canvas
// swallowed the clicks meant for the layer below. Points at the same spot fan out (spiderfy) when clicked.
const ClusterMarkers = memo(({ markers, onMarkerClick }) => {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 2,
      disableClusteringAtZoom: 16,
      maxClusterRadius: (zoom) => (zoom >= 15 ? 12 : zoom >= 13 ? 25 : 40),
      chunkedLoading: true,
      iconCreateFunction: (cluster) => {
        const childMarkers = cluster.getAllChildMarkers();
        const count = childMarkers.length;

        let dominant = 'RECONCILED';
        for (const m of childMarkers) {
          const st = m._validation_status;
          if (st === 'DISCREPANCY') { dominant = 'DISCREPANCY'; break; }
          if (st === 'REJECTED') dominant = 'REJECTED';
          else if (dominant !== 'REJECTED' && st === 'WAITING_FOR_LOADER') dominant = 'WAITING_FOR_LOADER';
          else if (dominant !== 'REJECTED' && dominant !== 'WAITING_FOR_LOADER' && st === 'WAITING_FOR_RECORDER') dominant = 'WAITING_FOR_RECORDER';
        }

        const info = reconStatus(dominant);
        const bg = info.color;
        const dark = info.dark;
        const size = count < 10 ? 30 : count < 100 ? 36 : 44;

        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:${bg};border:2.5px solid #ffffff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ffffff;font-family:'Inter',sans-serif;font-weight: 500;font-size:${size >= 36 ? '13px' : '11.5px'};box-shadow:0 3px 10px rgba(0,0,0,0.35),0 0 0 1px ${dark} inset;text-shadow:0 1px 2px rgba(0,0,0,0.4);">${count}</div>`,
          className: 'custom-status-cluster',
          iconSize: L.point(size, size),
          iconAnchor: L.point(size / 2, size / 2)
        });
      }
    });
    clusterGroupRef.current = clusterGroup;
    map.addLayer(clusterGroup);

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map]);

  useEffect(() => {
    if (!clusterGroupRef.current) return;
    clusterGroupRef.current.clearLayers();

    if (!map._ffbCanvas) map._ffbCanvas = L.canvas({ padding: 0.5 });
    const canvasRenderer = map._ffbCanvas;

    markers.forEach(op => {
      if (!op.latitude || !op.longitude) return;

      // Ring = the plot's status (same colours as the Approval Center); matched plots have a white ring.
      const hasIssue = op.validation_status && op.validation_status !== 'RECONCILED';

      const marker = L.circleMarker([parseFloat(op.latitude), parseFloat(op.longitude)], {
        radius: 7,
        fillColor: op._color,
        color: hasIssue ? reconStatus(op.validation_status).color : '#ffffff',
        weight: hasIssue ? 2.5 : 1.5,
        opacity: 1,
        fillOpacity: 0.9,
        renderer: canvasRenderer
      });
      marker._validation_status = op.validation_status || 'RECONCILED';

      marker.on('click', () => onMarkerClick(op));
      clusterGroupRef.current.addLayer(marker);
    });
  }, [markers, onMarkerClick]);

  return null;
});

/**
 * mode="interval": Geospatial Intel page (Post-Harvest Interval view only).
 * mode="errors":   Field Audit Map, embedded as a tab in the Approval Center (main map only).
 */
export function MapView({ mode = 'full', embedded = false } = {}) {
  const canvasRef = useRef(null);
  useFillToBottom(canvasRef, { enabled: embedded });
  const { operations, filters, updateFilters, resetFilters, geoData, estateMap } = useAppContext();
  const refreshTick = useRefreshTick(); // top-bar Refresh reloads this page's data
  const [mapReady, setMapReady] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const [geoLayers, setGeoLayers] = useState({ worker_markers: [], harvester_markers: [], loader_markers: [] });

  const [selectedOp, setSelectedOp] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [resetTick, setResetTick] = useState(0);
  const [legendOpen, setLegendOpen] = useState(true);
  const [activeSubpage, setActiveSubpage] = useState(mode === 'interval' ? 'harvest-interval' : 'main');
  const [intervalFilter, setIntervalFilter] = useState('7');
  const [hiStartDate, setHiStartDate] = useState('');
  const [hiEndDate, setHiEndDate] = useState('');
  const [hiEstate, setHiEstate] = useState('');
  const [plotsHarvestData, setPlotsHarvestData] = useState(null);
  const [loadingHarvestData, setLoadingHarvestData] = useState(false);


  const hasTarget = !!filters.search || !!filters.plot || !!filters.team;

  useEffect(() => {
    const timer = setTimeout(() => { if (localSearch !== filters.search) updateFilters({ search: localSearch }); }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, updateFilters]);

  useEffect(() => { setLocalSearch(filters.search); }, [filters.search]);

  // Fetch 3-layer geospatial markers
  useEffect(() => {
    let active = true; // a newer filter change wins over a slower older response
    const fetchGeo = async () => {

      try {
        const response = await API.fetchGeospatialMarkers(filters);
        if (!active) return;
        // New API returns { worker_markers, harvester_markers, loader_markers }
        if (response && typeof response === 'object' && 'worker_markers' in response) {
          setGeoLayers(response);
        } else {
          // Fallback: old flat array format (backward compat)
          setGeoLayers({ worker_markers: [], harvester_markers: response || [], loader_markers: [] });
        }
      } catch (err) {
        if (active) console.error('Failed to fetch geo markers', err);
      }
    };
    fetchGeo();
    return () => { active = false; };
  }, [filters, refreshTick]);


  // Plot status filter, the same rule as the Approval Center (utils/reconStatus.js): by default Pending,
  // Mismatch and Rejected; Matched when chosen or with All.
  const statusOk = useCallback((o) => statusMatches(filters.reconStatus, o.validation_status), [filters.reconStatus]);
  const harvesterMarkers = useMemo(() => (geoLayers.harvester_markers  || []).filter(o => o.latitude && o.longitude && statusOk(o)), [geoLayers, statusOk]);
  const loaderMarkers    = useMemo(() => (geoLayers.loader_markers     || []).filter(o => o.latitude && o.longitude && statusOk(o)), [geoLayers, statusOk]);
  // Worker-capture pins are not shown on this map (only harvester QA and loader capture).
  const allMarkers       = useMemo(() => [...harvesterMarkers, ...loaderMarkers], [harvesterMarkers, loaderMarkers]);
  const clusterPoints    = useMemo(() => [
    ...harvesterMarkers.map(o => ({ ...o, _color: '#3F8432' })),
    ...loaderMarkers.map(o => ({ ...o, _color: '#1d4ed8' })),
  ], [harvesterMarkers, loaderMarkers]);
  const openPoint = useCallback((op) => { setRotation(0); setSelectedOp(op); }, []);

  const plotIds = useMemo(() => Array.from(new Set(operations.map(o => o.plot_id))).sort(), [operations]);



  const dateRange = useMemo(() => {
    if (intervalFilter === 'custom') {
      return {
        from: hiStartDate || null,
        to: hiEndDate || null
      };
    }
    const days = parseInt(intervalFilter, 10);
    if (isNaN(days)) return { from: null, to: null };

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - days);

    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return {
      from: formatDate(from),
      to: formatDate(to)
    };
  }, [intervalFilter, hiStartDate, hiEndDate]);

  const hiPlotsGeoJson = useMemo(() => {
    if (!geoData || !plotsHarvestData) return null;

    const harvestMap = new Map();
    if (Array.isArray(plotsHarvestData)) {
      plotsHarvestData.forEach(item => {
        if (item.plot_id) {
          harvestMap.set(item.plot_id, item.last_harvested_at);
        }
      });
    }

    return {
      type: 'FeatureCollection',
      features: geoData.features.map(feature => {
        const props = feature.properties || {};
        const plotId = props.Plot_ID || props.plot_id;
        const lastHarvested = harvestMap.get(plotId) || null;

        return {
          ...feature,
          properties: {
            ...props,
            plot_id: plotId,
            site_id: props.IdSite || props.site_id,
            plot_number: props.PlotNb || props.plot_number,
            last_harvested_at: lastHarvested
          }
        };
      })
    };
  }, [geoData, plotsHarvestData]);

  useEffect(() => {
    if (activeSubpage !== 'harvest-interval') return;

    let active = true;
    const fetchHarvestStatus = async () => {
      setLoadingHarvestData(true);
      try {
        const data = await API.fetchPlotsHarvestStatus({
          date_from: dateRange.from,
          date_to: dateRange.to
        });
        if (active) {
          setPlotsHarvestData(data);
        }
      } catch (err) {
        console.error("Failed to fetch plot harvest status", err);
      } finally {
        if (active) {
          setLoadingHarvestData(false);
        }
      }
    };

    fetchHarvestStatus();
    return () => { active = false; };
  }, [activeSubpage, dateRange]);

  const hiGeoJsonStyle = useCallback((feature) => {
    const lastHarvested = feature.properties?.last_harvested_at;
    // The API already filters plotsHarvestData by the selected date range,
    // so a non-null last_harvested_at means this plot was harvested in the interval.
    const isHarvestedInInterval = !!lastHarvested;

    return {
      color: isHarvestedInInterval ? '#3F8432' : '#dc2626',
      weight: 2.5,
      fillOpacity: isHarvestedInInterval ? 0.30 : 0.15,
      fillColor: isHarvestedInInterval ? '#5AA041' : '#f87171',
      dashArray: showLabels ? '0' : '3',
    };
  }, [showLabels]);

  const onEachHiPlot = useCallback((feature, layer) => {
    if (feature.properties) {
      const { plot_id, site_id, plot_number, last_harvested_at } = feature.properties;

      if (plot_id && showLabels) {
        layer.bindTooltip(`<div style="font-weight: 500;font-size:11px;">${plot_id}</div>`, {
          permanent: true, direction: 'center', className: 'plot-label-tooltip'
        });
      }

      // API already returns only plots harvested in the interval, so trust the data
      const isHarvestedInInterval = !!last_harvested_at;

      const statusColor  = isHarvestedInInterval ? '#3F8432' : '#dc2626';
      const statusBg     = isHarvestedInInterval ? '#F3F8EF' : '#fff1f2';
      const statusBorder = isHarvestedInInterval ? '#5AA041' : '#fca5a5';
      const statusLabel  = isHarvestedInInterval ? 'Harvested in Interval' : 'No Harvest in Interval';
      const harvestLine  = last_harvested_at
        ? `<div style="font-size:11px;color:#475569;margin-top:4px;">Last harvested: <strong style="color:#0f172a;">${fmtDateTime(last_harvested_at)}</strong></div>`
        : `<div style="font-size:11px;color:#94a3b8;margin-top:4px;">No harvest record found</div>`;

      layer.bindPopup(`
        <div style="font-family:'Inter',sans-serif;min-width:200px;padding:0;border-radius:12px;overflow:hidden;">
          <div style="background:#3F8432;padding:12px 14px;">
            <div style="font-size:13px;font-weight: 500;color:white;letter-spacing:0.01em;">Plot ${plot_id || '—'}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Site: ${site_id || '—'} &nbsp;·&nbsp; #${plot_number || '—'}</div>
          </div>
          <div style="padding:12px 14px;background:white;">
            <div style="display:inline-block;padding:4px 10px;border-radius:20px;font-size:11px;font-weight: 500;background:${statusBg};color:${statusColor};border:1px solid ${statusBorder};">
              ${statusLabel}
            </div>
            ${harvestLine}
          </div>
        </div>
      `, { maxWidth: 260 });
    }
  }, [showLabels]);

  const geoJsonStyle = useCallback(() => {
    return {
      color: '#3F8432',
      weight: 2,
      fillOpacity: 0.15,
      fillColor: '#3F8432',
      dashArray: showLabels ? '0' : '3',
    };
  }, [showLabels]);

  const onEachPlot = useCallback((feature, layer) => {
    if (feature.properties) {
      const p = feature.properties;
      const plotId = p.Plot_ID || p.PlotID || p.plot_id || p.PlotNb || 'Plot';
      const siteId = p.IdSite || p.site_id || p.Estate || 'Main Estate';
      const plotNb = p.PlotNb || p.plot_number || p.PlotID || '—';
      const codeBloc = p.CodeBloc || p.code_bloc || '—';
      const areaHa = p.AreaHa || p.area_ha || '—';
      const crop = p.Crop || p.crop || 'Oil Palm';
      const yop = p.YOP || p.yop || '—';
      const density = p.Plantingdensity || p.density || '—';
      const trees = p.NbTreePlanting || p.trees || '—';
      const material = p.Material || p.material || '—';

      // Tooltip for labels — Permanent when zoomed in
      if (showLabels) {
        layer.bindTooltip(`<div style="font-weight: 500;font-size:11px;">${plotId}</div>`, {
          permanent: true, direction: 'center', className: 'plot-label-tooltip'
        });
      }

      // Popup for plot info
      layer.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; min-width: 230px; padding: 12px; background: #ffffff; border-radius: 12px;">
          <div style="background: #3F8432; padding: 10px 12px; border-radius: 8px; margin: -12px -12px 10px -12px;">
            <div style="font-size: 14px; font-weight: 500; color: white;">Plot ${plotId}</div>
            <div style="font-size: 11px; color: #F3F8EF; margin-top: 2px;">Block: ${codeBloc} &nbsp;·&nbsp; Site: ${siteId} (#${plotNb})</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; color: #334155;">
            <div><span style="color: #64748b;">Crop:</span> <strong style="color: #0f172a;">${crop}</strong></div>
            <div><span style="color: #64748b;">Area:</span> <strong style="color: #0f172a;">${areaHa} Ha</strong></div>
            <div><span style="color: #64748b;">Density:</span> <strong style="color: #0f172a;">${density} /Ha</strong></div>
            <div><span style="color: #64748b;">Trees:</span> <strong style="color: #0f172a;">${trees}</strong></div>
            <div><span style="color: #64748b;">Planting Year:</span> <strong style="color: #0f172a;">${yop}</strong></div>
            <div><span style="color: #64748b;">Material:</span> <strong style="color: #0f172a;">${material}</strong></div>
          </div>
        </div>
      `);
    }
  }, [showLabels]);

  const buildSuperPopup = (op) => {
    // Loader photos (blue) and harvest photos (green) show their own details.
    const isLoader = op.source_table === 'loading_clerk_record';
    const isPicker = ['picker', 'loose fruit picker'].includes(String(op.role || '').toLowerCase()) || op.role === ROLES.PICKER;
    const carriedBy = !op.carrier_id || op.carrier_id === op.worker_id ? 'Self' : op.carrier_id;
    const imageUrl = API.resolveImageUrl(op.image_url); // no photo -> the photo area stays empty

    return (
      <div className="map-super-popup">
        <div className="map-super-popup__header">
          <div className="map-super-popup__title-wrap">
            <div className="map-super-popup__icon" style={{ background: isPicker ? '#fff7ed' : '#F3F8EF', color: isPicker ? '#f97316' : '#3F8432', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <Zap size={18} />
            </div>
            <div>
              <div className="map-super-popup__title">Plot {op.plot_id || 'N/A'}</div>
              <div className="map-super-popup__subtitle">Field Audit Snapshot</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', paddingRight: '28px' }}>
            {imageUrl && <button
              onClick={(e) => { e.stopPropagation(); setRotation(r => (r + 90) % 360); }}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '10px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RotateCcw size={12} /> ROTATE
            </button>}
            <div className={`map-super-popup__badge map-super-popup__badge--${isPicker ? 'picker' : 'cutter'}`} style={{ whiteSpace: 'nowrap' }}>
              {isLoader ? (isPicker ? 'Sack Loading' : 'Loading') : (isPicker ? 'Loose Fruit' : 'Harvester')}
            </div>
          </div>
        </div>

        <div className="map-super-popup__media" style={{ overflow: 'hidden', background: '#f1f5f9' }}>
          {imageUrl && <img
            src={imageUrl}
            alt="Visual audit"
            style={{
              transition: 'transform 0.3s ease',
              transform: `rotate(${rotation}deg)`,
              objectFit: 'contain'
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />}
          {imageUrl && <div className="map-super-popup__chip">
            AI Detected
          </div>}
        </div>

        <div className="map-super-popup__metrics" style={{ border: '1px solid #E2E8F0' }}>
          {isPicker ? (
            <div className="map-super-popup__metric map-super-popup__metric--accent">
              <div className="map-super-popup__metric-label">{isLoader ? 'Loaded Weight' : 'Operational Weight'}</div>
              <div className="map-super-popup__metric-value">{fmtNumber(op.total_harvested_weight ?? op.weight_kg ?? 0)} kg</div>
            </div>
          ) : (
            <div className="map-super-popup__metric">
              <div className="map-super-popup__metric-label">{isLoader ? 'Loaded' : 'Bunches'}</div>
              <div className="map-super-popup__metric-value" style={{ color: '#3F8432' }}>
                {fmtNumber(op.typed_count != null ? bunchCount(op.ai_count, op.typed_count, op.approved_count).main : op.total_count || 0)} Bunches
                {bunchCount(op.ai_count, op.typed_count, op.approved_count).typed != null && <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: 500 }}> (typed {bunchCount(op.ai_count, op.typed_count, op.approved_count).typed})</span>}
              </div>
              {countFlag(op.ai_count, op.typed_count, op.approved_count) && (
                <div style={{ fontSize: '11.5px', fontWeight: 500, color: RECON_STATUS.DISCREPANCY.dark, marginTop: '2px' }}>{countFlag(op.ai_count, op.typed_count, op.approved_count)}: held for a supervisor</div>
              )}
            </div>
          )}
        </div>

        <div className="map-super-popup__meta">
          {isLoader ? (
            <div className="map-super-popup__meta-row">
              <span>Loading Role ID</span>
              <strong>{op.clerk_id || 'N/A'}</strong>
            </div>
          ) : (
            <>
              <div className="map-super-popup__meta-row">
                <span>{isPicker ? 'Picker ID' : 'Cutter ID'}</span>
                <strong>{op.worker_id || 'N/A'}</strong>
              </div>
              {!isPicker && (
                <div className="map-super-popup__meta-row">
                  <span>Carried By</span>
                  <strong>{carriedBy}</strong>
                </div>
              )}
              <div className="map-super-popup__meta-row">
                <span>Harvester Role ID</span>
                <strong>{op.clerk_id || 'N/A'}</strong>
              </div>
            </>
          )}
          <div className="map-super-popup__meta-row">
            <span>Operational Role</span>
            <strong>{isLoader ? (isPicker ? 'Loading Role (sacks)' : 'Loading Role (bunches)') : (isPicker ? 'Loose Fruit Picker' : 'Harvester (Cutter)')}</strong>
          </div>
          <div className="map-super-popup__meta-row">
            <span>Activity Time</span>
            <strong>{op.created_at ? fmtDateTime(op.created_at) : (op.work_date || '—')}</strong>
          </div>
          {/* The other half of this record: the load it pairs with (or the harvest scan, for a load) */}
          {op.paired_id && (() => {
            const ps = PAIR_STATUS[op.pair_status] || PAIR_STATUS.MATCHED;
            const other = isLoader ? 'Harvest scan' : 'Paired load';
            const amount = isPicker ? `${fmtNumber(op.paired_weight || 0)} kg` : `${fmtNumber(op.paired_count || 0)} bunches`;
            return (
              <div className="map-super-popup__meta-row" style={{ alignItems: 'flex-start' }}>
                <span>{other}</span>
                <strong style={{ textAlign: 'right' }}>
                  <span style={{ color: ps.dark }}>{ps.label}</span>
                  {op.paired_time && <><br />{fmtDateTime(op.paired_time)} · {amount}</>}
                </strong>
              </div>
            );
          })()}
          <div className="map-super-popup__meta-row">
            <span>Location</span>
            <strong>{op.estate || 'Main Estate'} | Plot {op.plot_id}</strong>
          </div>
        </div>
      </div>
    );
  };

  const handleReset = () => {
    resetFilters();
    setSelectedOp(null);
    setRotation(0);
    setResetTick(t => t + 1);
  };

  if (activeSubpage === 'harvest-interval') {
    return (
      <div className="view-container view-fade-in map-view" style={{ padding: '32px', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
        <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            {mode !== 'interval' && (
            <button
              onClick={() => setActiveSubpage('main')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                background: 'none',
                color: '#0f172a',
                fontWeight: 400,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '8px',
                padding: 0
              }}
            >
              ← Back to Geospatial Intel
            </button>
            )}
            <h1 className="view-title">{mode === 'interval' ? 'Geospatial Intelligence' : 'Plot Harvest Interval'}</h1>
            <p className="view-subtitle">Post-harvest intervals: plot boundaries overlaid with how long since each plot was last harvested.</p>
          </div>

          {/* Harvest / No-Harvest summary cards */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

            <div className="kpi-card" style={{ minWidth: '160px' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 500, color: '#14532d', lineHeight: 1 }}>
                  {hiPlotsGeoJson?.features
                    ? hiPlotsGeoJson.features.filter(f => {
                        if (hiEstate) {
                          const estateId = estateMap?.[hiEstate]?.id;
                          if (estateNameOf(f) !== hiEstate && (!estateId || f.properties?.site_id !== estateId)) return false;
                        }
                        return !!f.properties?.last_harvested_at;
                      }).length
                    : '—'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: '#3F8432', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                  Harvested
                </div>
              </div>
            </div>

            <div className="kpi-card" style={{ minWidth: '160px' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 500, color: '#7f1d1d', lineHeight: 1 }}>
                  {hiPlotsGeoJson?.features
                    ? hiPlotsGeoJson.features.filter(f => {
                        if (hiEstate) {
                          const estateId = estateMap?.[hiEstate]?.id;
                          if (estateNameOf(f) !== hiEstate && (!estateId || f.properties?.site_id !== estateId)) return false;
                        }
                        return !f.properties?.last_harvested_at;
                      }).length
                    : '—'}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                  No Harvest
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="map-filter-orchestrator" style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'flex-end', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--surface-1)', border: '1px solid var(--border-soft)', borderRadius: '12px' }}>
          {/* Estate / Location Filter */}
          <div className="filter-group" style={{ flex: '1.5', minWidth: '200px' }}>
            <label className="filter-label">Plantation Location</label>
            <select className="select-input" value={hiEstate} onChange={e => setHiEstate(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 400, color: '#0f172a' }}>
              <EstateOptions allLabel="All Locations" />
            </select>
          </div>

          {/* Interval Filter */}
          <div className="filter-group" style={{ flex: '1.5', minWidth: '220px' }}>
            <label className="filter-label">Filter by Interval</label>
            <select
              className="select-input"
              value={intervalFilter}
              onChange={e => setIntervalFilter(e.target.value)}
              style={{ width: '100%', height: '42px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 400, color: '#0f172a' }}
            >
              <option value="1">Daily Cycle (24h)</option>
              <option value="3">3-Day Cycle</option>
              <option value="7">Last 7 Days</option>
              <option value="14">Last 14 Days</option>
              <option value="20">Last 20 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="custom">Custom Filter...</option>
            </select>
          </div>

          {/* Custom Date selection inputs */}
          {intervalFilter === 'custom' && (
            <>
              <div className="filter-group" style={{ flex: '1', minWidth: '150px' }}>
                <label className="filter-label">Start Date</label>
                <input
                  type="date"
                  className="select-input"
                  value={hiStartDate}
                  onChange={e => setHiStartDate(e.target.value)}
                  style={{ width: '100%', height: '42px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 400, color: '#0f172a' }}
                />
              </div>
              <div className="filter-group" style={{ flex: '1', minWidth: '150px' }}>
                <label className="filter-label">End Date</label>
                <input
                  type="date"
                  className="select-input"
                  value={hiEndDate}
                  onChange={e => setHiEndDate(e.target.value)}
                  style={{ width: '100%', height: '42px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 400, color: '#0f172a' }}
                />
              </div>
            </>
          )}

          {/* Reset Filters button */}
          <button
            className="btn btn--outline"
            onClick={() => {
              setHiEstate('');
              setHiStartDate('');
              setHiEndDate('');
              setIntervalFilter('7');
            }}
            style={{ height: '42px', minWidth: '140px', whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
          >
            Reset Filters
          </button>
        </div>

        <div className="map-canvas-envelope" style={{ position: 'relative' }}>
          {loadingHarvestData && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div className="loader-spinner" style={{ margin: 0 }}></div>
              <span style={{ fontWeight: 500, color: 'var(--clr-brand-primary)' }}>Query Loading...</span>
            </div>
          )}
          <MapContainer preferCanvas center={CONFIG.MAP.CENTER} zoom={CONFIG.MAP.ZOOM} maxZoom={CONFIG.MAP.MAX_ZOOM} zoomControl={false} style={{ height: '100%', width: '100%', background: '#f8fafc' }} whenReady={() => setMapReady(true)}>
            <MapUpdater operations={[]} isReady={mapReady} currentEstate={hiEstate} hasTarget={false} geoData={hiPlotsGeoJson || geoData} />
            <InternalMapHandler setShowLabels={setShowLabels} />
            <MapFullscreenButton />

            <LayersControl position="bottomleft" collapsed={false}>
              <BaseLayer checked={true} name="Satellite Imagery">
                <TileLayer url={CONFIG.MAP.SAT_TILE_URL} attribution={CONFIG.MAP.SAT_ATTRIBUTION} maxZoom={CONFIG.MAP.MAX_ZOOM} maxNativeZoom={20} />
              </BaseLayer>
              <BaseLayer name="Street Map">
                <TileLayer url={CONFIG.MAP.TILE_URL} attribution={CONFIG.MAP.TILE_ATTRIBUTION} maxZoom={CONFIG.MAP.MAX_ZOOM} maxNativeZoom={19} />
              </BaseLayer>


              {hiPlotsGeoJson && (
                <Overlay checked name="PLOTS">
                  <GeoJSON
                    key={`hi-plots-${hiEstate}-${intervalFilter}-${JSON.stringify(dateRange)}-${showLabels}-${Array.isArray(plotsHarvestData) ? plotsHarvestData.length : 0}-${Array.isArray(plotsHarvestData) ? plotsHarvestData.filter(p => p.last_harvested_at).length : 0}`}
                    data={hiPlotsGeoJson}
                    style={hiGeoJsonStyle}
                    onEachFeature={onEachHiPlot}
                    filter={(f) => {
                      if (!hiEstate) return true;
                      const estateId = estateMap?.[hiEstate]?.id;
                      return estateNameOf(f) === hiEstate || (estateId && f.properties?.site_id === estateId);
                    }}
                  />
                </Overlay>
              )}
            </LayersControl>
            <ZoomControl position="bottomright" />

            <div className="map-legend">
              <div className="map-legend__title">Interval Legend</div>
              <div className="map-legend__items">
                <div className="map-legend__item" style={{ marginBottom: '6px' }}>
                  <div className="map-legend__dot" style={{ backgroundColor: '#5AA041', border: '1.5px solid #3F8432', width: '12px', height: '12px' }}></div>
                  <span>Harvested in Interval {hiPlotsGeoJson?.features && `(${hiPlotsGeoJson.features.filter(f => {
                    if (hiEstate) {
                      const estateId = estateMap?.[hiEstate]?.id;
                      if (estateNameOf(f) !== hiEstate && (!estateId || f.properties?.site_id !== estateId)) return false;
                    }
                    return !!f.properties?.last_harvested_at;
                  }).length})`}</span>
                </div>
                <div className="map-legend__item" style={{ marginBottom: '6px' }}>
                  <div className="map-legend__dot" style={{ backgroundColor: '#f87171', border: '1.5px solid #dc2626', width: '12px', height: '12px' }}></div>
                  <span>No Harvest in Interval {hiPlotsGeoJson?.features && `(${hiPlotsGeoJson.features.filter(f => {
                    if (hiEstate) {
                      const estateId = estateMap?.[hiEstate]?.id;
                      if (estateNameOf(f) !== hiEstate && (!estateId || f.properties?.site_id !== estateId)) return false;
                    }
                    return !f.properties?.last_harvested_at;
                  }).length})`}</span>
                </div>
              </div>
              <div className="map-legend__item" style={{ marginTop: '4px', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                <div style={{ width: '12px', height: '12px', border: '1.5px solid #64748b', opacity: 0.5, borderRadius: '2px' }}></div>
                <span>Interval Boundary</span>
              </div>
            </div>
          </MapContainer>
        </div>
      </div>
    );
  }

  return (
    <div className={`view-container view-fade-in map-view${embedded ? ' map-view--embedded' : ''}`} style={{ padding: embedded ? 0 : '32px', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" }}>
      <div className="view-header" style={{ display: embedded ? 'none' : 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        {!embedded && (
        <div>
          <h1 className="view-title">{mode === 'errors' ? 'Field Audit Map' : 'Geospatial Intelligence'}</h1>
          <p className="view-subtitle">
            {mode === 'errors'
              ? 'Field records on the map for audit and error review.'
              : 'Precision operational mapping with high-density audit tracking.'}
          </p>
        </div>
        )}

        {/* Post Harvest Interval Subpage Trigger (it has its own page in errors mode) */}
        {mode !== 'errors' && (
        <button
          className="btn btn--outline"
          onClick={() => setActiveSubpage('harvest-interval')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '12px',
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
          <Calendar size={18} />
          <span>Plot Harvest Interval</span>
        </button>
        )}
      </div>

      <div className="map-filter-orchestrator">
        <div className="filter-group">
          <label className="filter-label">Plantation Location</label>
          <select className="select-input" value={filters.estate || ''} onChange={(e) => updateFilters({ estate: e.target.value || null })}>
            <EstateOptions allLabel="All Locations" />
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Search Plot / Worker</label>
          <div className="map-search-wrap">
            <Search size={16} className="map-search-icon" />
            <input type="search" list="map-plot-list" className="search-input" placeholder="Identify plots or workers" value={localSearch} onChange={e => setLocalSearch(e.target.value)} />
            <datalist id="map-plot-list">{plotIds.map(pid => <option key={pid} value={pid} />)}</datalist>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Start Date</label>
          <input
            type="date"
            className="date-input"
            value={filters.dateRange?.from || ''}
            onChange={e => updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value || null } })}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">End Date</label>
          <input
            type="date"
            className="date-input"
            value={filters.dateRange?.to || ''}
            onChange={e => updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value || null } })}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">Reconciliation Status</label>
          <StatusFilter value={filters.reconStatus} onChange={v => updateFilters({ reconStatus: v })} />
        </div>

        <div className="filter-group">
          <label className="filter-label">Operation Focus</label>
          <select className="select-input" value={filters.role || ''} onChange={e => updateFilters({ role: e.target.value || null })}>
            {/* Each choice = the records it puts on the map (harvest scans with their matching loads). */}
            <option value="">All records</option>
            <option value={ROLES.CUTTER}>Bunches (harvest and loads)</option>
            <option value={ROLES.PICKER}>Loose fruit (picker and loads)</option>
            <option value={ROLES.L_CLERK}>Loading Role loads only</option>
          </select>
        </div>

        <button className="btn btn--outline map-filter-reset" onClick={handleReset}>Reset View</button>

      </div>

      <div className="map-canvas-envelope" ref={canvasRef}>
        {/* Map Audit opens straight on the record (no jump from the estate view to the platform) */}
        <MapContainer preferCanvas
          center={filters.mapFocus?.lat && filters.mapFocus?.lng ? [filters.mapFocus.lat, filters.mapFocus.lng] : CONFIG.MAP.CENTER}
          zoom={filters.mapFocus?.lat ? 20 : CONFIG.MAP.ZOOM}
          maxZoom={CONFIG.MAP.MAX_ZOOM} zoomControl={false} style={{ height: '100%', width: '100%', background: '#f8fafc' }} whenReady={() => setMapReady(true)}>
          <MapUpdater operations={allMarkers} isReady={mapReady} currentEstate={filters.estate} hasTarget={hasTarget} geoData={geoData} resetTick={resetTick} estateMap={estateMap}
            filterKey={[filters.estate, filters.dateRange?.from, filters.dateRange?.to, filters.role, filters.search, filters.plot, filters.team, String(filters.reconStatus || '')].join('|')}
            focusTick={filters.mapFocus?.t} />
          <InternalMapHandler setShowLabels={setShowLabels} />
          <MapFullscreenButton />
          <PlatformFocus focus={filters.mapFocus} />

          <LayersControl position="bottomleft" collapsed={false}>
            <BaseLayer checked={true} name="Satellite Imagery">
              <TileLayer url={CONFIG.MAP.SAT_TILE_URL} attribution={CONFIG.MAP.SAT_ATTRIBUTION} maxZoom={CONFIG.MAP.MAX_ZOOM} maxNativeZoom={20} />
            </BaseLayer>
            <BaseLayer name="Street Map">
              <TileLayer url={CONFIG.MAP.TILE_URL} attribution={CONFIG.MAP.TILE_ATTRIBUTION} maxZoom={CONFIG.MAP.MAX_ZOOM} maxNativeZoom={19} />
            </BaseLayer>


            {geoData && (
              <Overlay checked name="PLOTS">
                <GeoJSON
                  key={`plots-${filters.estate}-${showLabels}`}
                  data={geoData}
                  style={geoJsonStyle}
                  onEachFeature={onEachPlot}
                  filter={(f) => {
                    if (!filters.estate) return true;
                    const estateId = estateMap?.[filters.estate]?.id;
                    return estateNameOf(f) === filters.estate || (estateId && siteIdOf(f) === estateId);
                  }}
                />
              </Overlay>
            )}

            {/* Harvester Role (green) and loading role (blue) captures, one clickable layer */}
            <Overlay checked name="CAPTURES">
              <ClusterMarkers markers={clusterPoints} onMarkerClick={openPoint} />
            </Overlay>
          </LayersControl>
          <ZoomControl position="bottomright" />

          <div className="map-legend">
            <button
              type="button"
              className="map-legend__title"
              onClick={() => setLegendOpen(o => !o)}
              aria-expanded={legendOpen}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', width: '100%', textAlign: 'left' }}
            >
              Map Legend <span aria-hidden="true">{legendOpen ? '▾' : '▸'}</span>
            </button>
            {legendOpen && (<>
            <div className="map-legend__items">
              <div className="map-legend__item">
                <div className="map-legend__dot map-legend__dot--point" style={{ backgroundColor: '#3F8432' }}></div>
                <span>Harvester Role Capture</span>
              </div>
              <div className="map-legend__item">
                <div className="map-legend__dot map-legend__dot--point" style={{ backgroundColor: '#1d4ed8' }}></div>
                <span>Loading Role Capture</span>
              </div>
              {/* Ring colour = plot status, same colours and words as the Approval Center */}
              {['DISCREPANCY', 'WAITING_FOR_LOADER', 'WAITING_FOR_RECORDER', 'REJECTED'].map((k, i) => (
                <div key={k} className="map-legend__item" style={i === 0 ? { marginTop: '6px', borderTop: '1px solid #eee', paddingTop: '6px' } : undefined}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3F8432', border: `2.5px solid ${RECON_STATUS[k].color}` }}></div>
                  <span style={{ color: RECON_STATUS[k].dark, fontWeight: 500 }}>{RECON_STATUS[k].label}</span>
                </div>
              ))}
              <div className="map-legend__item">
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3F8432', border: '2px solid #ffffff', boxShadow: '0 0 0 1px #cbd5e1' }}></div>
                <span>{RECON_STATUS.RECONCILED.label}</span>
              </div>
            </div>
            <div className="map-legend__item" style={{ marginTop: '4px', borderTop: '1px solid #eee', paddingTop: '4px' }}>
              <div style={{ width: '12px', height: '12px', border: '1.5px solid #3F8432', opacity: 0.5, borderRadius: '2px' }}></div>
              <span>Plot Boundary</span>
            </div>
            </>)}
          </div>

          {selectedOp && (
            <div className="map-docked-panel">
              <div className="map-docked-panel__close" onClick={() => setSelectedOp(null)}>
                <X size={18} />
              </div>
              <div className="map-docked-panel__content">
                {buildSuperPopup(selectedOp)}
              </div>
            </div>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
