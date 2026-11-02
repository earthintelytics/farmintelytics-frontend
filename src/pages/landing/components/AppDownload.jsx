import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Mic, Bell, MapPin } from 'lucide-react';

// The FarmIntelytics Buddy Android app, downloaded straight from this server. What is offered comes from
// /downloads/farm-buddy.json, written when the APK is published; without it this section stays hidden.
const INFO = '/downloads/farm-buddy.json';

const POINTS = [
  { icon: Mic, text: 'Ask about your farm by voice, in English or Pidgin, and hear the answer.' },
  { icon: Bell, text: 'Get alerts when a block needs a visit, and listen to them.' },
  { icon: MapPin, text: 'Walk straight to the weak patch with directions on your phone.' },
];

const size = (bytes) => (bytes ? `${(bytes / 1048576).toFixed(0)} MB` : '');
const day = (iso) => { const d = new Date(`${iso}T00:00:00`); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); };

export default function AppDownload() {
  const [app, setApp] = useState(null);
  const [qr, setQr] = useState('');
  useEffect(() => {
    let active = true;
    fetch(INFO, { cache: 'no-store' })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
      .then((info) => { if (active && info?.file) setApp(info); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const href = app ? `/downloads/${encodeURIComponent(app.file)}` : '';
  useEffect(() => {
    if (!href) return;
    QRCode.toDataURL(new URL(href, window.location.origin).href, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [href]);
  if (!app) return null;

  return (
    <section id="get-the-app" className="border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-medium text-[var(--brand-primary)]">For farmers in the field</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-gray-900 mt-2">FarmIntelytics Buddy on your phone</h2>
          <p className="text-base text-gray-600 mt-3 max-w-2xl leading-relaxed">
            A simple app for the people who walk the fields. Sign in with the same details you use here.
          </p>
          <ul className="mt-6 space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 text-sm text-gray-700">
                <span className="w-8 h-8 shrink-0 rounded-lg bg-green-50 text-[var(--brand-primary)] flex items-center justify-center"><Icon size={16} /></span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
            <a href={href} download className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-colors">
              <Download size={16} />Download for Android
            </a>
            <p className="text-xs text-gray-500">
              {[app.version && `Version ${app.version}`, size(app.bytes), app.built && `updated ${day(app.built)}`].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="mt-6 rounded-2xl border border-gray-200 p-5 max-w-2xl">
            <p className="text-sm font-semibold text-gray-900">How to install</p>
            <ol className="mt-2 space-y-1.5 text-sm text-gray-600 list-decimal pl-5">
              <li>Open this page on your Android phone and tap Download for Android.</li>
              <li>Open the downloaded file. If the phone asks, allow installs from your browser.</li>
              <li>Tap Install, then open FarmIntelytics Buddy and sign in.</li>
            </ol>
            <p className="mt-3 text-xs text-gray-500">The app comes straight from this site, not from the Play Store, so your phone may warn you once before installing.</p>
          </div>
        </div>
        {qr && (
          <div className="hidden lg:flex flex-col items-center gap-3 rounded-2xl border border-gray-200 p-5">
            <img src={qr} alt="Code to scan with your phone to download FarmIntelytics Buddy" className="w-48 h-48" />
            <p className="text-xs text-gray-500 text-center max-w-[12rem]">On a computer? Scan this with your phone's camera to download.</p>
          </div>
        )}
      </div>
    </section>
  );
}
