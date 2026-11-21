import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { RefreshCw, UploadCloud, Save, ShieldCheck, Grid3x3, Users, Banknote, Link2, Copy, Check } from 'lucide-react';
import { adminFetch } from '../../../services/adminApi';
import { ADMIN_API_BASE } from '../../../services/apiBase';
import { Button, Field, Note } from '../../components/ui';
import { inputCls } from '../../components/formHelpers';

const ffbAdminBase = ADMIN_API_BASE.replace(/\/admin\/?$/, '/admin/ffb');

async function ffbAdminCall(path, options = {}) {
  const token = localStorage.getItem('fi_admin_token');
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${ffbAdminBase}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Error ${res.status}`);
  return data;
}

const OrgFfbSetup = ({ org }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [settings, setSettings] = useState(null);
  const [rates, setRates] = useState([]);
  const [counts, setCounts] = useState({ employees: 0, grid_cells: 0, records: 0 });
  const [prov, setProv] = useState(null);
  const [qrImg, setQrImg] = useState('');
  const [copied, setCopied] = useState(false);
  const [newRate, setNewRate] = useState({ role: 'Cutter', ripe_rate: 0, unripe_rate: 0, rotten_rate: 0, kg_rate: 0, unit: 'bunch' });
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const [data, provRes] = await Promise.all([
        ffbAdminCall(`/${org.schema_name}/settings`),
        ffbAdminCall(`/${org.schema_name}/provisioning`).catch(() => null),
      ]);
      setSettings(data.settings);
      setRates(data.pay_rates || []);
      setCounts(data.counts || { employees: 0, grid_cells: 0, records: 0 });
      if (provRes) {
        setProv(provRes);
        const url = await QRCode.toDataURL(provRes.qr_payload, { width: 160, margin: 1, color: { dark: '#034321', light: '#FFFFFF' } });
        setQrImg(url);
      }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [org.schema_name]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = async () => {
    setSaving(true); setErr(''); setMsg('');
    try {
      const updated = await ffbAdminCall(`/${org.schema_name}/settings`, { method: 'PATCH', body: JSON.stringify(settings) });
      setSettings(updated);
      setMsg('FFB settings saved.');
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };

  const rebuildFishnet = async () => {
    setRebuilding(true); setErr(''); setMsg('');
    try {
      const res = await ffbAdminCall(`/${org.schema_name}/fishnet/rebuild`, { method: 'POST' });
      setMsg(`Fishnet rebuilt: ${res.cells_created} edge cells across ${res.plots_processed} plots.`);
      await load();
    } catch (e) { setErr(e.message); } finally { setRebuilding(false); }
  };

  const uploadWorkforce = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setErr(''); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await ffbAdminCall(`/${org.schema_name}/employees/import`, { method: 'POST', body: fd });
      setMsg(`Workforce imported: ${res.created} added, ${res.updated} updated (${res.skipped} skipped).`);
      await load();
    } catch (ex) { setErr(ex.message); } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveRate = async () => {
    setErr(''); setMsg('');
    try {
      await ffbAdminCall(`/${org.schema_name}/pay-rates`, { method: 'POST', body: JSON.stringify(newRate) });
      setMsg(`Pay rate for ${newRate.role} saved.`);
      await load();
    } catch (ex) { setErr(ex.message); }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading FFB configuration…</p>;
  if (!settings) return <p className="text-sm text-red-600">{err || 'Could not load FFB settings.'}</p>;

  return (
    <div className="space-y-5">
      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">{msg}</div>}

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500 flex items-center gap-1.5"><Users size={13} /> Workforce</p>
          <p className="font-mono text-xl font-semibold text-gray-900 mt-1">{counts.employees}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500 flex items-center gap-1.5"><Grid3x3 size={13} /> Fishnet Cells</p>
          <p className="font-mono text-xl font-semibold text-gray-900 mt-1">{counts.grid_cells}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500 flex items-center gap-1.5"><ShieldCheck size={13} /> Harvest Scans</p>
          <p className="font-mono text-xl font-semibold text-gray-900 mt-1">{counts.records}</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Anti-Fraud Shield & Rules</p>
          <Button onClick={saveSettings} disabled={saving}><Save size={14} />{saving ? 'Saving…' : 'Save rules'}</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <input className={inputCls} value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Reconciliation mode">
            <select className={inputCls} value={settings.reconciliation_mode} onChange={(e) => setSettings({ ...settings, reconciliation_mode: e.target.value })}>
              <option value="3_layer">3-Layer (Harvester + Loader + Owner)</option>
              <option value="2_layer">2-Layer (Harvester + Loader)</option>
            </select>
          </Field>
          <Field label="Auto-approve score (0-100)">
            <input type="number" className={inputCls} value={settings.auto_approve_score} onChange={(e) => setSettings({ ...settings, auto_approve_score: Number(e.target.value) })} />
          </Field>
          <Field label="Auto-reject score (below)">
            <input type="number" className={inputCls} value={settings.auto_reject_score} onChange={(e) => setSettings({ ...settings, auto_reject_score: Number(e.target.value) })} />
          </Field>
          <Field label="Max manual stepper add (+N)">
            <input type="number" className={inputCls} value={settings.max_manual_stepper_add} onChange={(e) => setSettings({ ...settings, max_manual_stepper_add: Number(e.target.value) })} />
          </Field>
          <Field label="Settlement cutoff day">
            <input type="number" className={inputCls} value={settings.settlement_cutoff_day} onChange={(e) => setSettings({ ...settings, settlement_cutoff_day: Number(e.target.value) })} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Edge Platform Fishnet Grid</p>
          <p className="text-xs text-gray-500 mt-0.5">Generates {settings.edge_band_m}m × {settings.grid_segment_m}m PostGIS boundary cells directly from this organisation&apos;s uploaded estate boundaries.</p>
        </div>
        <Button variant="secondary" onClick={rebuildFishnet} disabled={rebuilding}>
          <RefreshCw size={14} className={rebuilding ? 'animate-spin' : ''} />{rebuilding ? 'Building…' : 'Rebuild Fishnet'}
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Workforce Roster (CSV / Excel)</p>
          <p className="text-xs text-gray-500 mt-0.5">Columns: employee_id, first_name, last_name, function, division, team, contractor.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={uploadWorkforce} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
            <UploadCloud size={14} />{importing ? 'Importing…' : 'Upload CSV'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><Banknote size={15} /> Default Pay Rates ({settings.currency})</p>
        {rates.length > 0 && (
          <div className="text-xs divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {rates.map((r) => (
              <div key={r.id} className="px-3 py-2 flex justify-between font-mono">
                <span className="font-semibold text-gray-800">{r.role}</span>
                <span className="text-gray-600">Ripe {r.ripe_rate} · Unripe {r.unripe_rate} · Rotten {r.rotten_rate} · Kg {r.kg_rate} ({r.unit})</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-6 gap-2 items-end">
          <Field label="Role"><input className={inputCls} value={newRate.role} onChange={(e) => setNewRate({ ...newRate, role: e.target.value })} /></Field>
          <Field label="Ripe"><input type="number" className={inputCls} value={newRate.ripe_rate} onChange={(e) => setNewRate({ ...newRate, ripe_rate: Number(e.target.value) })} /></Field>
          <Field label="Unripe"><input type="number" className={inputCls} value={newRate.unripe_rate} onChange={(e) => setNewRate({ ...newRate, unripe_rate: Number(e.target.value) })} /></Field>
          <Field label="Rotten"><input type="number" className={inputCls} value={newRate.rotten_rate} onChange={(e) => setNewRate({ ...newRate, rotten_rate: Number(e.target.value) })} /></Field>
          <Field label="Per Kg"><input type="number" className={inputCls} value={newRate.kg_rate} onChange={(e) => setNewRate({ ...newRate, kg_rate: Number(e.target.value) })} /></Field>
          <Button onClick={saveRate}>Set Rate</Button>
        </div>
      </div>

      {prov && (
        <div className="rounded-xl border border-green-200 bg-green-50/40 p-4 flex items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-sm font-semibold text-[#034321] flex items-center gap-1.5"><Link2 size={14} /> Direct Org Portal &amp; App Connection</p>
            <p className="text-xs font-mono text-gray-700 truncate">{prov.portal_url}</p>
            <p className="text-[11px] text-gray-600">
              Active AI Model: <strong className="font-mono">{prov.active_ml_model?.version || 'Bundled default'}</strong>
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => { navigator.clipboard?.writeText(prov.login_url); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-800">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied login link' : 'Copy org login link'}
              </button>
              {prov.apk_download_url && (
                <a href={prov.apk_download_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#3F8432] underline">
                  Download APK
                </a>
              )}
            </div>
          </div>
          {qrImg && <img src={qrImg} alt="Org Setup QR" className="w-24 h-24 rounded-lg border border-gray-200 bg-white p-1 shrink-0" />}
        </div>
      )}

      <Note>Mobile clerks scan the Setup QR above or sign in with Org Code <span className="font-mono font-semibold">{org.schema_name}</span> on the universal <strong>Earthintelytics FFB</strong> APK.</Note>
    </div>
  );
};

export default OrgFfbSetup;
