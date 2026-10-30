// The map background: a static basemap (satellite, streets, terrain, Google) or a colour composite of
// the organisation's own images, which moves with the time slider like the index layer.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../../../../services/organizationMonitorApi';

// Composite basemaps rendered from the organisation's archive, by the backend's composite id.
const COMPOSITE_BASEMAP_IDS = { 'true-color': 'true_color', 'false-color': 'false_color', 'sar-rgb': 'sar_rgb' };
// ESRI World Imagery, also shown while a composite's own tiles are loading so the map never goes blank.
const STATIC_BASEMAP_FALLBACK = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
// OpenTopoMap: ESRI's terrain base returns "Map data not yet available" tiles over much of Africa.
const TERRAIN_BASEMAP_URL = 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png';

export function useBasemap({ tenant, currentTimeline, noteLoadIssue }) {
  const [selectedBasemap, setSelectedBasemap] = useState('esri-imagery'); // satellite by default
  // Google's hybrid layer (lyrs=y) has place and road names; lyrs=s is the same imagery without them.
  const [showGoogleLabels, setShowGoogleLabels] = useState(true);
  const [compositeSliderData, setCompositeSliderData] = useState(null);
  const [showBasemapDropdown, setShowBasemapDropdown] = useState(false);
  const basemapDropdownRef = useRef(null);
  const activeComposite = COMPOSITE_BASEMAP_IDS[selectedBasemap] || null;

  // The composite's own dates and tiles while it is chosen; cleared on leaving it, so a stale
  // composite tile never lingers under a static basemap.
  useEffect(() => {
    if (!activeComposite) { setCompositeSliderData(null); return; } // eslint-disable-line react-hooks/set-state-in-effect
    let active = true;
    api.fetchCompositeSlider({ farm: tenant || 'farm_1', composite: activeComposite })
      .then(data => { if (active) setCompositeSliderData(data); })
      .catch(err => { noteLoadIssue('satellite imagery', err); if (active) setCompositeSliderData(null); });
    return () => { active = false; };
  }, [activeComposite, tenant, noteLoadIssue]);

  // Close the basemap list on a click outside it
  useEffect(() => {
    const handler = e => {
      if (basemapDropdownRef.current && !basemapDropdownRef.current.contains(e.target)) setShowBasemapDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // The composite is keyed to the same image date as the index layer, so both move together.
  const compositeTileUrl = useMemo(() => {
    if (!activeComposite || !currentTimeline || !compositeSliderData?.tiles) return null;
    return compositeSliderData.tiles[currentTimeline.date] || null;
  }, [activeComposite, compositeSliderData, currentTimeline]);

  const basemapUrl = useMemo(() => {
    if (activeComposite) return compositeTileUrl || STATIC_BASEMAP_FALLBACK;
    if (selectedBasemap === 'terrain') return TERRAIN_BASEMAP_URL;
    if (selectedBasemap === 'osm-streets') return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    if (selectedBasemap === 'google-hybrid') return `https://mt1.google.com/vt/lyrs=${showGoogleLabels ? 'y' : 's'}&x={x}&y={y}&z={z}`;
    return STATIC_BASEMAP_FALLBACK;
  }, [selectedBasemap, activeComposite, compositeTileUrl, showGoogleLabels]);

  // Credit for whichever background is showing (docs/DATA_SOURCES.md, credits).
  const basemapAttribution = activeComposite ? `Contains modified Copernicus Sentinel data ${new Date().getFullYear()}`
    : selectedBasemap === 'google-hybrid' ? 'Imagery © Google'
      : selectedBasemap === 'terrain' ? 'Map data © OpenStreetMap contributors, SRTM · Map style © OpenTopoMap (CC-BY-SA)'
        : selectedBasemap === 'osm-streets' ? '© OpenStreetMap contributors'
          : 'Imagery © Esri, Maxar, Earthstar Geographics';
  // OpenTopoMap's real tiles stop at zoom 17 and OpenStreetMap's at 19; the satellite sources at 18.
  const basemapMaxNativeZoom = !activeComposite && selectedBasemap === 'terrain' ? 17
    : !activeComposite && selectedBasemap === 'osm-streets' ? 19 : 18;

  return {
    selectedBasemap, setSelectedBasemap, showGoogleLabels, setShowGoogleLabels, activeComposite, compositeTileUrl,
    showBasemapDropdown, setShowBasemapDropdown, basemapDropdownRef, basemapUrl, basemapAttribution, basemapMaxNativeZoom,
  };
}
