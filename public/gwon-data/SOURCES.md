Frontline-state boundaries: geoBoundaries NGA ADM1 (gbOpen, CC BY 4.0), simplified for display. Areas computed on Africa Albers Equal Area (ESRI:102022) from the unsimplified boundaries. lat/lon: a point inside each state (shapely representative point), where the climate charts read ERA5 (Open-Meteo archive).
climate_series.json: ERA5 via the Open-Meteo archive, 2015 to five days before it was made (scripts/gwon_climate_series.py).
landuse_series.json: ESA CCI Land Cover, annual 300 m, 2000-2020, via Microsoft Planetary Computer, per state with true pixel areas (scripts/gwon_landcover_series.py).

nigeria_states.geojson and admin/lgas_*.geojson: OCHA common operational datasets, Nigeria administrative boundaries (COD-AB, admin 1 and 2, CC BY-IGO), via HDX, simplified for display.
admin/wards_*.geojson: GRID3 NGA Operational Wards (CC BY-SA 4.0), via HDX, simplified for display.
naggw-seal.png, naggw-logo-*.png: the National Agency for the Great Green Wall's own logo, from ggwnigeria.gov.ng, used on the platform built for the Agency.
Map layers: NASA GIBS (MODIS, VIIRS, SMAP, IMERG, GPW, SEDAC Natural Disaster Hotspots; public domain); Global Forest Change v1.12 (Hansen/UMD/Google/USGS/NASA, CC BY 4.0); World Database on Protected Areas (UNEP-WCMC and IUCN, non-commercial terms of use).
drought_indices.json: ERA5 via the Open-Meteo archive, monthly 1991 to now, SPI and SPEI per WMO-No. 1090 and Vicente-Serrano et al. 2010 (scripts/gwon_drought_indices.py).
climate_projections.json: World Bank Climate Change Knowledge Portal, CMIP6 0.25 degree ensemble (scripts/gwon_projections.py).
socioeconomic.json: OCHA COD-PS Nigeria 2022; Global MPI (OPHI/UNDP), DHS 2024; IOM DTM rounds 43 (North-east) and 13 (North-central and North-west) (scripts/gwon_socioeconomic.py).
Advisor, live: Open-Meteo forecast and ECMWF SEAS5 seasonal forecast, fetched by the reader's browser.
admin/people_*.json: WorldPop 2020 population (1 km, UN-adjusted, CC BY 4.0) summed over each LGA and ward; IOM DTM displacement by LGA (OCHA code) and ward (scripts/gwon_people_drilldown.py).
cropland_series.json: ESA CCI Land Cover cropland classes (10/11, 12, 20, 30, 40), per state, 2000-2020 (scripts/gwon_cropland_series.py).
stac/: the STAC 1.0.0 catalogue of these files (scripts/gwon_stac.py). Soil layers: SoilGrids 2.0, ISRIC (CC BY 4.0), live WMS.
photos/: nine photographs from the frontline states and the Sahel, from Wikimedia Commons (CC BY-SA 4.0, CC BY 4.0, CC BY 2.0); authors, licences and links in photos/credits.json and under "Photo credits" on the GWON home page.
