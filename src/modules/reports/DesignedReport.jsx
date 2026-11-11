import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { fetchReportPdf } from '../../services/organizationMonitorApi';
import ReportLoading from './ReportLoading';

/**
 * The report as the client receives it: the PDF itself, drawn page by page in the browser (PDF.js), so the
 * page shows exactly what the download holds (same pages, margins, page numbers, fonts and maps).
 * The PDF is fetched once and the download hands over that same file.
 * By default a saved report (reportId); loadPdf gives another source (a suitability run, a share link).
 */
const PAGE_PX = 794; // A4 width at 96 dpi: the pages are drawn at print size and shrink on narrow screens

async function drawPdf(blob, holder, isLive, onFirstPage) {
  const pdfjs = await import('pdfjs-dist');
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    // Bundled by Vite as a plain .js worker, so any web server serves it with a script type.
    const PdfWorker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?worker')).default;
    pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const sharp = Math.max(2, window.devicePixelRatio || 1);
  holder.replaceChildren();
  for (let n = 1; n <= doc.numPages; n += 1) {
    if (!isLive()) return;
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const fit = PAGE_PX / base.width;
    const view = page.getViewport({ scale: fit * sharp });

    const sheet = document.createElement('div');
    sheet.className = 'relative mx-auto bg-white border border-gray-200';
    sheet.style.width = '100%';
    sheet.style.maxWidth = `${PAGE_PX}px`;
    sheet.style.aspectRatio = `${base.width} / ${base.height}`;
    sheet.setAttribute('aria-label', `Page ${n} of ${doc.numPages}`);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(view.width);
    canvas.height = Math.round(view.height);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    sheet.appendChild(canvas);
    holder.appendChild(sheet);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: view }).promise;
    if (n === 1) onFirstPage();

    // Links in the PDF (share links, "open in the app" buttons) stay clickable.
    const notes = await page.getAnnotations();
    notes.filter((a) => a.subtype === 'Link' && a.url).forEach((a) => {
      const [x1, y1, x2, y2] = a.rect;
      const link = document.createElement('a');
      link.href = a.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.position = 'absolute';
      link.style.left = `${(x1 / base.width) * 100}%`;
      link.style.top = `${((base.height - y2) / base.height) * 100}%`;
      link.style.width = `${((x2 - x1) / base.width) * 100}%`;
      link.style.height = `${((y2 - y1) / base.height) * 100}%`;
      link.setAttribute('aria-label', a.url);
      sheet.appendChild(link);
    });
  }
}

export default function DesignedReport({ reportId, fileName, loadPdf }) {
  const [pdf, setPdf] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | failed
  const [problem, setProblem] = useState('');
  const [drawn, setDrawn] = useState(false);
  const holder = useRef(null);

  useEffect(() => {
    let live = true;
    (loadPdf ? loadPdf() : fetchReportPdf(reportId))
      .then((b) => { if (live) { setPdf(b); setState('ready'); } })
      .catch((e) => { if (live) { setProblem(e?.message || ''); setState('failed'); } });
    return () => { live = false; };
  }, [reportId, loadPdf]);

  useEffect(() => {
    if (!pdf || !holder.current) return undefined;
    let live = true;
    drawPdf(pdf, holder.current, () => live, () => { if (live) setDrawn(true); }).catch(() => {
      if (live) { setProblem('The pages could not be shown here. Download the PDF to read the report.'); setState('failed'); }
    });
    return () => { live = false; };
  }, [pdf]);

  const download = () => {
    const url = URL.createObjectURL(pdf);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || reportId}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {state === 'loading' && 'Preparing the report…'}
          {state === 'ready' && 'The report exactly as it prints.'}
          {state === 'failed' && (problem || 'The report could not be opened. Try again in a moment.')}
        </p>
        <button type="button" onClick={download} disabled={!pdf}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-500">
          <Download size={15} />Download PDF
        </button>
      </div>
      {(state === 'loading' || (pdf && !drawn && state !== 'failed')) && <ReportLoading />}
      {pdf && (
        <div className="rounded-2xl border border-gray-200 bg-gray-100 p-3 sm:p-6">
          <div ref={holder} className="space-y-4" />
        </div>
      )}
    </div>
  );
}
