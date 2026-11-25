/**
 * "All frontline states" for GWON's state filter: the climate series averaged over the eleven states (the mean of
 * their points), and the land types added up over them. A single state uses its own series unchanged.
 */
const mean = (xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

/** The mean of the states' series (climate_series.json), in the same shape as one state's. */
export function averageSeries(states) {
  const list = Object.values(states || {});
  if (!list.length) return null;
  const first = list[0];
  const arr = (pick, n) => Array.from({ length: n }, (_, i) => Math.round(mean(list.map((s) => pick(s)[i]))));
  return {
    until: first.until, year: first.year, baseline: first.baseline,
    baseline_rain_mean: mean(list.map((s) => s.baseline_rain_mean)),
    annual: first.annual.map((r, i) => {
      const rows = list.map((s) => s.annual[i]);
      const m = (k) => mean(rows.map((x) => x?.[k]));
      return { year: r.year, full: r.full, rain: m('rain'), et0: m('et0'), aridity: m('aridity'), hot_days: m('hot_days'), dry_spell: m('dry_spell'), z: m('z') };
    }),
    monthly: first.monthly.map((r, i) => {
      const part = (which) => {
        const rows = list.map((s) => s.monthly[i][which]).filter(Boolean);
        if (!rows.length) return null;
        return { rain: mean(rows.map((x) => x.rain)), balance: mean(rows.map((x) => x.balance)), soil: mean(rows.map((x) => x.soil)) };
      };
      return { month: r.month, now: part('now'), last: part('last'), mean: part('mean') };
    }),
    cumulative: {
      now: arr((s) => s.cumulative.now, first.cumulative.now.length),
      mean: arr((s) => s.cumulative.mean, 365), low: arr((s) => s.cumulative.low, 365), high: arr((s) => s.cumulative.high, 365),
    },
  };
}

/** The mean of the states' daily climate (Open-Meteo answers), for the month charts of the whole frontline. */
export function averageDaily(climate) {
  const list = Object.values(climate || {}).filter(Boolean);
  if (!list.length) return null;
  const keys = ['precipitation_sum', 'temperature_2m_max', 'et0_fao_evapotranspiration'];
  const out = { time: list[0].time };
  keys.forEach((k) => { out[k] = list[0].time.map((_, i) => mean(list.map((d) => d[k]?.[i]))); });
  return out;
}

/** The land types added up over the eleven states, year by year (landuse_series.json). */
export function sumLand(land) {
  const out = {};
  for (const y of land.years) {
    const o = {};
    for (const s of Object.values(land.states)) {
      if (!s[y]) continue;
      for (const t of land.types) o[t] = (o[t] || 0) + (s[y][t] || 0);
    }
    if (Object.keys(o).length) out[y] = o;
  }
  return out;
}
