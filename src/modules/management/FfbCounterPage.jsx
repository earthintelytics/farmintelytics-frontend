import { ArrowLeft, Smartphone, Grid3x3, BarChart3 } from 'lucide-react';

/**
 * FFB Counter (Management): fresh fruit bunches counted at harvest, per block and per day, recorded by
 * harvest recorders with the FFB Counter phone app. The app is being prepared, so this page says what the
 * service is and shows no counts until real ones are recorded.
 */
const STEPS = [
  { icon: Smartphone, title: 'Recorders count in the field', text: 'Harvest recorders count the fresh fruit bunches cut in each block with the FFB Counter phone app, with or without signal.' },
  { icon: Grid3x3, title: 'Counts land on the right block', text: 'Each count is saved with the block, the date and who recorded it, so it joins the estate map you already use.' },
  { icon: BarChart3, title: 'Managers see the harvest', text: 'Bunches per block and per day, compared with earlier rounds and with crop condition from satellite.' },
];

const FfbCounterPage = ({ onBack, onSignOut }) => {
  const orgName = localStorage.getItem('fi_display_name') || '';
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && <button onClick={onBack} aria-label="Back" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ArrowLeft size={18} /></button>}
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">FFB Counter</p>
              <p className="text-xs text-[var(--text-muted)]">{orgName ? `${orgName} · Management` : 'Management'}</p>
            </div>
          </div>
          {onSignOut && (
            <button onClick={onSignOut} className="px-4 py-2 rounded-[10px] text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">Sign out</button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-10 py-14 space-y-10">
        <section className="max-w-2xl">
          <p className="text-sm font-medium text-[var(--brand-primary)]">Management</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight mt-2">Fresh fruit bunches, counted where they are cut.</h1>
          <p className="text-base text-[var(--text-muted)] leading-relaxed mt-4">
            FFB Counter records the oil palm harvest block by block, so managers see what each block gives and where the harvest falls behind.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-200 p-6">
              <span className="w-10 h-10 rounded-xl bg-green-50 text-[var(--brand-primary)] flex items-center justify-center"><Icon size={20} /></span>
              <h2 className="font-display text-lg font-semibold mt-4">{title}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="font-display text-lg font-semibold">No counts yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-2 max-w-lg mx-auto">
            The FFB Counter phone app is being prepared. Once harvest recorders start counting, the bunches per block and per day appear here.
          </p>
        </section>
      </main>
    </div>
  );
};

export default FfbCounterPage;
