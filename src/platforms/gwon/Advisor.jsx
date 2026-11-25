/**
 * The GWON Advisor (prototype): what to do now, this season and for the future, for a state, an LGA or a ward,
 * from all of GWON's data. Each piece of advice says why (the figure and its source) and what to do; the rules are
 * written out under "How the advice is made" so staff can check them. Signed-in staff can have the AI write an
 * advisory note from the same figures.
 *
 * Live at the chosen place (from the reader's browser, Open-Meteo): the 16-day forecast (planting windows, heat) and
 * the ECMWF SEAS5 seasonal forecast (51 members, the next months' rain). From GWON's files: drought indices (ERA5,
 * since 1991), the season so far, land cover, people, CMIP6 futures.
 */
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertTriangle, CalendarClock, Eye, Sparkles, Printer, MapPin } from 'lucide-react';
import InfoTip from '../../components/page/InfoTip';
import SeriesChart from './SeriesChart';
import { CsvButton } from './csv';
import { gwonFetch } from './gwonApi';

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmt = (n, d = 0) => (n == null || !Number.isFinite(n) ? '—' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d }));
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const quant = (xs, q) => { const v = xs.filter((x) => x != null).sort((a, b) => a - b); if (!v.length) return null; const i = (v.length - 1) * q; const lo = Math.floor(i); return v[lo] + (v[Math.ceil(i)] - v[lo]) * (i - lo); };

function useFile(url) {
  const [d, setD] = useState(null);
  useEffect(() => { let live = true; fetch(url).then((r) => r.json()).then((x) => { if (live) setD(x); }).catch(() => {}); return () => { live = false; }; }, [url]);
  return d;
}

// A point inside a boundary: the middle of its largest ring's box, pulled to the ring's mean (good enough for a
// weather point at ward, LGA or state size).
function pointOf(feature) {
  const g = feature?.geometry;
  if (!g) return null;
  const rings = g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map((p) => p[0]) : [];
  const ring = rings.sort((a, b) => b.length - a.length)[0];
  if (!ring) return null;
  return { lat: mean(ring.map((c) => c[1])), lon: mean(ring.map((c) => c[0])) };
}

function useForecasts(pt) {
  const [f, setF] = useState({ short: null, seasonal: null, err: '' });
  const key = pt ? `${pt.lat.toFixed(3)},${pt.lon.toFixed(3)}` : '';
  useEffect(() => {
    if (!pt) return undefined;
    let live = true;
    const q = `latitude=${pt.lat.toFixed(4)}&longitude=${pt.lon.toFixed(4)}`;
    Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?${q}&daily=precipitation_sum,temperature_2m_max,et0_fao_evapotranspiration&forecast_days=16&timezone=Africa%2FLagos`).then((r) => r.json()),
      fetch(`https://seasonal-api.open-meteo.com/v1/seasonal?${q}&daily=precipitation_sum&forecast_days=183`).then((r) => r.json()),
    ]).then(([s, z]) => { if (live) setF({ short: s?.daily ? s.daily : null, seasonal: z?.daily ? z.daily : null, err: s?.reason || z?.reason || '' }); })
      .catch((e) => { if (live) setF({ short: null, seasonal: null, err: e.message }); });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return f;
}

// Planting window (Sivakumar 1988, used across the Sahel): 20 mm or more in 3 days in a row, and no dry spell of
// 7 days or more (under 1 mm a day) in the days after it, within the forecast.
function plantingWindow(d) {
  if (!d) return null;
  const p = d.precipitation_sum;
  for (let i = 0; i + 2 < p.length; i++) {
    if ((p[i] || 0) + (p[i + 1] || 0) + (p[i + 2] || 0) < 20) continue;
    let run = 0, worst = 0;
    for (let j = i + 3; j < p.length; j++) { run = (p[j] || 0) < 1 ? run + 1 : 0; worst = Math.max(worst, run); }
    if (worst < 7) return { day: d.time[i], rain: (p[i] || 0) + (p[i + 1] || 0) + (p[i + 2] || 0) };
  }
  return { day: null };
}

