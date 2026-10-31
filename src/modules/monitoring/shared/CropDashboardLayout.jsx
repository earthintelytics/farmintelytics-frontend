import { useState, useMemo, useEffect, useRef } from 'react';
import * as api from '../../../services/organizationMonitorApi';
import 'leaflet/dist/leaflet.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler
} from 'chart.js';
import DataNeededDialog from '../../data/DataNeededDialog';
import { cropPagesFor } from '../cropCatalog';
import NewResultsBanner from './dashboard/NewResultsBanner';
import { UNIT_LABEL, CROP_UNIT } from './dashboard/kpiCatalog';
import { useLayerLegends } from './dashboard/legends/layerLegends';
import { SMALLHOLDER_SERVICES } from '../../registry';
import { useBlockMeasures } from './dashboard/pages/BlockSummaryPage';
import { roleLabel } from '../../../pages/org/orgProfile';
import { CROP_CONFIG_KEYS } from './dashboard/constants/chartConfig';
import { renderInfoTooltip as renderInfoTooltipImpl, renderFloatingBasemapSelector as renderFloatingBasemapSelectorImpl, renderLegendCard as renderLegendCardImpl, renderLegendCards as renderLegendCardsImpl, colouredPolygon as colouredPolygonImpl, renderIntelPolygons as renderIntelPolygonsImpl, renderHealthPolygons as renderHealthPolygonsImpl, renderMoisturePolygons as renderMoisturePolygonsImpl, renderYieldPolygons as renderYieldPolygonsImpl, renderRestorePolygons as renderRestorePolygonsImpl, renderClimatePolygons as renderClimatePolygonsImpl } from './dashboard/map/mapRenderers';
import { renderMapBottomPanel as renderMapBottomPanelImpl } from './dashboard/map/MapBottomPanel';
import { renderDashboardHeader, renderDashboardSidebar } from './dashboard/layout/DashboardChrome';
import { renderDashboardPages } from './dashboard/layout/DashboardPages';
import { inEstate, mapBlocks, healthRows, moistureRows, yieldRows, climateRows, restorationRows } from './dashboard/hooks/blockRows';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { usePageData } from './dashboard/hooks/usePageData';
import { useImageTimeline } from './dashboard/hooks/useImageTimeline';
import { useBasemap } from './dashboard/hooks/useBasemap';
import { useMapLayerToggles } from './dashboard/hooks/useMapLayerToggles';
import { usePanelSizes } from './dashboard/hooks/usePanelSizes';
import { useAdvisorChat } from './dashboard/hooks/useAdvisorChat';
import { useLegendEntries } from './dashboard/hooks/useLegendEntries';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend,
  Filler
);

