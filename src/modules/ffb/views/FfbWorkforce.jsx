import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, UploadCloud, Plus, X, Printer } from 'lucide-react';
import { buildQuery, ffbCall } from '../api/ffbApi';

export default function FfbWorkforce({ tenantSlug }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [badge, setBadge] = useState(null);
  const [qrImg, setQrImg] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ employee_id: '', first_name: '', last_name: '', function: 'CUTTER', division: '', team: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const load = () => {
    setErr('');
    ffbCall(`/employees${buildQuery({ search })}`, { tenantSlug })
      .then((res) => setItems(res.items || []))
      .catch((e) => setErr(e.message));
  };

  useEffect(() => { load(); }, [tenantSlug, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBadge = async (empId) => {
    try {
      const b = await ffbCall(`/employees/${encodeURIComponent(empId)}/badge`, { tenantSlug });
      const url = await QRCode.toDataURL(b.qr_payload, { width: 260, margin: 2, color: { dark: '#034321', light: '#FFFFFF' } });
      setBadge(b);
      setQrImg(url);
    } catch (e) { setErr(e.message); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await ffbCall('/employees/import', { method: 'POST', form: fd, tenantSlug });
      setMsg(`Imported ${res.created} new, updated ${res.updated}.`);
      load();
    } catch (ex) { setErr(ex.message); } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveEmployee = async () => {
    setErr(''); setMsg('');
    try {
      await ffbCall('/employees', { method: 'POST', body: form, tenantSlug });
      setAdding(false);
      setForm({ employee_id: '', first_name: '', last_name: '', function: 'CUTTER', division: '', team: '' });
      load();
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-main)]">Workforce & QR Badges</h1>
          <p className="text-sm text-[var(--text-muted)]">Authorized cutters, carriers, pickers, and field clerks for this enterprise.</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff ID or name…"
            className="px-3 py-1.5 text-xs rounded-xl border border-[var(--border-light)] bg-white w-48" />
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-light)] bg-white text-xs font-semibold">
            <UploadCloud size={14} /> Import CSV
          </button>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold">
            <Plus size={14} /> Add Worker
          </button>
        </div>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">{msg}</div>}

      <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-light)]">
            <tr>
              <th className="px-4 py-3">Staff ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Function</th>
              <th className="px-4 py-3">Division</th><th className="px-4 py-3">Team</th><th className="px-4 py-3">QR Eligible</th><th className="px-4 py-3 text-right">Badge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">No workers registered yet. Upload a CSV roster to get started.</td></tr>
            ) : items.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5 font-mono font-semibold">{e.employee_id}</td>
                <td className="px-4 py-2.5 font-semibold">{e.full_name}</td>
                <td className="px-4 py-2.5">{e.function}</td>
                <td className="px-4 py-2.5">{e.division || '—'}</td>
                <td className="px-4 py-2.5">{e.team || '—'}</td>
                <td className="px-4 py-2.5">{e.qr_eligible ? <span className="text-green-700 font-semibold">Yes</span> : <span className="text-gray-400">Clerk / Restricted</span>}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => openBadge(e.employee_id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-[var(--brand-primary)] font-semibold">
                    <QrCode size={13} /> Badge
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {badge && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center p-4" onClick={() => setBadge(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono uppercase text-[var(--brand-primary)] font-semibold">{badge.company_id} · FFB ID</span>
              <button onClick={() => setBadge(null)}><X size={18} /></button>
            </div>
            {qrImg && <img src={qrImg} alt="Worker QR" className="mx-auto w-52 h-52 border border-gray-200 rounded-xl p-2" />}
            <div>
              <p className="font-display text-lg font-semibold">{badge.full_name}</p>
              <p className="font-mono text-sm text-gray-600">{badge.employee_id} · {badge.function}</p>
              <p className="text-xs text-gray-400">{badge.division}</p>
            </div>
            <button onClick={() => window.print()} className="w-full py-2 rounded-xl bg-[#034321] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5">
              <Printer size={14} /> Print Badge
            </button>
          </div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-base font-semibold">Add Worker / Clerk</h3>
            <input placeholder="Staff ID" className="w-full px-3 py-2 text-xs border rounded-xl" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="First name" className="px-3 py-2 text-xs border rounded-xl" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              <input placeholder="Last name" className="px-3 py-2 text-xs border rounded-xl" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <input placeholder="Function (e.g. CUTTER, CARRIER, PICKER, RECORDER, COUNTER)" className="w-full px-3 py-2 text-xs border rounded-xl" value={form.function} onChange={(e) => setForm({ ...form, function: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Division" className="px-3 py-2 text-xs border rounded-xl" value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} />
              <input placeholder="Team" className="px-3 py-2 text-xs border rounded-xl" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-xs rounded-xl border">Cancel</button>
              <button onClick={saveEmployee} className="px-4 py-1.5 text-xs rounded-xl bg-[var(--brand-primary)] text-white font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
