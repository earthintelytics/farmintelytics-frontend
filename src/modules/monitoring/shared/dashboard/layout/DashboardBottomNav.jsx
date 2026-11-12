import { useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { dashboardNav } from './DashboardChrome';

/**
 * The dashboard's pages on a phone: a bar at the bottom with the first pages and "More", which opens a sheet
 * with every page, the map tools and the settings (the same list as the sidebar on wider screens). Hidden
 * from `md` up, where the sidebar shows.
 */

// ── Settings ─────────────────────────────────────────────────────────────────────────────────────
const IN_BAR = 4;   // pages in the bar; the rest are under More

export default function DashboardBottomNav({ ctx }) {
  const [more, setMore] = useState(false);
  const { activeSidebarItem, handleSidebarClick } = ctx;
  const nav = dashboardNav(ctx);
  const inBar = nav.main.slice(0, IN_BAR);
  const moreActive = !inBar.some((i) => i.id === activeSidebarItem);
  const go = (id) => { setMore(false); handleSidebarClick(id); };

  const tab = (active) => `relative flex flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold ${active ? 'text-green-700' : 'text-gray-500'}`;
  const row = (active) => `w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold ${active ? 'bg-green-50 text-green-800' : 'text-gray-700 hover:bg-gray-50'}`;

  return (
    <>
      {more && (
        <div className="md:hidden fixed inset-0 z-[1300]" role="dialog" aria-label="All pages">
          <div className="absolute inset-0 bg-gray-900/30" onClick={() => setMore(false)} aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="font-display text-base font-semibold">All pages</span>
              <button type="button" onClick={() => setMore(false)} aria-label="Close" className="p-2 rounded-lg text-gray-500 hover:bg-gray-50"><X size={18} /></button>
            </div>
            <div className="space-y-0.5">
              {nav.main.map((item) => (
                <button key={item.id} type="button" onClick={() => go(item.id)} className={row(activeSidebarItem === item.id)}>
                  {item.icon}<span className="flex-1 text-left">{item.label}</span>
                  {item.badge > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">{item.badge}</span>}
                </button>
              ))}
            </div>
            <div className="space-y-0.5">
              <p className="px-3 text-[11px] font-bold text-gray-500">Map tools</p>
              {nav.tools.map((item) => (
                <button key={item.id} type="button" onClick={() => { item.toggle(); setMore(false); }} className={row(item.active)}>
                  {item.icon}<span className="flex-1 text-left">{item.label}</span>{item.active && <span className="text-xs text-green-700">On</span>}
                </button>
              ))}
            </div>
            <div className="space-y-0.5">
              <p className="px-3 text-[11px] font-bold text-gray-500">Settings</p>
              {nav.settings.map((item) => (
                <button key={item.id} type="button" onClick={() => go(item.id)} className={row(activeSidebarItem === item.id)}>
                  {item.icon}<span className="flex-1 text-left">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav className="md:hidden shrink-0 border-t border-gray-200 bg-white grid grid-cols-5 pb-[env(safe-area-inset-bottom)] z-[60]" aria-label="Dashboard pages">
        {inBar.map((item) => (
          <button key={item.id} type="button" onClick={() => go(item.id)} className={tab(activeSidebarItem === item.id)} aria-current={activeSidebarItem === item.id ? 'page' : undefined}>
            {item.icon}
            <span className="max-w-full truncate px-1">{item.label}</span>
            {item.badge > 0 && <span className="absolute top-1 right-[22%] w-2 h-2 rounded-full bg-red-500" />}
          </button>
        ))}
        <button type="button" onClick={() => setMore(true)} className={tab(moreActive)} aria-label="More pages">
          <MoreHorizontal size={17} /><span>More</span>
        </button>
      </nav>
    </>
  );
}
