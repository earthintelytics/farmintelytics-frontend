import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { ArrowRight, Bell, Download, Languages, LogIn, MapPin, Mic, ShieldCheck, Volume2 } from 'lucide-react';
import LandingNav from '../landing/components/LandingNav';
import LandingFooter from '../landing/components/LandingFooter';
import { appHref, useBuddyApp } from '../landing/components/useBuddyApp';

/**
 * /app: FarmIntelytics Buddy, the farmers' phone app, explained before it is downloaded: what it does, how to install
 * it, and the file's facts (version, size, date, SHA-256). The file is the one published on this server
 * (/downloads/farm-buddy.json); without it the page says the app is not available here yet. The phone on the page
 * is a drawing with an example conversation, not a screenshot of anyone's farm.
 */
const FEATURES = [
  { icon: Mic, title: 'Ask by voice', text: 'Tap, speak your question about the farm, check the words, send. No typing needed.' },
  { icon: Volume2, title: 'Hear the answer', text: 'Answers are read aloud, so you can listen while you walk the field.' },
  { icon: Bell, title: 'Alerts you can listen to', text: 'When a block needs a visit, the alert comes to your phone and can be played aloud.' },
  { icon: MapPin, title: 'Walk to the spot', text: 'Directions on your phone lead you to the weak patch the satellite found.' },
  { icon: LogIn, title: 'Same sign-in', text: 'Use the same details as the FarmIntelytics portal. Your organisation sets who can use it.' },
  { icon: Languages, title: 'Your language', text: 'English and Pidgin by voice. Where the phone has no Hausa, Yoruba or Igbo voice, the app says so and shows the text.' },
];

const STEPS = [
  ['Download', 'Open this page on your Android phone and tap Download for Android.'],
  ['Allow the install', 'Open the downloaded file. If the phone asks, allow installs from your browser, for this file only.'],
  ['Install and sign in', 'Tap Install, open FarmIntelytics Buddy, and sign in with your FarmIntelytics details.'],
];

const size = (bytes) => (bytes ? `${(bytes / 1048576).toFixed(0)} MB` : '');
const day = (iso) => { const d = new Date(`${iso}T00:00:00`); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }); };

function Phone() {
  return (
    <div className="mx-auto w-[260px] sm:w-[290px] rounded-[2.2rem] border-[10px] border-[#E5E7EB] bg-white" role="img"
      aria-label="A drawing of the Buddy app: a farmer asks by voice which block needs a visit, and the advisor answers">
      <div className="rounded-[1.5rem] overflow-hidden bg-[#F5FAF3]">
        <div className="flex items-center gap-2 bg-white px-4 py-3 border-b border-[#E3EFDF]">
          <img src="/farmintelytics-mark.png" alt="" className="h-7 w-7" />
          <div><p className="text-sm font-semibold text-gray-900">FarmIntelytics Buddy</p><p className="text-[11px] text-gray-500">Farm advisor</p></div>
        </div>
        <div className="space-y-3 px-3 py-4 min-h-[330px]">
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-[var(--brand-primary)] px-3 py-2 text-[13px] text-white">Which block should I visit first this week?</div>
          <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-white border border-[#E3EFDF] px-3 py-2 text-[13px] text-gray-800 leading-snug">
            Block 12. Its crop has been slower than the rest for two weeks, on the north side. I can show you the way.
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--brand-primary-dark)]"><Volume2 size={13} />Read aloud</p>
          </div>
          <div className="max-w-[88%] rounded-xl bg-white border border-amber-200 px-3 py-2 text-[12px] text-amber-900"><Bell size={12} className="inline mr-1" />Alert: Block 7 is short of water.</div>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-3 border-t border-[#E3EFDF]">
          <span className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-[12px] text-gray-400">Tap the microphone to speak</span>
          <span className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center"><Mic size={18} /></span>
        </div>
      </div>
      <p className="py-2 text-center text-[11px] text-gray-400">Example</p>
    </div>
  );
}

