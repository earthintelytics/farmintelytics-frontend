# Alternative Landing Imagery: Sentinel-2 True-Colour Mosaic (T54)

## Overview
This directory contains a static, cloud-free Sentinel-2 true-colour alternative to the default Esri World Imagery hero background on the Farmintelytics landing page.

- **Sensor:** Copernicus Sentinel-2C MSI (Level-2A Bottom of Atmosphere Surface Reflectance)
- **Granule:** `S2C_32PMU_20260322_0_L2A`
- **Acquisition Date:** 22 March 2026 (Dry Season, 0.34% cloud cover)
- **Location:** Kura, Kano State, Nigeria (Kano River Irrigation Project - KRIP)
- **Coordinates:**
  - Latitude: 11.722° N to 11.738° N
  - Longitude: 8.426° E to 8.470° E
  - EPSG: 32632 (UTM Zone 32N) / 3857 (Web Mercator)
- **Data Status:** Public domain open geospatial data, no confidential or client farm boundaries.
- **Required Attribution:**
  > "Contains modified Copernicus Sentinel data 2026"

---

## Tile Structure
- Zoom Level: `16`
- Columns ($X$): `34302`, `34303`, `34304`, `34305`, `34306`, `34307`, `34308`, `34309` (8 tiles)
- Rows ($Y$): `30616`, `30617`, `30618` (3 tiles)
- Tile Size: 256 x 256 px
- Total Mosaic Size: 2048 x 768 px

Path format supported:
- Standard slippy map: `/landing/tiles/16/{y}/{x}.jpg`
- Direct z/y/x: `/landing/16/{y}/{x}.jpg`
- Single full mosaic image: `/landing/mosaic.jpg` or `/landing/sentinel2_kura_kano_mosaic.jpg`

---

## 1-Line Switch in Landing Page
To switch the landing page from Esri imagery to our Copernicus Sentinel-2 mosaic, change one line in `src/pages/landing/components/HeroBackdrop.jsx`:

```diff
- const tile = (x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${Z}/${y}/${x}`;
+ const tile = (x, y) => `/landing/tiles/${Z}/${y}/${x}.jpg`;
```

And update the credit paragraph at the bottom of the component:
```diff
- <p className="absolute bottom-2 right-3 text-[11px] text-white/90">Imagery © Esri, Maxar, Earthstar Geographics</p>
+ <p className="absolute bottom-2 right-3 text-[11px] text-white/90">Contains modified Copernicus Sentinel data 2026</p>
```
