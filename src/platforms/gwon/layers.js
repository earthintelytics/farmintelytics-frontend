/** GWON's map layers (NASA GIBS) and the dates they come in. Shared by the map view and the pages. */
export const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
export const LAYERS = {
  truecolor: { group: 'Base', name: 'Satellite picture', id: 'MODIS_Terra_CorrectedReflectance_TrueColor', level: 9, ext: 'jpg', time: 'daily', lag: 1,
    info: 'The land as the eye sees it, every day (NASA MODIS Terra). Clouds and dust show as they were that day.' },
  ndvi: { group: 'Vegetation and forest', name: 'Vegetation', id: 'MODIS_Terra_L3_NDVI_16Day', level: 9, ext: 'png', time: 'period',
    info: 'How green the land is (vegetation index, NDVI), as a 16-day picture without clouds, 250 m. Brown is bare, dark green is dense.' },
  soil: { group: 'Water and climate', name: 'Soil moisture', id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', level: 6, ext: 'png', time: 'daily', lag: 4, coarse: true,
    info: 'Water held in the soil where roots reach (NASA SMAP), in m³ of water per m³ of soil. Dry soil near new plantings warns of drought stress.' },
  rain: { group: 'Water and climate', name: 'Rainfall rate', id: 'IMERG_Precipitation_Rate', level: 6, ext: 'png', time: 'daily', lag: 2, coarse: true,
    info: 'Where it is raining, in millimetres an hour (NASA GPM IMERG): whether the rains have started in each state.' },
  landcover: { group: 'Vegetation and forest', name: 'Land cover 2024', id: 'MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual', level: 8, ext: 'png', fixed: '2024-01-01',
    info: 'What covers the land in 2024, at 500 m (MODIS, IGBP classes): cropland, savanna, grassland, shrubland, bare land, built-up.' },
  population: { name: 'Population 2020', group: 'People', id: 'GPW_Population_Density_2020', level: 7, ext: 'png', fixed: '2020-01-01',
    info: 'People per square kilometre in 2020 (Gridded Population of the World), to place restoration where it serves most people.' },
  // Vegetation and forest
  evi: { name: 'Enhanced vegetation (EVI)', group: 'Vegetation and forest', id: 'MODIS_Terra_L3_EVI_16Day', level: 9, ext: 'png', time: 'period',
    info: 'Enhanced vegetation index, 16-day, 250 m (MODIS): like NDVI but less washed out over dense or very sparse cover.' },
  photo: { name: 'Plant growth (photosynthesis)', group: 'Vegetation and forest', id: 'MODIS_Terra_L4_Net_Photosynthesis_8Day', level: 8, ext: 'png', time: 'daily', lag: 20, step: 8,
    info: 'Carbon the plants took up over 8 days (MODIS net photosynthesis, 500 m): where vegetation is actually growing.' },
  forestloss: { period: '2001 to 2024', name: 'Forest loss 2001-2024', group: 'Vegetation and forest', kind: 'xyz', url: 'https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.12/loss_alpha/{z}/{x}/{y}.png', level: 12, fixed: '2024-12-31',
    info: 'Tree cover lost between 2001 and 2024, 30 m (Hansen and others, University of Maryland, Global Forest Change v1.12).' },
  protected: { period: 'Latest release', name: 'Protected areas', group: 'Vegetation and forest', kind: 'xyz', url: 'https://data-gis.unep-wcmc.org/server/rest/services/ProtectedSites/The_World_Database_of_Protected_Areas/MapServer/tile/{z}/{y}/{x}', level: 12, fixed: 'latest',
    info: 'National parks, forest reserves and other protected areas (World Database on Protected Areas, UNEP-WCMC and IUCN, latest release).' },
  // Hazards
  fires: { name: 'Fires and hot spots', group: 'Hazards', kind: 'wms', id: 'MODIS_Combined_Thermal_Anomalies_All', time: 'daily', lag: 1,
    info: 'Fires and other hot spots seen that day by MODIS on Terra and Aqua (1 km). Bush fires burn young trees: watch them near the sites.' },
  lst: { name: 'Land surface heat', group: 'Hazards', id: 'MODIS_Terra_Land_Surface_Temp_Day', level: 7, ext: 'png', time: 'daily', lag: 2, coarse: true,
    info: 'How hot the ground is in the day, in °C (MODIS Terra, 1 km). Very hot ground dries seedlings fast.' },
  flood: { name: 'Floods (3 days)', group: 'Hazards', id: 'MODIS_Combined_Flood_3-Day', level: 9, ext: 'png', time: 'daily', lag: 1,
    info: 'Surface water seen over 3 days (MODIS flood product): river floods and standing water after storms.' },
  droughthaz: { period: '1980 to 2000', name: 'Drought hazard 1980-2000', group: 'Hazards', id: 'NDH_Drought_Hazard_Frequency_Distribution_1980-2000', level: 7, ext: 'png', fixed: '',
    info: 'How often drought struck, 1980-2000 (NASA SEDAC, Natural Disaster Hotspots): the long-term drought exposure of each place.' },
  droughtloss: { period: 'Around 2000', name: 'Drought economic loss risk', group: 'People', id: 'NDH_Drought_Proportional_Economic_Loss_Risk_Deciles_2000', level: 7, ext: 'png', fixed: '',
    info: 'Share of the local economy at risk from drought, in deciles (NASA SEDAC, Natural Disaster Hotspots, 2000).' },
  nightlights: { name: 'Night lights 2016', group: 'People', id: 'VIIRS_Black_Marble', level: 8, ext: 'png', fixed: '2016-01-01',
    info: 'Lights at night in 2016 (NASA Black Marble, VIIRS): towns, villages and roads where people and markets are.' },
};
// Drawn bottom to top.
export const ORDER = ['truecolor', 'landcover', 'nightlights', 'population', 'droughtloss', 'droughthaz', 'ndvi', 'evi', 'photo', 'lst', 'soil', 'rain', 'flood', 'protected', 'forestloss', 'fires'];
export const GROUPS = ['Vegetation and forest', 'Water and climate', 'Hazards', 'People', 'Base'];

