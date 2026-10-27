/**
 * Which charts each crop and service shows on Overview and on its health
 * trend tab, in its own words. Every chart reads real data only: the
 * farm-average series from /timeseries/slider (overviewTrends) or the latest
 * value per block (plots). A chart without readings says so; charts with no
 * data source at all (VPD, growing degree days, ET) are not offered.
 *
 * Chart ids:
 *   trend:<index>   farm average over the last 6 months (ndvi, evi, ndmi, rvi, lst)
 *   classes         how many blocks sit in each map class for the main index
 *   weakest         the blocks with the lowest main index today
 *   greenness       land cover now: greenness classes of the latest run, change since a year before
 *   landcover       land cover in 2021 (ESA WorldCover map) inside the boundaries
 *   history         land cover year by year since 2000 (GLC_FCS30D, JRC forest, Esri 10 m), records compared
 *   eudr            deforestation check results and the plots that lost forest
 *   carbon          carbon by pool (above ground, roots, soil) with a row per estate
 */

// Plain defaults per series; a crop or service can retitle them.
export const SERIES = {
  ndvi: { title: 'Crop condition over time', text: 'Average crop condition of all your blocks. Optical when clear, estimated from radar when cloudy.', colour: '#3F8432', range: [0, 1] },
  evi: { title: 'Crop condition over time', text: 'Average crop vigour across your blocks. Optical when clear, estimated from radar when cloudy.', colour: '#3F8432', range: [0, 1] },
  fused_ndvi: { title: 'Crop condition over time', text: 'Continuous crop reading. Optical when clear, estimated from radar when cloudy.', colour: '#3F8432', range: [0, 1] },
  fused_evi: { title: 'Crop condition over time', text: 'Continuous crop reading. Optical when clear, estimated from radar when cloudy.', colour: '#3F8432', range: [0, 1] },
  crop_condition: { title: 'Crop condition over time', text: 'Continuous crop reading. Optical when clear, estimated from radar when cloudy.', colour: '#3F8432', range: [0, 1] },
  ndmi: { title: 'Water in the canopy over time', text: 'Average water held in the leaves. Low values mean the crop is short of water.', colour: '#2563EB', range: [-0.2, 0.7] },
  rvi: { title: 'Growth seen by radar', text: 'Radar sees through cloud, so this keeps going in the rainy season when photos fail.', colour: '#475569', range: [0, 2] },
  lst: { title: 'Ground temperature over time', text: 'Surface heat. Hot spells during flowering or grain fill cut yield.', colour: '#D97706', range: [15, 50] },
};

const t = (index, title, text) => ({ id: `trend:${index}`, index, ...(title && { title }), ...(text && { text }) });
const classes = (title, text) => ({ id: 'classes', ...(title && { title }), ...(text && { text }) });
const weakest = (title, text) => ({ id: 'weakest', ...(title && { title }), ...(text && { text }) });
const card = (id, title, text) => ({ id, ...(title && { title }), ...(text && { text }) });
const greenness = (title, text) => card('greenness', title, text);
const landcover = (title, text) => card('landcover', title, text);
const history = (title, text) => card('history', title, text);