// The one layout every crop and service portal uses: header, sidebar, map pages and the other tabs.
// It composes the dashboard hooks (dashboard/hooks/): the organisation's data, page data, the image
// timeline, the basemap, layer switches, panel sizes, the advisor chat and the legend cards.
const CropDashboardLayout = ({ mode = 'crop', service = null, cropType, cropIndices, mapCenter, onBack, onSignOut }) => {
  useLayerLegends(); // map colours follow the admin's classes once loaded
  const isOrg = mode === 'organization' || Boolean(service);
  const isAiOnly = Boolean(service?.isAiOnly);
  // Service portals (sustainability, field advisory, finance) reuse this
  // exact layout; the service config only picks and names the sub-pages.
  // pick(defaults, list): keep the service's entries, in its order, with
  // its labels, and the default icon for each id.
  // A service that lists nothing shows nothing: it never falls back to the crop pages.
  const pick = (defaults, list) => !list ? (service ? [] : defaults) : list
    .map(s => { const d = defaults.find(x => x.id === s.id); return d ? { ...d, label: s.label || d.label } : null; })
    .filter(Boolean);
  const cropLabel = isOrg ? '' : (CROP_CONFIG_KEYS[cropType] || cropType);
  // Tenant identity comes strictly from the authenticated session — no default
  // organization. Without a session, bounce straight back to login.
  const tenant = localStorage.getItem('fi_tenant');
  const hasSession = Boolean(tenant && localStorage.getItem('fi_token'));
  useEffect(() => {
    if (!hasSession && onSignOut) onSignOut();
  }, [hasSession]); // eslint-disable-line react-hooks/exhaustive-deps
  // Display name comes from the organization's TenantConfig (stored at login)
  const tenantDisplayName = localStorage.getItem('fi_display_name')
    || (tenant ? tenant.charAt(0).toUpperCase() + tenant.slice(1) : '');
  // Map center comes from TenantConfig: the mapCenter prop (fetched live) first,
  // then the copy stored at login, then a neutral default.
  let storedMapCenter;
  try { storedMapCenter = JSON.parse(localStorage.getItem('fi_map_center') || 'null'); } catch { storedMapCenter = null; }
  const defaultMapCenter = mapCenter
    || (Array.isArray(storedMapCenter) && storedMapCenter.length === 2 ? storedMapCenter : [6.436, 5.273]);

  // Extract numeric farm ID from real plot IDs like PLOT-042 → '42', or fall back to '1'
  const getBackendFarmId = (plotId) => {
    if (!plotId) return '1';
    const match = plotId.match(/\d+/);
    return match ? match[0] : '1';
  };

  const [activeSidebarItem, setActiveSidebarItem] = useState(service?.sidebar?.[0]?.id || 'analytics');
  const [answersForm, setAnswersForm] = useState(null);
  // Estate selector (organisations with several estates): 'All' or an estate
  // name. Lives in the URL (?estate=) so a link or refresh keeps the choice.
  const [filterEstate, setFilterEstate] = useState(() => new URLSearchParams(window.location.search).get('estate') || 'All');
  useEffect(() => {
    const url = new URL(window.location.href);
    if (filterEstate && filterEstate !== 'All') url.searchParams.set('estate', filterEstate); else url.searchParams.delete('estate');
    window.history.replaceState(window.history.state, '', url);
  }, [filterEstate]);
  // Settings → Farm data: which dataset to open (set by the sign-in "Data needed" dialog)
  const [dataFocus, setDataFocus] = useState(null);
  // Page set: the service's catalogue entry, or the crop's (cropCatalog.js).
  const pageSet = service || cropPagesFor(cropType);
  // Glossary entry to open (links from farmer words on screen)
  const [glossaryFocus, setGlossaryFocus] = useState(null);
  const [activeTab, setActiveTab] = useState(() => isAiOnly ? 'ai-assistant' : 'monitor');
  const openGlossary = (key) => { setGlossaryFocus(key); setActiveTab('monitor'); setActiveSidebarItem('help'); };
  const [activeAnalyticsSubpage, setActiveAnalyticsSubpage] = useState('overview');

  useEffect(() => {
    if (isAiOnly) {
      setActiveTab('ai-assistant'); // eslint-disable-line react-hooks/set-state-in-effect
      setActiveSidebarItem('analytics');
    }
  }, [isAiOnly, service?.id]);

  // Reports, Verification and Assistant cover the whole portal, so they open
  // from any page; choosing a sidebar page returns to Monitor.
  const handleTopNavTabClick = (tabId) => {
    if (tabId !== 'monitor') setActiveSidebarItem('analytics');
    setActiveTab(tabId);
  };

  const isSmallholderService = SMALLHOLDER_SERVICES.includes(service?.id) || service?.id === 'smallholder-hub';
  const {
    estates, stats, carbon, eudrResults, dataLoading, plots, restorationZones, farmBoundary, alerts, scouting,
    landCover, landCoverLoading, availableIndices, dashboardFilterKeys, loadIssues, setLoadIssues,
    noteLoadIssue, handleAcknowledgeAlert,
  } = useDashboardData({ tenant, hasSession, service, isSmallholderService });
  const { overviewTrends, waterDemandData, waterDemandLoading, plotsTelemetry } = usePageData({ tenant, cropType, activeSidebarItem, activeTab, activeAnalyticsSubpage, noteLoadIssue });

  const [selectedIndex, setSelectedIndex] = useState('ndvi');
  const [mapOpacity, setMapOpacity] = useState(80);
  const [showRasterLayer, setShowRasterLayer] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [pixelTimeseries, setPixelTimeseries] = useState(null);
  const [dynamicFilterValues, setDynamicFilterValues] = useState({});

  // ── Crop-specific index profile (from /crop-monitoring/indices) ──────────
  // Ordered by agronomic priority, each entry carries the crop-specific label,
  // notes and legend classification for this crop's interpretation.
  const cropProfileEntries = useMemo(() => cropIndices?.indices || [], [cropIndices]);
  const cropPrimaryIndex = cropIndices?.primary_index || null;

  // A block's own value for an index, classified with the admin's legend classes for this crop (Crop
  // thresholds). No value -> no colour (never a value borrowed from another index).
  const blockValue = (plot, key) => {
    const v = plot.indices?.[key] ?? (key === 'ndvi' ? plot.ndvi : key === 'ndmi' ? plot.ndmi : key === 'lswi' ? (plot.indices?.lswi ?? plot.ndmi) : null);
    return v == null || Number.isNaN(Number(v)) ? null : Number(v);
  };

  // Start on the crop's primary index once data is available (once only)
  const primaryAppliedRef = useRef(false);
  useEffect(() => {
    if (primaryAppliedRef.current || !cropPrimaryIndex || !availableIndices.length) return;
    const exists = availableIndices.some(i => String(i.index).toLowerCase() === cropPrimaryIndex);
    if (exists) setSelectedIndex(cropPrimaryIndex); // eslint-disable-line react-hooks/set-state-in-effect
    primaryAppliedRef.current = true;
  }, [cropPrimaryIndex, availableIndices]);

  const {
    TIMELINE_DATA, timelineLoading, zarrBounds, calendarDates, calendarMonth, calendarYear, setCalendarMonth,
    setCalendarYear, calendarInitializedRef, pendingCalendarDateRef, selectedTimelineIndex, setSelectedTimelineIndex,
    setRefreshSlider, effectiveSensor, satellitePicker, setSatellitePicker, selectDateWithSensor, isCompareMode,
    setIsCompareMode, compareTimelineIndex, setCompareTimelineIndex, activeDateSlot, setActiveDateSlot, sliderPending,
    currentTimeline, currentTimelineA, currentTimelineB, currentTileUrl, currentTileUrlB, tileRefreshing, isPlaying,
    togglePlay, canPrevCal, canNextCal, prevCalMonth, nextCalMonth, latestCalDate, jumpToLatestMonth, calFirstDay,
    calDaysInMonth, calTrailing, SENSOR_DOT_COLOR,
  } = useImageTimeline({ tenant, cropType, selectedIndex, setSelectedIndex, plots, activeSidebarItem, noteLoadIssue });

  const {
    selectedBasemap, setSelectedBasemap, showGoogleLabels, setShowGoogleLabels, activeComposite, compositeTileUrl,
    showBasemapDropdown, setShowBasemapDropdown, basemapDropdownRef, basemapUrl, basemapAttribution, basemapMaxNativeZoom,
  } = useBasemap({ tenant, currentTimeline, noteLoadIssue });

  const {
    intelShowLayers, setIntelShowLayers, intelShowBoundaries, setIntelShowBoundaries, intelBoundariesOpacity, setIntelBoundariesOpacity, getIntelPlotStyleOutline,
    healthShowLayers, setHealthShowLayers, healthShowBoundaries, setHealthShowBoundaries, healthBoundariesOpacity, setHealthBoundariesOpacity, getHealthPlotStyleOutline,
    moistureShowLayers, setMoistureShowLayers, moistureShowBoundaries, setMoistureShowBoundaries, moistureBoundariesOpacity, setMoistureBoundariesOpacity,
    yieldShowLayers, setYieldShowLayers, yieldShowBoundaries, setYieldShowBoundaries, yieldBoundariesOpacity, setYieldBoundariesOpacity, getYieldPlotStyleOutline,
    climateShowLayers, setClimateShowLayers, climateShowBoundaries, setClimateShowBoundaries, climateBoundariesOpacity, setClimateBoundariesOpacity, getClimatePlotStyleOutline,
    restoreShowLayers, setRestoreShowLayers, restoreShowBoundaries, setRestoreShowBoundaries, restoreBoundariesOpacity, setRestoreBoundariesOpacity, getRestorePlotStyleOutline,
  } = useMapLayerToggles();

  const {
    sidebarWidth, bottomPanelHeight, isBottomPanelMinimized, setIsBottomPanelMinimized, activeResizeType,
    startSidebarResize, startBottomPanelResize, splitPosition, isDraggingSplit, handleSplitDragStart,
  } = usePanelSizes();

  const {
    legendEntries, legendGroups, expandedLegendKeys, toggleLegendKey, expandedLegendGroups, toggleLegendGroup,
    resetLegendExpansion, emptyLegendMessage,
  } = useLegendEntries({ isOrg, availableIndices, cropProfileEntries });

  const chatContext = [
    `Organisation: ${tenantDisplayName}`,
    service ? `Service: ${service.title}` : (!isOrg && cropLabel ? `Crop: ${cropLabel}` : null),
    filterEstate && filterEstate !== 'All' ? `Estate: ${filterEstate}` : null,
  ].filter(Boolean).join('. ');
  const {
    scenarioFormOpen, setScenarioFormOpen, chatMessages, setChatMessages, chatInput, setChatInput, chatLoading,
    chatEndRef, handleChatSubmit,
  } = useAdvisorChat({ contextLine: chatContext });

  // Click on a block: the pixel history of the layer on the map at that point
  const handlePlotClick = async (plot, lat, lng) => {
    setSelectedPlot(plot);
    try {
      const data = await api.fetchPixelTimeseries({
        farm: `farm_${getBackendFarmId(plot.id)}`,
        index: (selectedIndex || 'ndvi').toLowerCase(),
        lat,
        lon: lng
      });
      setPixelTimeseries(data && data.series ? data.series : null);
    } catch (err) {
      noteLoadIssue("the block's history", err);
      setPixelTimeseries(null);
    }
  };

  // Every block of the organisation (slots A and B of compare mode show the same blocks).
  const plotsDataA = useMemo(() => mapBlocks(plots), [plots]);
  const plotsDataB = plotsDataA;

  // Estates: registered estates from the backend, else the estate names the
  // plots carry (boundary property). The selector only shows with 2 or more.
  const estateOptions = useMemo(() => {
    if (estates.length) return estates.map(e => e.name).filter(Boolean);
    return [...new Set(plotsDataA.map(p => p.subfarm).filter(Boolean))].sort();
  }, [estates, plotsDataA]);
  // Every page reads plotsData, so scoping it to the chosen estate scopes the
  // maps, charts and tables together.
  const plotsData = useMemo(() => {
    const est = estates.find(e => e.name === filterEstate);
    const scoped = (!filterEstate || filterEstate === 'All') ? plotsDataA
      : plotsDataA.filter(p => inEstate(p.subfarm, p.farmId, filterEstate, est));
    if (!eudrResults?.length) return scoped;
    // The stored EUDR result for each plot (matched as on the Deforestation check page).
    const byId = new Map(eudrResults.map(r => [String(r.plot_id), r]));
    return scoped.map(p => {
      const r = byId.get(String(p.id)) || byId.get(String(p.plot_id)) || byId.get(String(p.name));
      return r ? { ...p, eudrStatus: r.status, eudrReason: r.reason, eudrLossHa: r.loss_after_cutoff_ha, eudrLossYear: r.loss_year, eudrForest2020: r.forest_2020_pct, eudrProtected: r.protected_overlap } : p;
    });
  }, [plotsDataA, filterEstate, estates, eudrResults]);
  // The raw plots of the chosen estate: every section's map, chart and table (health, moisture,
  // yield, climate, restoration) is built from this, so the estate dropdown scopes them all.
  const estatePlots = useMemo(() => {
    if (!plots || !filterEstate || filterEstate === 'All') return plots || [];
    const est = estates.find(e => e.name === filterEstate);
    return plots.filter(p => inEstate(p.subfarm || p.division, p.farm_id, filterEstate, est));
  }, [plots, filterEstate, estates]);

  // Admin-configured dashboard filters (Super Admin onboarding) narrow the
  // intelligence-layers map only; other pages keep the full plotsData.
  const filteredPlotsData = useMemo(() => {
    const activeFilters = Object.entries(dynamicFilterValues).filter(([, v]) => v && v !== 'All');
    if (activeFilters.length === 0) return plotsData;
    return plotsData.filter(p => activeFilters.every(([key, val]) => String(p.filters?.[key]) === val));
  }, [plotsData, dynamicFilterValues]);

  // Each map page's block rows (compare slots A and B show the same blocks on different dates).
  const healthPlotsData = useMemo(() => healthRows(estatePlots), [estatePlots]);
  const moisturePlotsData = useMemo(() => moistureRows(estatePlots, selectedIndex), [estatePlots, selectedIndex]);
  const yieldPlotsData = useMemo(() => yieldRows(estatePlots), [estatePlots]);
  const climatePlotsData = useMemo(() => climateRows(estatePlots, plotsTelemetry), [estatePlots, plotsTelemetry]);
  const restorationPlotsData = useMemo(() => restorationRows(restorationZones), [restorationZones]);
  const [healthPlotsDataA, healthPlotsDataB] = [healthPlotsData, healthPlotsData];
  const [moisturePlotsDataA, moisturePlotsDataB] = [moisturePlotsData, moisturePlotsData];
  const [yieldPlotsDataA, yieldPlotsDataB] = [yieldPlotsData, yieldPlotsData];
  const [climatePlotsDataA, climatePlotsDataB] = [climatePlotsData, climatePlotsData];
  const [restorationPlotsDataA, restorationPlotsDataB] = [restorationPlotsData, restorationPlotsData];

  const activePlotBounds = useMemo(() => {
    // For the raster overlay we want full-farm coverage, not a single plot.
    // Priority: all-plots bbox → farm boundary bbox → single plot fallback.
    // A loop, not Math.min(...list): a large estate has more corner points than a spread allows.
    const bbox = (coordLists) => {
      let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
      for (const coords of coordLists) for (const [lat, lng] of coords || []) {
        if (lat < a) a = lat; if (lng < b) b = lng; if (lat > c) c = lat; if (lng > d) d = lng;
      }
      return a === Infinity ? null : [[a, b], [c, d]];
    };
    if (plotsData && plotsData.length > 0) {
      const all = bbox(plotsData.map(p => p.coords));
      if (all) return all;
    }
    if (farmBoundary?.properties?.bbox) {
      const { min_lat, max_lat, min_lng, max_lng } = farmBoundary.properties.bbox;
      return [[min_lat, min_lng], [max_lat, max_lng]];
    }
    // Last resort: single selected/first plot
    const activePlot = selectedPlot || (plotsData && plotsData[0]);
    if (!activePlot || !activePlot.coords) return null;
    return bbox([activePlot.coords]);
  }, [selectedPlot, plotsData, farmBoundary]);

  // Bounds used for the raster ImageOverlay: prefer zarr-derived bounds (exact pixel coverage)
  // over GeoJSON-derived bounds which may differ from the zarr spatial extent.
  const rasterOverlayBounds = zarrBounds || activePlotBounds;

  // Map pieces drawn by dashboard/map: each gets the state it reads.
  const renderInfoTooltip = (...args) => renderInfoTooltipImpl({}, ...args);
  const renderFloatingBasemapSelector = (...args) => renderFloatingBasemapSelectorImpl({ activeComposite, basemapDropdownRef, compositeTileUrl, selectedBasemap, setSelectedBasemap, setShowBasemapDropdown, setShowGoogleLabels, showBasemapDropdown, showGoogleLabels }, ...args);
  // Each map page's layers panel: the switch puts that index's raster on the map, one at a time.
  const renderLegendCard = (...args) => renderLegendCardImpl({ expandedLegendKeys, mapOpacity, openGlossary, renderInfoTooltip, selectedIndex, setMapOpacity, setSelectedIndex, setShowRasterLayer, showRasterLayer, toggleLegendKey }, ...args);
  // groupFilter narrows which legend groups a page shows; Map Analytics omits it to show the whole archive.
  const renderLegendCards = (...args) => renderLegendCardsImpl({ emptyLegendMessage, expandedLegendGroups, legendEntries, legendGroups, renderLegendCard, selectedIndex, showRasterLayer, toggleLegendGroup }, ...args);
  const renderIntelPolygons = (...args) => renderIntelPolygonsImpl({ getIntelPlotStyleOutline, handlePlotClick, intelShowBoundaries }, ...args);
  const renderHealthPolygons = (...args) => renderHealthPolygonsImpl({ getHealthPlotStyleOutline, handlePlotClick, healthShowBoundaries }, ...args);
  const renderMoisturePolygons = (...args) => renderMoisturePolygonsImpl({ handlePlotClick, moistureBoundariesOpacity, moistureShowBoundaries, showRasterLayer }, ...args);
  // A block or zone filled by the "Colour by" choice of its map page, with
  // the same classes as the panel's legend (dashboard/legends/layerLegends.js).
  const colouredPolygon = (...args) => colouredPolygonImpl({ cropType }, ...args);
  const renderYieldPolygons = (...args) => renderYieldPolygonsImpl({ colouredPolygon, getYieldPlotStyleOutline, handlePlotClick, yieldShowBoundaries }, ...args);
  const RESTORE_VALUE = { restoration_progress: 'progress', survival: 'survivalNum', carbon: 'carbonPerHa' };
  const renderRestorePolygons = (...args) => renderRestorePolygonsImpl({ RESTORE_VALUE, colouredPolygon, getRestorePlotStyleOutline, restoreShowBoundaries }, ...args);
  const CLIMATE_VALUE = { rain: 'rainfall', heat: 'lst' };
  const renderClimatePolygons = (...args) => renderClimatePolygonsImpl({ CLIMATE_VALUE, climateShowBoundaries, colouredPolygon, getClimatePlotStyleOutline, handlePlotClick }, ...args);

  // Map play / calendar / user menu
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const [showNotifications, setShowNotifications] = useState(false);
  // Left sidebar tools
  const [showCalendarTool, setShowCalendarTool] = useState(true);
  const [showTimeSliderTool, setShowTimeSliderTool] = useState(true);
  // Dashboard filter states
  const [filterPlot, setFilterPlot] = useState('All');
  const [filterDate, setFilterDate] = useState('All');

  // The signed-in person, read-only here; it is changed at /org/<tenant>/settings.
  const profileEmail = localStorage.getItem('fi_email') || '';
  // Without a holder name on the account, the organisation's name reads better than the mailbox part ("olam").
  const profileName = localStorage.getItem('fi_full_name') || tenantDisplayName || profileEmail || 'Account';
  const profileRole = roleLabel(localStorage.getItem('fi_role') || 'admin');
  const profileInitials = profileName.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

  const handleEstateChange = (val) => {
    setFilterEstate(val);
    setFilterPlot('All');
  };

  const handlePlotFilterChange = (plotId) => setFilterPlot(plotId);

  const handleSidebarClick = (item) => {
    setActiveSidebarItem(item);
    setActiveTab('monitor');
    // selectedIndex and showRasterLayer are shared by every page's map: a freshly opened page shows
    // its own index layer straight away when an image exists for the date (the map draws it only then),
    // never the last page's layer.
    const hasImage = (k) => availableIndices.some(i => String(i.index).toLowerCase() === k);
    if (item === 'moisture-content') {
      // The first water layer that has an image: standing water (radar), then the optical water layers.
      // Radar soil moisture comes last: it needs a dry reference built over many passes and is rarely there.
      setSelectedIndex(['flood_mask', 'lswi', 'ndmi', 'ndwi', 'smi'].find(hasImage) || 'flood_mask');
    } else if (item === 'crop-health' || item === 'crop-yield' || item === 'intelligence-layers') {
      setSelectedIndex('ndvi');
    } else if (item === 'land-restoration') {
      setSelectedIndex('ndwi');
    } else if (item === 'climate') {
      // Weather shows surface heat (Landsat thermal) when there is an image.
      setSelectedIndex('lst');
    }
    setShowRasterLayer(item === 'climate' ? hasImage('lst') : true);
    // Each sub-page has its own calendar: forget the last page's month and date, so the calendar
    // opens on this layer's newest image once its timeline loads.
    calendarInitializedRef.current = false;
    pendingCalendarDateRef.current = null;
    resetLegendExpansion();
  };

  const renderMapBottomPanel = (...args) => renderMapBottomPanelImpl({ setActiveDateSlot, latestCalDate, jumpToLatestMonth, setCalendarYear, setCalendarMonth, canPrevCal, canNextCal, SENSOR_DOT_COLOR, TIMELINE_DATA, activeDateSlot, bottomPanelHeight, calDaysInMonth, calFirstDay, calTrailing, calendarDates, calendarMonth, calendarYear, compareTimelineIndex, currentTimeline, currentTimelineA, currentTimelineB, effectiveSensor, isBottomPanelMinimized, isCompareMode, isPlaying, nextCalMonth, prevCalMonth, satellitePicker, selectDateWithSensor, selectedIndex, selectedTimelineIndex, setCompareTimelineIndex, setIsBottomPanelMinimized, setRefreshSlider, setSatellitePicker, setSelectedTimelineIndex, showCalendarTool, showTimeSliderTool, sliderPending, startBottomPanelResize, timelineLoading, togglePlay }, ...args);

  // Measures for Block summary: the crop's index classes, plus rain and heat per block.
  const telemetryById = useMemo(() => Object.fromEntries((plotsTelemetry || []).map(t => [t.plot_id, t])), [plotsTelemetry]);
  const blockMeasures = useBlockMeasures({ cropProfileEntries, blockValue, cropType, telemetryById });

  // Inputs for the Overview KPI cards. Condition classes come from the
  // admin's map classes for the index: best = highest class, worst = lowest.
  const kpiContext = useMemo(() => {
    const classify = (plot, key) => {
      const v = blockValue(plot, key);
      const legend = cropProfileEntries.find(e => e.key === key)?.legend;
      if (v == null || !Array.isArray(legend) || !legend.length) return null;
      const sorted = [...legend].filter(l => Array.isArray(l.range)).sort((x, y) => Number(x.range[0]) - Number(y.range[0]));
      const cls = sorted.find(l => v >= l.range[0] && v <= l.range[1]);
      if (!cls) return null;
      const i = sorted.indexOf(cls);
      return { label: cls.label, rank: i === sorted.length - 1 ? 'best' : i === 0 ? 'worst' : 'middle' };
    };
    const keys = cropProfileEntries.map(e => e.key);
    return {
      plots: plotsData,
      stats,
      carbon,
      alerts,
      loading: dataLoading,
      classify,
      primaryKey: cropPrimaryIndex || keys[0] || null,
      waterKey: ['ndmi', 'lswi', 'smi'].find(k => keys.includes(k)) || null,
      unitLabel: UNIT_LABEL[service?.id] || (service ? null : CROP_UNIT[cropType]) || 'blocks',
      latestPass: currentTimeline?.label || null,
      // Weak patches inside fields (where to walk), and those whose likely cause is water.
      weakPatches: scouting?.spots?.length || 0,
      dryPatches: (scouting?.spots || []).filter((sp) => (sp.likely_causes || []).some((c) => c.cause === 'too_little_water')).length,
    };
  }, [plotsData, stats, carbon, alerts, scouting, dataLoading, cropProfileEntries, cropPrimaryIndex, service, cropType, currentTimeline]);

  const nutrientData = useMemo(() => {
    // Radar axes from the farm's index values on the chosen date; missing values stay null
    // (never drawn as 0) and the card shows an empty state instead.
    const ndvi  = currentTimeline?.ndvi  ?? null;
    const ndmi  = currentTimeline?.ndmi  ?? null;
    const evi   = currentTimeline?.evi   ?? null;
    const reci  = currentTimeline?.reci  ?? null;
    const ndre  = currentTimeline?.ndre  ?? null;
    const lswi  = currentTimeline?.lswi  ?? null;
    // Normalise each index to 0-100 using known physical ranges
    const norm = (v, lo, hi) => (v == null ? null : Math.min(100, Math.max(0, Math.round(((v - lo) / (hi - lo)) * 100))));
    return {
      hasData: [ndvi, ndre, ndmi, evi, reci, lswi].some(v => v != null),
      labels: ['Crop health', 'Leaf greenness', 'Leaf water', 'Canopy density', 'Leaf colour', 'Canopy water'],
      datasets: [{
        label: 'Farm index profile',
        data: [
          norm(ndvi,  -0.2, 1.0),
          norm(ndre,  -0.1, 0.8),
          norm(ndmi,  -0.6, 0.8),
          norm(evi,   -0.2, 1.0),
          norm(reci,   0.0, 5.0),
          norm(lswi,  -0.6, 0.8),
        ],
        backgroundColor: 'rgba(22, 163, 74, 0.15)',
        borderColor: '#16A34A',
        pointBackgroundColor: '#16A34A',
        borderWidth: 2.5,
      }]
    };
  }, [currentTimeline]);

  // Keep the open block details in step with refreshed block data
  useEffect(() => {
    if (selectedPlot) {
      const updated = plotsData.find(p => p.id === selectedPlot.id);
      if (updated) setSelectedPlot(updated); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [plotsData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close user menu on outside click
  useEffect(() => {
    const handler = e => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white text-gray-900 font-sans antialiased overflow-hidden">
      {hasSession && (
        <DataNeededDialog
          cropType={isOrg ? null : cropType}
          serviceId={service?.id}
          onFill={(id) => { setActiveTab('monitor'); setActiveSidebarItem('farm-data'); setDataFocus(id); }}
        />
      )}
      {/* ── TOP HEADER BAR ─────────────────────────────────────────────────── */}
      {renderDashboardHeader({ activeTab, alerts, cropLabel, estateOptions, filterEstate, handleEstateChange, handleTopNavTabClick, onBack, onSignOut, pick, profileEmail, profileInitials, profileName, profileRole, service, setShowNotifications, setShowUserMenu, showNotifications, showUserMenu, tenant, tenantDisplayName, userMenuRef })}
      {hasSession && <NewResultsBanner />}

      {/* ── MAIN WORKSPACE ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        {!isAiOnly && activeTab === 'monitor' && (
          renderDashboardSidebar({ TIMELINE_DATA, activeDateSlot, activeSidebarItem, alerts, compareTimelineIndex, handleSidebarClick, isCompareMode, pageSet, pick, selectedTimelineIndex, service, setActiveDateSlot, setCompareTimelineIndex, setIsCompareMode, setShowCalendarTool, setShowTimeSliderTool, showCalendarTool, showTimeSliderTool, sidebarWidth, startSidebarResize })
        )}

        {/* ── WORKSPACE CONTENT ── */}
        {renderDashboardPages({ blockMeasures, TIMELINE_DATA, activeAnalyticsSubpage, activeSidebarItem, activeTab, alerts, answersForm, basemapAttribution, basemapMaxNativeZoom, basemapUrl, blockValue, chatEndRef, chatInput, chatLoading, chatMessages, climateBoundariesOpacity, climatePlotsData, climatePlotsDataA, climatePlotsDataB, climateShowBoundaries, climateShowLayers, cropLabel, cropProfileEntries, cropType, currentTileUrl, currentTileUrlB, currentTimelineA, currentTimelineB, dashboardFilterKeys, dataFocus, defaultMapCenter, dynamicFilterValues, estateOptions, farmBoundary, filterDate, filterEstate, filterPlot, filteredPlotsData, glossaryFocus, handleAcknowledgeAlert, handleChatSubmit, handleEstateChange, handlePlotClick, handlePlotFilterChange, handleSidebarClick, handleSplitDragStart, healthBoundariesOpacity, healthPlotsData, healthPlotsDataA, healthPlotsDataB, healthShowBoundaries, healthShowLayers, intelBoundariesOpacity, intelShowBoundaries, intelShowLayers, isAiOnly, isCompareMode, isOrg, kpiContext, landCover, landCoverLoading, loadIssues, mapOpacity, moistureBoundariesOpacity, moisturePlotsData, moisturePlotsDataA, moisturePlotsDataB, moistureShowBoundaries, moistureShowLayers, nutrientData, overviewTrends, pageSet, pick, pixelTimeseries, plots, plotsData, plotsDataA, plotsDataB, rasterOverlayBounds, renderClimatePolygons, renderFloatingBasemapSelector, renderHealthPolygons, renderInfoTooltip, renderIntelPolygons, renderLegendCards, renderMapBottomPanel, renderMoisturePolygons, renderRestorePolygons, renderYieldPolygons, restorationPlotsData, restorationPlotsDataA, restorationPlotsDataB, restoreBoundariesOpacity, restoreShowBoundaries, restoreShowLayers, scenarioFormOpen, selectedIndex, selectedPlot, service, setActiveAnalyticsSubpage, setActiveSidebarItem, setActiveTab, setAnswersForm, setChatInput, setChatMessages, setClimateBoundariesOpacity, setClimateShowBoundaries, setClimateShowLayers, setDataFocus, setDynamicFilterValues, setFilterDate, setFilterEstate, setFilterPlot, setHealthBoundariesOpacity, setHealthShowBoundaries, setHealthShowLayers, setIntelBoundariesOpacity, setIntelShowBoundaries, setIntelShowLayers, setLoadIssues, setMapOpacity, setMoistureBoundariesOpacity, setMoistureShowBoundaries, setMoistureShowLayers, setRestoreBoundariesOpacity, setRestoreShowBoundaries, setRestoreShowLayers, setScenarioFormOpen, setSelectedPlot, setShowRasterLayer, setYieldBoundariesOpacity, setYieldShowBoundaries, setYieldShowLayers, showRasterLayer, splitPosition, tenant, tenantDisplayName, tileRefreshing, waterDemandData, waterDemandLoading, yieldBoundariesOpacity, yieldPlotsData, yieldPlotsDataA, yieldPlotsDataB, yieldShowBoundaries, yieldShowLayers, zarrBounds })}
      </div>

      {/* Resizing and dragging overlay helper */}
      {(activeResizeType || isDraggingSplit) && (
        <div 
          className={`fixed inset-0 z-[999999] bg-transparent select-none ${
            activeResizeType === 'sidebar' || isDraggingSplit ? 'cursor-col-resize' : 'cursor-row-resize'
          }`}
        />
      )}

    </div>
  );
};

export default CropDashboardLayout;
