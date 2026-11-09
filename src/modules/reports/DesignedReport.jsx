import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { fetchReportHtml, fetchReportPdf } from '../../services/organizationMonitorApi';

/**
 * The report as the client receives it: the designed pages from the report engine, shown in the page, and
 * the PDF printed from the same pages. The report's own HTML is shown in a frame with no scripts.
 * By default a saved report (reportId); loadHtml / loadPdf give another source (a suitability run, a share link).
 */
export default function DesignedReport({ reportId, fileName, loadHtml, loadPdf }) {
  const [html, setHtml] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | failed
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [height, setHeight] = useState(1200);
  const frame = useRef(null);

  useEffect(() => {
    let live = true;
    (loadHtml ? loadHtml() : fetchReportHtml(reportId))
      .then((h) => { if (live) { setHtml(h); setState('ready'); } })
      .catch((e) => { if (live) { setProblem(e?.message || ''); setState('failed'); } });
    return () => { live = false; };
  }, [reportId, loadHtml]);

  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (doc?.body) setHeight(doc.documentElement.scrollHeight + 16);
  };

  const download = async () => {
    setBusy(true);
    try {
      const blob = await (loadPdf ? loadPdf() : fetchReportPdf(reportId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || reportId}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {state === 'loading' && 'Opening the report…'}
          {state === 'ready' && 'The report as it prints. The PDF has the same pages.'}
          {state === 'failed' && (problem || 'The report could not be opened. Try again in a moment.')}
        </p>
        <button type="button" onClick={download} disabled={busy || state !== 'ready'}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500">
          <Download size={15} />{busy ? 'Preparing the PDF…' : 'Download PDF'}
        </button>
      </div>
      {state === 'ready' && (
        <div className="rounded-2xl border border-gray-200 bg-gray-100 p-3 sm:p-6 overflow-x-auto">
          <iframe ref={frame} title="Report" srcDoc={html} sandbox="allow-same-origin" onLoad={fit}
            className="mx-auto block w-[210mm] max-w-none bg-white border border-gray-200" style={{ height }} />
        </div>
      )}
    </div>
  );
}
