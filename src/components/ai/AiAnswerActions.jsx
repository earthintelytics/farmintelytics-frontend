import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Check, Copy, FileDown } from 'lucide-react';
import AiAnswer from './AiAnswer';
import { plainText } from './answerText';

/**
 * Under an AI answer: Copy (plain text for WhatsApp, email or a document) and Save as PDF (the answer as a
 * one-page report: the question as its title, the farm or result and the date, the answer with its tables,
 * and a note that it was written with AI). Shared by every advisor.
 */

// ── The printed page ─────────────────────────────────────────────────────────────────────────────
const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #ffffff; color: #111827; font: 11pt/1.55 Inter, system-ui, sans-serif; }
  .eyebrow { font-size: 8.5pt; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #2E7D32; }
  h1 { font-family: Sora, Inter, sans-serif; font-size: 17pt; line-height: 1.25; margin: 4pt 0 2pt; }
  .meta { font-size: 9pt; color: #6B7280; margin-bottom: 14pt; padding-bottom: 10pt; border-bottom: 1px solid #E5E7EB; }
  p, li { text-align: justify; hyphens: auto; overflow-wrap: anywhere; }
  ul, ol { padding-left: 16pt; } li { margin: 2pt 0; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin: 4pt 0; }
  th { background: #F9FAFB; text-align: left; font-weight: 600; }
  th, td { border: 1px solid #E5E7EB; padding: 4pt 6pt; vertical-align: top; }
  .note { margin-top: 16pt; padding-top: 8pt; border-top: 1px solid #E5E7EB; font-size: 8.5pt; color: #6B7280; }
`;

const escapeHtml = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function printAnswer({ text, question, about }) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const body = renderToStaticMarkup(<AiAnswer text={text} />);
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(question || 'Advisor answer')}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Sora:wght@600&display=swap" rel="stylesheet">
    <style>${PRINT_CSS}</style></head><body>
    <div class="eyebrow">FarmIntelytics · AI advisor</div>
    <h1>${escapeHtml(question || 'Advisor answer')}</h1>
    <div class="meta">${escapeHtml([about, today].filter(Boolean).join(' · '))}</div>
    ${body}
    <div class="note">Written with AI from this farm's own data on ${escapeHtml(today)}. Check important decisions in the field.</div>
    </body></html>`);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}

export default function AiAnswerActions({ text, question = '', about = '' }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText(text));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* no clipboard (an old browser or http): nothing to do */ }
  };
  const button = 'inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-50';
  return (
    <div className="flex flex-wrap items-center gap-1 -ml-2">
      <button type="button" onClick={copy} className={button} aria-label="Copy the answer">
        {copied ? <Check size={14} className="text-green-700" /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}
      </button>
      <button type="button" onClick={() => printAnswer({ text, question, about })} className={button} aria-label="Save the answer as a PDF">
        <FileDown size={14} />Save as PDF
      </button>
    </div>
  );
}
