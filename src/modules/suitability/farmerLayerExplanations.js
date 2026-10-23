/**
 * Plain-English Agronomic Explanations for Farmers (Zero GIS / Remote Sensing Jargon).
 * 
 * Translates technical geospatial layers into clear, practical farming advice
 * that any farm manager, landowner, or investor without GIS training can understand.
 */

export const FARMER_LAYER_EXPLANATIONS = {
  final_class: {
    label: 'Overall Planting Suitability',
    plainTitle: 'Overall Planting Recommendation',
    category: 'Summary',
    badge: 'FAO S1–N',
    whatItMeans:
      'This shows the combined score for your land. In agriculture, a crop is only as good as the weakest condition. Even with perfect rain, steep hills or waterlogging will destroy your crop. Every spot shows its worst limiting factor.',
    whyItMatters: (crop) =>
      `Tells you directly where ${crop || 'your crop'} will thrive with high yields, where you will need costly treatments, and where planting will waste money.`,
    classesGuide: [
      { code: 'S1', name: 'Highly Suitable (Prime Land)', color: '#2e7d32', text: 'Prime farm ground. No major obstacles. Plant with standard best practices for top yields.' },
      { code: 'S2', name: 'Moderately Suitable (Good Land)', color: '#7cb342', text: 'Good farm ground with mild limitations (like slight slope or mild dry months). Easy to manage with good routine farming.' },
      { code: 'S3', name: 'Marginally Suitable (Challenging)', color: '#fbc02d', text: 'Challenging land. Requires higher investments (such as contour terracing, irrigation, or liming) to get profitable yields.' },
      { code: 'N', name: 'Unsuitable / Excluded (Do Not Plant)', color: '#c62828', text: 'Do not cultivate. Land is either physically unviable (steep hills, deep swamps) or strictly protected by anti-deforestation laws (EUDR).' },
    ],
    farmerAdvice:
      'Focus initial clearing and nursery transplanting on the dark green (S1) zones first. Inspect the amber (S3) zones to see what treatments are needed before spending capital.',
    farmerQuestions: [
      'Which specific blocks should I clear and plant first for the fastest return?',
      'Why are certain sections marked Unsuitable (N), and can they be fixed?',
      'What is the expected yield difference between my S1 and S2 land?',
    ],
  },

  slope: {
    label: 'Terrain Slope & Steepness',
    plainTitle: 'How Steep or Flat Your Ground Is',
    category: 'Terrain',
    badge: 'Copernicus DEM 30m',
    whatItMeans:
      'Measures the incline or steepness of your hills in degrees. Flat ground is 0°, while steep hillsides can be over 20°.',
    whyItMatters: () =>
      `Steep slopes make heavy rain wash away topsoil and expensive fertilizers before roots can absorb them. Tractors and machinery also tip over on steep hills, making harvesting dangerous and expensive.`,
    classesGuide: [
      { code: 'S1', name: 'Flat to Gentle (0° – 8°)', color: '#2e7d32', text: 'Ideal. Farm vehicles and harvesters move freely. Rainwater soaks straight into the roots without washing away topsoil.' },
      { code: 'S2', name: 'Moderate Incline (8° – 16°)', color: '#7cb342', text: 'Gentle rolling hills. Suitable for planting, but plant along contour lines to prevent rainwater wash-off.' },
      { code: 'S3', name: 'Steep Hillside (16° – 25°)', color: '#fbc02d', text: 'Steep. High risk of severe soil erosion. Requires mechanical terracing, contour trenches, and manual harvesting.' },
      { code: 'N', name: 'Severe Slope (> 25°)', color: '#c62828', text: 'Too steep for safe farming. Extreme erosion and landslide hazard. Keep this under natural forest cover.' },
    ],
    farmerAdvice:
      'On slopes over 8°, establish leguminous cover crops (like Mucuna bracteata) immediately after clearing to bind the topsoil. On slopes over 12°, dig contour silt trenches to catch rainwater and runoff fertilizer.',
    farmerQuestions: [
      'How do I build contour terraces on the steeper parts of this farm?',
      'Can farm tractors and harvest carts safely drive on this slope?',
      'How much topsoil and fertilizer will I lose if I do not terrace my hills?',
    ],
  },

  elevation: {
    label: 'Height Above Sea Level',
    plainTitle: 'Altitude & Cooling Effect',
    category: 'Terrain',
    badge: '30m DEM',
    whatItMeans:
      'Measures how many meters your land sits above sea level. Higher altitudes are naturally cooler and windier.',
    whyItMatters: () =>
      `Tropical crops like oil palm and cocoa thrive in warm, humid lowlands. As altitude rises, chilly night temperatures slow down vegetative growth, delay flowering, and reduce fruit bunch size.`,
    classesGuide: [
      { code: 'Low', name: 'Warm Lowlands (< 400 m)', color: '#2e7d32', text: 'Warm, humid tropical climate. Fast vegetative growth, high pollination rates, and rapid fruit ripening.' },
      { code: 'Mid', name: 'Mid-Altitude (400 m – 700 m)', color: '#7cb342', text: 'Slightly cooler nights. Growth is steady, but maturity and first commercial harvest may be delayed by 4–6 months.' },
      { code: 'High', name: 'Highlands (> 700 m)', color: '#fbc02d', text: 'Cool mountain air. Commercial yields for lowland tropical crops are stunted. Better suited for highland crops (tea or coffee).' },
    ],
    farmerAdvice:
      'If planting near the upper altitude limits, choose cold-tolerant seedlings and avoid frost hollows or exposed ridge crests with high desiccating winds.',
    farmerQuestions: [
      'Will cold night temperatures at this elevation delay my first harvest?',
      'Are there varieties of this crop bred specifically for higher elevations?',
      'How does wind exposure on these hills affect young seedlings?',
    ],
  },

  rainfall: {
    label: 'Annual Rainfall Volume',
    plainTitle: 'Yearly Rain Supply',
    category: 'Climate',
    badge: 'NASA POWER',
    whatItMeans:
      'The total volume of rainwater that falls on your fields across a 12-month period, calculated from 30 years of satellite and weather records.',
    whyItMatters: () =>
      `Water is the primary fuel for crop growth. If annual rainfall is insufficient, trees abort flowers, produce small empty bunches, and suffer stunted root development.`,
    classesGuide: [
      { code: 'S1', name: 'Abundant Rain (> 2,000 mm)', color: '#2e7d32', text: 'Plentiful moisture for maximum yields. Keep field drainage channels clear to prevent waterlogging during the wet peak.' },
      { code: 'S2', name: 'Sufficient Rain (1,500 – 2,000 mm)', color: '#7cb342', text: 'Good rain supply. Yields are solid as long as the rainfall is evenly spread across the months.' },
      { code: 'S3', name: 'Marginal Rain (1,200 – 1,500 mm)', color: '#fbc02d', text: 'Water-deficit zone. Trees will suffer periodic drought stress. Mulching with organic matter is essential.' },
      { code: 'N', name: 'Deficit (< 1,200 mm)', color: '#c62828', text: 'Too dry for rain-fed commercial production. Requires an artificial drip or furrow irrigation system.' },
    ],
    farmerAdvice:
      'In areas with moderate or low rainfall, recycle organic matter (like empty fruit bunches or pruned fronds) around the weeded weeding circle of each tree to retain soil moisture.',
    farmerQuestions: [
      'Do I need to install an irrigation system for this crop with this rainfall?',
      'How many months of the year will my trees be under water stress?',
      'What cover crops retain the most soil moisture in this rainfall zone?',
    ],
  },

  dry_season: {
    label: 'Dry Season Duration',
    plainTitle: 'Months with Rain Shortage',
    category: 'Climate',
    badge: 'NASA POWER',
    whatItMeans:
      'The number of consecutive months where less than 100 mm of rain falls. During these months, the hot sun evaporates more water from the ground than rain puts back in.',
    whyItMatters: () =>
      `A prolonged dry spell triggers leaf desiccation, flower abortion, and sudden yield collapse 8 to 12 months later when the aborted flowers would have become harvestable fruit.`,
    classesGuide: [
      { code: 'S1', name: 'Short or No Dry Season (0 – 2 months)', color: '#2e7d32', text: 'Ideal. Continuous growth and uniform monthly harvest rounds throughout the year.' },
      { code: 'S2', name: 'Moderate Dry Spell (2 – 3.5 months)', color: '#7cb342', text: 'Standard tropical dry season. Manageable with proper weed control and moisture mulching.' },
      { code: 'S3', name: 'Extended Dry Spell (3.5 – 5 months)', color: '#fbc02d', text: 'Severe drought stress. Palms will produce a sharp seasonal yield trough. Mulching is mandatory.' },
      { code: 'N', name: 'Extreme Drought (> 5 months)', color: '#c62828', text: 'Arid dry spell. Young seedlings will wither and die without irrigation.' },
    ],
    farmerAdvice:
      'During dry months, cease all herbicide ring-weeding so exposed bare soil does not bake in the sun. Layer cut palm fronds or crop residues around tree bases to keep roots cool.',
    farmerQuestions: [
      'How much yield will I lose during the dry season without irrigation?',
      'When is the best month to plant seedlings so they develop deep roots before the dry spell?',
      'Does mulching with empty fruit bunches (EFB) protect young trees from drought?',
    ],
  },

  temperature: {
    label: 'Average Air Temperature',
    plainTitle: 'Year-Round Heat & Growing Conditions',
    category: 'Climate',
    badge: 'NASA POWER',
    whatItMeans:
      'The average daily temperature of the air throughout the farming year.',
    whyItMatters: () =>
      `Controls photosynthesis and vegetative metabolism. Extreme heat burns pollen and blossoms; cold air locks plant respiration.`,
    classesGuide: [
      { code: 'S1', name: 'Optimal Warmth (25°C – 28°C)', color: '#2e7d32', text: 'Perfect tropical warmth. Maximum photosynthesis, healthy frond production, and active pollinating weevils.' },
      { code: 'S2', name: 'Slightly Cool or Warm (22°C – 25°C / 28°C – 31°C)', color: '#7cb342', text: 'Acceptable. Slight seasonal slowing of fruit ripening.' },
      { code: 'S3', name: 'Sub-Optimal (20°C – 22°C / 31°C – 33°C)', color: '#fbc02d', text: 'Thermal stress. Pollination rates drop, requiring insect-attracting habitat strips.' },
      { code: 'N', name: 'Extreme Heat or Cold (< 20°C or > 34°C)', color: '#c62828', text: 'Unfavorable. Severe heat scorch or cold dormancy.' },
    ],
    farmerAdvice:
      'In hot zones, maintain inter-row vegetation covers to lower soil surface temperatures by up to 4°C compared to bare soil.',
    farmerQuestions: [
      'Will high midday heat scorch newly transplanted seedlings?',
      'Does temperature affect my pollinating weevils or bees in this area?',
    ],
  },

  soil_ph: {
    label: 'Soil Acidity & Chemistry',
    plainTitle: 'Soil Acidity (Sour vs Sweet Ground)',
    category: 'Soil',
    badge: 'ISRIC SoilGrids 250m',
    whatItMeans:
      'Measures whether your soil is sour (acidic, low pH) or sweet (alkaline, high pH). Tested across the top 0–30 cm root zone.',
    whyItMatters: () =>
      `In highly sour soil (pH below 4.5), expensive chemical fertilizers become chemically locked to soil clay particles. The roots cannot absorb phosphorus or nitrogen, starving the crop even if you apply bags of fertilizer.`,
    classesGuide: [
      { code: 'S1', name: 'Optimal Acidity (pH 5.0 – 6.5)', color: '#2e7d32', text: 'The sweet spot. Applied fertilizers dissolve easily into soil moisture and are greedily absorbed by roots.' },
      { code: 'S2', name: 'Mild Acidity (pH 4.5 – 5.0 / 6.5 – 7.0)', color: '#7cb342', text: 'Mildly sour. Standard agricultural practice with routine rock phosphate fertilization works well.' },
      { code: 'S3', name: 'Strong Acidity (pH 4.0 – 4.5)', color: '#fbc02d', text: 'Very sour. Fertilizer efficiency drops by 40%. Requires applying agricultural dolomite or lime.' },
      { code: 'N', name: 'Extreme Acid or Alkaline (< 4.0 or > 8.0)', color: '#c62828', text: 'Severely toxic soil. High aluminum toxicity burns root tips. Requires massive soil reclamation.' },
    ],
    farmerAdvice:
      'If your soil pH is below 4.8, broadcast 1 to 2 tonnes of ground agricultural limestone (calcium carbonate) or dolomite per hectare prior to planting to neutralize acidity and free up phosphorus.',
    farmerQuestions: [
      'How many bags of agricultural lime do I need to apply per hectare to fix this pH?',
      'Can I apply rock phosphate directly to this acidic soil?',
      'Will low soil pH cause yellowing fronds on young trees?',
    ],
  },

  flood_frequency: {
    label: 'Flood & Waterlogging Risk',
    plainTitle: 'Standing Water & Swamp Danger',
    category: 'Water',
    badge: 'JRC Global Surface Water',
    whatItMeans:
      'Historical satellite radar tracking how often this exact patch of land is submerged under standing floodwater over multiple rainy seasons.',
    whyItMatters: () =>
      `Tree roots breathe oxygen from soil pores. When land stays submerged for more than a few days, roots suffocate, rot sets in, fronds turn pale yellow, and the crop dies.`,
    classesGuide: [
      { code: 'S1', name: 'Well Drained (0% – 5% flood occurrence)', color: '#2e7d32', text: 'Safe, well-aerated soil. Roots breathe freely and grow deep into the subsoil.' },
      { code: 'S2', name: 'Occasional Puddles (5% – 15%)', color: '#7cb342', text: 'Temporary seasonal puddles during heavy monsoon rains. Easily fixed with shallow field collection ditches.' },
      { code: 'S3', name: 'Seasonal Waterlogging (15% – 30%)', color: '#fbc02d', text: 'Prone to standing water for weeks. Requires deep mechanical drainage canals and raised planting mounds.' },
      { code: 'N', name: 'Permanent Swamp (> 30%)', color: '#c62828', text: 'Chronic marshland or wetland. Unsuited for terrestrial tree crops. Roots will rot. Only suited for wetland rice.' },
    ],
    farmerAdvice:
      'Dig field drains (1 m deep by 1 m wide) every 4 planting rows leading into natural drainage creeks before planting in any areas marked S2 or S3.',
    farmerQuestions: [
      'Where should I position main drainage canals to drain floodwater off this block?',
      'Can tree crops survive if floodwater stays for two weeks during the rainy season?',
      'How deep should collection ditches be dug in these waterlogged zones?',
    ],
  },

  distance_to_water: {
    label: 'Proximity to Water Bodies',
    plainTitle: 'Distance to Rivers & Streams',
    category: 'Water',
    badge: 'Surface Water Proximity',
    whatItMeans:
      'Measures the direct distance in meters from each point to the nearest permanent river, creek, or natural lake.',
    whyItMatters: () =>
      `Being close to water provides convenient supply for spray tanks and nursery watering, but land right next to riverbanks is legally protected from clearing to prevent river siltation and pollution.`,
    classesGuide: [
      { code: 'N', name: 'Riparian Buffer Zone (< 50 m)', color: '#c62828', text: '⚠️ Mandatory Non-Clearing Zone! Environmental laws forbid clearing trees or spraying agrochemicals within 50 m of streams.' },
      { code: 'S1', name: 'Convenient Access (50 m – 1.5 km)', color: '#2e7d32', text: 'Ideal. Easy water pumping for nursery seedlings, tractor spray rigs, and farm worker camps.' },
      { code: 'S2', name: 'Moderate Distance (1.5 km – 4 km)', color: '#7cb342', text: 'Manageable. Water must be transported by bowser cart for crop protection spraying.' },
      { code: 'S3', name: 'Far from Surface Water (> 4 km)', color: '#fbc02d', text: 'Distant. Requires drilling deep boreholes and installing overhead storage tanks for farm water needs.' },
    ],
    farmerAdvice:
      'Leave a mandatory 50-meter buffer of native trees along all streams. Never apply chemical herbicides or chemical fertilizers within this riparian corridor to prevent polluting downstream drinking water.',
    farmerQuestions: [
      'What are the exact legal rules for planting near rivers and stream banks?',
      'Can I pump water directly from the nearby stream for my nursery seedlings?',
    ],
  },

  land_cover: {
    label: 'Current Land Cover (2021)',
    plainTitle: 'What is Currently on the Ground',
    category: 'Vegetation',
    badge: 'ESA WorldCover 10m',
    whatItMeans:
      'High-resolution satellite camera mapping showing the exact existing vegetation on your land: forest trees, existing cropland, open grassland, buildings, or water.',
    whyItMatters: () =>
      `Tells you what you need to clear before planting, whether neighbor farmlands or access roads border your blocks, and helps estimate mechanical land clearing costs per hectare.`,
    classesGuide: [
      { code: 'Tree', name: 'Dense Tree Canopy', color: '#1b5e20', text: 'Woodland or tree cover. Check EUDR forest loss history before clearing!' },
      { code: 'Cropland', name: 'Existing Farmland', color: '#ffd54f', text: 'Previously farmed land. Easy and cheap to clear, but check whether old crop diseases remain in the soil.' },
      { code: 'Shrub', name: 'Shrub & Grassland', color: '#aed581', text: 'Open grassland or brush. Fast, low-cost mechanical clearing with tractor slashers.' },
      { code: 'Built-up', name: 'Settlement & Roads', color: '#757575', text: 'Villages, roads, and farm buildings. Excluded from planting.' },
      { code: 'Water', name: 'Open Water', color: '#1e88e5', text: 'Ponds, lakes, and rivers. Excluded from planting.' },
    ],
    farmerAdvice:
      'Prioritize planting on existing degraded shrub and grasslands (light green) first to minimize mechanical clearing costs and avoid deforestation scrutiny.',
    farmerQuestions: [
      'How much will it cost to clear dense trees compared to open shrubland?',
      'Are there existing roads visible on this land cover map to haul harvested crops?',
    ],
  },

  forest_loss: {
    label: 'EUDR Forest Loss (Post-2020)',
    plainTitle: 'Deforestation Legal Warning (Post-2020)',
    category: 'Regulatory',
    badge: 'Hansen GFC 2024 v1.12',
    whatItMeans:
      'Detects whether any natural forest or tree canopy was cleared or burned after December 31, 2020.',
    whyItMatters: () =>
      `🚨 CRITICAL EXPORT WARNING: Under the European Union Deforestation Regulation (EUDR) and international sustainability standards, agricultural products harvested from land deforested after 2020 CANNOT be exported to Europe or sold to certified international buyers.`,
    classesGuide: [
      { code: 'Clean', name: 'No Deforestation After 2020', color: '#2e7d32', text: '100% compliant. Safe for international export, bank loans, and sustainability certifications.' },
      { code: 'Alert', name: 'Tree Cover Cut After 2020', color: '#c62828', text: '🛑 High Compliance Risk! Satellite recorded tree canopy loss after 2020. Products from these red pixels face export bans and buyer rejections.' },
    ],
    farmerAdvice:
      'Do not plant export crops on the red pixels. If these areas were cleared legally for non-forest purposes (e.g., replanting old rubber or brownfield palms), gather documented proof and historical land titles to defend your EUDR due diligence statement.',
    farmerQuestions: [
      'Will European buyers reject my harvest if I plant on these red parcels?',
      'How can I prove to an EU buyer that my land was not natural forest in 2020?',
      'What documents do I need to prepare for an EUDR Due Diligence Statement?',
    ],
  },

  protected_exclusion: {
    label: 'Protected Nature Reserves',
    plainTitle: 'Protected Wildlife & Forest Reserves',
    category: 'Regulatory',
    badge: 'WDPA & Community Reserves',
    whatItMeans:
      'Boundaries of official government national parks (such as Okomu National Park), statutory forest reserves, and community-protected nature sanctuaries.',
    whyItMatters: () =>
      `Cultivating inside statutory reserves is illegal, leads to immediate government eviction, criminal prosecution, and total forfeiture of planted crops.`,
    classesGuide: [
      { code: 'Outside', name: 'Outside Protected Zones', color: '#2e7d32', text: 'Legally eligible for private land leasing, community partnership, and agricultural titling.' },
      { code: 'Inside', name: 'Inside Protected Reserve', color: '#c62828', text: '⛔ Strictly Forbidden! Land overlaps protected ecological boundaries. Automatically cut out of your field analysis.' },
    ],
    farmerAdvice:
      'Ensure all physical boundary boundary pillars are verified with government survey beacons to ensure field operations never encroach into neighboring national parks.',
    farmerQuestions: [
      'Are any of my boundary lines touching official government forest reserves?',
      'How close to a national park boundary can I legally plant my crop?',
    ],
  },
};

/** Get the explanation object for any layer key, with fallback */
export function getFarmerLayerExplanation(layerKey, cropName = 'your crop') {
  const info = FARMER_LAYER_EXPLANATIONS[layerKey] || FARMER_LAYER_EXPLANATIONS.final_class;
  return {
    ...info,
    whyItMatters: typeof info.whyItMatters === 'function' ? info.whyItMatters(cropName) : info.whyItMatters,
  };
}
