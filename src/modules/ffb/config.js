import { API_BASE } from '../../services/apiBase';

const FFB_BASE = API_BASE.replace(/\/agromonitoring\/?$/, '/ffb');

export const CONFIG = Object.freeze({
  API_BASE_URL: FFB_BASE,

  MAP: {
    CENTER: [6.44, 5.23],
    ZOOM: 10.0,
    MIN_ZOOM: 3,
    MAX_ZOOM: 22,
    TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    TILE_ATTRIBUTION: '&copy; OpenStreetMap contributors',
    SAT_TILE_URL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    SAT_ATTRIBUTION: '&copy; Esri World Imagery',
  },

  PAGE_SIZE: 10,

  ROLE_COLORS: {
    harvesting_clerk: '#034321',
    loading_clerk: '#3F8432',
    picker: '#5AA041',
  },

  STATUS_COLORS: {
    valid: '#034321',
    warning: '#f57f17',
    error: '#c62828',
  },

  APP_NAME: 'Earthintelytics FFB Portal',
  APP_VERSION: '3.0.0',
});
