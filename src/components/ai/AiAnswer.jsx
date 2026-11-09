import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * An AI answer, laid out the way it should read: short paragraphs, lists, a few bold words; headings shown as
 * bold lines (never large titles), tables kept simple. Block codes read as people say them ("Plot 1").
 */
const readable = (text) => String(text || '').replace(/\b([A-Za-z]+)_0*(\d+)\b/g, '$1 $2');

const parts = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  h1: ({ children }) => <p className="font-semibold text-gray-900">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-gray-900">{children}</p>,
  h3: ({ children }) => <p className="font-semibold text-gray-900">{children}</p>,
  h4: ({ children }) => <p className="font-semibold text-gray-900">{children}</p>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-green-800 underline">{children}</a>,
  table: ({ children }) => <div className="overflow-x-auto"><table className="text-sm border-collapse">{children}</table></div>,
  th: ({ children }) => <th className="text-left font-semibold text-gray-700 border-b border-gray-200 px-2 py-1">{children}</th>,
  td: ({ children }) => <td className="border-b border-gray-100 px-2 py-1">{children}</td>,
  code: ({ children }) => <span className="font-mono">{children}</span>,
};

export default function AiAnswer({ text, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={parts}>{readable(text)}</ReactMarkdown>
    </div>
  );
}
