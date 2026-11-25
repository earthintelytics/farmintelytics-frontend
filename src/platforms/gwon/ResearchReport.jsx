/**
 * The GWON research report: a full study of the frontline (or one state) in the shape of a research paper, about
 * fifteen printed pages: cover, summary, introduction and study area, data and methods, then rainfall, drought,
 * water stress and heat, land cover, cropland, people, climate resilience, climate futures, land management,
 * recommendations, limitations and references. Every figure and sentence comes from GWON's saved data; signed-in
 * staff can have the AI write a discussion for each section from the same figures. Print or save as PDF.
 */
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Printer, Sparkles } from 'lucide-react';
import SeriesChart from './SeriesChart';
import { LandDonut, LandBars } from './LandCharts';
import { StateBars } from './Charts';
import Choropleth from './Choropleth';
import { PALETTE } from './palette';
import { gwonFetch } from './gwonApi';

const fmt = (n, d = 0) => (n == null || !Number.isFinite(Number(n)) ? '—' : Number(n).toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d }));
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
function useFile(url) {
  const [d, setD] = useState(null);
  useEffect(() => { let live = true; fetch(url).then((r) => r.json()).then((x) => { if (live) setD(x); }).catch(() => {}); return () => { live = false; }; }, [url]);
  return d;
}

const REFS = [
  'Gibbs, W. J. and Maher, J. V. (1967). Rainfall deciles as drought indicators. Bulletin No. 48, Bureau of Meteorology, Melbourne.',
  'Hansen, M. C. et al. (2013). High-resolution global maps of 21st-century forest cover change. Science 342, 850-853 (Global Forest Change v1.12).',
  'Hersbach, H. et al. (2020). The ERA5 global reanalysis. Quarterly Journal of the Royal Meteorological Society 146, 1999-2049.',
  'Johnson, S. J. et al. (2019). SEAS5: the new ECMWF seasonal forecast system. Geoscientific Model Development 12, 1087-1117.',
  'McKee, T. B., Doesken, N. J. and Kleist, J. (1993). The relationship of drought frequency and duration to time scales. 8th Conference on Applied Climatology, Anaheim, 179-184.',
  'Allen, R. G., Pereira, L. S., Raes, D. and Smith, M. (1998). Crop evapotranspiration. FAO Irrigation and Drainage Paper 56. FAO, Rome.',
  'Alkire, S. et al. (2024). Global Multidimensional Poverty Index 2024. OPHI and UNDP.',
  'ESA (2017, 2021). Land Cover CCI Product User Guide, versions 2.0 and C3S 2.1. European Space Agency Climate Change Initiative.',
  'Poggio, L. et al. (2021). SoilGrids 2.0: producing soil information for the globe with quantified spatial uncertainty. SOIL 7, 217-240.',
  'Sivakumar, M. V. K. (1988). Predicting rainy season potential from the onset of rains in Southern Sahelian and Sudanian climatic zones of West Africa. Agricultural and Forest Meteorology 42, 295-305.',
  'Vicente-Serrano, S. M., Beguería, S. and López-Moreno, J. I. (2010). A multiscalar drought index sensitive to global warming: the SPEI. Journal of Climate 23, 1696-1718.',
  'World Bank (2024). Climate Change Knowledge Portal, CMIP6 0.25° collection. World Bank Group.',
  'WMO (2012). Standardized Precipitation Index User Guide. WMO-No. 1090. World Meteorological Organization, Geneva.',
  'IOM (2022, 2023). Displacement Tracking Matrix, Nigeria: North-east round 43; North-central and North-west round 13.',
  'OCHA (2022). Nigeria subnational population statistics (COD-PS) and administrative boundaries (COD-AB).',
  'WorldPop (2020). Global 1 km population, UN-adjusted. University of Southampton.',
  'UNCCD and Great Green Wall Accelerator (2021). Harmonized Results Framework for the Great Green Wall Initiative.',
];

