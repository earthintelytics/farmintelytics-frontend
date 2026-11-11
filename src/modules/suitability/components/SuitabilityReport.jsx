import { useEffect, useState } from 'react';
import { Download, FileText, LayoutList } from 'lucide-react';
import DesignedReport from '../../reports/DesignedReport';
import ReportMap from './ReportMap';
import StudiesSection from './StudiesSection';
import ReportLoading from '../../reports/ReportLoading';

/**
 * The crop suitability report as a web page. Its content (words, figures, maps, legends) comes from the report
 * engine, the same content the PDF prints, so the page and the PDF always say the same thing. "Printed pages"
 * shows the PDF itself. Runs made before the report had this content show the PDF only.
 */
export default function SuitabilityReport({ loadData, loadPdf, fileName, team }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | failed
  const [view, setView] = useState('report'); // report | pages
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);   // bumped after a team action, so the report reloads
  const teamActions = team ? {
    onMake: async () => { await team.makeStudies(); setVersion((v) => v + 1); },
    onCheck: async (checked) => { await team.checkStudies(checked); setVersion((v) => v + 1); },
  } : null;

  useEffect(() => {
    let live = true;
    loadData()
      .then((d) => { if (live) { setData(d); setState('ready'); } })
      .catch(() => { if (live) setState('failed'); });
    return () => { live = false; };
  }, [loadData, version]);

  // The saved file is named after the analysis: "Suru LGA - Rice suitability - 11 Nov 2026.pdf".
  const savedName = data?.farm_name
    ? [data.farm_name, data.title, String(data.period_text || '').replace(/^(Analysed on|Analysis of) /, '')].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, ' ').trim()
    : fileName;

  const download = async () => {
    setBusy(true);
    try {
      const blob = await loadPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${savedName || 'Suitability report'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return <ReportLoading />;
  if (state === 'failed' || !data || data.version === 0) return <DesignedReport fileName={fileName} loadPdf={loadPdf} />;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-gray-200 p-1" role="tablist" aria-label="How to show the report">
          {[['report', 'Report', LayoutList], ['pages', 'Printed pages', FileText]].map(([key, label, Icon]) => (
            <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium ${view === key ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
        {view === 'report' && (
          <button type="button" onClick={download} disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500">
            <Download size={15} />{busy ? 'Preparing the PDF…' : 'Download PDF'}
          </button>
        )}
      </div>
      {view === 'pages' ? <DesignedReport fileName={savedName} loadPdf={loadPdf} /> : <ReportBody d={data} team={teamActions} />}
      {busy && <ReportLoading text="Preparing the PDF…" />}
    </div>
  );
}

// ── The page ─────────────────────────────────────────────────────────────────────────────────────
function ReportBody({ d, team }) {
  const sections = d.sections || [];
  let n = 1;
  const numbered = sections.map((s) => ({ ...s, n: ++n }));
  const combineN = ++n;
  const stepsN = d.next_steps?.length ? ++n : null;
  const studiesN = d.studies || team ? ++n : null;
  const limitsN = ++n;
  const toc = [
    ['summary', '1', 'Summary'],
    ...numbered.map((s) => [s.id, String(s.n), s.title]),
    ['combine', String(combineN), 'How the factors combine'],
    ...(stepsN ? [['next', String(stepsN), 'What to do next']] : []),
    ...(studiesN ? [['studies', String(studiesN), 'Similar land and a plan']] : []),
    ['limits', String(limitsN), 'What was not counted'],
  ];

  return (
    <article className="mx-auto w-full max-w-6xl bg-white text-gray-900">
      <header className="border-b border-gray-200 pb-8">
        {d.cover_image && (
          <img src={d.cover_image} alt="" className="mb-8 h-48 sm:h-72 w-full rounded-2xl object-cover" />
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-green-700">FarmIntelytics · Crop suitability report</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight">{d.title}</h1>
        <p className="mt-3 text-xl text-gray-800">{d.for_whom}</p>
        <p className="mt-1 text-sm text-gray-500">
          {[d.period_text, d.irrigated ? 'Irrigated' : 'Rain-fed', d.report_id && `Report ${d.report_id}`].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-6 rounded-2xl bg-green-50 px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-green-700">The headline</p>
          <p className="mt-1.5 font-display text-xl font-semibold leading-snug">{d.headline}</p>
        </div>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Contents" className="hidden lg:block">
          <div className="sticky top-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Contents</p>
            <ol className="mt-3 space-y-1">
              {toc.map(([id, num, label]) => (
                <li key={id}>
                  <a href={`#sr-${id}`} className="flex gap-2.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                    <span className="font-mono text-gray-400 w-4 shrink-0">{num}</span>{label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 space-y-14">
          <Section id="summary" n={1} eyebrow="Summary" title={`How well the land suits ${d.crop}`}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {d.kpis.map((k) => (
                <div key={k.key} className="rounded-xl border border-gray-200 px-4 py-3.5">
                  <p className="flex items-center gap-2 text-sm text-gray-600"><Swatch c={k.colour} />{k.label}</p>
                  <p className="mt-1.5 font-mono text-2xl">{fmt(k.ha)} ha</p>
                  <p className="text-xs text-gray-500">{Math.round(k.pct)}% of the land</p>
                </div>
              ))}
            </div>
            <ShareBar items={d.kpis} />
            <Prose items={d.summary} />
            <h3 className="font-display text-lg font-semibold">How the result is made</h3>
            <Prose items={[d.method]} />
            {d.result_map && (
              <Figure n={d.result_map.figure} caption={d.result_map.caption}>
                <MapPanel map={d.result_map} extent={d.extent} outline={d.outline} tall />
              </Figure>
            )}
          </Section>

          {numbered.map((s) => (
            <Section key={s.id} id={s.id} n={s.n} eyebrow={s.eyebrow} title={s.title}>
              <Prose items={s.paragraphs} />
              {(s.why || s.short || s.do) && (
                <div className="rounded-xl bg-green-50 px-5 py-4 space-y-2 text-[15px] leading-relaxed">
                  {s.why && <p><b className="font-semibold">Why it matters.</b> {s.why}</p>}
                  {s.short && <p>{s.counted && <b className="font-semibold">Where it falls short. </b>}{s.short}</p>}
                  {s.do && <p><b className="font-semibold">What can be done.</b> {s.do}</p>}
                </div>
              )}
              {s.maps?.length > 0 && (
                <Figure n={s.figure} caption={s.caption}>
                  {s.maps.length > 1 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {s.maps.map((m) => <MapPanel key={m.title} map={m} extent={d.extent} outline={d.outline} />)}
                    </div>
                  ) : <MapPanel map={s.maps[0]} extent={d.extent} outline={d.outline} tall />}
                </Figure>
              )}
              {s.table && <DataTable t={s.table} />}
            </Section>
          ))}

          <Section id="combine" n={combineN} eyebrow="The result" title="How the factors combine">
            <Prose items={d.combine.paragraphs} />
            {d.combine.tables.map((t) => <DataTable key={t.number} t={t} />)}
          </Section>

          {stepsN && (
            <Section id="next" n={stepsN} eyebrow="Next steps" title="What to do next">
              <ol className="space-y-3">
                {d.next_steps.map((x, i) => (
                  <li key={x} className="flex gap-4 rounded-xl border border-gray-200 px-5 py-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-700 font-mono text-sm text-white">{i + 1}</span>
                    <p className="text-[15px] leading-relaxed">{x}</p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {studiesN && <StudiesSection s={d.studies} n={studiesN} team={team} />}

          <Section id="limits" n={limitsN} eyebrow="Limits" title="What was not counted, and why">
            {d.limits.table && <DataTable t={d.limits.table} />}
          </Section>

          {d.sources?.length > 0 && (
            <footer className="border-t border-gray-200 pt-6 text-xs leading-relaxed text-gray-500">
              Sources: {d.sources.join('; ')}.
            </footer>
          )}
        </div>
      </div>
    </article>
  );
}

function Section({ id, n, eyebrow, title, children }) {
  return (
    <section id={`sr-${id}`} className="scroll-mt-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-green-700">{n} · {eyebrow}</p>
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Prose({ items }) {
  return <div className="space-y-3 text-[15px] leading-relaxed text-gray-800 text-justify hyphens-auto" lang="en">{(items || []).filter(Boolean).map((p) => <p key={p}>{p}</p>)}</div>;
}

function Swatch({ c }) {
  return <i className="inline-block h-3 w-3 shrink-0 rounded-[3px]" style={{ background: c }} />;
}

function ShareBar({ items }) {
  return (
    <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
      {items.filter((k) => k.pct > 0).map((k) => <div key={k.key} style={{ width: `${k.pct}%`, background: k.colour }} />)}
    </div>
  );
}

function Figure({ n, caption, children }) {
  return (
    <figure className="space-y-2">
      {children}
      {caption && <figcaption className="text-sm text-gray-500"><b className="font-semibold text-gray-800">Figure {n}.</b> {caption}</figcaption>}
    </figure>
  );
}

function DataTable({ t }) {
  return (
    <div>
      <p className="mb-2 text-sm text-gray-500"><b className="font-semibold text-gray-800">Table {t.number}.</b> {t.caption}</p>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>{t.head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={r.join('|')} className="border-t border-gray-100 align-top">
                {r.map((cell, j) => (
                  <td key={j} className={`px-4 py-2.5 ${(t.num || []).includes(j) ? 'font-mono whitespace-nowrap' : ''}`}>
                    {j === 0 && t.swatches ? <span className="inline-flex items-center gap-2"><Swatch c={t.swatches[i]} />{cell}</span> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Maps: the run's picture of a layer, north up, with north arrow, scale bar and legend ────────────
function MapPanel({ map, extent, outline, tall = false }) {
  return (
    <ReportMap map={map} extent={extent} outline={outline} tall={tall}>
      {map.key?.type && <MapKey k={map.key} />}
    </ReportMap>
  );
}

function MapKey({ k }) {
  if (k.type === 'ramp') {
    return (
      <div className="text-xs">
        <p className="mb-1.5 text-gray-500">{k.title}</p>
        <div className="flex h-3 overflow-hidden rounded">
          {k.colours.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
        </div>
        <div className="mt-1 grid grid-cols-3 text-gray-800">
          <span>{k.lo}</span><span className="text-center">{k.mid}</span><span className="text-right">{k.hi}</span>
        </div>
        {k.note && <p className="mt-1 text-[11px] text-gray-500">{k.note}</p>}
      </div>
    );
  }
  return (
    <ul className={`grid gap-x-4 gap-y-1.5 text-xs text-gray-800 ${k.type === 'classes' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {k.items.map((i) => <li key={i.label} className="flex items-center gap-2"><Swatch c={i.colour} />{i.label}</li>)}
    </ul>
  );
}

function fmt(v) {
  return Math.round(Number(v) || 0).toLocaleString('en-GB');
}
