// The frame of every FarmIntelytics Buddy screen: a slim header (name, language, menu), the screen, and two
// big tabs at the bottom: Ask and Alerts.
import { NavLink } from 'react-router-dom';
import { Bell, Languages, Menu, MessageCircle } from 'lucide-react';
import { btnLine, btnQuiet, muted } from './ui';

const tab = ({ isActive }) => `flex-1 flex flex-col items-center justify-center gap-1 min-h-[60px] text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--brand-primary)] ${isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'}`;

export default function BuddyShell({ subtitle, language, onLanguage, onMenu, children }) {
  return (
    <div className="h-[100dvh] flex flex-col bg-white text-[var(--text-main)] font-sans">
      <header className="shrink-0 flex items-center gap-2 px-4 pt-[calc(8px+env(safe-area-inset-top))] pb-2 border-b border-[var(--border-light)]">
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-semibold leading-tight">FarmIntelytics Buddy</h1>
          {subtitle && <p className={`text-sm ${muted} truncate`}>{subtitle}</p>}
        </div>
        {language && (
          <button type="button" onClick={onLanguage} className={`${btnLine} px-3 min-h-[44px]`} aria-label={`Answer language: ${language.label}. Change`}>
            <Languages size={18} aria-hidden="true" />{language.label}
          </button>
        )}
        {onMenu && <button type="button" onClick={onMenu} className={`${btnQuiet} px-3 min-h-[44px]`} aria-label="Menu"><Menu size={24} /></button>}
      </header>
      <main className="flex-1 min-h-0 flex flex-col">{children}</main>
      {onMenu && (
        <nav className="shrink-0 flex border-t border-[var(--border-light)] bg-white pb-[env(safe-area-inset-bottom)]" aria-label="FarmIntelytics Buddy">
          <NavLink to="/buddy" end className={tab}><MessageCircle size={24} aria-hidden="true" />Ask</NavLink>
          <NavLink to="/buddy/alerts" className={tab}><Bell size={24} aria-hidden="true" />Alerts and updates</NavLink>
        </nav>
      )}
    </div>
  );
}
