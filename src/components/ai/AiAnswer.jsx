import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MapPin } from 'lucide-react';
import { DIRECTIONS_URL, readable, withDirections } from './answerText';

/**
 * An AI answer, laid out the way it should read: short paragraphs, points, a few bold words; the bold labels
 * (What I see, Where, What to do) as small headings; tables framed, shaded at the top and scrolling sideways
 * on their own on a phone, so nothing runs off the screen. Long words wrap. GPS points become "Directions"
 * buttons that open the phone's maps. Block codes read as people say them ("Plot 1").
 */

const WRAP = 'break-words [overflow-wrap:anywhere]';

const parts = {
  p: ({ children }) => <p className={`leading-relaxed ${WRAP}`}>{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 marker:text-green-700">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 marker:font-semibold marker:text-green-800">{children}</ol>,
  li: ({ children }) => <li className={`leading-relaxed pl-0.5 ${WRAP}`}>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  h1: ({ children }) => <p className="font-semibold text-gray-900 pt-1">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-gray-900 pt-1">{children}</p>,
  h3: ({ children }) => <p className="font-semibold text-gray-900 pt-1">{children}</p>,
  h4: ({ children }) => <p className="font-semibold text-gray-900 pt-1">{children}</p>,
  a: ({ href, children }) => (String(href || '').startsWith(DIRECTIONS_URL) ? (
    // A GPS point: a button that opens directions to it in Google Maps (or the phone's maps app).
    <a href={href} target="_blank" rel="noreferrer" title="Directions to this point"
      className="inline-flex items-center gap-1 align-baseline whitespace-nowrap rounded-md border border-green-200 bg-green-50 px-1.5 py-0.5 font-mono text-[12px] text-green-900 no-underline hover:bg-green-100">
      <MapPin size={12} className="shrink-0" />{children}<span className="font-sans font-semibold">· Directions</span>
    </a>
  ) : <a href={href} target="_blank" rel="noreferrer" className={`text-green-800 underline ${WRAP}`}>{children}</a>),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-lg border border-gray-200 max-w-full">
      <table className="min-w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => <th className="text-left font-semibold text-gray-700 border-b border-gray-200 px-3 py-2 whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="border-b border-gray-100 px-3 py-2 align-top">{children}</td>,
  code: ({ children }) => <span className={`font-mono ${WRAP}`}>{children}</span>,
};

export default function AiAnswer({ text, className = '' }) {
  return (
    <div className={`space-y-3 min-w-0 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={parts}>{withDirections(readable(text))}</ReactMarkdown>
    </div>
  );
}