// The seasonal outlook: each SEAS5 member's rain for the next three whole months against the terciles of the same
// three months in 1991-2020 (ERA5 at the state's point).
function outlook(seasonal, idx, stateName) {
  const s = idx?.states?.[stateName];
  if (!seasonal || !s) return null;
  const now = new Date();
  const months = [1, 2, 3].map((k) => { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + k, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; });
  const members = Object.keys(seasonal).filter((k) => k.startsWith('precipitation_sum'));
  const totals = members.map((k) => {
    let sum = 0, n = 0;
    seasonal.time.forEach((t, i) => { if (months.includes(t.slice(0, 7)) && seasonal[k][i] != null) { sum += seasonal[k][i]; n += 1; } });
    return n >= 80 ? sum : null;
  }).filter((v) => v != null);
  if (totals.length < 10) return null;
  const cms = months.map((m) => Number(m.slice(5)));
  const years = [...new Set(s.month.map((m) => Number(m.slice(0, 4))))].filter((y) => y >= 1991 && y <= 2020);
  const past = years.map((y) => {
    let sum = 0, ok = true;
    cms.forEach((cm, i) => { const yy = cm < cms[0] && i > 0 ? y + 1 : y; const j = s.month.indexOf(`${yy}-${String(cm).padStart(2, '0')}`); if (j < 0 || s.rain[j] == null) ok = false; else sum += s.rain[j]; });
    return ok ? sum : null;
  }).filter((v) => v != null);
  const lo = quant(past, 1 / 3), hi = quant(past, 2 / 3), normal = mean(past);
  const below = totals.filter((v) => v < lo).length / totals.length, above = totals.filter((v) => v > hi).length / totals.length;
  return { months, totals, lo, hi, normal, below, above, near: 1 - below - above, median: quant(totals, 0.5), p10: quant(totals, 0.1), p90: quant(totals, 0.9), members: totals.length, dry: normal != null && normal < 30 };
}

const LEVELS = { now: ['Act now', 'border-[#F5C8C8] bg-[#FDF2F2]', AlertTriangle, 'text-[#B42318]'], plan: ['Plan this season', 'border-[#F6D9A0] bg-[#FFF8EB]', CalendarClock, 'text-amber-700'], watch: ['Watch', 'border-[#BFDDF6] bg-[#EEF6FD]', Eye, 'text-[#2563EB]'], good: ['Going well', 'border-[#A9D9BF] bg-[#F1F9F4]', Sparkles, 'text-[#007248]'] };

