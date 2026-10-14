import { useCallback, useEffect, useState } from 'react';
import { HardDrive, RefreshCw } from 'lucide-react';
import { fetchStorageUsage } from '../../../services/adminApi';

const fmtBytes = (b) => {
  if (b == null) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
};

/** MinIO storage in total and per organisation, with what each organisation's space is used for. */
export default function StorageUsage({ disk }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback((refresh = false) => {
    setLoading(true); setError('');
    fetchStorageUsage(refresh)
      .then((d) => setData(d))
      .catch((e) => setError(e.message || 'Could not load storage use'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(false); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- load on open

  const total = data?.total_bytes || 0;
  const orgs = data?.organisations || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Object storage (MinIO) used</p>
          <p className="font-mono text-2xl font-semibold text-gray-900 mt-1">{loading && !data ? '…' : fmtBytes(total)}</p>
          <p className="text-xs text-gray-500 mt-1">{data?.total_objects != null ? `${data.total_objects.toLocaleString()} files in ${data.bucket}` : ''}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Server disk used</p>
          <p className="font-mono text-2xl font-semibold text-gray-900 mt-1">{disk?.percent_used != null ? `${disk.percent_used}%` : '—'}</p>
          <p className="text-xs text-gray-500 mt-1">{disk?.free_gb != null ? `${disk.free_gb} GB free` : 'Not reported'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between">
          <p className="text-xs text-gray-500">Counted</p>
          <p className="text-sm text-gray-800 mt-1">{data?.computed_at ? new Date(data.computed_at).toLocaleString() : '—'}</p>
          <button type="button" onClick={() => load(true)} disabled={loading}
            className="mt-2 self-start inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Count again
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {data && data.available === false && <p className="text-sm text-amber-800">{data.message}</p>}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
            <tr><th className="px-5 py-3">Organisation</th><th className="px-5 py-3">Space used</th><th className="px-5 py-3 w-1/3">Share</th><th className="px-5 py-3">Files</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && !data && <tr><td colSpan={4} className="px-5 py-6 text-gray-500">Counting the files in storage…</td></tr>}
            {orgs.map((o) => {
              const share = total ? (o.bytes / total) * 100 : 0;
              return [
                <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(open === o.id ? null : o.id)}>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 font-medium text-gray-900"><HardDrive size={14} className="text-gray-400" />{o.name}</span>
                    {!o.is_organisation && <span className="ml-2 text-xs text-gray-500">(shared, not an organisation)</span>}
                  </td>
                  <td className="px-5 py-3 font-mono">{fmtBytes(o.bytes)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2"><div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-[var(--brand-primary)]" style={{ width: `${Math.max(share, 0.5)}%` }} /></div><span className="text-xs text-gray-500 w-12 text-right">{share.toFixed(1)}%</span></div>
                  </td>
                  <td className="px-5 py-3 font-mono text-gray-600">{o.objects.toLocaleString()}</td>
                </tr>,
                open === o.id && (
                  <tr key={`${o.id}-areas`} className="bg-gray-50/60">
                    <td colSpan={4} className="px-5 py-3">
                      <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2 text-xs">
                        {o.areas.map((a) => <li key={a.id} className="flex justify-between"><span className="text-gray-600">{a.label}</span><span className="font-mono text-gray-900">{fmtBytes(a.bytes)}</span></li>)}
                      </ul>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Click an organisation to see what its space is used for. Old runs are removed by the retention setting; uploads and boundaries are never removed automatically.</p>
    </div>
  );
}