export const CHART_CATALOG = {
  oil_palm: [t('evi', 'Crop condition over time'), t('ndmi'), classes(), weakest('Blocks to inspect first')],
  cocoa: [t('ndvi', 'Crop condition over time'), t('ndmi'), t('rvi', 'Canopy seen by radar', 'Keeps watching the canopy through the long rainy season.'), classes('Farms by condition')],
  rubber: [t('ndvi', 'Crop condition over time', 'Continuous crop condition. Falls in wintering (December to February) and should recover; a fall at other times needs a look.'), t('ndmi'), classes(), weakest()],
  cashew: [t('ndvi', 'Crop condition over time'), t('ndmi'), t('lst', 'Heat during flowering', 'Hot, dry spells while trees flower reduce the nut set.'), classes('Orchards by condition')],
  maize: [t('ndvi', 'Crop condition over time'), t('ndmi'), t('lst', 'Heat at tasselling', 'Heat in weeks 8 to 11 is the biggest risk to yield.'), classes('Fields by condition')],
  rice: [t('ndvi', 'Crop condition over time'), t('rvi', 'Flooding and growth seen by radar', 'Radar shows standing water and growth even under cloud.'), t('ndmi'), classes('Fields by condition')],
  cassava: [t('ndvi', 'Crop condition over time'), t('ndmi'), classes('Fields by condition'), weakest('Fields to visit first')],
  sugarcane: [t('ndvi', 'Crop condition over time'), t('ndmi'), t('lst'), classes('Fields by condition')],
  'carbon-ffb': [card('carbon'), greenness('Vegetation cover now', 'Dense vegetation holds most of the above-ground carbon; a fall in the greenest classes means carbon lost.'), landcover(), history(), t('evi', 'Biomass over time', 'Vigour of the estate’s vegetation; carbon stock follows it.'), t('ndmi', 'Peat and canopy moisture', 'Drying canopies in peat areas point to falling water tables.'), classes('Blocks by biomass'), weakest('Blocks losing biomass')],
  'forestry-intel': [greenness('Forest and vegetation cover now', 'Hectares of dense canopy and how they changed since the same weeks last year.'), landcover(), history(), t('ndvi', 'Forest canopy over time'), t('ndmi', 'Canopy dryness (fire risk)', 'Very dry canopy in the dry season means high fire risk.'), t('rvi', 'Canopy seen by radar', 'Clearing shows up here even when it is cloudy.'), classes('Compartments by condition')],
  'land-restoration': [greenness('Cover in the zones now', 'Restoration is working when hectares move into the greener classes year on year.'), landcover(), history(), t('ndvi', 'Greening of the zones', 'Should rise as planting takes hold; flat after a year means poor survival.'), t('ndmi'), classes('Zones by recovery'), weakest('Zones not recovering')],
  'eudr-check': [card('eudr'), greenness('Tree and vegetation cover now', 'A loss of dense cover since last year is worth checking before it shows in the deforestation data.'), history('Land cover since 2000', 'What the plots were each year since 2000, from published records, next to the EUDR cut-off of 31 December 2020.'), t('ndvi', 'Tree cover on your plots', 'A sudden fall can mean clearing; it raises a deforestation alert to review.'), t('rvi', 'Tree cover seen by radar', 'Confirms clearing under cloud.')],
  advisor: [t('ndvi', 'Crop condition over time'), t('ndmi'), t('lst'), classes('Fields by condition')],
  'group-monitoring': [classes('Member farms by condition'), weakest('Farms to visit first', 'The weakest member farms today.'), t('ndvi', 'All member farms over time'), t('ndmi')],
  'carbon-groups': [greenness('Vegetation cover on member farms now'), t('ndvi', 'Tree cover on member farms'), classes('Member farms by tree cover')],
  'smallholder-members': [classes('Parcels by condition'), t('ndvi', 'All parcels over time')],
  'smallholder-eudr': [card('eudr', 'Parcels by check result'), t('ndvi', 'Tree cover on member parcels', 'A sudden fall can mean clearing after 2020.')],
  'rs-drone': [classes(), t('ndvi', 'Crop condition over time')],
  'carbon-estimator': [card('carbon'), greenness(), landcover(), history()],
};
CHART_CATALOG.ffb = CHART_CATALOG.oil_palm;

export const chartsFor = (serviceId, cropType) => CHART_CATALOG[serviceId] || CHART_CATALOG[cropType] || [t('ndvi'), t('ndmi'), classes(), weakest()];

/** The crop-health tab: the service's own vegetation charts, radar, and the weakest blocks. */
export const healthChartsFor = (serviceId, cropType) => {
  const list = chartsFor(serviceId, cropType).filter((c) => ['trend:ndvi', 'trend:evi', 'trend:rvi', 'weakest'].includes(c.id));
  const has = (id) => list.some((c) => c.id === id);
  return [...list, ...(has('trend:rvi') ? [] : [t('rvi')]), ...(has('weakest') ? [] : [weakest()])];
};

/** The water tab: water in the canopy and surface heat, in the service's words. */
export const waterChartsFor = (serviceId, cropType) => {
  const list = chartsFor(serviceId, cropType).filter((c) => ['trend:ndmi', 'trend:lst'].includes(c.id));
  const has = (id) => list.some((c) => c.id === id);
  return [...(has('trend:ndmi') ? [] : [t('ndmi')]), ...list, ...(has('trend:lst') ? [] : [t('lst')])];
};