export default function Advisor({ scope, placeName, focus, stateFeature, series, land, signedIn, onSignIn }) {
  const idx = useFile('/gwon-data/drought_indices.json');
  const socio = useFile('/gwon-data/socioeconomic.json');
  const proj = useFile('/gwon-data/climate_projections.json');
  const place = placeName || (scope === 'all' ? 'the frontline' : `${scope} State`);
  const stateName = scope === 'all' ? null : scope;
  const pt = useMemo(() => (focus ? pointOf(focus) : stateFeature ? { lat: stateFeature.properties.lat, lon: stateFeature.properties.lon } : null), [focus, stateFeature]);
  const fc = useForecasts(stateName ? pt : null);
  const [note, setNote] = useState({ text: '', busy: false, err: '' });

  // Where to act first: every state ranked by drought now, poverty and bare land (each scaled 0-1 across the states).
  const ranking = useMemo(() => {
    if (!idx || !socio || !land) return [];
    const rows = Object.keys(idx.states).map((s) => {
      const x = idx.states[s]; const k = x.month.length - 1 - [...x.spi6].reverse().findIndex((v) => v != null);
      const ys = land.years.filter((y) => land.states[s]?.[y]); const o = land.states[s]?.[ys[ys.length - 1]] || {};
      const tot = land.types.reduce((a, t) => a + (o[t] || 0), 0) || 1;
      return { state: s, spi6: x.spi6[k], poor: socio.states[s]?.poverty?.poor_pct ?? null, bare: (((o['Bare land'] || 0) + (o['Sparse vegetation'] || 0) + (o.Shrubland || 0) * 0) / tot) * 100, tree: ((o['Tree cover'] || 0) / tot) * 100 };
    });
    const sc = (k, inv) => { const v = rows.map((r) => r[k]).filter((x) => x != null); const lo = Math.min(...v), hi = Math.max(...v); return (x) => (x == null || hi === lo ? 0 : inv ? (hi - x) / (hi - lo) : (x - lo) / (hi - lo)); };
    const a = sc('spi6', true), b = sc('poor'), c = sc('tree', true);
    return rows.map((r) => ({ ...r, score: Math.round(((a(r.spi6) + b(r.poor) + c(r.tree)) / 3) * 100) })).sort((p, q) => q.score - p.score);
  }, [idx, socio, land]);

  const facts = useMemo(() => {
    if (!idx) return null;
    const names = stateName ? [stateName] : Object.keys(idx.states);
    const last = (n, k) => { const x = idx.states[n]; const i = x.month.length - 1 - [...x[k]].reverse().findIndex((v) => v != null); return { month: x.month[i], value: x[k][i] }; };
    const sa = stateName ? series?.states?.[stateName] : null;
    const kNow = sa ? sa.cumulative.now.length - 1 : null;
    const ys = land && stateName ? land.years.filter((y) => land.states[stateName]?.[y]) : [];
    const share = (y, t) => { const o = land.states[stateName][y]; const tot = land.types.reduce((a, x) => a + (o[x] || 0), 0); return tot ? (o[t] / tot) * 100 : null; };
    const so = stateName ? socio?.states?.[stateName] : null;
    const cddRef = proj ? mean(Object.entries(proj.national.cdd.historical).filter(([y]) => y >= 1995 && y <= 2014).map(([, v]) => v)) : null;
    const fut = (v, s) => (proj ? mean(Object.entries(proj.national[v][s].median).filter(([y]) => y >= 2041 && y <= 2060).map(([, x]) => x)) : null);
    const hdRef = proj ? mean(Object.entries(proj.national.hd40.historical).filter(([y]) => y >= 1995 && y <= 2014).map(([, v]) => v)) : null;
    return {
      place, state: stateName,
      drought_now: names.map((n) => ({ state: n, spi3: last(n, 'spi3'), spi6: last(n, 'spi6'), spei12: last(n, 'spei12') })),
      season_so_far: sa ? { until: sa.until, rain_mm: sa.cumulative.now[kNow], normal_by_now_mm: sa.cumulative.mean[kNow] } : null,
      land: ys.length ? { first: ys[0], last: ys[ys.length - 1], tree_pct_first: share(ys[0], 'Tree cover'), tree_pct_last: share(ys[ys.length - 1], 'Tree cover'), bare_sparse_pct_last: (share(ys[ys.length - 1], 'Bare land') || 0) + (share(ys[ys.length - 1], 'Sparse vegetation') || 0) } : null,
      people: so ? { population_2022: so.population?.total, poor_pct: so.poverty?.poor_pct, severe_pct: so.poverty?.severe_pct, idps: so.displacement?.idps ?? null } : null,
      future_nigeria_2041_2060_ssp245: proj ? { longest_dry_spell_days: fut('cdd', 'ssp245'), reference_1995_2014: cddRef, days_over_40c: fut('hd40', 'ssp245'), days_over_40c_reference: hdRef } : null,
    };
  }, [idx, series, land, socio, proj, place, stateName]);

  const pw = plantingWindow(fc.short);
  const ol = stateName ? outlook(fc.seasonal, idx, stateName) : null;
  const hot = fc.short ? fc.short.temperature_2m_max.filter((t) => t >= 40).length : null;
  const rain16 = fc.short ? fc.short.precipitation_sum.reduce((a, b) => a + (b || 0), 0) : null;
  const month = new Date().getUTCMonth() + 1;
  const rainy = month >= 5 && month <= 9;

  // The advice: each from a rule written out below, with its figure and source.
  const advice = [];
  if (facts && stateName) {
    const d = facts.drought_now[0];
    if (d.spi3.value != null && d.spi3.value <= -1) advice.push({ level: 'now', title: 'Short-term drought: protect young trees', why: `SPI-3 is ${fmt(d.spi3.value, 2)} (${MON[Number(d.spi3.month.slice(5)) - 1]} ${d.spi3.month.slice(0, 4)}), moderately dry or worse (ERA5, against 1991-2020).`, do: 'Water seedlings planted this year on a fixed round; mulch around stems; repair half-moons and zaï pits so the next rain stays on the site; hold new planting until the rains return.' });
    if (d.spei12.value != null && d.spei12.value <= -1) advice.push({ level: 'plan', title: 'A long dry spell in the water balance', why: `SPEI-12 is ${fmt(d.spei12.value, 2)}: twelve months drier than normal once heat is counted.`, do: 'Favour deep-rooted, drought-hardy native species for the next planting (for example Acacia senegal, Balanites aegyptiaca, Ziziphus mauritiana); plan water points and check community wells before the dry season.' });
    if (d.spi3.value != null && d.spi3.value >= 1) advice.push({ level: 'good', title: 'A wet season: use it', why: `SPI-3 is ${fmt(d.spi3.value, 2)}, wetter than normal.`, do: 'Gap-fill dead seedlings now while the soil holds water; watch low ground for standing water and flood damage to young plantings.' });
    if (fc.short && rainy) {
      if (pw?.day) advice.push({ level: 'now', title: `A planting window from ${new Date(`${pw.day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`, why: `The 16-day forecast for ${place} gives ${fmt(pw.rain)} mm in 3 days with no dry spell of 7 days after it (Sivakumar 1988 onset rule; Open-Meteo forecast).`, do: 'Have seedlings at the site and teams ready to plant in the two days after that rain; plant into moist soil, not before.' });
      else advice.push({ level: 'watch', title: 'No safe planting window in the next 16 days', why: `The forecast gives ${fmt(rain16)} mm in 16 days without 20 mm in 3 days followed by enough rain (Sivakumar 1988 rule).`, do: 'Keep seedlings in the nursery, shaded and watered; check the forecast again in a few days.' });
    }
    if (hot != null && hot >= 3) advice.push({ level: 'now', title: `${hot} days of 40 °C or more in the next 16 days`, why: `The 16-day forecast for ${place} (Open-Meteo).`, do: 'Shade nursery beds, water seedlings early in the morning, and do not transplant on those days.' });
    if (!rainy && (month >= 11 || month <= 3)) advice.push({ level: 'plan', title: 'The dry season is the fire season', why: 'Most fires in the frontline burn between November and March (watch the Fires and hot spots layer on the map).', do: 'Clear firebreaks of 5 to 10 metres around plantations and nurseries, agree early-burning rules with herders and communities, and name a fire watch for each site.' });
    if (ol && !ol.dry) {
      const lvl = ol.below >= 0.5 ? 'now' : ol.below >= 0.4 ? 'plan' : ol.above >= 0.4 ? 'good' : 'watch';
      advice.push({ level: lvl, title: `${MON[Number(ol.months[0].slice(5)) - 1]} to ${MON[Number(ol.months[2].slice(5)) - 1]}: ${ol.below >= 0.4 ? 'likely drier than normal' : ol.above >= 0.4 ? 'likely wetter than normal' : 'no clear signal'}`, why: `${Math.round(ol.below * 100)}% of the ${ol.members} ECMWF SEAS5 members give less than the driest third of 1991-2020 (under ${fmt(ol.lo)} mm), ${Math.round(ol.above * 100)}% more than the wettest third (over ${fmt(ol.hi)} mm).`, do: ol.below >= 0.4 ? 'Plan fewer, better-protected plantings; order water harvesting works and drought-hardy species now; budget for watering.' : ol.above >= 0.4 ? 'Prepare for a bigger planting effort and for flood risk on low ground.' : 'Plan the season as normal and check the outlook again next month.' });
    }
    if (facts.land && facts.land.tree_pct_last != null && facts.land.tree_pct_last < 5) advice.push({ level: 'plan', title: `Tree cover is ${fmt(facts.land.tree_pct_last, 1)}% of the land`, why: `ESA land cover, ${facts.land.last}; ${facts.land.tree_pct_last >= facts.land.tree_pct_first ? 'up' : 'down'} from ${fmt(facts.land.tree_pct_first, 1)}% in ${facts.land.first}.`, do: 'Put restoration where bare and sparse land meets farms and settlements: shelterbelts on field edges, farmer-managed natural regeneration on fallows, woodlots near villages.' });
    if (facts.people?.poor_pct >= 60) advice.push({ level: 'plan', title: `${fmt(facts.people.poor_pct, 0)}% of people are poor here`, why: 'Global Multidimensional Poverty Index, DHS 2024.', do: 'Choose species and works that pay communities soon: gum arabic, fruit and fodder trees, cash-for-work for earthworks, and community nurseries run by women and youth groups.' });
    if (facts.people?.idps > 50000) advice.push({ level: 'watch', title: `${fmt(facts.people.idps)} people displaced in the state`, why: 'IOM Displacement Tracking Matrix.', do: 'Plan with host communities and camps: fuelwood lots and green belts around settlements ease pressure on the land; check security before field work.' });
    if (facts.future_nigeria_2041_2060_ssp245?.longest_dry_spell_days && facts.future_nigeria_2041_2060_ssp245.reference_1995_2014) {
      const f = facts.future_nigeria_2041_2060_ssp245; const ch = ((f.longest_dry_spell_days - f.reference_1995_2014) / f.reference_1995_2014) * 100;
      advice.push({ level: 'watch', title: 'The future: hotter, with longer dry spells', why: `CMIP6, Nigeria, SSP2-4.5: the longest dry spell ${ch >= 0 ? '+' : ''}${fmt(ch, 0)}% and days over 40 °C from ${fmt(f.days_over_40c_reference, 0)} to ${fmt(f.days_over_40c, 0)} a year by 2041-2060, against 1995-2014 (World Bank CCKP ensemble median).`, do: 'Choose species and seed sources that cope with today’s hottest, driest years; keep water harvesting part of every new site.' });
    }
  }
  const order = { now: 0, plan: 1, good: 2, watch: 3 };
  advice.sort((a, b) => order[a.level] - order[b.level]);

  const writeNote = async () => {
    setNote({ text: '', busy: true, err: '' });
    try {
      const r = await gwonFetch('/platforms/gwon/ask', { method: 'POST', body: JSON.stringify({ module: 'advisor', facts: { ...facts, forecast_16_days: fc.short ? { rain_mm: rain16, days_over_40c: hot, planting_window: pw } : null, seasonal_outlook: ol ? { months: ol.months, chance_below_normal: ol.below, chance_above_normal: ol.above, members: ol.members } : null, advice: advice.map((a) => ({ level: LEVELS[a.level][0], title: a.title, why: a.why })) },
        question: `Write a one-page advisory note for the Agency's officers in ${place}: the situation now, the outlook for the coming months, and what to do (now, this season, for the future), in short sections with bullet points. Use only the figures given and say where each comes from.` }) });
      setNote({ text: r.answer, busy: false, err: '' });
    } catch (e) { setNote({ text: '', busy: false, err: e.message }); }
  };

  if (!stateName) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#A9D9BF] bg-[#F1F9F4] p-4 text-sm text-gray-700">Choose a state in the filters (and an LGA and ward if you like) for advice there. Below: where to act first across the frontline.</div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold flex items-center gap-1.5">Where to act first <InfoTip text="Each state scored 0 to 100 from three figures, each scaled from the best to the worst state and weighted equally: drought now (SPI-6, lower is worse), poverty (MPI headcount) and tree cover (ESA, lower is worse). A guide for where to look first, not a final ranking." /></p>
            <CsvButton name="where-to-act-first" rows={ranking.map((r) => ({ state: r.state, priority_score: r.score, spi6_now: r.spi6, poor_pct: r.poor, tree_cover_pct: Math.round(r.tree * 10) / 10 }))} />
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-[#007248] text-white text-left"><tr>{['State', 'Priority', 'Drought now (SPI-6)', 'Poor %', 'Tree cover %'].map((h) => <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {ranking.map((r) => (
                  <tr key={r.state}><td className="px-3 py-1.5 font-semibold">{r.state}</td>
                    <td className="px-3 py-1.5"><div className="flex items-center gap-2"><div className="w-24 h-2.5 rounded bg-gray-100"><div className="h-full rounded bg-[#B42318]" style={{ width: `${r.score}%` }} /></div><span className="tabular-nums">{r.score}</span></div></td>
                    <td className="px-3 py-1.5 tabular-nums">{fmt(r.spi6, 2)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.poor, 1)}</td><td className="px-3 py-1.5 tabular-nums">{fmt(r.tree, 1)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-700 flex items-center gap-1.5"><MapPin size={15} className="text-[#007248]" /> Advice for <span className="font-semibold text-gray-900">{place}</span>{pt && <span className="text-gray-500"> · forecast point {pt.lat.toFixed(3)}, {pt.lon.toFixed(3)}</span>}</p>
        <button type="button" onClick={() => window.print()} className="gwon-noprint inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700"><Printer size={15} /> Print the advice</button>
      </div>
      {fc.err && <p className="text-sm text-amber-700">The live forecast could not be loaded ({fc.err}); the advice below uses GWON's saved data only.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {advice.map((a) => {
          const [label, tone, Icon, ink] = LEVELS[a.level];
          return (
            <div key={a.title} className={`rounded-2xl border p-4 space-y-1.5 ${tone}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${ink}`}><Icon size={14} /> {label}</p>
              <p className="font-semibold text-gray-900">{a.title}</p>
              <p className="text-sm text-gray-800"><span className="font-semibold">Do: </span>{a.do}</p>
              <p className="text-xs text-gray-600"><span className="font-semibold">Why: </span>{a.why}</p>
            </div>
          );
        })}
        {!advice.length && <p className="text-sm text-gray-600">No advice yet: the figures are loading.</p>}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">The next 16 days, {place} <InfoTip text="Open-Meteo's best-match weather forecast at the point, daily rain and highest temperature." /></p>
          {fc.short ? <SeriesChart series={[{ name: 'Rain', color: '#2563EB', points: fc.short.time.map((t, i) => [t, fc.short.precipitation_sum[i]]) }]} bars colorOf={() => '#2563EB'} unit="mm" digits={1} xFmt={(t) => t.slice(5)} csvName={`forecast-16-days-${place}`} xLabel="day" height={180} /> : <p className="text-sm text-gray-500">Loading the forecast…</p>}
          {fc.short && <SeriesChart series={[{ name: 'Highest temperature', color: '#D97706', points: fc.short.time.map((t, i) => [t, fc.short.temperature_2m_max[i]]) }]} refs={[{ y: 40, label: '40 °C', color: '#B42318' }]} unit="°C" digits={1} xFmt={(t) => t.slice(5)} csvName={`forecast-16-days-tmax-${place}`} xLabel="day" height={160} />}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">Seasonal outlook: the next three months <InfoTip text="ECMWF SEAS5 (51 members, through Open-Meteo) at the point: each member's rain for the next three whole months, against the driest, middle and wettest thirds of the same months in 1991-2020 (ERA5 at the state's point). Raw model output, not bias-corrected: read it as a signal, not an amount." /></p>
          {!ol ? <p className="text-sm text-gray-500">{fc.seasonal ? 'Not enough members for the next three months.' : 'Loading the seasonal forecast…'}</p> : ol.dry ? (
            <p className="text-sm text-gray-700">{MON[Number(ol.months[0].slice(5)) - 1]} to {MON[Number(ol.months[2].slice(5)) - 1]} is the dry season here (a normal of {fmt(ol.normal)} mm): a seasonal rain outlook says little. Plan for heat and fire.</p>
          ) : (
            <>
              <div className="flex h-8 rounded-lg overflow-hidden text-xs font-semibold text-white">
                <div className="bg-[#D97706] flex items-center justify-center" style={{ width: `${ol.below * 100}%` }}>{ol.below >= 0.12 ? `${Math.round(ol.below * 100)}% drier` : ''}</div>
                <div className="bg-[#9CA3AF] flex items-center justify-center" style={{ width: `${ol.near * 100}%` }}>{ol.near >= 0.12 ? `${Math.round(ol.near * 100)}% near` : ''}</div>
                <div className="bg-[#2563EB] flex items-center justify-center" style={{ width: `${ol.above * 100}%` }}>{ol.above >= 0.12 ? `${Math.round(ol.above * 100)}% wetter` : ''}</div>
              </div>
              <p className="text-xs text-gray-600">{ol.months.map((m) => MON[Number(m.slice(5)) - 1]).join(', ')}: members give {fmt(ol.p10)} to {fmt(ol.p90)} mm (middle {fmt(ol.median)} mm). Normal {fmt(ol.normal)} mm; the middle third {fmt(ol.lo)} to {fmt(ol.hi)} mm. A third each would mean no signal.</p>
            </>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold flex items-center gap-1.5"><Sparkles size={15} className="text-[#007248]" /> Advisory note for {place} <InfoTip text="The AI writes the note from exactly the figures above (no others), through the AI set-up in the admin. Check it before you send it." /></p>
          {signedIn ? <button type="button" onClick={writeNote} disabled={note.busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007248] text-white text-sm font-semibold disabled:opacity-60">{note.busy ? 'Writing…' : note.text ? 'Write it again' : 'Write the advisory note'}</button>
            : <button type="button" onClick={onSignIn} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700">Sign in to have the AI write it</button>}
        </div>
        {note.err && <p className="text-sm text-red-700">{note.err}</p>}
        {note.text && <div className="prose prose-sm max-w-none text-gray-800"><ReactMarkdown remarkPlugins={[remarkGfm]}>{note.text}</ReactMarkdown></div>}
      </div>
      <details className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
        <summary className="font-semibold cursor-pointer">How the advice is made</summary>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Short-term drought: SPI-3 of -1 or lower (WMO moderately dry) for the state. A wet season: SPI-3 of 1 or more.</li>
          <li>Long-term water balance: SPEI-12 of -1 or lower.</li>
          <li>Planting window (May to September): 20 mm or more in 3 days in a row, with no run of 7 days under 1 mm after it within the 16-day forecast (Sivakumar 1988).</li>
          <li>Heat: 3 or more forecast days of 40 °C or more in the next 16 days.</li>
          <li>Seasonal outlook: the share of SEAS5 members below the driest third / above the wettest third of 1991-2020 for the next three months; 50% or more drier means act now, 40% or more plan.</li>
          <li>Tree cover under 5% (ESA land cover); poverty of 60% or more (Global MPI); more than 50,000 people displaced (IOM DTM); the CMIP6 change by 2041-2060 under SSP2-4.5.</li>
          <li>The practices named (half-moons, zaï pits, mulching, firebreaks, farmer-managed natural regeneration, native drought-hardy species) are standard sustainable land management for the Sahel. LGA and ward advice uses the state's records with the forecast at the chosen place.</li>
        </ul>
      </details>
    </div>
  );
}
