// Shown once when Farm Buddy does not yet know which of the organisation's services to read. The
// list is the organisation's own licensed services, as on its hub.
import { ChevronRight } from 'lucide-react';
import { rowButton, btnLine, muted, main } from './ui';

export default function ServicePicker({ services, onPick, onSignOut }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      {services.length === 0 ? (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">No services yet</h2>
          <p className={`text-base ${muted}`}>No services are set up for your organisation yet. FarmIntelytics adds them during onboarding; contact your FarmIntelytics team.</p>
          <button type="button" onClick={onSignOut} className={btnLine}>Sign out</button>
        </div>
      ) : (
        <>
          <h2 className="font-display text-xl font-semibold">Which farm is this for?</h2>
          <p className={`text-base ${muted} mt-1 mb-5`}>Choose once. You can change it later in the menu.</p>
          <ul className="space-y-3">
            {services.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onPick(s.id)} className={rowButton}>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-base font-semibold ${main}`}>{s.title}</span>
                    <span className={`block text-[15px] ${muted} mt-0.5`}>{s.text}</span>
                  </span>
                  <ChevronRight size={22} className="shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onSignOut} className={`${btnLine} mt-6`}>Sign out</button>
        </>
      )}
    </div>
  );
}
