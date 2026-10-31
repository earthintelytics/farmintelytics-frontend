// The menu: installing Farm Buddy on the phone, and signing out. Nothing else.
import { useEffect, useState } from 'react';
import { Download, LogOut } from 'lucide-react';
import Sheet from './Sheet';
import { rowButton, main } from './ui';

function useInstallOffer() {
  const [offer, setOffer] = useState(() => (typeof window !== 'undefined' ? window.__fiInstallPrompt || null : null));
  useEffect(() => {
    const on = () => setOffer(window.__fiInstallPrompt || null);
    window.addEventListener('fi-install-available', on);
    return () => window.removeEventListener('fi-install-available', on);
  }, []);
  const install = async () => {
    if (!offer) return;
    offer.prompt();
    try { await offer.userChoice; } catch { /* closed */ }
    window.__fiInstallPrompt = null;
    setOffer(null);
  };
  return { canInstall: !!offer, install };
}

export default function BuddyMenu({ orgName, onSignOut, onClose }) {
  const { canInstall, install } = useInstallOffer();
  return (
    <Sheet title="Menu" onClose={onClose}>
      <div className="mb-4">
        {orgName && <p className={`text-base font-semibold ${main}`}>{orgName}</p>}
      </div>
      <ul className="space-y-2">
        {canInstall && (
          <li>
            <button type="button" className={rowButton} onClick={install}>
              <Download size={22} className="shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
              <span className={`text-base font-medium ${main}`}>Install on this phone</span>
            </button>
          </li>
        )}
        <li>
          <button type="button" className={rowButton} onClick={onSignOut}>
            <LogOut size={22} className="shrink-0 text-[var(--status-critical)]" aria-hidden="true" />
            <span className={`text-base font-medium ${main}`}>Sign out</span>
          </button>
        </li>
      </ul>
    </Sheet>
  );
}
