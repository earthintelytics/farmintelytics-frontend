import { useState } from 'react';
import { BookOpen, CheckCircle2, RefreshCw } from 'lucide-react';
import ReportLoading from '../../reports/ReportLoading';

/**
 * "Similar land elsewhere, and a plan" on the suitability report page: how the land compares with published
 * studies the AI found (each a real, linked page), what it can be expected to give, a month-by-month plan from
 * the run's own rain and temperature, and the studies. The team makes it and marks it checked (team actions);
 * a client sees it only once checked.
 */
export default function StudiesSection({ s, n, team }) {
  const [busy, setBusy] = useState('');
  const [problem, setProblem] = useState('');

  const act = async (kind, fn) => {
    setBusy(kind);
    setProblem('');
    try {
      await fn();
    } catch (e) {
      setProblem(e?.message || 'That did not work just now. Try again in a moment.');
    } finally {
      setBusy('');
    }
  };

  if (!s && !team) return null;
  return (
    <section id="sr-studies" className="scroll-mt-6 space-y-5">
      {busy && <ReportLoading text={busy === 'make' ? 'Searching published studies…' : 'Saving…'} />}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-green-700">{n} · Compared with published studies · AI-assisted</p>
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight">Similar land elsewhere, and a plan</h2>
      </div>

      {team && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
          <p className="mr-auto text-sm text-gray-600">
            {!s ? 'Not made yet. The AI searches published studies on this crop in similar land and writes a month-by-month plan.'
              : s.checked ? `Checked by ${s.checked.by} on ${s.checked.on}. The client sees this section.`
                : 'Not checked yet: the client does not see this section until you mark it checked.'}
          </p>
          <button type="button" disabled={!!busy} onClick={() => act('make', team.onMake)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {s ? <RefreshCw size={15} /> : <BookOpen size={15} />}{s ? 'Search again' : 'Compare with published studies'}
          </button>
          {s && (
            <button type="button" disabled={!!busy} onClick={() => act('check', () => team.onCheck(!s.checked))}
              className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">
              <CheckCircle2 size={15} />{s.checked ? 'Take the check back' : 'Mark as checked'}
            </button>
          )}
          {problem && <p className="w-full text-sm text-red-700">{problem}</p>}
        </div>
      )}

      {s && (
        <>
          <Paragraphs items={s.comparison} />
          {s.projection?.length > 0 && (
            <>
              <h3 className="font-display text-lg font-semibold">What this land can be expected to give</h3>
              <Paragraphs items={s.projection} />
            </>
          )}
          {s.plan?.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-gray-500"><b className="font-semibold text-gray-800">Month by month.</b> This land's rain and temperature, and what to do.</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>{['Month', 'Rain (mm)', 'Temp (°C)', 'What to do', 'Why'].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {s.plan.map((r) => (
                      <tr key={r.month} className="border-t border-gray-100 align-top">
                        <td className="px-4 py-2.5 font-medium">{r.month}</td>
                        <td className="px-4 py-2.5 font-mono">{r.rain_mm ?? ''}</td>
                        <td className="px-4 py-2.5 font-mono">{r.temp_c ?? ''}</td>
                        <td className="px-4 py-2.5">{r.do}</td>
                        <td className="px-4 py-2.5 text-gray-600">{r.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {s.studies?.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-gray-500"><b className="font-semibold text-gray-800">The studies.</b> Each is a page the search really found.</p>
              <ul className="space-y-2">
                {s.studies.map((st) => (
                  <li key={st.url || st.title} className="rounded-xl border border-gray-200 px-4 py-3 text-sm">
                    <a href={st.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-800 hover:underline">{st.title || st.url}</a>
                    <span className="text-gray-500">{[st.where, st.year].filter(Boolean).join(' · ') && ` — ${[st.where, st.year].filter(Boolean).join(' · ')}`}</span>
                    {st.found && <p className="mt-1 text-gray-700">{st.found}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-gray-500">{s.how_made}</p>
        </>
      )}
    </section>
  );
}

function Paragraphs({ items }) {
  return <div className="space-y-3 text-[15px] leading-relaxed text-gray-800 text-justify hyphens-auto" lang="en">{(items || []).filter(Boolean).map((p) => <p key={p}>{p}</p>)}</div>;
}
