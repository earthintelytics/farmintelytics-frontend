import { Line, Bar } from 'react-chartjs-2';
import { CHART_DEFAULTS } from '../constants/chartConfig';
import { SERIES } from './chartCatalog';

const noLegend = { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } } };
const CLASS_COLOUR = { best: '#3F8432', middle: '#D97706', worst: '#DC2626' };

const ChartCard = ({ title, text, badge, empty, children }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-3">
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-display text-base font-semibold text-gray-900">{title}</h3>
        {badge}
      </div>
      {text && <p className="text-sm text-gray-500 mt-1">{text}</p>}
    </div>
    <div className="h-[260px] relative">
      {empty ? <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 text-center px-6">{empty}</div> : children}
    </div>
  </div>
);

// A chart with a table under it (the table sets the card's height).
const DataCard = ({ title, text, badge, empty, chartHeight = 220, chart, children, wide }) => (
  <div className={`bg-white p-6 rounded-2xl border border-gray-200 space-y-4 ${wide ? 'xl:col-span-2' : ''}`}>
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-display text-base font-semibold text-gray-900">{title}</h3>
        {badge}
      </div>
      {text && <p className="text-sm text-gray-500 mt-1">{text}</p>}
    </div>
    {empty ? <p className="text-sm text-gray-500 py-10 text-center">{empty}</p> : (
      <>
        {chart && <div className="relative" style={{ height: chartHeight }}>{chart}</div>}
        {children}
      </>
    )}
  </div>
);

const Table = ({ head, rows }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs">
      <thead><tr className="border-b border-gray-200 text-gray-500">{head.map((h, i) => <th key={i} className={`py-2 pr-3 font-semibold ${i ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-gray-100 text-gray-700">
        {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`py-2 pr-3 ${j ? 'text-right tabular-nums' : ''}`}>{c}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

const ha = (v) => (v == null ? '—' : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: v < 10 ? 2 : 0 })} ha`);
const pct = (v) => (v == null ? '—' : `${Number(v).toFixed(v < 1 && v > 0 ? 2 : 1)}%`);
const tons = (v) => (v == null ? '—' : `${Math.round(v).toLocaleString()} t`);
const nice = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// Greenness classes, lowest to greenest (one colour per class, any number of classes).
const GREEN_RAMP = ['#9A6B4B', '#C9A27E', '#E3C567', '#9CC069', '#3F8432', '#1F5A1C'];
const rampFor = (n) => Array.from({ length: n }, (_, i) => GREEN_RAMP[Math.round((i * (GREEN_RAMP.length - 2)) / Math.max(1, n - 1))]);
// ESA WorldCover legend colours (the map product's own).
const WORLDCOVER_COLOUR = { 10: '#006400', 20: '#FFBB22', 30: '#FFFF4C', 40: '#F096FF', 50: '#FA0000', 60: '#B4B4B4', 70: '#F0F0F0', 80: '#0064C8', 90: '#0096A0', 95: '#00CF75', 100: '#FAE6A0' };
const EUDR = [['pass', 'No deforestation', '#3F8432'], ['review', 'To review', '#D97706'], ['fail', 'Deforestation found', '#DC2626'], ['not_checked', 'Not checked', '#9CA3AF']];

const hBar = (labels, values, colours, unitText = '%') => ({
  data: { labels, datasets: [{ data: values, backgroundColor: colours, borderRadius: 4 }] },
  options: { ...noLegend, indexAxis: 'y', plugins: { ...noLegend.plugins, tooltip: { ...noLegend.plugins?.tooltip, callbacks: { label: (t) => `${t.formattedValue}${unitText}` } } } },
});

/**
 * The charts chosen for this crop or service (chartCatalog.js), drawn from
 * real readings only.
 *   trends     { ndvi: [{ label, date, mean, is_estimated, source }], ... }   farm averages, 6 months
 *   plots      latest value per block: valueOf(plot, key); classify(plot, key) → { label, rank }
 *   landCover  { cover: 2021 map inside the blocks, greenness: land cover now (latest run) }
 *   carbon     estate carbon total with its estates (pools per estate)
 */
const OverviewCharts = ({ charts, trends, plots, classify, valueOf, primaryKey, unitLabel = 'blocks', landCover, carbon }) => {
  if (!charts.length) return null;
  const unit = unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1);

  const render = (c) => {
    if (c.id === 'greenness') {
      const g = landCover?.greenness;
      const empty = !g ? 'Land cover now appears after the next monitoring run (it needs at least one clear image in the period).' : null;
      const cls = g?.classes || [];
      const colours = rampFor(cls.length);
      const ref = g?.reference;
      const chart = g && {
        data: {
          labels: cls.map((k) => k.name),
          datasets: [
            ...(ref ? [{ label: `${nice(g.reference_period?.from)} – ${nice(g.reference_period?.to)}`, data: ref.classes.map((k) => k.pct), backgroundColor: colours.map((x) => `${x}66`), borderRadius: 4 }] : []),
            { label: `${nice(g.period?.from)} – ${nice(g.period?.to)}`, data: cls.map((k) => k.pct), backgroundColor: colours, borderRadius: 4 },
          ],
        },
        options: { ...CHART_DEFAULTS, indexAxis: 'y', plugins: { ...CHART_DEFAULTS.plugins, legend: { display: !!ref, position: 'bottom' }, tooltip: { ...CHART_DEFAULTS.plugins?.tooltip, callbacks: { label: (t) => `${t.dataset.label}: ${t.formattedValue}%` } } } },
      };
      const score = g && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Greenness Score', `${g.greenness_score.toFixed(2)} of ${Math.max(...(g.weights || [5]))}`, ref ? `${ref.greenness_score.toFixed(2)} a year before` : `${g.greenness_score_0_1.toFixed(2)} on a 0–1 scale`],
            [`In the greenest class`, pct(g.top_class_pct), ref ? `${pct(ref.top_class_pct)} a year before` : cls[cls.length - 1]?.name],
            ['Greenest tenth (NDVI)', g.top10_mean.toFixed(2), `average ${g.mean.toFixed(2)}`],
            ['Area measured', ha(g.area_ha), `${g.pixel_m} m pixels`]].map(([l, v, s]) => (
            <div key={l} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-500">{l}</p>
              <p className="text-base font-semibold text-gray-900 mt-0.5">{v}</p>
              <p className="text-xs text-gray-500">{s}</p>
            </div>
          ))}
        </div>
      );
      return (
        <DataCard key={c.id} wide title={c.title || 'Land cover now'} empty={empty}
          text={c.text || 'How much of the land is green, and how densely: the greenest clear view of the period put into vegetation classes. Unlike an average, it shows the hectares in each class.'}
          chart={chart && <Bar data={chart.data} options={chart.options} />}>
          {score}
          {g && <Table head={['Class', `${g.index?.toUpperCase()} range`, 'Share', 'Area', ...(ref ? ['A year before'] : [])]}
            rows={cls.map((k, i) => [k.name, `${k.from == null ? 'below' : k.from}${k.to == null ? ' and above' : ` to ${k.to}`}`.replace('below to ', 'below '), pct(k.pct), ha(k.area_ha), ...(ref ? [ha(ref.classes[i]?.area_ha)] : [])])} />}
          {g?.change?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">What changed since a year before</p>
              <Table head={['From', 'To', 'Area']} rows={g.change.slice(0, 8).map((t) => [t.from, <span key="t" className={t.greener ? 'text-green-800' : 'text-red-800'}>{t.to}</span>, ha(t.area_ha)])} />
            </div>
          )}
          {g?.by_estate?.length > 0 && (
            <Table head={['Estate', 'Greenness Score', 'Greenest class', 'Area']}
              rows={g.by_estate.map((e) => [e.estate, `${e.greenness_score.toFixed(2)}${e.reference ? ` (was ${e.reference.greenness_score.toFixed(2)})` : ''}`, pct(e.top_class_pct), ha(e.area_ha)])} />
          )}
          {ref && ref.area_ha < g.area_ha * 0.95 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Clear images a year before covered {ha(ref.area_ha)} of {ha(g.area_ha)} (clouds hid the rest), so compare the hectares that changed rather than the shares.
            </p>
          )}
          {g && <p className="text-xs text-gray-500">{g.note} Method: {g.source}.</p>}
        </DataCard>
      );
    }

    if (c.id === 'landcover') {
      const lc = landCover?.cover;
      const cls = lc?.classes || [];
      const bar = hBar(cls.map((k) => k.name), cls.map((k) => k.pct), cls.map((k) => WORLDCOVER_COLOUR[k.code] || '#9CA3AF'));
      return (
        <DataCard key={c.id} title={c.title || 'Land cover in 2021 (map)'} empty={lc ? null : 'Land cover appears after the next monitoring run.'}
          text={c.text || 'What the land was in 2021 according to the ESA WorldCover map, inside your boundaries. For land cover now, see the greenness classes.'}
          chart={lc && <Bar data={bar.data} options={bar.options} />}>
          {lc && <Table head={['Class', 'Share', 'Area']} rows={cls.map((k) => [k.name, pct(k.pct), ha(k.area_ha)])} />}
          {lc && <p className="text-xs text-gray-500">{lc.source}. {lc.note}</p>}
        </DataCard>
      );
    }

    if (c.id === 'eudr') {
      const counts = EUDR.map(([s]) => plots.filter((p) => (p.eudrStatus || 'not_checked') === s).length);
      const flagged = plots.filter((p) => p.eudrStatus === 'fail' || p.eudrStatus === 'review' || (p.eudrLossHa || 0) > 0)
        .sort((a, b) => (b.eudrLossHa || 0) - (a.eudrLossHa || 0)).slice(0, 15);
      const bar = hBar(EUDR.map(([, l]) => l), counts, EUDR.map(([, , col]) => col), ` ${unitLabel}`);
      return (
        <DataCard key={c.id} title={c.title || 'Deforestation check results'} empty={plots.length ? null : `No ${unitLabel} registered yet.`}
          text={c.text || `How many ${unitLabel} passed, need a look or lost forest after 31 December 2020.`}
          chart={<Bar data={bar.data} options={bar.options} />}>
          {flagged.length ? (
            <Table head={['Plot', 'Result', 'Forest lost', 'Year', 'Forest in 2020', 'Protected area']}
              rows={flagged.map((p) => [p.name || p.id, EUDR.find(([s]) => s === p.eudrStatus)?.[1] || 'Not checked', ha(p.eudrLossHa), p.eudrLossYear || '—', pct(p.eudrForest2020), p.eudrProtected ? 'Overlaps' : '—'])} />
          ) : <p className="text-sm text-gray-500">{counts[3] === plots.length ? 'No plot has been checked yet.' : 'No forest loss found on the checked plots.'}</p>}
        </DataCard>
      );
    }

    if (c.id === 'carbon') {
      const estates = (carbon?.estates || []).filter((e) => e.carbon_t);
      const pools = carbon?.carbon_t ? [
        ['Above ground', carbon.carbon_t],
        ['Roots', carbon.roots_t],
        ['Soil, 0–30 cm', carbon.soil?.total_t != null ? { low: carbon.soil.total_t, high: carbon.soil.total_t } : null],
      ].filter(([, v]) => v && v.high) : [];
      const data = {
        labels: pools.map(([l]) => l),
        datasets: [{ data: pools.map(([, v]) => [v.low, v.high]), backgroundColor: ['#3F8432', '#8B5E3C', '#C9A27E'], borderRadius: 4, borderSkipped: false }],
      };
      const opts = { ...noLegend, indexAxis: 'y', plugins: { ...noLegend.plugins, tooltip: { ...noLegend.plugins?.tooltip, callbacks: { label: (t) => { const [lo, hi] = t.raw; return lo === hi ? `about ${tons(lo)} C` : `${tons(lo)} – ${tons(hi)} C`; } } } } };
      return (
        <DataCard key={c.id} title={c.title || 'Carbon by pool'} empty={pools.length ? null : (carbon?.note || 'No estimate yet: blocks need a boundary and a crop.')}
          text={c.text || 'Tonnes of carbon in each pool, as a low – high range. Dead wood and litter are not counted. Not calibrated or certified.'}
          chartHeight={160} chart={pools.length > 0 && <Bar data={data} options={opts} />}>
          {estates.length > 1 && (
            <Table head={['Estate', 'Area', 'Crops and roots', 'Soil']}
              rows={estates.map((e) => [e.name || e.farm_id, ha(e.area_ha), `${tons((e.biomass_t || e.carbon_t).low)} – ${tons((e.biomass_t || e.carbon_t).high)}`, e.soil?.total_t != null ? `about ${tons(e.soil.total_t)}` : '—'])} />
          )}
        </DataCard>
      );
    }

    if (c.id.startsWith('trend:')) {
      const def = SERIES[c.index];
      const series = trends[c.index] || [];
      const hasRadarEstimates = series.some((p) => p.is_estimated || p.source === 'radar_estimate');
      const data = {
        labels: series.map((p) => p.label || p.date),
        datasets: [{
          label: c.title || def.title,
          data: series.map((p) => p.mean),
          borderColor: def.colour,
          backgroundColor: `${def.colour}14`,
          fill: true,
          tension: 0.35,
          pointRadius: series.map((p) => (p.is_estimated || p.source === 'radar_estimate' ? 4 : 3)),
          pointBackgroundColor: series.map((p) => (p.is_estimated || p.source === 'radar_estimate' ? '#D97706' : def.colour)),
        }],
      };
      const opts = {
        ...noLegend,
        plugins: {
          ...noLegend.plugins,
          tooltip: {
            ...noLegend.plugins?.tooltip,
            callbacks: {
              afterLabel: (tooltipCtx) => {
                const item = series[tooltipCtx.dataIndex];
                return (item?.is_estimated || item?.source === 'radar_estimate') ? 'From radar (cloudy)' : '';
              },
            },
          },
        },
        scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, suggestedMin: def.range[0], suggestedMax: def.range[1] } },
      };
      const radarBadge = hasRadarEstimates ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          From radar (cloudy)
        </span>
      ) : null;
      return (
        <ChartCard key={c.id} title={c.title || def.title} text={c.text || def.text} badge={radarBadge} empty={series.length ? null : 'No readings in the last 6 months yet. They appear after the next monitoring run.'}>
          <Line data={data} options={opts} />
        </ChartCard>
      );
    }

    const key = primaryKey;
    const rows = key ? plots.map((p) => ({ p, v: valueOf(p, key), cls: classify(p, key) })).filter((r) => r.v != null && !Number.isNaN(Number(r.v))) : [];

    if (c.id === 'classes') {
      const buckets = new Map();
      rows.forEach((r) => { if (r.cls) { const b = buckets.get(r.cls.label) || { n: 0, rank: r.cls.rank }; b.n += 1; buckets.set(r.cls.label, b); } });
      const entries = [...buckets.entries()].sort((a, b) => ['best', 'middle', 'worst'].indexOf(a[1].rank) - ['best', 'middle', 'worst'].indexOf(b[1].rank));
      const data = { labels: entries.map(([l]) => l), datasets: [{ data: entries.map(([, b]) => b.n), backgroundColor: entries.map(([, b]) => CLASS_COLOUR[b.rank]), borderRadius: 6 }] };
      return (
        <ChartCard key={c.id} title={c.title || `${unit} by condition`} text={c.text || `How many ${unitLabel} sit in each class on the map today.`} empty={entries.length ? null : `No ${unitLabel} have a reading yet.`}>
          <Bar data={data} options={{ ...noLegend, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, ticks: { precision: 0 } } } }} />
        </ChartCard>
      );
    }

    if (c.id === 'weakest') {
      const worst = [...rows].sort((a, b) => a.v - b.v).slice(0, 10);
      const data = { labels: worst.map((r) => r.p.name || r.p.id), datasets: [{ data: worst.map((r) => r.v), backgroundColor: worst.map((r) => CLASS_COLOUR[r.cls?.rank] || '#9CA3AF'), borderRadius: 4 }] };
      return (
        <ChartCard key={c.id} title={c.title || `Weakest ${unitLabel}`} text={c.text || `The ${unitLabel} with the lowest reading today. Start inspections here.`} empty={worst.length ? null : `No ${unitLabel} have a reading yet.`}>
          <Bar data={data} options={{ ...noLegend, indexAxis: 'y' }} />
        </ChartCard>
      );
    }
    return null;
  };

  return <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">{charts.map(render)}</div>;
};

export default OverviewCharts;
