import L from 'leaflet';

/** Canonical Plot ID of a GeoJSON feature. */
export const plotIdOf = (feature) => {
  const p = feature?.properties || {};
  return p.Plot_ID || p.plot_id || p.PlotID || p.PlotNb || p.plot_number || p.unique_id || p.name || null;
};

/** Dynamic Site/Estate identifier derived from feature properties or Plot ID prefix. */
export const siteIdOf = (feature) => {
  const p = feature?.properties || {};
  const rawSite = String(p.IdSite || p.site_id || p.Estate || p.estate || p.Location || p.location || p.subfarm || '').trim();
  if (rawSite) return rawSite;
  const pid = String(plotIdOf(feature) || '').trim();
  if (pid.includes('-')) return pid.split('-')[0];
  return 'Main Estate';
};

/** Dynamic Estate display name for a feature. */
export const estateNameOf = (feature) => {
  const p = feature?.properties || {};
  const explicit = String(p.Estate || p.estate || p.Location || p.location || p.subfarm || '').trim();
  if (explicit) return explicit;
  return siteIdOf(feature) || 'Main Estate';
};

/** Build dynamic { name -> { id, name, center, zoom, plotCount } } map from GeoJSON polygons. */
export function extractEstates(geoData) {
  const features = geoData?.features || [];
  if (!features.length) return { list: [], byName: {} };

  const buckets = new Map();
  for (const f of features) {
    const name = estateNameOf(f);
    const id = siteIdOf(f);
    if (!buckets.has(name)) buckets.set(name, { id, name, features: [] });
    buckets.get(name).features.push(f);
  }

  const list = [];
  const byName = {};
  for (const b of buckets.values()) {
    let center = null;
    try {
      const bounds = L.geoJSON({ type: 'FeatureCollection', features: b.features }).getBounds();
      if (bounds.isValid()) {
        const c = bounds.getCenter();
        center = [Number(c.lat.toFixed(5)), Number(c.lng.toFixed(5))];
      }
    } catch {
      center = null;
    }
    const meta = {
      id: b.id,
      name: b.name,
      center: center || [6.44, 5.23],
      zoom: 13,
      plotCount: b.features.length,
    };
    list.push(meta);
    byName[b.name] = meta;
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return { list, byName };
}

/** Backwards-compatible fallback lookup (populated dynamically per loaded tenant). */
export const ESTATE_COORDS = {};
