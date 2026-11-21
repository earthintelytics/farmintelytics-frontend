import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone, CheckCircle2, Copy, Check, Download, ExternalLink,
  Cpu, ShieldCheck, RefreshCw, TabletSmartphone, Building2,
} from 'lucide-react';
import { ffbCall } from '../api/ffbApi';
import OrgLogo from '../../../components/OrgLogo';

export default function FfbAppConnection({ tenantSlug }) {
  const [pack, setPack] = useState(null);
  const [qrImg, setQrImg] = useState('');
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [err, setErr] = useState('');

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    setErr('');
    try {
      await ffbCall('/app-connection/regenerate-code', { method: 'POST', tenantSlug });
      await load();
    } catch (e) {
      setErr(e.message || 'Could not regenerate organisation code.');
    } finally {
      setRegenerating(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await ffbCall('/app-connection', { tenantSlug });
      setPack(data);
      if (data.qr_payload) {
        const imgUrl = await QRCode.toDataURL(data.qr_payload, {
          width: 240,
          margin: 2,
          color: { dark: '#3F8432', light: '#FFFFFF' },
        });
        setQrImg(imgUrl);
      } else {
        setQrImg('');
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tenantSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyText = (key, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1800);
  };

  const CopyBtn = ({ id, value, label = 'Copy' }) => (
    <button
      type="button"
      onClick={() => copyText(id, value)}
      disabled={!value}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-light)] bg-white text-xs font-normal text-gray-700 hover:bg-gray-50 disabled:opacity-40"
    >
      {copied === id ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      {copied === id ? 'Copied' : label}
    </button>
  );

  const devices = pack?.connected_devices || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-normal text-[var(--text-main)]">Field App &amp; Organisation Link</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Verified web portal link, Android APK download, Setup QR code, and active field devices bound strictly to your estate.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-light)] bg-white text-xs font-normal hover:bg-gray-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Status
        </button>
      </div>

      {err && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{err}</div>}

      {pack && (
        <>
          {/* Verified Client Identity Hero */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <OrgLogo
                tenant={pack.company_id}
                version={pack.logo_url ? '1' : ''}
                className="w-14 h-14 rounded-xl shrink-0"
                fallback={
                  <div className="w-14 h-14 rounded-xl bg-[#F3F8EF] text-[#3F8432] flex items-center justify-center shrink-0">
                    <Building2 size={24} strokeWidth={1.5} />
                  </div>
                }
              />
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3F8EF] text-[#2D6A2C] text-[11px] font-medium uppercase tracking-wider mb-1">
                  <CheckCircle2 size={12} strokeWidth={1.5} /> Connected &amp; Tenant-Isolated
                </div>
                <h2 className="font-display text-xl font-medium text-gray-900 truncate">{pack.display_name || pack.company_id}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <p className="text-xs text-gray-700 font-mono">
                    Organisation Access Code:{' '}
                    <span className="font-normal text-[#2D6A2C] bg-[#F3F8EF] px-2.5 py-1 rounded-md text-sm tracking-wider">
                      {pack.access_code || pack.company_id}
                    </span>
                  </p>
                  <CopyBtn id="code" value={pack.access_code || pack.company_id} label="Copy Access Code" />
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    disabled={regenerating}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    title="Generate a new unique organisation access code"
                  >
                    <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                    {regenerating ? 'Rotating...' : 'New Code'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Send this code to your field team. Entering it on first launch locks the mobile app exclusively to <strong>{pack.display_name || pack.company_id}</strong> before Worker Role sign-in.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Active Field Devices</p>
                <p className="text-base font-mono font-medium text-gray-900">{devices.length}</p>
              </div>
              <div className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium flex items-center gap-1">
                  <Cpu size={11} strokeWidth={1.5} /> OTA AI Model
                </p>
                <p className="text-base font-mono font-medium text-gray-900">{pack.active_ml_model?.version || 'Bundled'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Direct Portal Link & APK */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-[var(--border-light)] p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[var(--brand-primary)]" />
                  <h3 className="font-display text-base font-normal">Dedicated Client Portal &amp; App Endpoints</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-light)]">
                    <p className="text-[11px] font-normal text-[var(--text-muted)] mb-1">Direct Client FFB Portal URL</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-gray-900 break-all">{pack.portal_url}</code>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <CopyBtn id="portal" value={pack.portal_url} />
                        {pack.portal_url && (
                          <a
                            href={pack.portal_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#FFFFFF' }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#3F8432] text-white font-medium hover:bg-[#2D6A2C]"
                          >
                            <ExternalLink size={12} strokeWidth={1.5} /> Open
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-light)]">
                    <p className="text-[11px] font-normal text-[var(--text-muted)] mb-1">Dedicated Sign-In URL (Bookmark for Managers)</p>
                    <div className="flex items-center justify-between gap-2">
                      <code className="font-mono text-gray-900 break-all">{pack.login_url}</code>
                      <CopyBtn id="login" value={pack.login_url} />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-light)]">
                    <p className="text-[11px] font-medium text-[var(--text-muted)] mb-1">FarmIntelytics FFB Android APK</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          Version <span className="font-mono">{pack.latest_apk_version || '—'}</span>
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          Install this APK on estate tablets/phones, enter the Organisation Access Code or scan the Setup QR to unlock Harvester Role &amp; Loading Role sign-in.
                        </p>
                      </div>
                      {pack.apk_download_url ? (
                        <a
                          href={pack.apk_download_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#FFFFFF' }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3F8432] text-white text-xs font-medium hover:bg-[#2D6A2C]"
                        >
                          <Download size={14} strokeWidth={1.5} /> Download APK
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                          APK not yet uploaded in Admin Hub
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Connected Field Devices Table */}
              <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[var(--border-light)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TabletSmartphone size={17} className="text-[var(--brand-primary)]" />
                    <h3 className="font-display text-base font-normal">Verified Connected Field Devices</h3>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">{devices.length} device stream(s)</span>
                </div>

                {devices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                    No field devices linked to <span className="font-mono font-normal">{pack.display_name || pack.company_id}</span> yet. Once a phone enters your Organisation Access Code or signs in, it registers here immediately.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border-light)]">
                        <tr>
                          <th className="px-4 py-2.5 font-normal">Device</th>
                          <th className="px-4 py-2.5 font-normal">Status</th>
                          <th className="px-4 py-2.5 font-normal">Worker ID</th>
                          <th className="px-4 py-2.5 font-normal">Synced Scans</th>
                          <th className="px-4 py-2.5 font-normal">Last Active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {devices.map((d, idx) => {
                          const st = d.status || (d.scans > 0 ? 'active' : 'connected');
                          const badge = st === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : st === 'signed_in'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-700';
                          const stLabel = st === 'active' ? 'Syncing' : st === 'signed_in' ? 'Signed In' : 'Linked';
                          return (
                            <tr key={`${d.device_id}-${d.clerk_id}-${idx}`}>
                              <td className="px-4 py-2.5">
                                <p className="font-mono font-medium text-gray-900">{d.device_id}</p>
                                {(d.device_name || d.app_version) && (
                                  <p className="text-[11px] text-gray-500">
                                    {[d.device_name, d.app_version ? `v${d.app_version}` : ''].filter(Boolean).join(' · ')}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${badge}`}>{stLabel}</span>
                              </td>
                              <td className="px-4 py-2.5 font-mono text-gray-700">{d.clerk_id || '—'}</td>
                              <td className="px-4 py-2.5 font-normal text-gray-900">{d.scans ?? 0}</td>
                              <td className="px-4 py-2.5 text-gray-600">
                                {(d.last_sync_at || d.last_seen_at) ? new Date(d.last_sync_at || d.last_seen_at).toLocaleString() : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right col: Scannable Setup QR */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center text-center space-y-3 h-fit">
              <div className="w-9 h-9 rounded-full bg-[#F3F8EF] text-[#3F8432] flex items-center justify-center">
                <Smartphone size={18} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-display text-base font-medium">1-Scan Device Setup QR</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Open <strong>FarmIntelytics FFB</strong> on the phone, enter Access Code <strong className="font-mono">{pack.access_code || pack.company_id}</strong> or scan this Setup QR to unlock role sign-in for <strong>{pack.display_name || pack.company_id}</strong>.
                </p>
              </div>
              {qrImg ? (
                <div className="p-3 rounded-2xl border border-gray-200 bg-white">
                  <img src={qrImg} alt={`Setup QR for ${pack.company_id}`} className="w-52 h-52" />
                </div>
              ) : (
                <div className="w-52 h-52 rounded-2xl border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                  Generating QR…
                </div>
              )}
              <div className="w-full p-2.5 rounded-xl bg-[#F3F8EF] text-[#2D6A2C] text-[11px] font-medium">
                Once validated, the app displays a permanent green badge:{' '}
                <strong className="font-mono">Connected: {pack.display_name || pack.company_id} ({pack.company_id})</strong>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
