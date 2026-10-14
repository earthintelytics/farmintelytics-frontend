/**
 * Plain names for every index, used wherever a client sees one. `short` fits a narrow button,
 * `name` is the layer's title, `science` is shown only in the (i) hint.
 */
export const INDEX_NAMES = {
  // Optical layers keep their own names: the map images are optical only. The fused reading
  // (optical when clear, radar on cloudy dates) is crop_condition / fused_*, below.
  ndvi: { short: 'Health', name: 'Vegetation health', science: 'NDVI, Normalised Difference Vegetation Index (optical, needs a clear sky)' },
  evi: { short: 'Growth', name: 'Vegetation growth', science: 'EVI, Enhanced Vegetation Index (optical, needs a clear sky)' },
  fused_ndvi: { short: 'Condition', name: 'Crop condition', science: 'Optical NDVI and Sentinel-1 radar (RVI) fused into one continuous reading; sees through cloud' },
  fused_evi: { short: 'Condition', name: 'Crop condition', science: 'Optical EVI and Sentinel-1 radar (RVI) fused into one continuous reading; sees through cloud' },
  crop_condition: { short: 'Condition', name: 'Crop condition', science: 'Optical and Sentinel-1 radar fused into one continuous reading; sees through cloud' },
  ndmi: { short: 'Moisture', name: 'Vegetation moisture', science: 'NDMI, Normalised Difference Moisture Index' },
  lswi: { short: 'Water', name: 'Surface water', science: 'LSWI, Land Surface Water Index' },
  ndwi: { short: 'Water', name: 'Open water', science: 'NDWI, Normalised Difference Water Index' },
  reci: { short: 'Leaf colour', name: 'Leaf colour', science: 'RECI, Red-Edge Chlorophyll Index' },
  cvi: { short: 'Chlorophyll', name: 'Leaf chlorophyll', science: 'CVI, Chlorophyll Vegetation Index' },
  ndre: { short: 'Nitrogen', name: 'Nitrogen status', science: 'NDRE, Normalised Difference Red Edge' },
  gndvi: { short: 'Greenness', name: 'Greenness', science: 'GNDVI, Green Normalised Difference Vegetation Index' },
  lai: { short: 'Leaf cover', name: 'Leaf cover', science: 'LAI, Leaf Area Index' },
  msavi2: { short: 'Ground cover', name: 'Ground cover', science: 'MSAVI2, Modified Soil-Adjusted Vegetation Index' },
  msi: { short: 'Stress', name: 'Moisture stress', science: 'MSI, Moisture Stress Index' },
  wdi: { short: 'Water deficit', name: 'Water deficit', science: 'WDI, Water Deficit Index' },
  rvi: { short: 'Radar', name: 'Crop structure (radar)', science: 'RVI, Radar Vegetation Index from Sentinel-1, sees through cloud' },
  dprvi: { short: 'Radar', name: 'Crop structure (radar)', science: 'DpRVI, Dual-polarisation Radar Vegetation Index from Sentinel-1' },
  smi: { short: 'Soil moisture', name: 'Soil moisture (radar)', science: 'SMI, Soil Moisture Index from Sentinel-1' },
  lst: { short: 'Heat', name: 'Surface heat', science: 'LST, Land Surface Temperature from Landsat' },
  vci: { short: 'Drought', name: 'Drought condition', science: 'VCI, Vegetation Condition Index' },
};

export const indexName = (key) => {
  const k = String(key || '').toLowerCase();
  return INDEX_NAMES[k] || { short: k.toUpperCase(), name: k.toUpperCase(), science: '' };
};
