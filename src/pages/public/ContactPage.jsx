import { useState } from 'react';
import { Mail, MapPin, Send } from 'lucide-react';
import PublicLayout from './PublicLayout';

const EMAIL = 'support@earthintelytics.com';
const SUBJECTS = ['A demo for my organisation', 'Pricing and licences', 'Help with my account', 'Data and privacy', 'Something else'];
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-[15px] outline-none focus:border-[var(--brand-primary)]';

/**
 * Contact: the form opens the visitor's own email app with the message filled in, so nothing is
 * lost on a server that does not send mail yet, and the visitor keeps a copy.
 */
export default function ContactPage() {
  const [form, setForm] = useState({ name: '', organisation: '', subject: SUBJECTS[0], message: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const send = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) { setError('Please add your name and a message.'); return; }
    setError('');
    const body = `${form.message.trim()}\n\n${form.name.trim()}${form.organisation.trim() ? `, ${form.organisation.trim()}` : ''}`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`FarmIntelytics: ${form.subject}`)}&body=${encodeURIComponent(body)}`;
  };
  return (
    <PublicLayout eyebrow="Contact" title="Talk to us" wide
      intro="For a demo, pricing, help with your account or anything about your data.">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <div className="flex gap-3">
            <span className="w-10 h-10 rounded-xl bg-green-50 text-[var(--brand-primary)] flex items-center justify-center shrink-0"><Mail size={18} /></span>
            <div>
              <p className="font-semibold">Email</p>
              <a href={`mailto:${EMAIL}`} className="text-[var(--brand-primary)] underline">{EMAIL}</a>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-10 h-10 rounded-xl bg-green-50 text-[var(--brand-primary)] flex items-center justify-center shrink-0"><MapPin size={18} /></span>
            <div>
              <p className="font-semibold">Where we are</p>
              <p className="text-gray-600">Abuja and Lagos, Nigeria</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Already a client? Signed-in users can send a problem report from any page in the platform.</p>
        </div>

        <form onSubmit={send} className="space-y-4 rounded-2xl border border-gray-200 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5"><span className="text-sm font-medium">Your name</span><input className={inputCls} value={form.name} onChange={set('name')} autoComplete="name" /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Organisation <span className="text-gray-400 font-normal">(optional)</span></span><input className={inputCls} value={form.organisation} onChange={set('organisation')} autoComplete="organization" /></label>
          </div>
          <label className="block space-y-1.5"><span className="text-sm font-medium">About</span>
            <select className={inputCls} value={form.subject} onChange={set('subject')}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label className="block space-y-1.5"><span className="text-sm font-medium">Message</span>
            <textarea rows={5} className={`${inputCls} resize-y`} value={form.message} onChange={set('message')} placeholder="Tell us about your farm or what you need" />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
            <Send size={15} />Write the email
          </button>
          <p className="text-xs text-gray-500">This opens your email app with the message ready to send to {EMAIL}.</p>
        </form>
      </div>
    </PublicLayout>
  );
}
