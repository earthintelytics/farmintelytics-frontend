/**
 * Documentation: how the system and each service work, the data behind them and their references.
 * Team only: the text comes from the backend (GET /admin/documentation, team sign-in required), generated from the
 * repo's docs folder by docs/build_admin_docs.py. Nothing of it ships in the public website files.
 */
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search } from 'lucide-react';
import { Page, Card, Empty, Loading } from '../components/ui';
import { fetchAdminDocs } from '../../services/adminApi';

const readHash = () => (window.location.hash.startsWith('#doc:') ? window.location.hash.slice(5) : '');

// Markdown elements in the console's style: plain words, white surfaces, tables that scroll on their own.
const md = (open) => ({
  h1: (p) => <h1 className="font-display text-2xl font-semibold text-gray-900 mt-2 mb-4" {...p} />,
  h2: (p) => <h2 className="font-display text-lg font-semibold text-gray-900 mt-8 mb-3" {...p} />,
  h3: (p) => <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2" {...p} />,
  h4: (p) => <h4 className="text-sm font-semibold text-gray-900 mt-4 mb-2" {...p} />,
  p: (p) => <p className="text-sm text-gray-700 leading-relaxed my-3" {...p} />,
  ul: (p) => <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 my-3" {...p} />,
  ol: (p) => <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700 my-3" {...p} />,
  li: (p) => <li className="leading-relaxed" {...p} />,
  strong: (p) => <strong className="font-semibold text-gray-900" {...p} />,
  code: (p) => <code className="text-[13px] bg-gray-100 text-gray-800 rounded px-1 py-0.5 break-words" {...p} />,
  pre: (p) => <pre className="text-[13px] bg-gray-50 border border-gray-200 rounded-xl p-4 overflow-x-auto my-4" {...p} />,
  blockquote: (p) => <blockquote className="border-l-4 border-green-200 pl-4 text-sm text-gray-600 my-4" {...p} />,
  hr: () => <hr className="my-8 border-gray-200" />,
  // Photos are the portal's own service pictures (/crops/*.webp).
  img: ({ src, alt }) => <img src={src} alt={alt || ''} loading="lazy" className="w-full h-56 object-cover rounded-xl border border-gray-200 my-4" />,
  table: (p) => <div className="overflow-x-auto my-4 border border-gray-200 rounded-xl"><table className="w-full text-sm" {...p} /></div>,
  thead: (p) => <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600" {...p} />,
  th: (p) => <th className="px-4 py-2.5 align-top" {...p} />,
  td: (p) => <td className="px-4 py-2.5 align-top border-t border-gray-100 text-gray-700" {...p} />,
  a: ({ href = '', children }) => href.startsWith('#doc:')
    ? <button type="button" onClick={() => open(href.slice(5))} className="font-medium text-green-700 hover:underline">{children}</button>
    : <a href={href} target="_blank" rel="noreferrer" className="font-medium text-green-700 hover:underline break-words">{children}</a>,
});

export default function Documentation() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(readHash);

  useEffect(() => {
    let active = true;
    fetchAdminDocs()
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e.message || 'The documentation could not be loaded.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onHash = () => setCurrent(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const open = (id) => {
    window.history.replaceState(null, '', `#doc:${id}`);
    setCurrent(id);
    document.getElementById('doc-body')?.scrollTo({ top: 0 });
  };

  const groups = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.groups
      .map((g) => ({ ...g, ids: g.ids.filter((id) => !q || data.docs[id].title.toLowerCase().includes(q) || data.docs[id].markdown.toLowerCase().includes(q)) }))
      .filter((g) => g.ids.length);
  }, [data, query]);

  const docId = data && data.docs[current] ? current : data?.groups?.[0]?.ids?.[0];
  const doc = data?.docs?.[docId];

  return (
    <Page wide eyebrow="Help" title="Documentation"
      text={`How the platform and each service work, the data behind them and their references. Team only.${data?.built ? ` Updated ${data.built}.` : ''}`}>
      {error ? <Empty>{error}</Empty> : !data ? <Loading /> : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          <Card className="p-4 lg:sticky lg:top-0">
            <label className="relative block mb-4">
              <span className="sr-only">Search the documentation</span>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600" />
            </label>
            {groups.length === 0 ? <p className="text-sm text-gray-500 px-1">Nothing matches "{query}".</p> : (
              <nav className="space-y-5 max-h-[70vh] overflow-y-auto">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="px-2 mb-1.5 text-xs font-medium text-gray-400">{g.label}</p>
                    {g.ids.map((id) => (
                      <button key={id} type="button" onClick={() => open(id)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${id === docId ? 'bg-green-50 text-green-800 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                        {data.docs[id].title}
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            )}
          </Card>
          <Card className="p-6 sm:p-8 min-w-0">
            {doc ? (
              <article id="doc-body">
                <p className="text-xs text-gray-400 mb-2">{doc.path}</p>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={md(open)}>{doc.markdown}</ReactMarkdown>
              </article>
            ) : <Empty>No documentation has been generated yet. Run python docs/build_admin_docs.py.</Empty>}
          </Card>
        </div>
      )}
    </Page>
  );
}
