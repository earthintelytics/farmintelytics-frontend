/**
 * GWON's glossary: every term, index and source the platform uses, in plain words, searchable and grouped.
 */
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

const TERMS = [
  // Vegetation and land
  ['Vegetation and land', 'NDVI (Normalized Difference Vegetation Index)', 'How green the land is, from how plants reflect red and near-infrared light. About 0 is bare ground or water, 0.2 to 0.4 sparse grass and shrubs, above 0.6 dense green vegetation. GWON uses NASA MODIS 16-day pictures at 250 m.'],
  ['Vegetation and land', 'EVI (Enhanced Vegetation Index)', 'A vegetation index like NDVI, corrected for haze and soil background, so it stays useful over very sparse and very dense cover. MODIS, 16-day, 250 m.'],
  ['Vegetation and land', 'Net photosynthesis', 'The carbon plants take up over 8 days, minus what they breathe out (MODIS, 500 m): where vegetation is actually growing.'],
  ['Vegetation and land', 'Land cover', 'What covers the ground: tree cover, shrubland, grassland, cropland, sparse vegetation, bare land, built-up, water. GWON uses ESA CCI (300 m, yearly 2000-2020) for the trends and MODIS IGBP (500 m) on the map.'],
  ['Vegetation and land', 'Tree cover loss', 'Places where tree cover was removed or died between 2001 and 2024, at 30 m (Global Forest Change, University of Maryland). Loss is not the same as deforestation: it includes fire and dieback.'],
  ['Vegetation and land', 'Protected area', 'Land set aside by law for nature: national parks, game and forest reserves. From the World Database on Protected Areas (UNEP-WCMC and IUCN).'],
  ['Vegetation and land', 'Land degradation', 'A lasting fall in the land’s ability to grow plants and hold water and soil. The UNCCD measures it with three sub-indicators: land cover, land productivity and soil organic carbon.'],
  // Water and climate
  ['Water and climate', 'ERA5', 'The European Centre for Medium-Range Weather Forecasts’ reanalysis: hourly weather for the whole world since 1940, rebuilt from observations with a weather model. GWON reads it through the Open-Meteo archive at one point inside each state.'],
  ['Water and climate', 'ET0 (reference evapotranspiration)', 'The water a well-watered short grass would lose to the air in a day (FAO-56 method), from temperature, sun, wind and humidity. It is the air’s demand for water.'],
  ['Water and climate', 'Water balance (rain minus ET0)', 'Rain minus the air’s demand. Below zero, plants live on the water already in the soil.'],
  ['Water and climate', 'Aridity index', 'A year’s rain divided by its reference evaporation. Under 0.05 hyper-arid, 0.05 to 0.2 arid, 0.2 to 0.5 semi-arid, 0.5 to 0.65 dry sub-humid (UNEP classes).'],
  ['Water and climate', 'Soil moisture', 'Water held in the soil, in cubic metres of water per cubic metre of soil. GWON shows NASA SMAP (root zone, 9 km) on the map and ERA5 topsoil (0-7 cm) in the charts.'],
  ['Water and climate', 'Hot day', 'In GWON, a day with a highest temperature of 40 °C or more (35 °C in the CMIP6 "days over 35 °C" series).'],
  ['Water and climate', 'Dry spell', 'A run of days with under 1 mm of rain. GWON reports the longest one in the rainy season (May to September); a long dry spell after planting kills seedlings.'],
  ['Water and climate', 'Rainfall rate', 'How hard it is raining, in millimetres an hour, from NASA GPM IMERG (about 10 km, every half hour, shown per day).'],
  // Drought indices
  ['Drought indices', 'SPI (Standardized Precipitation Index)', 'How unusual the rain of the last 1, 3, 6 or 12 months is against the same months in 1991-2020, as a standard score: 0 is normal, -1 moderately dry, -1.5 severely dry, -2 extremely dry (McKee and others, 1993; WMO, 2012).'],
  ['Drought indices', 'SPEI (Standardized Precipitation-Evapotranspiration Index)', 'Like SPI, but on rain minus the air’s demand (ET0), so hotter years show as drier (Vicente-Serrano and others, 2010). The same classes as SPI.'],
  ['Drought indices', 'Timescale (1, 3, 6, 12 months)', 'How many months an index adds up. 1 and 3 months: the season, crops and seedlings. 6 months: the whole rainy season. 12 months: long droughts, groundwater and wells.'],
  ['Drought indices', 'Percent of normal', 'A month’s rain as a percent of its 1991-2020 mean. Easy to read, but in the dry season a few millimetres can give very large or small percents.'],
  ['Drought indices', 'Rainfall decile', 'Where a month’s rain ranks among the same month in 1991-2020: decile 1 is among the driest tenth, decile 10 the wettest (Gibbs and Maher, 1967).'],
  ['Drought indices', 'Baseline (1991-2020)', 'The thirty years every index is compared with, the World Meteorological Organization’s standard climate normal period.'],
  ['Drought indices', 'Drought hazard (1980-2000)', 'How often drought struck each place in 1980-2000, from NASA SEDAC’s Natural Disaster Hotspots: long-term exposure, not this year’s drought.'],
  // Climate futures
  ['Climate futures', 'CMIP6', 'The sixth Coupled Model Intercomparison Project: the set of climate model runs behind the IPCC’s Sixth Assessment Report.'],
  ['Climate futures', 'SSP (Shared Socioeconomic Pathway)', 'A storyline of how the world develops and how much it emits. SSP1-2.6 low emissions, SSP2-4.5 middle, SSP3-7.0 high, SSP5-8.5 very high. The number after the dash is the extra warming force by 2100, in watts per square metre.'],
  ['Climate futures', 'Ensemble, median and percentiles', 'Many models run for the same scenario. The median is the middle model; the 10th to 90th percentile range holds the middle 80% of them. A wide range means the models disagree.'],
  ['Climate futures', 'Reference period (1995-2014)', 'The last twenty years of the models’ historical runs: changes are shown against it.'],
  ['Climate futures', 'HighResMIP', 'High-resolution CMIP6 models (about 20 to 50 km). GWON shows them for each state to 2050, to see how far single models differ.'],
  // People
  ['People', 'MPI (Multidimensional Poverty Index)', 'Poverty counted by what people lack in health, education and living standards, not only income (OPHI and UNDP). Headcount: the share of people poor; intensity: how many deprivations they have on average.'],
  ['People', 'Severe poverty', 'People deprived in at least half of the weighted MPI indicators.'],
  ['People', 'IDP (internally displaced person)', 'Someone forced from home who has not crossed an international border. GWON counts them from IOM’s Displacement Tracking Matrix site assessments.'],
  ['People', 'Population (COD-PS)', 'OCHA’s common population statistics for Nigeria (2022), by state, sex and age, based on National Population Commission figures.'],
  ['People', 'Night lights', 'Light seen from space at night (NASA Black Marble, 2016): towns, villages, roads and markets. Often used as a sign of economic activity.'],
  // Places and maps
  ['Places and maps', 'Frontline states', 'The eleven northern states of the Great Green Wall in Nigeria: Adamawa, Bauchi, Borno, Gombe, Jigawa, Kano, Katsina, Kebbi, Sokoto, Yobe and Zamfara.'],
  ['Places and maps', 'LGA (Local Government Area)', 'The level of government under the state. Nigeria has 774. GWON uses OCHA’s common boundaries.'],
  ['Places and maps', 'Ward', 'The smallest administrative area, under the LGA. GWON uses GRID3’s operational ward boundaries.'],
  ['Places and maps', 'Fire or hot spot', 'A place much hotter than its surroundings when MODIS passed over (about 1 km): usually a fire, sometimes a flare or hot ground.'],
  ['Places and maps', 'Swipe and side-by-side compare', 'Two dates of the same map: drag the swipe line, or see them next to each other, panning and zooming together.'],
  ['Places and maps', 'Choropleth', 'A map with each area coloured by its value, such as states by drought class or by poverty.'],
  // Programme
  ['Programme', 'Great Green Wall', 'The African Union’s initiative to restore land across the Sahel, from Senegal to Djibouti. In Nigeria it is led by the National Agency for the Great Green Wall (NAGGW), set up in 2015.'],
  ['Programme', 'Harmonized Results Framework', 'The Great Green Wall Accelerator’s set of core indicators each country reports to the UNCCD every year, including land under restoration and its satellite-measured condition.'],
  ['Programme', 'ACReSAL', 'Agro-Climatic Resilience in Semi-Arid Landscapes: the Federal Government and World Bank programme restoring land and water in northern Nigeria.'],
  ['Programme', 'Survival rate', 'The share of planted trees still alive after a set time. In the scenario planner it is your own assumption, per normal and per drought year.'],
  ['Programme', 'STAC (SpatioTemporal Asset Catalog)', 'An open standard for listing geospatial data, so other systems can find and fetch GWON’s datasets.'],
];

export default function Glossary() {
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const hit = TERMS.filter(([, t, d]) => !s || t.toLowerCase().includes(s) || d.toLowerCase().includes(s));
    return [...new Set(hit.map((x) => x[0]))].map((g) => [g, hit.filter((x) => x[0] === g)]);
  }, [q]);
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 max-w-xl">
        <Search size={16} className="text-gray-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a term, e.g. SPI, ward, SSP" className="flex-1 bg-transparent text-sm outline-none" aria-label="Search the glossary" />
        <span className="text-xs text-gray-500">{groups.reduce((s, [, l]) => s + l.length, 0)} terms</span>
      </label>
      {groups.map(([g, list]) => (
        <section key={g} className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#007248] mb-3">{g}</h2>
          <dl className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
            {list.map(([, t, d]) => (
              <div key={t}><dt className="text-sm font-semibold text-gray-900">{t}</dt><dd className="text-sm text-gray-700 mt-0.5">{d}</dd></div>
            ))}
          </dl>
        </section>
      ))}
      {!groups.length && <p className="text-sm text-gray-600">No term matches “{q}”.</p>}
    </div>
  );
}
