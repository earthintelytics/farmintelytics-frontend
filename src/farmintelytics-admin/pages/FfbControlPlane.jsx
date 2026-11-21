import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone, Cpu, Building2, Copy, Check, QrCode, UploadCloud,
  RotateCcw, ExternalLink, Link2, Save, X,
} from 'lucide-react';
import { ADMIN_API_BASE } from '../../services/apiBase';

const FFB_ADMIN = ADMIN_API_BASE.replace(/\/admin\/?$/, '/admin/ffb');

async function ffbAdminCall(path, options = {}) {
  const token = localStorage.getItem('fi_admin_token');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${FFB_ADMIN}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Error ${res.status}`);
  return data;
}

export default function FfbControlPlane() {
  const [tab, setTab] = useState('orgs'); // orgs | connection | models
  const [config, setConfig] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [models, setModels] = useState([]);
  const [qrModal, setQrModal] = useState(null);
  const [qrImg, setQrImg] = useState('');
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // APK upload state
  const [apkVersion, setApkVersion] = useState('0.1.12+14');
  const [apkNotes, setApkNotes] = useState('');
  const apkRef = useRef(null);

  // ML model upload state
  const [mlVersion, setMlVersion] = useState('ffb-yolo11-v1.0.1');
  const [mlScope, setMlScope] = useState('');
  const [mlNotes, setMlNotes] = useState('');
  const [mlConf, setMlConf] = useState(0.18);
  const [mlIou, setMlIou] = useState(0.50);
  const mlRef = useRef(null);

  const load = async () => {
    setErr('');
    try {
      const [cfg, ov, ml] = await Promise.all([
        ffbAdminCall('/platform-config'),
        ffbAdminCall('/overview'),
        ffbAdminCall('/ml-models'),
      ]);
      setConfig(cfg);
      setOrgs(ov.items || []);
      setModels(ml.items || []);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); }, []);

  const copyText = (key, text) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  const openProvisioning = async (companyId) => {
    setErr('');
    try {
      const pack = await ffbAdminCall(`/${companyId}/provisioning`);
      const imgUrl = await QRCode.toDataURL(pack.qr_payload, {
        width: 260,
        margin: 2,
        color: { dark: '#034321', light: '#FFFFFF' },
      });
      setQrModal(pack);
      setQrImg(imgUrl);
    } catch (e) { setErr(e.message); }
  };

  const saveConnection = async () => {
    setErr(''); setMsg('');
    try {
      const updated = await ffbAdminCall('/platform-config', {
        method: 'PATCH',
        body: JSON.stringify({
          server_url: config.server_url,
          portal_url: config.portal_url,
          min_apk_version: config.min_apk_version,
        }),
      });
      setConfig(updated);
      setMsg('Cloud server & portal URLs saved.');
    } catch (e) { setErr(e.message); }
  };

  const uploadApk = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('version', apkVersion);
      fd.append('release_notes', apkNotes);
      const updated = await ffbAdminCall('/apk/publish', { method: 'POST', body: fd });
      setConfig(updated);
      setMsg(`APK ${updated.latest_apk_version} published to cloud storage.`);
    } catch (ex) { setErr(ex.message); } finally {
      if (apkRef.current) apkRef.current.value = '';
    }
  };

  const uploadModel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(''); setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('version', mlVersion);
      fd.append('company_id', mlScope);
      fd.append('confidence_threshold', String(mlConf));
      fd.append('iou_threshold', String(mlIou));
      fd.append('release_notes', mlNotes);
      fd.append('activate', 'true');
      await ffbAdminCall('/ml-models/publish', { method: 'POST', body: fd });
      setMsg(`AI Model ${mlVersion} published and activated for OTA rollout.`);
      await load();
    } catch (ex) { setErr(ex.message); } finally {
      if (mlRef.current) mlRef.current.value = '';
    }
  };

  const activateModel = async (version) => {
    setErr(''); setMsg('');
    try {
      await ffbAdminCall(`/ml-models/${encodeURIComponent(version)}/activate`, { method: 'POST' });
      setMsg(`Activated ${version}.`);
      await load();
    } catch (ex) { setErr(ex.message); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900">FFB &amp; Mobile Control Plane</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure cloud connection, distribute universal APK &amp; per-organisation setup links, and push OTA AI models.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { id: 'orgs', label: 'Organisations & Links', icon: Building2 },
            { id: 'connection', label: 'App & Connection', icon: Smartphone },
            { id: 'models', label: 'AI Models (OTA)', icon: Cpu },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border ${
                tab === id ? 'bg-[#034321] text-white border-[#034321]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">{msg}</div>}

      {tab === 'orgs' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Direct FFB Portal Link</th>
                <th className="px-4 py-3">Workforce</th>
                <th className="px-4 py-3">Devices</th>
                <th className="px-4 py-3">Fishnet Cells</th>
                <th className="px-4 py-3">Records</th>
                <th className="px-4 py-3 text-right">Mobile Provisioning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No organisations have FFB licensed yet. Enable it under Organisations → Licence.</td></tr>
              ) : orgs.map((o) => {
                const portalUrl = `${config?.portal_url || window.location.origin}/org/${o.company_id}/ffb-counter`;
                const loginUrl = `${config?.portal_url || window.location.origin}/org/${o.company_id}/login?next=ffb-counter`;
                return (
                  <tr key={o.company_id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{o.display_name}</p>
                      <p className="font-mono text-[11px] text-gray-500">{o.company_id}</p>
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-gray-700 truncate max-w-xs">{portalUrl}</span>
                        <button onClick={() => copyText(o.company_id, portalUrl)} className="p-1 rounded hover:bg-gray-100 text-[#3F8432]">
                          {copied === o.company_id ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                        <a href={portalUrl} target="_blank" rel="noreferrer" className="p-1 rounded hover:bg-gray-100 text-gray-500"><ExternalLink size={13} /></a>
                      </div>
                      <button onClick={() => copyText(`${o.company_id}-login`, loginUrl)} className="text-[11px] text-gray-500 hover:text-gray-800 inline-flex items-center gap-1">
                        <Link2 size={11} /> {copied === `${o.company_id}-login` ? 'Login link copied!' : 'Copy direct login link'}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-mono">{o.employees}</td>
                    <td className="px-4 py-3 font-mono">{o.devices ?? 0}</td>
                    <td className="px-4 py-3 font-mono">{o.grid_cells}</td>
                    <td className="px-4 py-3 font-mono">{o.records}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openProvisioning(o.company_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 text-[#034321] font-semibold hover:bg-green-100">
                        <QrCode size={14} /> Setup QR &amp; App
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'connection' && config && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-display text-base font-semibold">Cloud Endpoints (No Hardcoding)</h2>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Backend API Server URL</label>
                <input className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono" value={config.server_url}
                  onChange={(e) => setConfig({ ...config, server_url: e.target.value })} placeholder="https://api.earthintelytics.com" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Web Portal Base URL</label>
                <input className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono" value={config.portal_url}
                  onChange={(e) => setConfig({ ...config, portal_url: e.target.value })} placeholder="https://portal.earthintelytics.com" />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Minimum Required APK Version</label>
                <input className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono" value={config.min_apk_version}
                  onChange={(e) => setConfig({ ...config, min_apk_version: e.target.value })} />
              </div>
            </div>
            <button onClick={saveConnection} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3F8432] text-white text-xs font-semibold">
              <Save size={14} /> Save Endpoints
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-display text-base font-semibold">Universal Android APK Release</h2>
            <p className="text-xs text-gray-500">Upload <span className="font-mono">Earthintelytics_FFB_Release.apk</span> once to cloud MinIO. Every organisation shares this universal binary.</p>
            {config.latest_apk_version && (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1 font-mono">
                <p>Latest: <strong>{config.latest_apk_version}</strong> ({((config.apk_size_bytes || 0) / 1048576).toFixed(2)} MB)</p>
                <p className="text-gray-500 truncate">SHA-256: {config.apk_sha256}</p>
                {config.apk_download_url && (
                  <a href={config.apk_download_url} target="_blank" rel="noreferrer" className="text-[#3F8432] underline inline-block mt-1">Download APK</a>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input className="px-3 py-2 border border-gray-200 rounded-xl font-mono" value={apkVersion} onChange={(e) => setApkVersion(e.target.value)} placeholder="Version e.g. 0.1.12+14" />
              <input className="px-3 py-2 border border-gray-200 rounded-xl" value={apkNotes} onChange={(e) => setApkNotes(e.target.value)} placeholder="Release notes" />
            </div>
            <input ref={apkRef} type="file" accept=".apk" className="hidden" onChange={uploadApk} />
            <button onClick={() => apkRef.current?.click()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold hover:bg-gray-50">
              <UploadCloud size={14} /> Upload &amp; Publish .apk
            </button>
          </div>
        </div>
      )}

      {tab === 'models' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-display text-base font-semibold">Publish New YOLOv11 TFLite Model (Cloud OTA)</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <input className="px-3 py-2 border rounded-xl font-mono" value={mlVersion} onChange={(e) => setMlVersion(e.target.value)} placeholder="Version tag" />
              <input className="px-3 py-2 border rounded-xl font-mono" value={mlScope} onChange={(e) => setMlScope(e.target.value)} placeholder="Org slug (blank = global)" />
              <input type="number" step="0.01" className="px-3 py-2 border rounded-xl font-mono" value={mlConf} onChange={(e) => setMlConf(e.target.value)} placeholder="Conf (0.18)" />
              <input type="number" step="0.01" className="px-3 py-2 border rounded-xl font-mono" value={mlIou} onChange={(e) => setMlIou(e.target.value)} placeholder="IoU (0.50)" />
              <input className="px-3 py-2 border rounded-xl" value={mlNotes} onChange={(e) => setMlNotes(e.target.value)} placeholder="Release notes" />
            </div>
            <input ref={mlRef} type="file" accept=".tflite" className="hidden" onChange={uploadModel} />
            <button onClick={() => mlRef.current?.click()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3F8432] text-white text-xs font-semibold">
              <UploadCloud size={14} /> Upload .tflite &amp; Activate OTA
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Version</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Thresholds</th>
                  <th className="px-4 py-3">Size / SHA-256</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {models.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No OTA ML models published yet. Upload a .tflite release above or run publish_model.py.</td></tr>
                ) : models.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-mono font-semibold">{m.version}</td>
                    <td className="px-4 py-3">{m.company_id || 'Global (all orgs)'}</td>
                    <td className="px-4 py-3 font-mono">conf={m.confidence_threshold} · iou={m.iou_threshold}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{(m.file_size_bytes / 1048576).toFixed(2)} MB · {m.sha256.slice(0, 12)}…</td>
                    <td className="px-4 py-3">{m.is_active ? <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-800 font-semibold">Active</span> : 'Archived'}</td>
                    <td className="px-4 py-3 text-right">
                      {!m.is_active && (
                        <button onClick={() => activateModel(m.version)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 font-semibold hover:bg-gray-50">
                          <RotateCcw size={12} /> Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {qrModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-display text-lg font-semibold">{qrModal.display_name} — Mobile Setup</h3>
              <button onClick={() => setQrModal(null)}><X size={18} /></button>
            </div>
            {qrImg && <img src={qrImg} alt="Provisioning QR" className="mx-auto w-52 h-52 border border-gray-200 rounded-xl p-2" />}
            <div className="text-xs space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
              <p><strong>Org Code:</strong> <span className="font-mono">{qrModal.company_id}</span></p>
              <p className="truncate"><strong>Portal Link:</strong> <span className="font-mono">{qrModal.portal_url}</span></p>
              <p className="truncate"><strong>API Endpoint:</strong> <span className="font-mono">{qrModal.api_base}</span></p>
              {qrModal.apk_download_url && (
                <a href={qrModal.apk_download_url} target="_blank" rel="noreferrer" className="inline-block font-semibold text-[#3F8432] underline">
                  Download Earthintelytics FFB APK ({qrModal.latest_apk_version})
                </a>
              )}
            </div>
            <p className="text-[11px] text-gray-500">Field clerks scan this QR on the Earthintelytics FFB sign-in screen to lock the phone directly to {qrModal.display_name}.</p>
          </div>
        </div>
      )}
    </div>
  );
}
