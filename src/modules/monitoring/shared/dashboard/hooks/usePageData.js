// Data fetched only while the page that shows it is open: the Overview trend lines, the water figures
// and the weather per block. Nulls when the pipeline has not run yet, never placeholder values.
import { useEffect, useState } from 'react';
import * as api from '../../../../../services/organizationMonitorApi';

const isoDate = (d) => d.toISOString().slice(0, 10);

export function usePageData({ tenant, cropType, activeSidebarItem, activeTab, activeAnalyticsSubpage, noteLoadIssue }) {
  // Farm-average trend series for the Overview charts, fetched independently of whichever index is on
  // the map, since Overview shows NDVI/NDMI/EVI/LST/RVI at once. Each "mean" is a true per-date
  // average over the raster from /timeseries/slider.
  const [overviewTrends, setOverviewTrends] = useState({ ndvi: [], ndmi: [], evi: [], lst: [], rvi: [] });
  const [waterDemandData, setWaterDemandData] = useState(null);
  const [waterDemandLoading, setWaterDemandLoading] = useState(false);
  const [plotsTelemetry, setPlotsTelemetry] = useState(null);

  useEffect(() => {
    const relevantSubpage = ['overview', 'vigor-health', 'moisture-et'].includes(activeAnalyticsSubpage);
    if (!(activeSidebarItem === 'analytics' && activeTab === 'monitor' && relevantSubpage)) return;
    let active = true;
    const windowEnd = new Date();
    const windowStart = new Date();
    windowStart.setMonth(windowStart.getMonth() - 6);
    const specs = [
      { key: 'ndvi', sensor: undefined },
      { key: 'ndmi', sensor: undefined },
      { key: 'evi', sensor: undefined },
      { key: 'lst', sensor: 'landsat' },
      { key: 'rvi', sensor: 'sentinel-1' },
    ];
    Promise.all(specs.map(s =>
      api.fetchTimeseriesSlider({
        farm: tenant || 'farm_1', index: s.key, sensor: s.sensor,
        start: isoDate(windowStart), end: isoDate(windowEnd), cropType,
      }).catch(err => { console.error(`Failed to fetch ${s.key} trend:`, err); return null; })
    )).then(results => {
      if (!active) return;
      const next = {};
      specs.forEach((s, i) => {
        next[s.key] = (results[i]?.timeline || []).filter(t => t.mean != null).map(t => ({
          ...t,
          is_estimated: Boolean(t.is_estimated || t.source === 'radar_estimate'),
          source: t.source || (t.is_estimated ? 'radar_estimate' : null),
        }));
      });
      setOverviewTrends(next);
    });
    return () => { active = false; };
  }, [activeSidebarItem, activeTab, activeAnalyticsSubpage, tenant, cropType]);

  // Water management (FAO-56 crop water use and irrigation efficiency), while that page is open.
  useEffect(() => {
    const onMonitorTab = activeSidebarItem === 'analytics' && activeTab === 'monitor';
    if (!(onMonitorTab && (activeAnalyticsSubpage === 'et-log' || activeAnalyticsSubpage === 'water-management'))) return;
    let active = true;
    setWaterDemandLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    api.fetchPlotsWaterDemand({})
      .then(data => { if (active) setWaterDemandData(data); })
      .catch(err => { noteLoadIssue('water figures', err); if (active) setWaterDemandData(null); })
      .finally(() => { if (active) setWaterDemandLoading(false); });
    return () => { active = false; };
  }, [activeSidebarItem, activeTab, activeAnalyticsSubpage, tenant, noteLoadIssue]);

  // Weather per block (surface heat from the Landsat thermal band; rain where the run had it), while
  // Weather is open.
  useEffect(() => {
    if (activeSidebarItem !== 'climate') return;
    let active = true;
    api.fetchPlotsTelemetry({})
      .then(data => { if (active) setPlotsTelemetry(data); })
      .catch(err => { noteLoadIssue('weather per block', err); if (active) setPlotsTelemetry(null); });
    return () => { active = false; };
  }, [activeSidebarItem, tenant, noteLoadIssue]);

  return { overviewTrends, waterDemandData, waterDemandLoading, plotsTelemetry };
}
