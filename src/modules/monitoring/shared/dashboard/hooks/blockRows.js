// Rows each map page draws for its blocks, built from the blocks of the chosen estate.
// Values are the block's own readings; a reading the run did not have stays null, never invented.
import { geoJsonToLeaflet } from '../../../../../services/organizationMonitorApi';

const ringOf = (boundary) => (boundary?.coordinates?.[0] ? geoJsonToLeaflet(boundary.coordinates[0]) : []);
const haText = (area, unit = 'ha') => (area != null ? `${area} ${unit}` : null);
const healthOf = (ndvi) => (ndvi == null ? 'No data' : ndvi > 0.7 ? 'Optimal' : ndvi > 0.55 ? 'Good' : 'Stressed');

// A member parcel in the shape the maps and KPIs use for a block.
export const parcelsAsBlocks = (fc) => (fc?.features || []).map((f) => {
  const pr = f.properties || {};
  return {
    plot_id: `P${pr.id}`, name: pr.member_name ? `${pr.member_name}'s farm` : `Parcel ${pr.id}`,
    boundary: ['Polygon', 'MultiPolygon'].includes(f.geometry?.type) ? (f.geometry.type === 'Polygon' ? f.geometry : { type: 'Polygon', coordinates: f.geometry.coordinates[0] }) : null,
    area_ha: pr.area_ha ?? null, subfarm: pr.group_name || null, indices: {},
    filters: { crop: pr.crop || '', group: pr.group_name || '' },
  };
});

// Smallholder groups as one carbon figure for the Overview card (the same shape as an estate total).
export function smallholderCarbonTotal(res) {
  const groups = res?.groups || [];
  const est = groups.filter(g => g.carbon_t);
  const area = groups.reduce((a, g) => a + (g.area_ha || 0), 0);
  const covered = groups.reduce((a, g) => a + (g.area_with_estimate_ha || 0), 0);
  return {
    area_ha: area,
    area_with_estimate_ha: covered,
    carbon_t: est.length ? { low: est.reduce((a, g) => a + g.carbon_t.low, 0), high: est.reduce((a, g) => a + g.carbon_t.high, 0) } : null,
    note: est.length ? null : 'Not enough data for an estimate',
  };
}

// Whether a block belongs to the chosen estate: by the registered estate id, else by name (the estate list
// says "Okomu - main" while a block's estate column says "main").
export function inEstate(blockEstate, blockFarmId, chosen, est) {
  if (est && blockFarmId) return blockFarmId === est.farm_id;
  const b = String(blockEstate || '').trim().toLowerCase();
  const c = String(chosen || '').trim().toLowerCase();
  return !!b && (b === c || c.endsWith(` - ${b}`) || c.endsWith(` ${b}`));
}

// Every block of the organisation, as the shared map, KPIs and tables read it.
export const mapBlocks = (plots) => (plots || []).map(p => {
  const ndviVal = p.indices?.ndvi ?? null; // null until the first satellite result: never counted as stressed
  const health = healthOf(ndviVal);
  const color = health === 'Optimal' ? '#15803d' : health === 'Good' ? '#84cc16' : health === 'Stressed' ? '#dc2626' : '#9CA3AF';
  return { id: p.plot_id, name: p.name || p.plot_id, area: haText(p.area_ha, 'HA'), health, ndvi: ndviVal, ndmi: p.indices?.ndmi ?? null, color, coords: ringOf(p.boundary), indices: p.indices, subfarm: p.subfarm || p.division || null, division: p.division || null, blocId: p.bloc_id || null, filters: p.filters || {}, farmId: p.farm_id || null };
});

export const healthRows = (plots) => plots.map(p => {
  const ndviVal = p.indices?.ndvi ?? null;
  return {
    id: p.plot_id,
    name: p.name || p.plot_id,
    area: haText(p.area_ha),
    health: healthOf(ndviVal),
    ndvi: ndviVal,
    savi: p.indices?.savi ?? null,
    ndwi: p.indices?.ndwi ?? null,
    cumulative_rainfall_14d: p.indices?.cumulative_rainfall_14d ?? null,
    chlorophyll: p.indices?.chlorophyll ?? null,
    waterStress: p.indices?.ndmi ?? null,
    pestRisk: p.indices?.uas_anomaly_score > 0.4 ? 'High Risk' : p.indices?.uas_anomaly_score > 0.15 ? 'Moderate Risk' : 'Low Risk',
    coords: ringOf(p.boundary),
  };
});

export const moistureRows = (plots, selectedIndex) => plots.map(p => {
  const v = { ndmi: p.indices?.ndmi ?? null, ndwi: p.indices?.ndwi ?? null, lswi: p.indices?.lswi ?? null, smi: p.indices?.smi ?? null, msi: p.indices?.msi ?? null };
  const activeVal = ['ndwi', 'lswi', 'smi', 'msi'].includes(selectedIndex) ? v[selectedIndex] : v.ndmi;
  let status = 'Adequate';
  let color = '#60a5fa';
  if (activeVal != null) {
    if (selectedIndex === 'smi') {
      // Radar soil moisture is 0 (the farm's driest) to 1 (its wettest), as in the pipeline's block summary.
      status = activeVal > 0.8 ? 'Wet Soil' : activeVal >= 0.2 ? 'Adequate' : 'Dry Soil';
      color = activeVal > 0.8 ? '#1d4ed8' : activeVal >= 0.2 ? '#60a5fa' : '#dc2626';
    } else {
      status = activeVal > 0.35 ? 'Well-Hydrated' : activeVal > 0.15 ? 'Adequate' : activeVal > -0.05 ? 'Mild Deficit' : 'Severe Deficit';
      color = activeVal > 0.35 ? '#1d4ed8' : activeVal > 0.15 ? '#60a5fa' : activeVal > -0.05 ? '#fbbf24' : '#dc2626';
    }
  }
  return { id: p.plot_id, name: p.name || p.plot_id, area: haText(p.area_ha), ...v, activeVal, moistureStatus: status, color, coords: ringOf(p.boundary) };
});

// Yield from harvest records (Farm data); empty until they are uploaded.
export const yieldRows = (plots) => plots.map(p => ({
  id: p.plot_id, name: p.name || p.plot_id, area: haText(p.area_ha), yieldValue: p.yield_t_ha ?? null, coords: ringOf(p.boundary),
}));

// Rain and surface heat per block from /plots/telemetry; null when the run had no reading.
export const climateRows = (plots, telemetry) => plots.map(p => {
  const t = (telemetry || []).find(x => x.plot_id === p.plot_id);
  return { id: p.plot_id, name: p.name || p.plot_id, area: haText(p.area_ha), rainfall: t?.rainfall_mm ?? null, lst: t?.surface_lst_celsius ?? null, coords: ringOf(p.boundary) };
});

export const restorationRows = (zones) => (zones || []).map(z => ({
  id: z.zone_id,
  name: z.name,
  area: haText(z.area_ha),
  carbonPerHa: z.carbon_offset_tco2e != null && z.area_ha ? z.carbon_offset_tco2e / z.area_ha : null,
  type: z.project_type ?? null,
  progress: z.progress_pct ?? null,
  survival: z.survival_rate_pct != null ? `${z.survival_rate_pct}%` : '—',
  trees: z.tree_count != null ? z.tree_count.toLocaleString() : '—',
  carbon: z.carbon_offset_tco2e != null ? `${z.carbon_offset_tco2e} tCO2e` : '—',
  status: z.status ?? null,
  coords: ringOf(z.boundary),
  manager: z.manager ?? null,
  survivalNum: z.survival_rate_pct ?? null,
}));
