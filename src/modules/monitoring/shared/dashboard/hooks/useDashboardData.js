// The organisation's data every page of the dashboard reads: summary figures, blocks (or member parcels),
// alerts, carbon, the farm outline, estates, land cover, the satellite layers held and the admin's filters.
// Each part loads on its own and a failure is noted once in loadIssues, never shown as an empty page.
import { useCallback, useEffect, useState } from 'react';
import * as api from '../../../../../services/organizationMonitorApi';
import { fetchEstates } from '../../../../../services/estatesApi';
import { fetchParcels, fetchCarbonSummary } from '../../../../../services/smallholderApi';
import { SERVICE_KPIS } from '../kpiCatalog';
import { parcelsAsBlocks, smallholderCarbonTotal } from './blockRows';

export function useDashboardData({ tenant, hasSession, service, isSmallholderService }) {
  const [estates, setEstates] = useState([]); // from GET /estates when the backend has it
  const [stats, setStats] = useState(null);
  const [carbon, setCarbon] = useState(null);  // carbon held in the crops: area x the admin's range per crop
  const [eudrResults, setEudrResults] = useState(null);  // the EUDR check per plot, for the KPI card and the register
  const [dataLoading, setDataLoading] = useState(true);  // cards say Loading until the first answers arrive
  const [plots, setPlots] = useState([]);
  const [restorationZones, setRestorationZones] = useState([]);
  const [farmBoundary, setFarmBoundary] = useState(null); // GeoJSON Feature for tenants with no plot polygons
  const [alerts, setAlerts] = useState([]);
  const [landCover, setLandCover] = useState(null);
  const [landCoverLoading, setLandCoverLoading] = useState(false);
  const [availableIndices, setAvailableIndices] = useState([]);
  // Boundary-property keys the admin picked at onboarding to show as dashboard filter dropdowns
  // (empty = no extra filters). Values are filtered client-side from each block's own .filters.
  const [dashboardFilterKeys, setDashboardFilterKeys] = useState([]);
  // Data that could not be loaded, shown in one note instead of an empty page.
  const [loadIssues, setLoadIssues] = useState([]);
  const noteLoadIssue = useCallback((what, err) => {
    console.warn(`Could not load ${what}:`, err);
    setLoadIssues((l) => (l.includes(what) ? l : [...l, what]));
  }, []);

  useEffect(() => {
    let active = true;
    fetchEstates().then(list => { if (active && Array.isArray(list)) setEstates(list); }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Same live backend data as the organization view — the crop pages must render
  // the identical experience (map, splits, calendar, charts, alerts, boundary).
  useEffect(() => {
    if (!hasSession) return; // no authenticated session — the layout's redirect handles it
    let active = true;
    async function loadBackendData() {
      // Each part loads on its own: one refused or failed request never blanks the others.
      const [statsRes, plotsRes, zonesRes, alertsRes] = await Promise.allSettled([
        api.fetchDashboardStats(tenant),
        // Smallholder services show the members' parcels (forms, drawn or uploaded),
        // never the organisation's estate blocks.
        isSmallholderService ? fetchParcels().then(parcelsAsBlocks) : api.fetchPlotsIntelligence(tenant),
        // Restoration zones belong to land restoration (the only licence that opens them): other
        // pages never ask, so no request is refused.
        service?.id === 'land-restoration' ? api.fetchRestorationZones(tenant) : Promise.resolve([]),
        api.fetchAlerts(tenant),
      ]);
      if (!active) return;
      const ok = (r, what, optional = false) => {
        if (r.status === 'fulfilled') return r.value;
        // A service this organisation does not have is not a failure to report.
        // The status is on the error (its message is already plain words, without the number).
        if (!(optional && (r.reason?.status === 403 || /\b403\b/.test(String(r.reason?.message))))) noteLoadIssue(what, r.reason);
        return null;
      };
      const statsVal = ok(statsRes, 'summary figures');
      if (statsVal) setStats(statsVal);
      const plotsVal = ok(plotsRes, 'blocks');
      if (plotsVal) setPlots(plotsVal);
      setRestorationZones(ok(zonesRes, 'restoration zones', true) || []);
      const alertsVal = ok(alertsRes, 'alerts');
      if (service?.id === 'eudr-check') {
        try {
          const r = await api.fetchEudrPlots();
          if (active) setEudrResults(Array.isArray(r) ? r : []);
        } catch (e) {
          noteLoadIssue('deforestation check results', e);
        }
      }
      if ((SERVICE_KPIS[service?.id] || []).includes('carbon')) {
        try {
          let c;
          if (isSmallholderService) c = smallholderCarbonTotal(await fetchCarbonSummary());
          else {
            const res = await api.fetchEstateCarbon();
            // No estate for this service: say that, not a generic "not enough data".
            // Per-estate pools (without their block lists) for the carbon chart on the overview.
            const perEstate = (res?.estates || []).map((e) => ({ ...e, blocks: undefined }));
            c = res?.estates?.length ? { ...res.total, estates: perEstate } : (res ? { ...res.total, carbon_t: null, note: res.note || res.total?.note } : null);
          }
          if (active) setCarbon(c || null);
        } catch (e) {
          noteLoadIssue('carbon estimate', e);
        }
      }
      if (!isSmallholderService) try {
        const boundary = await api.fetchFarmBoundary();
        if (active && boundary && boundary.geometry) setFarmBoundary(boundary);
      } catch (e) {
        noteLoadIssue('farm outline', e);
      }
      if (alertsVal) {
        // Workflow status from the server: seen, scout sent, resolved or dismissed all count as handled.
        const handled = (a) => a.acknowledged || ['scout_assigned', 'resolved', 'dismissed'].includes(a.status);
        setAlerts((alertsVal.feed || []).map(a => ({
          id: a.alert_id,
          plot: a.plot_id,
          category: a.type,
          severity: a.severity,
          desc: a.message,
          date: (a.timestamp || '').split(' ')[0],
          time: (a.timestamp || '').split(' ')[1] || '',
          status: handled(a) ? 'Acknowledged' : 'Active',
          workflow: a.status || 'open',
          module: a.module || '',
        })));
      }
    }
    loadBackendData().finally(() => { if (active) setDataLoading(false); });
    return () => { active = false; };
  }, [tenant, service?.id, noteLoadIssue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Satellite layers held for the organisation
  useEffect(() => {
    api.fetchRasterIndices()
      .then(data => setAvailableIndices(Array.isArray(data?.indices) ? data.indices : []))
      .catch(err => noteLoadIssue('satellite layers', err));
  }, [tenant, service?.id, noteLoadIssue]);

  useEffect(() => {
    api.fetchCropMonitoringConfig()
      .then(cfg => setDashboardFilterKeys(cfg?.dashboard_filter_keys || []))
      .catch(err => noteLoadIssue('dashboard settings', err));
  }, [tenant, noteLoadIssue]);

  // Land cover: the 2021 map inside the blocks, and land cover now (greenness classes of the latest run)
  useEffect(() => {
    let active = true;
    async function loadLandCover() {
      setLandCoverLoading(true);
      const [cover, green, history] = await Promise.allSettled([api.fetchLandCover(service?.id), api.fetchGreenness(service?.id), api.fetchLandHistory(service?.id)]);
      const val = (r, what) => {
        if (r.status === 'rejected') { noteLoadIssue(what, r.reason); return null; }
        return r.value && Object.keys(r.value).length ? r.value : null;
      };
      if (active) {
        setLandCover({ cover: val(cover, 'land cover'), greenness: val(green, 'land cover now'), history: val(history, 'land cover since 2000') });
        setLandCoverLoading(false);
      }
    }
    loadLandCover();
    return () => { active = false; };
  }, [tenant, service?.id, noteLoadIssue]);

  const handleAcknowledgeAlert = (alertId) => {
    // Optimistic update, reverted if the backend call fails, so an acknowledgement
    // never reappears as "Active" after a refresh without saying so.
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'Acknowledged' } : a));
    api.acknowledgeAlert(alertId).catch(err => {
      console.error('Failed to acknowledge alert:', err);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'Active' } : a));
    });
  };

  return {
    estates, stats, carbon, eudrResults, dataLoading, plots, restorationZones, farmBoundary, alerts,
    landCover, landCoverLoading, availableIndices, dashboardFilterKeys, loadIssues, setLoadIssues,
    noteLoadIssue, handleAcknowledgeAlert,
  };
}