function Section({ n, title, children, ai, onAi, busy, signedIn }) {
  return (
    <section className="gwon-rr-section rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 space-y-3">
      <h2 className="font-display text-xl font-semibold text-gray-900">{n}. {title}</h2>
      <div className="text-[15px] leading-relaxed text-gray-800 space-y-3">{children}</div>
      {ai && <div className="rounded-xl border border-[#A9D9BF] bg-[#F1F9F4] p-4 text-sm text-gray-800 prose prose-sm max-w-none"><p className="text-[11px] font-semibold uppercase tracking-wider text-[#007248] !mt-0">Discussion (written by AI from the figures in this section)</p><ReactMarkdown>{ai}</ReactMarkdown></div>}
      {signedIn && onAi && !ai && <button type="button" onClick={onAi} disabled={busy} className="gwon-noprint inline-flex items-center gap-1.5 text-xs font-semibold text-[#007248] disabled:opacity-50"><Sparkles size={13} /> {busy ? 'Writing…' : 'Write a discussion of this section with AI'}</button>}
    </section>
  );
}

export default function ResearchReport({ scope, states, series, land, signedIn, onSignIn, dark }) {
  const idx = useFile('/gwon-data/drought_indices.json');
  const socio = useFile('/gwon-data/socioeconomic.json');
  const proj = useFile('/gwon-data/climate_projections.json');
  const crop = useFile('/gwon-data/cropland_series.json');
  const [ai, setAi] = useState({});
  const [busy, setBusy] = useState('');
  const all = scope === 'all';
  const names = all ? Object.keys(series?.states || {}) : [scope];
  const place = all ? 'the eleven frontline states of the Great Green Wall in Nigeria' : `${scope} State`;
  const ready = series && land && idx && socio && proj;
  const made = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const F = useMemo(() => {
    if (!ready) return null;
    const sa = names.map((n) => series.states[n]).filter(Boolean);
    const years = sa[0].annual.map((r) => r.year);
    const annual = years.map((y, i) => ({ year: y, full: sa[0].annual[i].full, rain: mean(sa.map((s) => s.annual[i]?.rain)), hot: mean(sa.map((s) => s.annual[i]?.hot_days)), dry: mean(sa.map((s) => s.annual[i]?.dry_spell)), arid: mean(sa.map((s) => s.annual[i]?.aridity)) }));
    const full = annual.filter((r) => r.full);
    const wettest = [...full].sort((a, b) => b.rain - a.rain)[0], driest = [...full].sort((a, b) => a.rain - b.rain)[0];
    const k = sa[0].cumulative.now.length - 1;
    const nowRain = mean(sa.map((s) => s.cumulative.now[k])), normRain = mean(sa.map((s) => s.cumulative.mean[k]));
    const ix = names.map((n) => idx.states[n]).filter(Boolean);
    const months = ix[0].month;
    const spei12 = months.map((m, i) => [m, mean(ix.map((s) => s.spei12[i]))]);
    const spi3 = months.map((m, i) => [m, mean(ix.map((s) => s.spi3[i]))]);
    const lastK = spei12.length - 1 - [...spei12].reverse().findIndex((p) => p[1] != null);
    const droughtYears = [...new Set(spei12.filter(([m, v]) => m.endsWith('-12') && v != null && v <= -1).map(([m]) => m.slice(0, 4)))];
    const landOf = all ? (() => { const out = {}; land.years.forEach((y) => { const o = {}; Object.values(land.states).forEach((s) => { if (s[y]) land.types.forEach((t) => { o[t] = (o[t] || 0) + (s[y][t] || 0); }); }); if (Object.keys(o).length) out[y] = o; }); return out; })() : land.states[scope];
    const ly = land.years.filter((y) => landOf?.[y]);
    const share = (y, t) => { const o = landOf[y]; const tot = land.types.reduce((a, x) => a + (o[x] || 0), 0); return tot ? ((o[t] || 0) / tot) * 100 : null; };
    const so = names.map((n) => socio.states[n]).filter(Boolean);
    const pop = so.reduce((a, s) => a + (s.population?.total || 0), 0);
    const poor = so.reduce((a, s) => a + (s.poverty?.poor_pct || 0) * (s.population?.total || 0), 0) / (pop || 1);
    const idps = so.reduce((a, s) => a + (s.displacement?.idps || 0), 0);
    const ha = (states?.features || []).filter((f) => all || f.properties.state === scope).reduce((a, f) => a + f.properties.area_ha, 0);
    const ref = (v) => mean(Object.entries(proj.national[v].historical).filter(([y]) => y >= 1995 && y <= 2014).map(([, x]) => x));
    const fut = (v, s, a, b) => mean(Object.entries(proj.national[v][s].median).filter(([y]) => y >= a && y <= b).map(([, x]) => x));
    return { annual, full, wettest, driest, nowRain, normRain, until: sa[0].until, year: sa[0].year, spei12, spi3, lastK, months, droughtYears, landOf, ly, share, pop, poor, idps, ha, ref, fut,
      baseline: mean(sa.map((s) => s.baseline_rain_mean)), cum: sa.length === 1 ? sa[0].cumulative : null };
  }, [ready, names.join('|'), series, land, idx, socio, proj, states, all, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const askAi = async (key, title, facts) => {
    setBusy(key);
    try {
      const r = await gwonFetch('/platforms/gwon/ask', { method: 'POST', body: JSON.stringify({ module: 'research-report', facts, question: `Write a short scientific discussion (two paragraphs, no headings) for the section "${title}" of a research report on ${place}. Interpret the figures, compare with what is known for the Sahel only where the figures support it, and end with one implication for the Great Green Wall. Use only these figures; do not invent numbers.` }) });
      setAi((a) => ({ ...a, [key]: r.answer }));
    } catch (e) { setAi((a) => ({ ...a, [key]: `Could not write the discussion: ${e.message}` })); }
    setBusy('');
  };

  if (!F) return <p className="text-sm text-gray-500">Gathering the figures for the report…</p>;
  const tree0 = F.share(F.ly[0], 'Tree cover'), tree1 = F.share(F.ly[F.ly.length - 1], 'Tree cover');
  const bare = (y) => (F.share(y, 'Bare land') || 0) + (F.share(y, 'Sparse vegetation') || 0);
  const crop0 = F.share(F.ly[0], 'Cropland'), crop1 = F.share(F.ly[F.ly.length - 1], 'Cropland');
  const last = F.spei12[F.lastK];
  const hd = { r: F.ref('hd40'), m: F.fut('hd40', 'ssp245', 2041, 2060), h: F.fut('hd40', 'ssp585', 2081, 2100) };
  const tx = { r: F.ref('tasmax'), m: F.fut('tasmax', 'ssp245', 2041, 2060), h: F.fut('tasmax', 'ssp585', 2081, 2100) };
  const pr = { r: F.ref('pr'), m: F.fut('pr', 'ssp245', 2041, 2060) };
  const cropBy = crop ? (all ? (() => { const out = {}; crop.years.forEach((y) => { const o = {}; Object.values(crop.states).forEach((s) => { if (s[y]) crop.types.forEach((t) => { o[t] = (o[t] || 0) + (s[y][t] || 0); }); }); out[y] = o; }); return out; })() : crop.states[scope]) : null;
  const S = (key, n, title, facts, body) => <Section key={key} n={n} title={title} ai={ai[key]} busy={busy === key} signedIn={signedIn} onAi={facts ? () => askAi(key, title, facts) : null}>{body}</Section>;
  const stateRows = Object.entries(idx.states).map(([s, v]) => ({ label: s, value: v.spei12[F.lastK], color: (v.spei12[F.lastK] ?? 0) <= -1 ? '#D97706' : '#007248' })).filter((r) => r.value != null).sort((a, b) => a.value - b.value);

  return (
    <div className="space-y-4">
      <style>{'@media print { .gwon-rr-section, .gwon-rr-cover { break-before: page; border: none !important; } .gwon-rr-cover { break-before: auto; min-height: 95vh; } @page { size: A4; margin: 16mm; } }'}</style>
      <div className="gwon-noprint flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#A9D9BF] bg-[#F1F9F4] p-4">
        <p className="text-sm text-gray-700">A research-style study of {place}, about fifteen printed pages, from GWON’s data. Change the state in the filters for a state report. {signedIn ? 'Each section can have an AI-written discussion added.' : 'Sign in to add AI-written discussions.'}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => (signedIn ? window.print() : onSignIn())} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007248] text-white text-sm font-semibold"><Printer size={15} /> Print or save as PDF</button>
        </div>
      </div>

      {/* Cover */}
      <section className="gwon-rr-cover rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 flex flex-col justify-between min-h-[560px]">
        <div className="flex items-center gap-4"><img src="/gwon-data/naggw-seal.png" alt="" className="w-20 h-20" /><div><p className="text-sm font-semibold text-[#007248] tracking-widest">GREENWALL OBSERVATORY NIGERIA</p><p className="text-sm text-gray-600">National Agency for the Great Green Wall</p></div></div>
        <div className="py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Research report</p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#0E2D41] leading-tight mt-2">Climate, land and people in {all ? 'the Great Green Wall frontline of Nigeria' : `${scope} State`}</h1>
          <p className="text-lg text-gray-700 mt-4 max-w-2xl">Drought since 1991, land cover change since 2000, the people who live on the land, and the climate to 2100: evidence for restoration planning.</p>
        </div>
        <div className="border-t border-gray-200 pt-4 text-sm text-gray-600 flex flex-wrap justify-between gap-2"><span>{made} · made from the data on GWON</span><span>Powered by Earthintelytics</span></div>
      </section>

      {S('summary', 1, 'Summary', { rain_so_far: F.nowRain, normal_by_now: F.normRain, spei12_latest: last, tree_pct: [tree0, tree1], people: F.pop, poor_pct: F.poor },
        <>
          <p>This report brings together the climate record, land cover change, socio-economic statistics and climate projections for {place}, covering {fmt(F.ha / 1e6, 2)} million hectares and {fmt(F.pop / 1e6, 1)} million people (2022).</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Rain this year to {F.until} is {fmt(F.nowRain)} mm against a 2015-2024 normal of {fmt(F.normRain)} mm to the same day ({F.nowRain >= F.normRain ? '+' : ''}{fmt(((F.nowRain - F.normRain) / (F.normRain || 1)) * 100)}%).</li>
            <li>The 12-month water balance (SPEI-12) stands at {fmt(last[1], 2)} in {last[0]}; {F.droughtYears.length} years since 1991 ended in moderate drought or worse ({F.droughtYears.slice(-6).join(', ') || 'none'}{F.droughtYears.length > 6 ? ', …' : ''}).</li>
            <li>Tree cover went from {fmt(tree0, 1)}% to {fmt(tree1, 1)}% of the land between {F.ly[0]} and {F.ly[F.ly.length - 1]}; bare and sparse land from {fmt(bare(F.ly[0]), 1)}% to {fmt(bare(F.ly[F.ly.length - 1]), 1)}%.</li>
            <li>{fmt(F.poor, 0)}% of people are multidimensionally poor (DHS 2024){F.idps ? ` and ${fmt(F.idps)} people are displaced (IOM DTM)` : ''}.</li>
            <li>Under a middle emissions path (SSP2-4.5), days over 40 °C in Nigeria rise from {fmt(hd.r)} a year (1995-2014) to {fmt(hd.m)} by 2041-2060 (CMIP6 median).</li>
          </ul>
        </>)}

      {S('intro', 2, 'Introduction and study area', { states: names, area_ha: F.ha },
        <>
          <p>The Great Green Wall is the African Union’s programme to restore degraded land across the Sahel. In Nigeria it is led by the National Agency for the Great Green Wall, established in 2015, across eleven frontline states in the north of the country. Restoration there must work within a short rainy season, frequent droughts, rising heat and the needs of a large, young and largely rural population.</p>
          <p>The study area is {place}. The map shows the frontline states; the analysis below uses a point inside each state for the climate record, the full state boundaries for land cover and statistics, and national figures for the climate projections.</p>
          <Choropleth states={states} dark={dark} colorOf={(s) => (all || s === scope ? '#5DB487' : '#E5E7EB')} label={(s) => `<b>${s}</b>`} height={300} />
        </>)}

      {S('methods', 3, 'Data and methods', null,
        <>
          <p><b>Climate.</b> Daily rain, reference evapotranspiration (FAO-56) and maximum temperature from the ERA5 reanalysis (Hersbach et al., 2020), read at one point inside each state from 1991. Seasonal and yearly totals are compared with 2015-2024 (charts) or 1991-2020 (indices).</p>
          <p><b>Drought indices.</b> The Standardized Precipitation Index (McKee et al., 1993; WMO, 2012) fits a gamma distribution to rain totals for each calendar month on 1991-2020; the SPEI (Vicente-Serrano et al., 2010) fits a log-logistic distribution to rain minus evapotranspiration. Where a dry-season month has too little rain to fit, the Gringorten plotting position is used. Classes follow WMO: -1 moderately dry, -1.5 severely dry, -2 extremely dry.</p>
          <p><b>Land cover.</b> ESA Climate Change Initiative annual land cover at 300 m, 2000-2020, grouped into ten land types and five kinds of cropland, with true pixel areas.</p>
          <p><b>People.</b> OCHA COD-PS 2022 population, the Global Multidimensional Poverty Index (DHS 2024), IOM DTM displacement counts and WorldPop 2020 for LGAs and wards.</p>
          <p><b>Projections.</b> CMIP6 multi-model ensembles for Nigeria under SSP1-2.6, SSP2-4.5, SSP3-7.0 and SSP5-8.5 (World Bank, 2024), as the median and 10th-90th percentiles.</p>
        </>)}

      {S('rain', 4, 'Rainfall', { years: F.full.map((r) => ({ year: r.year, rain_mm: Math.round(r.rain) })), baseline_mm: F.baseline, wettest: F.wettest, driest: F.driest },
        <>
          <p>Mean yearly rain over 2015-2024 is {fmt(F.baseline)} mm. The wettest full year was {F.wettest.year} ({fmt(F.wettest.rain)} mm) and the driest {F.driest.year} ({fmt(F.driest.rain)} mm), a range of {fmt(((F.wettest.rain - F.driest.rain) / (F.baseline || 1)) * 100)}% of the mean.</p>
          <SeriesChart series={[{ name: 'Rain each year', color: '#2563EB', points: F.annual.map((r) => [r.year, r.rain]) }]} bars colorOf={() => '#2563EB'} unit="mm" digits={0} refs={[{ y: F.baseline, label: '2015-2024 mean' }]} csvName="report-rain" xLabel="year" height={220} />
          <p className="text-xs text-gray-500">Figure 1. Rain each year, {place} (ERA5). The last bar is the year so far.</p>
        </>)}

      {S('drought', 5, 'Drought since 1991', { spei12_latest: last, drought_years: F.droughtYears },
        <>
          <p>The 12-month SPEI shows the long-term water balance. {F.droughtYears.length} of the years since 1991 ended in moderate drought or worse. The most recent value, for {last[0]}, is {fmt(last[1], 2)}: {last[1] <= -1 ? 'drier than normal' : last[1] >= 1 ? 'wetter than normal' : 'near normal'}.</p>
          <SeriesChart series={[{ name: 'SPEI-12', color: '#007248', points: F.spei12 }]} bars colorOf={(v) => (v <= -1.5 ? '#EA580C' : v <= -1 ? '#FBBF24' : v >= 1 ? '#3B82F6' : '#D1D5DB')} refs={[{ y: -1, label: 'Moderately dry', color: '#D97706' }]} xFmt={(m) => m.slice(0, 4)} digits={2} csvName="report-spei12" xLabel="month" height={230} />
          <p className="text-xs text-gray-500">Figure 2. SPEI-12, monthly, 1991 to now. Orange: moderately or severely dry; blue: wet.</p>
          <StateBars unit="" digits={2} rows={stateRows} />
          <p className="text-xs text-gray-500">Figure 3. SPEI-12 in {last[0]}, every frontline state.</p>
        </>)}

      {S('heat', 6, 'Water stress and heat', { aridity_mean: mean(F.full.map((r) => r.arid)), hot_days: F.full.map((r) => ({ year: r.year, hot: Math.round(r.hot) })) },
        <>
          <p>The aridity index (rain divided by reference evapotranspiration) averages {fmt(mean(F.full.map((r) => r.arid)), 2)}, {mean(F.full.map((r) => r.arid)) < 0.2 ? 'arid' : 'semi-arid'} on the UNEP scale. Days with a maximum of 40 °C or more average {fmt(mean(F.full.map((r) => r.hot)))} a year, and the longest rainy-season dry spell {fmt(mean(F.full.map((r) => r.dry)))} days.</p>
          <SeriesChart series={[{ name: 'Days of 40 °C or more', color: '#D97706', points: F.annual.map((r) => [r.year, r.hot]) }]} unit="days" digits={0} zero csvName="report-hot-days" xLabel="year" height={200} />
          <p className="text-xs text-gray-500">Figure 4. Hot days each year (ERA5).</p>
        </>)}

      {S('land', 7, 'Land cover change, 2000-2020', { first: F.ly[0], last: F.ly[F.ly.length - 1], tree: [tree0, tree1], bare: [bare(F.ly[0]), bare(F.ly[F.ly.length - 1])], cropland: [crop0, crop1] },
        <>
          <p>Between {F.ly[0]} and {F.ly[F.ly.length - 1]}, cropland went from {fmt(crop0, 1)}% to {fmt(crop1, 1)}% of the land, tree cover from {fmt(tree0, 1)}% to {fmt(tree1, 1)}%, and bare and sparse land from {fmt(bare(F.ly[0]), 1)}% to {fmt(bare(F.ly[F.ly.length - 1]), 1)}%.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LandDonut years={F.ly} byYear={F.landOf} types={land.types} colors={land.colors} />
            <LandBars from={F.ly[0]} to={F.ly[F.ly.length - 1]} a={F.landOf[F.ly[0]]} b={F.landOf[F.ly[F.ly.length - 1]]} types={land.types} colors={land.colors} />
          </div>
          <p className="text-xs text-gray-500">Figure 5. Share of each land type, and hectares in the first and last year (ESA CCI).</p>
        </>)}

      {cropBy && S('crop', 8, 'Kinds of cropland', null,
        <>
          <p>ESA’s land cover separates rainfed herbaceous crops, tree and shrub crops, irrigated crops, and mosaics of crops and natural vegetation. The figure shows how each changed; crop species are not in these maps.</p>
          <SeriesChart series={crop.types.map((t, i) => ({ name: t, color: crop.colors[t] || PALETTE[i], points: crop.years.filter((y) => cropBy[y]).map((y) => [y, (cropBy[y][t] || 0) / 1000]) }))} unit="thousand ha" digits={0} csvName="report-cropland" xLabel="year" height={240} />
          <p className="text-xs text-gray-500">Figure 6. Hectares of each kind of cropland, 2000-2020 (ESA CCI).</p>
        </>)}

      {S('people', 9, 'People and livelihoods', { population: F.pop, poor_pct: F.poor, idps: F.idps },
        <>
          <p>{fmt(F.pop)} people lived in {place} in 2022 (OCHA COD-PS). {fmt(F.poor, 0)}% are multidimensionally poor, deprived in health, education and living standards (Global MPI, DHS 2024){F.idps ? `, and IOM counted ${fmt(F.idps)} displaced people` : ''}. Restoration that brings income soon, such as gum arabic, fruit and fodder trees and paid earthworks, therefore matters as much as the trees themselves.</p>
          <StateBars unit="%" digits={1} rows={Object.entries(socio.states).map(([s, x]) => ({ label: s, value: x.poverty?.poor_pct || 0, color: !all && s === scope ? '#0E2D41' : '#D97706' })).sort((a, b) => b.value - a.value)} />
          <p className="text-xs text-gray-500">Figure 7. Share of people multidimensionally poor, every frontline state.</p>
        </>)}

      {S('futures', 10, 'Climate futures', { tasmax: tx, hot_days_40: hd, rain: pr },
        <>
          <p>CMIP6 projections for Nigeria show continued warming under every scenario. The mean daily maximum rises from {fmt(tx.r, 1)} °C (1995-2014) to {fmt(tx.m, 1)} °C by 2041-2060 under SSP2-4.5 and {fmt(tx.h, 1)} °C by 2081-2100 under SSP5-8.5; days over 40 °C from {fmt(hd.r)} to {fmt(hd.m)} and {fmt(hd.h)} a year. Yearly rain changes from {fmt(pr.r)} mm to {fmt(pr.m)} mm by 2041-2060 (SSP2-4.5), within a wide model range.</p>
          <SeriesChart series={['ssp126', 'ssp245', 'ssp585'].map((s, i) => ({ name: proj.scenarios[s], color: ['#15803D', '#2563EB', '#B42318'][i], points: Object.entries(proj.national.hd40[s].median).map(([y, v]) => [Number(y), v]) }))} unit="days" digits={0} csvName="report-hd40" xLabel="year" height={220} />
          <p className="text-xs text-gray-500">Figure 8. Days over 40 °C a year in Nigeria, CMIP6 median by scenario (World Bank CCKP).</p>
        </>)}

      {S('slm', 11, 'Land management options', { mean_rain_mm: F.baseline },
        <>
          <p>With a mean of {fmt(F.baseline)} mm of rain a year, the water-harvesting practices of the Sahel fit {place}: zaï pits and half-moons on crusted land, stone bunds along the contour, farmer-managed natural regeneration on farms and fallows, shelterbelts against wind and sand, and Faidherbia albida agroforestry on cereal fields. The choice on each site depends on slope, soil depth and what the community wants.</p>
        </>)}

      {S('recs', 12, 'Recommendations', { spei12_latest: last, poor_pct: F.poor, tree_pct: tree1, hot_days_future: hd },
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Plant at the onset of the rains only (20 mm in three days with no seven-day dry spell after, Sivakumar 1988), using the GWON Advisor’s forecast check.</li>
          <li>{last[1] <= -1 ? 'With the 12-month water balance in drought, protect existing plantings first: watering rounds, mulch and repaired water-harvesting works.' : 'Use near-normal or wet years to expand planting, while keeping water harvesting in every new site.'}</li>
          <li>Choose drought- and heat-hardy native species and seed sources, as hot days are projected to rise to about {fmt(hd.m)} a year by mid-century.</li>
          <li>{F.poor >= 60 ? 'Tie restoration to income: gum arabic, fruit and fodder trees, community nurseries and cash-for-work, given high poverty.' : 'Link restoration to local livelihoods through community nurseries and useful species.'}</li>
          <li>Measure survival and greening on every registered site every season, so the Results Framework indicators are reported from evidence.</li>
        </ol>)}

      {S('limits', 13, 'Limitations', null,
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Climate is read at one point inside each state; it describes that point, not every LGA or ward.</li>
          <li>Land cover at 300 m misses small plantings and shelterbelts; the latest ESA CCI year in GWON is 2020.</li>
          <li>Projections are national ensembles; state-level model runs are added when available.</li>
          <li>Poverty is published by state only; displacement counts cover the sites IOM assessed.</li>
        </ul>)}

      <Section n={14} title="References">
        <ol className="list-decimal pl-5 space-y-1 text-sm">{REFS.map((r) => <li key={r}>{r}</li>)}</ol>
      </Section>
    </div>
  );
}

