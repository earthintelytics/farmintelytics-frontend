import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  RefreshCw, UploadCloud, Save, ShieldCheck, Grid3x3, Users,
  Banknote, Link2, Copy, Check, Map as MapIcon, Layers, Shield,
} from 'lucide-react';
import { ADMIN_API_BASE } from '../../../services/apiBase';
import { Button, Field, Note } from '../../components/ui';
import { useConfirm } from '../../../components/ConfirmProvider';
import { inputCls } from '../../components/formHelpers';

const ffbAdminBase = ADMIN_API_BASE.replace(/\/admin\/?$/, '/admin/ffb');

async function ffbAdminCall(path, options = {}) {
  const token = localStorage.getItem('fi_admin_token');
  const headers = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${ffbAdminBase}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.message || `Error ${res.status}`);
  return data;
}

const SHIELD_LAYERS = [
  { id: 'L1', name: 'Spatial Fishnet & Edge Geofence', desc: 'Verifies GPS coordinates fall inside an uploaded estate polygon or within the configurable edge buffer.' },
  { id: 'L2', name: 'Reconciliation Match (Harvester vs Loader)', desc: 'Compares harvesting clerk bunches/kg against loading clerk truck counts for the plot and day.' },
  { id: 'L3', name: 'Duplicate Scan Prevention', desc: 'Flags near-identical timestamp, GPS, plot, and count submissions or repeated client IDs.' },
  { id: 'L4', name: 'Temporal Plausibility & Teleport Check', desc: 'Checks inter-scan intervals and flags physically impossible travel speeds exceeding max teleport speed.' },
  { id: 'L5', name: 'Device & Session Integrity', desc: 'Verifies authorized device registration, clerk role mutual exclusion, and continuous capture sessions.' },
  { id: 'L6', name: 'Typed vs AI Variance & Stepper Cap', desc: 'Enforces the maximum manual stepper increment above AI-detected bunch counts.' },
  { id: 'L7', name: 'Camera Pitch Orientation Lock', desc: 'Validates mobile camera capture inclination stays within portrait/landscape pitch windows.' },
  { id: 'L8', name: 'Cross-Harvester Plot Density Check', desc: 'Detects unusual multi-worker clustering or inflated daily totals within a single plot.' },
  { id: 'L9', name: 'Historical Plot Trend Anomaly', desc: 'Compares daily yield against rolling historical baselines to hold extreme outliers for review.' },
];

function FitBoundaryBounds({ plotsGeoJson, platformsGeoJson }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    const target = plotsGeoJson?.features?.length ? plotsGeoJson : platformsGeoJson;
    if (!target?.features?.length) return;
    try {
      const b = L.geoJSON(target).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [24, 24], maxZoom: 16 });
    } catch {
      /* ignore malformed bounds */
    }
  }, [map, plotsGeoJson, platformsGeoJson]);
  return null;
}