export const iso = (d) => d.toISOString().slice(0, 10);
export const daysAgo = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d; };
// The newest complete 16-day vegetation picture on or before a day (published a few days late: two periods back).
export function ndviDate(ref = new Date()) {
  const start = Date.UTC(ref.getUTCFullYear(), 0, 1);
  const k = Math.floor(Math.floor((Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()) - start) / 86400000) / 16) - 2;
  if (k < 0) return ndviDate(new Date(Date.UTC(ref.getUTCFullYear() - 1, 11, 31)));
  return iso(new Date(start + k * 16 * 86400000));
}
export function ndviPeriods(year) {
  const newest = ndviDate(new Date());
  const out = [];
  for (let k = 0; k < 23; k++) {
    const d = iso(new Date(Date.UTC(year, 0, 1) + k * 16 * 86400000));
    if (d.slice(0, 4) !== String(year) || d > newest) break;
    out.push(d);
  }
  return out;
}
export const dailyDays = (lag, n = 45, end = null) => {
  const last = iso(daysAgo(lag));
  const e = end && end < last ? new Date(`${end}T00:00:00Z`) : new Date(`${last}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => iso(new Date(e.getTime() - (n - 1 - i) * 86400000)));
};
// The 16-day vegetation picture a day falls in (never newer than the newest published one).
export function periodOf(day) {
  const d = new Date(`${day}T00:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const k = Math.min(22, Math.floor((d.getTime() - start) / 86400000 / 16));
  const p = iso(new Date(start + k * 16 * 86400000));
  const newest = ndviDate(new Date());
  return p > newest ? newest : p;
}
export const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
export const tileUrl = (key, date) => {
  const l = LAYERS[key];
  if (l.kind === 'xyz') return l.url;
  return date ? `${GIBS}/${l.id}/default/${date}/GoogleMapsCompatible_Level${l.level}/{z}/{y}/{x}.${l.ext}`
    : `${GIBS}/${l.id}/default/GoogleMapsCompatible_Level${l.level}/{z}/{y}/{x}.${l.ext}`;
};
