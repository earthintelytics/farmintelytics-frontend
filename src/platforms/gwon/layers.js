/** GWON's map layers (NASA GIBS) and the dates they come in. Shared by the map view and the pages. */
export const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
export const LAYERS = {
  truecolor: { name: 'Satellite picture', id: 'MODIS_Terra_CorrectedReflectance_TrueColor', level: 9, ext: 'jpg', time: 'daily', lag: 1,
    info: 'The land as the eye sees it, every day (NASA MODIS Terra). Clouds and dust show as they were that day.' },
  ndvi: { name: 'Vegetation', id: 'MODIS_Terra_L3_NDVI_16Day', level: 9, ext: 'png', time: 'period',
    info: 'How green the land is (vegetation index, NDVI), as a 16-day picture without clouds, 250 m. Brown is bare, dark green is dense.' },
  soil: { name: 'Soil moisture', id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', level: 6, ext: 'png', time: 'daily', lag: 4, coarse: true,
    info: 'Water held in the soil where roots reach (NASA SMAP), in m³ of water per m³ of soil. Dry soil near new plantings warns of drought stress.' },
  rain: { name: 'Rainfall rate', id: 'IMERG_Precipitation_Rate', level: 6, ext: 'png', time: 'daily', lag: 2, coarse: true,
    info: 'Where it is raining, in millimetres an hour (NASA GPM IMERG): whether the rains have started in each state.' },
  landcover: { name: 'Land cover 2024', id: 'MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual', level: 8, ext: 'png', fixed: '2024-01-01',
    info: 'What covers the land in 2024, at 500 m (MODIS, IGBP classes): cropland, savanna, grassland, shrubland, bare land, built-up.' },
  population: { name: 'Population 2020', id: 'GPW_Population_Density_2020', level: 7, ext: 'png', fixed: '2020-01-01',
    info: 'People per square kilometre in 2020 (Gridded Population of the World), to place restoration where it serves most people.' },
};
export const ORDER = ['truecolor', 'landcover', 'population', 'ndvi', 'soil', 'rain'];

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
export const dailyDays = (lag, n = 45) => Array.from({ length: n }, (_, i) => iso(daysAgo(lag + n - 1 - i)));
export const tileUrl = (key, date) => `${GIBS}/${LAYERS[key].id}/default/${date}/GoogleMapsCompatible_Level${LAYERS[key].level}/{z}/{y}/{x}.${LAYERS[key].ext}`;
