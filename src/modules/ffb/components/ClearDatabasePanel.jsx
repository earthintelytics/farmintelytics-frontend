import { useState } from 'react';
import { AlertTriangle, Trash2, Download, Lock, X, Loader2 } from 'lucide-react';
import { API } from '../services/api';

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Danger zone for the Sync tab: clears the worker directory (employee table).
 * Step 1 asks whether to back up first; step 2 requires the admin's password.
 * The backend re-verifies the password and Super Admin role before deleting.
 */
export function ClearDatabasePanel({ employeeCount, onCleared, showToast }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = backup choice, 2 = password
  const [backup, setBackup] = useState(true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const adminEmail = localStorage.getItem('fi_ffb_admin_email') || '';

  const close = () => {
    if (busy) return;
    setOpen(false);
    setStep(1);
    setBackup(true);
    setPassword('');
    setError('');
  };

  const chooseBackup = (withBackup) => {
    setBackup(withBackup);
    setStep(2);
  };

  const handleClear = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await API.clearEmployees(adminEmail, password, backup);
      if (backup && res?.backup_csv != null) {
        downloadCsv(res.backup_filename || 'fi_ffb_workers_backup.csv', res.backup_csv);
      }
      showToast?.(
        `Worker directory cleared: ${res?.deleted ?? 0} records deleted${backup ? ' (backup downloaded)' : ''}.`,
        'success'
      );
      setBusy(false);
      close();
      onCleared?.();
    } catch (err) {
      setError(err.message || 'Clearing failed. Nothing was deleted.');
      setBusy(false);
    }
  };

  const btn = {
    height: '42px', padding: '0 18px', borderRadius: '8px', fontWeight: 900, fontSize: '13px',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  };

  return (
    <>
      <div style={{ marginTop: '24px', background: '#FFFFFF', border: '1.5px solid #FCA5A5', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 320px' }}>
          <div style={{ background: 'transparent', color: '#DC2626', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#991B1B' }}>Danger Zone · Clear Worker Directory</div>
            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600, marginTop: '4px', lineHeight: 1.6 }}>
              Permanently deletes all {employeeCount} worker and clerk records so you can re-upload a fresh list.
              Harvest and loading records are not touched. Super Admin only; your password is required.
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(true)} style={{ ...btn, background: '#DC2626', color: '#FFFFFF', border: 'none' }}>
          <Trash2 size={16} /> Clear Database
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-db-title"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', maxWidth: '460px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 id="clear-db-title" style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={22} color="#DC2626" /> Clear worker directory
              </h3>
              <button onClick={close} aria-label="Close" disabled={busy} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0f172a' }}>
                <X size={20} />
              </button>
            </div>

            {step === 1 && (
              <>
                <p style={{ fontSize: '14px', color: '#0f172a', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                  This deletes <strong>all {employeeCount} records</strong> in the worker directory. Do you want to download a backup first?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button onClick={() => chooseBackup(true)} style={{ ...btn, background: '#034321', color: '#FFFFFF', border: 'none' }}>
                    <Download size={16} /> Yes, back up then clear
                  </button>
                  <button onClick={() => chooseBackup(false)} style={{ ...btn, background: '#FFFFFF', color: '#991B1B', border: '1.5px solid #FCA5A5' }}>
                    No, clear without backup
                  </button>
                  <button onClick={close} style={{ ...btn, background: '#FFFFFF', color: '#0f172a', border: '1px solid #CBD5E1' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <form onSubmit={handleClear}>
                <p style={{ fontSize: '14px', color: '#0f172a', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                  {backup
                    ? 'A backup CSV will download, then all records will be deleted.'
                    : 'All records will be deleted with no backup.'}{' '}
                  Enter the password for <strong>{adminEmail || 'your account'}</strong> to confirm.
                </p>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="password"
                    autoFocus
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    style={{ width: '100%', boxSizing: 'border-box', height: '42px', padding: '0 12px 0 36px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>
                {error && (
                  <div role="alert" style={{ marginTop: '10px', fontSize: '13px', fontWeight: 700, color: '#991B1B', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '8px 12px' }}>
                    {error}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" onClick={() => setStep(1)} disabled={busy} style={{ ...btn, background: '#FFFFFF', color: '#0f172a', border: '1px solid #CBD5E1' }}>
                    Back
                  </button>
                  <button type="submit" disabled={busy || !password} style={{ ...btn, background: '#DC2626', color: '#FFFFFF', border: 'none', opacity: busy || !password ? 0.6 : 1 }}>
                    {busy ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={16} />}
                    {backup ? 'Back up & clear' : 'Clear database'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
