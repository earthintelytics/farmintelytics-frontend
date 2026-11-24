/**
 * Climate of the frontline states for the GWON charts: ERA5 reanalysis through the Open-Meteo archive (free, open,
 * no key), read at one point inside each state (its lat/lon in frontline_states.geojson). Daily rainfall, highest
 * temperature and reference evaporation from 1 January last year to five days ago (ERA5 is published a few days late).
 * Only what the source gives: nothing is filled in or smoothed.
 */
const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';
const iso = (d) => d.toISOString().slice(0, 10);

export async function fetchClimate(states) {
  const feats = states?.features || [];
  if (!feats.length) return {};
  const today = new Date();
  const end = new Date(today); end.setUTCDate(end.getUTCDate() - 5);
  const start = `${today.getUTCFullYear() - 1}-01-01`;
  const q = new URLSearchParams({
    latitude: feats.map((f) => f.properties.lat).join(','),
    longitude: feats.map((f) => f.properties.lon).join(','),
    start_date: start, end_date: iso(end),
    daily: 'precipitation_sum,temperature_2m_max,et0_fao_evapotranspiration',
    timezone: 'Africa/Lagos',
  });
  const res = await fetch(`${ARCHIVE}?${q}`);
  if (!res.ok) throw new Error('Climate data could not be loaded just now.');
  const body = await res.json();
  const list = Array.isArray(body) ? body : [body];
  const out = {};
  feats.forEach((f, i) => { out[f.properties.state] = list[i]?.daily || null; });
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export { MONTHS };

/** Monthly totals (rain, evaporation) and monthly mean of the daily highs, for one year of one state's daily series. */
export function monthly(daily, year) {
  const rows = MONTHS.map((m) => ({ month: m, rain: 0, et0: 0, tmaxSum: 0, days: 0 }));
  if (!daily) return rows.map(() => null);
  daily.time.forEach((t, i) => {
    if (Number(t.slice(0, 4)) !== year) return;
    const r = rows[Number(t.slice(5, 7)) - 1];
    if (daily.precipitation_sum[i] != null) r.rain += daily.precipitation_sum[i];
    if (daily.et0_fao_evapotranspiration[i] != null) r.et0 += daily.et0_fao_evapotranspiration[i];
    if (daily.temperature_2m_max[i] != null) { r.tmaxSum += daily.temperature_2m_max[i]; r.days += 1; }
  });
  return rows.map((r) => (r.days ? { month: r.month, rain: r.rain, et0: r.et0, tmax: r.tmaxSum / r.days, days: r.days } : null));
}

/** Rain so far this year, and over the same days last year (the fair comparison). */
export function rainToDate(daily) {
  if (!daily) return null;
  const last = daily.time[daily.time.length - 1];
  const year = Number(last.slice(0, 4));
  const cut = last.slice(5);
  let now = 0, before = 0;
  daily.time.forEach((t, i) => {
    const v = daily.precipitation_sum[i] || 0;
    if (Number(t.slice(0, 4)) === year) now += v;
    else if (Number(t.slice(0, 4)) === year - 1 && t.slice(5) <= cut) before += v;
  });
  return { year, until: last, now, before, change: before ? ((now - before) / before) * 100 : null };
}