const OrgFfbSetup = ({ org }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingGeo, setUploadingGeo] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [settings, setSettings] = useState(null);
  const [rates, setRates] = useState([]);
  const confirm = useConfirm();
  const [counts, setCounts] = useState({ employees: 0, grid_cells: 0, records: 0 });
  const [boundaryData, setBoundaryData] = useState(null);
  const [showPlatforms, setShowPlatforms] = useState(true);
  const [prov, setProv] = useState(null);
  const [qrImg, setQrImg] = useState('');
  const [copied, setCopied] = useState(false);
  const [newRate, setNewRate] = useState({ role: 'Cutter', ripe_rate: 0, unripe_rate: 0, rotten_rate: 0, kg_rate: 0, unit: 'bunch' });
  const fileRef = useRef(null);
  const geoFileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [data, provRes, bndRes] = await Promise.all([
        ffbAdminCall(`/${org.schema_name}/settings`),
        ffbAdminCall(`/${org.schema_name}/provisioning`).catch(() => null),
        ffbAdminCall(`/${org.schema_name}/boundary`).catch(() => null),
      ]);
      setSettings(data.settings);
      setRates(data.pay_rates || []);
      setCounts(data.counts || { employees: 0, grid_cells: 0, records: 0 });
      setBoundaryData(bndRes);
      if (provRes) {
        setProv(provRes);
        const url = await QRCode.toDataURL(provRes.qr_payload, {
          width: 160,
          margin: 1,
          color: { dark: '#3F8432', light: '#FFFFFF' },
        });
        setQrImg(url);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [org.schema_name]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSettings = async () => {
    setSaving(true);
    setErr('');
    setMsg('');
    try {
      const updated = await ffbAdminCall(`/${org.schema_name}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setSettings(updated);
      setMsg('FFB anti-fraud rules & onboarding configuration saved.');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadBoundary = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingGeo(true);
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await ffbAdminCall(`/${org.schema_name}/boundary`, { method: 'POST', body: fd });
      setMsg(`Shared estate boundary saved (${res.plot_count} plots) & generated ${res.cells_created} edge platform cells.`);
      await load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setUploadingGeo(false);
      if (geoFileRef.current) geoFileRef.current.value = '';
    }
  };

  const rebuildFishnet = async () => {
    setRebuilding(true);
    setErr('');
    setMsg('');
    try {
      const res = await ffbAdminCall(`/${org.schema_name}/fishnet/rebuild`, { method: 'POST' });
      setMsg(`Fishnet rebuilt: ${res.cells_created} edge cells across ${res.plots_processed} plots.`);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setRebuilding(false);
    }
  };

  const uploadWorkforce = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await ffbAdminCall(`/${org.schema_name}/employees/import`, { method: 'POST', body: fd });
      setMsg(`Workforce imported: ${res.created} added, ${res.updated} updated (${res.skipped} skipped).`);
      await load();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // Remove one role's pay rate (set it again to bring it back).
  const removeRate = async (role) => {
    if (!(await confirm(`Remove the pay rate for ${role}? Set it again any time to bring it back.`, { action: 'Remove' }))) return;
    try {
      await ffbAdminCall(`/${org.schema_name}/pay-rates/${encodeURIComponent(role)}`, { method: 'DELETE' });
      setMsg(`Pay rate for ${role} removed.`);
      await load();
    } catch (e) { setMsg(e.message); }
  };

  const saveRate = async () => {
    setErr('');
    setMsg('');
    try {
      await ffbAdminCall(`/${org.schema_name}/pay-rates`, { method: 'POST', body: JSON.stringify(newRate) });
      setMsg(`Pay rate for ${newRate.role} saved.`);
      await load();
    } catch (ex) {
      setErr(ex.message);
    }
  };

  const numField = (key, step = '1') => (
    <input
      type="number"
      step={step}
      className={inputCls}
      value={settings?.[key] ?? 0}
      onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
    />
  );

  const plotsGeoJson = boundaryData?.plots_geojson;
  const platformsGeoJson = boundaryData?.platforms_geojson;
  const previewKey = useMemo(
    () => `${org.schema_name}-${boundaryData?.plot_count || 0}-${boundaryData?.cell_count || 0}-${showPlatforms}`,
    [org.schema_name, boundaryData?.plot_count, boundaryData?.cell_count, showPlatforms],
  );

  if (loading) return <p className="text-sm text-gray-500">Loading FFB configuration…</p>;
  if (!settings) return <p className="text-sm text-red-600">{err || 'Could not load FFB settings.'}</p>;

  return (
    <div className="space-y-5">
      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}
      {msg && <div className="p-3 rounded-xl bg-[#E8F2E5] border border-[#5AA041] text-xs text-[#034321] font-medium">{msg}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapIcon size={13} /> Estate Plots</p>
          <p className="font-mono text-xl font-semibold text-gray-900 mt-1">{boundaryData?.plot_count ?? 0}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500 flex items-center gap-1.5"><Grid3x3 size={13} /> Edge Platform Cells</p>
          <p className="font-mono text-xl font-semibold text-gray-900 mt-1">{counts.grid_cells}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500 flex items-center gap-1.5"><Users size={13} /> Workforce</p>
          <p className="font-mono text-xl font-semibold text-gray-900 mt-1">{counts.employees}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
          <p className="text-xs text-gray-500 flex items-center gap-1.5"><ShieldCheck size={13} /> Harvest Scans</p>
          <p className="font-mono text-xl font-semibold text-gray-900 mt-1">{counts.records}</p>
        </div>
      </div>

      {/* Dedicated FFB Estate Boundary & Platform Edge Fishnet Preview */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2D6A2C] flex items-center gap-1.5">
              <Layers size={15} /> Dedicated FFB Estate Boundary &amp; Platform Edge Fishnet
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Dedicated to FarmIntelytics FFB (not auto-copied from satellite monitoring). Powers the mobile app offline geofence, FFB portal map, and {settings.edge_band_m}m × {settings.grid_segment_m}m platform edge cells.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={geoFileRef} type="file" accept=".geojson,.json,application/geo+json" className="hidden" onChange={uploadBoundary} />
            <Button variant="secondary" onClick={() => geoFileRef.current?.click()} disabled={uploadingGeo}>
              <UploadCloud size={14} />{uploadingGeo ? 'Uploading…' : 'Upload .geojson'}
            </Button>
            <Button variant="secondary" onClick={rebuildFishnet} disabled={rebuilding}>
              <RefreshCw size={14} className={rebuilding ? 'animate-spin' : ''} />{rebuilding ? 'Building…' : 'Rebuild Fishnet'}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block bg-[#2D6A2C]" /> Estate Plots ({boundaryData?.plot_count ?? 0})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block bg-[#5AA041]" /> Platform Edge Fishnet ({boundaryData?.cell_count ?? counts.grid_cells})
            </span>
          </div>
          <label className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
            <input type="checkbox" checked={showPlatforms} onChange={(e) => setShowPlatforms(e.target.checked)} className="accent-[#3F8432]" />
            Show platform cells
          </label>
        </div>

        <div className="h-72 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
          {plotsGeoJson?.features?.length || platformsGeoJson?.features?.length ? (
            <MapContainer key={previewKey} preferCanvas center={[6.44, 5.23]} zoom={12} style={{ width: '100%', height: '100%' }}>
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
              {plotsGeoJson?.features?.length > 0 && (
                <GeoJSON
                  data={plotsGeoJson}
                  style={{ color: '#2D6A2C', weight: 2, fillColor: '#3F8432', fillOpacity: 0.16 }}
                  onEachFeature={(f, layer) => {
                    const pid = f.properties?.Plot_ID || f.properties?.plot_id || f.properties?.unique_id || '';
                    if (pid) layer.bindTooltip(String(pid), { sticky: true });
                  }}
                />
              )}
              {showPlatforms && platformsGeoJson?.features?.length > 0 && (
                <GeoJSON
                  data={platformsGeoJson}
                  style={{ color: '#5AA041', weight: 1, fillColor: '#5AA041', fillOpacity: 0.3 }}
                />
              )}
              <FitBoundaryBounds plotsGeoJson={plotsGeoJson} platformsGeoJson={platformsGeoJson} />
            </MapContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-gray-500 gap-1">
              <MapIcon size={24} className="text-gray-400" />
              <span>No FFB boundary uploaded yet. Upload your dedicated FFB estate .geojson file above.</span>
            </div>
          )}
        </div>
      </div>

      {/* Editable Anti-Fraud Shield & Onboarding Rules */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#034321] flex items-center gap-1.5"><Shield size={15} /> Anti-Fraud Shield &amp; Onboarding Rules</p>
            <p className="text-xs text-gray-500 mt-0.5">Saved per organisation and enforced live across mobile bootstrap, field capture, approval scoring, and payroll.</p>
          </div>
          <Button onClick={saveSettings} disabled={saving}><Save size={14} />{saving ? 'Saving…' : 'Save rules'}</Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Currency">
            <input className={inputCls} value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })} />
          </Field>
          <Field label="Reconciliation mode">
            <select className={inputCls} value={settings.reconciliation_mode} onChange={(e) => setSettings({ ...settings, reconciliation_mode: e.target.value })}>
              <option value="3_layer">3-Layer (Harvester + Loader + Owner)</option>
              <option value="2_layer">2-Layer (Harvester + Loader)</option>
            </select>
          </Field>
          <Field label="Auto-approve score (0-100)">{numField('auto_approve_score')}</Field>
          <Field label="Auto-reject score (below)">{numField('auto_reject_score')}</Field>

          <Field label="Max manual stepper (+N)">{numField('max_manual_stepper_add')}</Field>
          <Field label="Max teleport speed (km/h)">{numField('max_teleport_speed_kmh', '0.5')}</Field>
          <Field label="Geofence buffer (m)">{numField('geofence_buffer_m', '0.5')}</Field>
          <Field label="Settlement cutoff day">{numField('settlement_cutoff_day')}</Field>

          <Field label="Edge band width (m)">{numField('edge_band_m', '0.5')}</Field>
          <Field label="Grid cell length (m)">{numField('grid_segment_m', '0.5')}</Field>
          <Field label="Loose fruit cutter share">{numField('loose_fruit_cutter_share', '0.05')}</Field>
          <Field label="Loose fruit carrier share">{numField('loose_fruit_carrier_share', '0.05')}</Field>

          <Field label="Portrait pitch min (°)">{numField('portrait_pitch_min', '0.5')}</Field>
          <Field label="Portrait pitch max (°)">{numField('portrait_pitch_max', '0.5')}</Field>
          <Field label="Landscape pitch min (°)">{numField('landscape_pitch_min', '0.5')}</Field>
          <Field label="Landscape pitch max (°)">{numField('landscape_pitch_max', '0.5')}</Field>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Active 9-Layer Validation Shield Rules</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {SHIELD_LAYERS.map((l) => (
              <div key={l.id} className="rounded-lg border border-gray-200 bg-gray-50/70 p-2.5 text-xs">
                <p className="font-semibold text-[#2D6A2C]">{l.id} · {l.name}</p>
                <p className="text-gray-600 mt-0.5 leading-snug">{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workforce CSV Import */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Workforce Roster (CSV / Excel)</p>
          <p className="text-xs text-gray-500 mt-0.5">Columns: Employee ID, First Name, Last Name, Function, Division, Team, Contractor.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={uploadWorkforce} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
            <UploadCloud size={14} />{importing ? 'Importing…' : 'Upload CSV'}
          </Button>
        </div>
      </div>

      {/* Default Pay Rates */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><Banknote size={15} /> Default Pay Rates ({settings.currency})</p>
        {rates.length > 0 && (
          <div className="text-xs divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {rates.map((r) => (
              <div key={r.id} className="px-3 py-2 flex justify-between font-mono">
                <span className="font-semibold text-gray-800">{r.role}</span>
                <span className="text-gray-600">Ripe {r.ripe_rate} · Unripe {r.unripe_rate} · Rotten {r.rotten_rate} · Kg {r.kg_rate} ({r.unit})</span>
                <span className="flex gap-3 font-sans">
                  <button type="button" onClick={() => setNewRate({ role: r.role, ripe_rate: r.ripe_rate, unripe_rate: r.unripe_rate, rotten_rate: r.rotten_rate, kg_rate: r.kg_rate, unit: r.unit })} className="font-semibold text-green-800 hover:underline">Edit</button>
                  <button type="button" onClick={() => removeRate(r.role)} className="font-semibold text-red-700 hover:underline">Remove</button>
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
          <Field label="Role"><input className={inputCls} value={newRate.role} onChange={(e) => setNewRate({ ...newRate, role: e.target.value })} /></Field>
          <Field label="Ripe"><input type="number" className={inputCls} value={newRate.ripe_rate} onChange={(e) => setNewRate({ ...newRate, ripe_rate: Number(e.target.value) })} /></Field>
          <Field label="Unripe"><input type="number" className={inputCls} value={newRate.unripe_rate} onChange={(e) => setNewRate({ ...newRate, unripe_rate: Number(e.target.value) })} /></Field>
          <Field label="Rotten"><input type="number" className={inputCls} value={newRate.rotten_rate} onChange={(e) => setNewRate({ ...newRate, rotten_rate: Number(e.target.value) })} /></Field>
          <Field label="Per Kg"><input type="number" className={inputCls} value={newRate.kg_rate} onChange={(e) => setNewRate({ ...newRate, kg_rate: Number(e.target.value) })} /></Field>
          <Button onClick={saveRate}>Set Rate</Button>
        </div>
      </div>

      {/* Direct Org Portal & App Connection */}
      {prov && (
        <div className="rounded-xl border border-gray-200 bg-[#F3F8EF] p-4 flex items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-sm font-semibold text-[#2D6A2C] flex items-center gap-1.5"><Link2 size={14} /> Direct Org Portal &amp; App Connection</p>
            <p className="text-xs text-gray-800">
              Project / Organisation Code: <span className="font-mono font-semibold text-[#2D6A2C] bg-white px-2 py-0.5 rounded border border-gray-200">{org.schema_name}</span>
            </p>
            <p className="text-xs font-mono text-gray-700 truncate">{prov.portal_url}</p>
            <p className="text-[11px] text-gray-700">
              Active AI Model: <strong className="font-mono">{prov.active_ml_model?.version || 'Bundled default'}</strong>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(org.schema_name); setCopied('code'); setTimeout(() => setCopied(false), 1800); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-300 text-xs font-semibold text-gray-800"
              >
                {copied === 'code' ? <Check size={12} /> : <Copy size={12} />} {copied === 'code' ? 'Copied project code' : 'Copy project code'}
              </button>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(prov.login_url); setCopied('login'); setTimeout(() => setCopied(false), 1800); }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-300 text-xs font-semibold text-gray-800"
              >
                {copied === 'login' ? <Check size={12} /> : <Copy size={12} />} {copied === 'login' ? 'Copied login link' : 'Copy org login link'}
              </button>
              {prov.apk_download_url && (
                <a href={prov.apk_download_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#2D6A2C] underline">
                  Download APK ({prov.latest_apk_version || 'Latest'})
                </a>
              )}
            </div>
          </div>
          {qrImg && <img src={qrImg} alt="Org Setup QR" className="w-24 h-24 rounded-lg border border-gray-200 bg-white p-1 shrink-0" />}
        </div>
      )}

      <Note>On first launch of <strong>FarmIntelytics FFB</strong>, clerks scan the Setup QR above or enter Project Code <span className="font-mono font-semibold">{org.schema_name}</span> to validate and unlock Clerk Login.</Note>
    </div>
  );
};

export default OrgFfbSetup;