export default function AppPage() {
  const navigate = useNavigate();
  const app = useBuddyApp();
  const href = appHref(app);
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!href) return;
    QRCode.toDataURL(new URL('/app', window.location.origin).href, { width: 240, margin: 1 }).then(setQr).catch(() => setQr(''));
  }, [href]);
  const facts = app ? [app.version && `Version ${app.version}`, size(app.bytes), app.built && `updated ${day(app.built)}`, 'Android'].filter(Boolean) : [];

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
      <LandingNav />

      {/* Hero */}
      <section className="bg-[#F5FAF3] border-b border-[#E3EFDF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-primary-dark)]">The phone app for the people in the field</p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08]">FarmIntelytics Buddy</h1>
            <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-xl">
              Ask about your farm by voice, hear the answer, get alerts when a block needs you, and walk straight to the spot.
              Everything FarmIntelytics sees from space, in your pocket.
            </p>
            {app ? (
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
                <a href={href} download className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] transition-colors">
                  <Download size={17} />Download for Android
                </a>
                <p className="text-sm text-gray-600">{facts.join(' · ')}</p>
              </div>
            ) : (
              <div className="mt-8 rounded-xl border border-[#E3EFDF] bg-white p-4 text-sm text-gray-700 max-w-xl">
                The app is not available for download from this server yet. Ask your organisation, or <button type="button" onClick={() => navigate('/contact')} className="font-semibold text-[var(--brand-primary)] hover:underline">contact us</button>.
              </div>
            )}
            {qr && (
              <div className="mt-8 hidden lg:flex items-center gap-4">
                <img src={qr} alt="Code to scan with your phone to open this page" className="w-28 h-28 rounded-lg border border-[#E3EFDF] bg-white p-1" />
                <p className="text-sm text-gray-600 max-w-[16rem]">On a computer? Scan this with your phone's camera to open this page there and download.</p>
              </div>
            )}
          </div>
          <Phone />
        </div>
      </section>

      <main className="flex-1">
        {/* What it does */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <p className="text-sm font-semibold text-[var(--brand-primary)]">What it does</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Made for walking the farm, not sitting at a desk</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-gray-200 p-6">
                <span className="w-11 h-11 rounded-xl bg-[#EEF6EC] text-[var(--brand-primary)] flex items-center justify-center"><Icon size={20} /></span>
                <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How to install */}
        <section className="bg-[#FBF8F1] border-y border-[#F0E9DA]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-semibold text-[#9A6A00]">How to install</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Three steps, about a minute</h2>
              <ol className="mt-8 space-y-5">
                {STEPS.map(([title, text], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="shrink-0 w-10 h-10 rounded-xl bg-white border border-[#F0E9DA] font-display font-semibold text-gray-900 flex items-center justify-center">{i + 1}</span>
                    <div><p className="font-semibold text-gray-900">{title}</p><p className="mt-1 text-sm text-gray-600 leading-relaxed">{text}</p></div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-[#F0E9DA] bg-white p-6 self-start">
              <ShieldCheck size={22} className="text-[var(--brand-primary)]" />
              <h3 className="mt-3 font-display text-lg font-semibold">About this download</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 leading-relaxed">
                <li>The app comes straight from this site, not from the Play Store, so your phone may warn you once before installing. That is normal for apps from a website.</li>
                <li>It is for Android phones. An iPhone version needs Apple's App Store and is not available yet.</li>
                {app?.sha256 && <li className="break-all">To check the file is ours, its SHA-256 fingerprint is <code className="font-mono text-[12px] text-gray-800">{app.sha256}</code>.</li>}
              </ul>
              {app && (
                <a href={href} download className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]">
                  <Download size={16} />Download for Android
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Back to the platform */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <h2 className="font-display text-2xl font-semibold">Managing the farm from a computer?</h2>
            <p className="mt-1 text-gray-600">The FarmIntelytics portal has the maps, reports and every service.</p>
          </div>
          <button type="button" onClick={() => navigate('/login')}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-900 border border-gray-300 hover:bg-gray-50">
            Sign in to the portal<ArrowRight size={16} />
          </button>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
