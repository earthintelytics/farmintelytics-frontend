/**
 * GWON sign-in: an account of an organisation with the GWON service (the Agency's staff). Public visitors see the
 * dashboard, maps and analysis; signing in unlocks the project registry, the Assistant, programme publishing and
 * report downloads. Locked shows what a page needs, with the sign-in button.
 */
import { useState } from 'react';
import { X, LogIn, Lock } from 'lucide-react';
import { gwonSignIn } from './gwonApi';

export function SignInDialog({ open, onClose, onSignedIn }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!open) return null;
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const me = await gwonSignIn(email.trim(), code);
      if (me?.error) setErr(me.error);
      else if (me) { onSignedIn(me); onClose(); }
      else setErr('Could not sign in.');
    } catch (ex) { setErr(ex.status === 401 ? 'Wrong email or password.' : ex.message); }
    setBusy(false);
  };
  const cls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#007248]';
  return (
    <div className="fixed inset-0 z-[3100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Sign in to GWON">
      <div className="absolute inset-0 bg-[#0E2D41]/50" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-start gap-3">
          <img src="/gwon-data/naggw-seal.png" alt="" className="w-11 h-11" />
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-gray-900">Sign in to GWON</p>
            <p className="text-xs text-gray-600">For Agency staff and partners with a GWON account.</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto p-1 rounded-lg hover:bg-gray-100" aria-label="Close"><X size={16} /></button>
        </div>
        <label className="block space-y-1"><span className="text-xs font-semibold text-gray-700">Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={cls} /></label>
        <label className="block space-y-1"><span className="text-xs font-semibold text-gray-700">Password</span>
          <input type="password" autoComplete="current-password" required value={code} onChange={(e) => setCode(e.target.value)} className={cls} /></label>
        {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
        <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#007248] text-white text-sm font-semibold disabled:opacity-60">
          <LogIn size={16} /> {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-[11px] text-gray-500">Accounts are given by the Agency's GWON administrator. Signing in here also signs you in to FarmIntelytics.</p>
      </form>
    </div>
  );
}

export function Locked({ what, onSignIn, note }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col items-center text-center gap-3">
      <span className="w-12 h-12 rounded-2xl bg-[#E8F5EE] text-[#007248] flex items-center justify-center"><Lock size={22} /></span>
      <p className="font-display text-lg font-semibold text-gray-900">Sign in to {what}</p>
      <p className="text-sm text-gray-600 max-w-md">{note || 'This part of GWON holds the Agency’s own data, so it is for signed-in staff and partners.'}</p>
      <button type="button" onClick={onSignIn} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#007248] text-white text-sm font-semibold"><LogIn size={16} /> Sign in</button>
    </div>
  );
}
