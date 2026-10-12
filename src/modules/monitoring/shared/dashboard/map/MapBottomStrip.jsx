/**
 * The strip under every map: which picture is on the map, step through pictures, play them, and a
 * small month calendar in a pop-up. Kept short on purpose so the map keeps the screen.
 * The client never chooses a satellite: the best picture of a day is shown.
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Play, Pause, CalendarDays, RefreshCw } from 'lucide-react';
import { MONTH_NAMES } from '../constants/chartConfig';

const BEST_ORDER = ['sentinel-2', 'landsat', 'sentinel-1'];
const bestSensor = (sensors = []) => BEST_ORDER.find((s) => sensors.includes(s)) || sensors[0];
const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const longLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function MapBottomStrip({ ctx, centerContent, hideTimeline }) {
  const {
    TIMELINE_DATA, calendarDates, selectedTimelineIndex, compareTimelineIndex, isCompareMode, activeDateSlot,
    setSelectedTimelineIndex, setCompareTimelineIndex, isPlaying, togglePlay, timelineLoading, setRefreshSlider,
    isBottomPanelMinimized, setIsBottomPanelMinimized, selectedIndex, showCalendarTool,
  } = ctx;
  const [calOpen, setCalOpen] = useState(false);
  const stripRef = useRef(null);
  const activeIdx = isCompareMode && activeDateSlot === 'B' ? compareTimelineIndex : selectedTimelineIndex;
  const setActive = (i) => (isCompareMode && activeDateSlot === 'B' ? setCompareTimelineIndex(i) : setSelectedTimelineIndex(i));
  const count = TIMELINE_DATA.length;
  const current = count ? TIMELINE_DATA[Math.min(activeIdx, count - 1)] : null;
  const measure = (selectedIndex || 'ndvi').toUpperCase();

  // Keep the chosen picture in view in the strip.
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeIdx, isBottomPanelMinimized]);

  const iconBtn = 'w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="bg-white border-t border-gray-200 shrink-0 relative">
      <div className="h-12 px-3 sm:px-4 flex items-center gap-2">
        {!hideTimeline && (
          <>
            <button type="button" onClick={togglePlay} disabled={count < 2} aria-label={isPlaying ? 'Pause' : 'Play through the pictures'}
              className="w-8 h-8 rounded-full inline-flex items-center justify-center text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:bg-gray-200 disabled:text-gray-400">
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button type="button" className={iconBtn} disabled={!count || activeIdx <= 0} onClick={() => setActive(activeIdx - 1)} aria-label="Earlier picture"><ChevronLeft size={18} /></button>
            <div className="min-w-0 px-1">
              {timelineLoading ? <span className="text-sm text-gray-500">Loading pictures…</span>
                : current ? (
                  <span className="text-sm whitespace-nowrap"><span className="font-semibold text-gray-900">{current.date ? longLabel(current.date) : current.label}</span>
                    <span className="text-gray-500"> · {measure}{count > 1 ? ` · ${Math.min(activeIdx, count - 1) + 1} of ${count}` : ''}</span></span>
                ) : <span className="text-sm text-gray-500">No satellite pictures yet. They appear after the first monitoring run.</span>}
            </div>
            <button type="button" className={iconBtn} disabled={!count || activeIdx >= count - 1} onClick={() => setActive(activeIdx + 1)} aria-label="Later picture"><ChevronRight size={18} /></button>
          </>
        )}
        <div className="flex-1" />
        {showCalendarTool && !hideTimeline && (
          <div className="relative">
            <button type="button" onClick={() => setCalOpen((o) => !o)} aria-expanded={calOpen}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
              <CalendarDays size={15} /><span className="hidden sm:inline">Calendar</span>
            </button>
            {calOpen && <MonthPopover ctx={ctx} onClose={() => setCalOpen(false)} />}
          </div>
        )}
        <button type="button" className={iconBtn} onClick={() => setRefreshSlider((n) => n + 1)} disabled={timelineLoading} aria-label="Look for new pictures"><RefreshCw size={15} className={timelineLoading ? 'animate-spin' : ''} /></button>
        <button type="button" onClick={() => setIsBottomPanelMinimized(!isBottomPanelMinimized)}
          aria-label={isBottomPanelMinimized ? 'Show all picture dates' : 'Hide picture dates'}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
          {isBottomPanelMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}<span className="hidden sm:inline">{isBottomPanelMinimized ? 'Dates' : 'Hide'}</span>
        </button>
      </div>

      {!isBottomPanelMinimized && !hideTimeline && count > 0 && (
        <div ref={stripRef} className="px-3 sm:px-4 pb-3 flex gap-1.5 overflow-x-auto [scrollbar-width:thin]" role="listbox" aria-label="Picture dates">
          {TIMELINE_DATA.map((t, i) => {
            const isA = i === selectedTimelineIndex;
            const isB = isCompareMode && i === compareTimelineIndex;
            const newMonth = i === 0 || (t.date || '').slice(0, 7) !== (TIMELINE_DATA[i - 1].date || '').slice(0, 7);
            return (
              <div key={`${t.date}-${i}`} className="flex items-end gap-1.5 shrink-0">
                {newMonth && <span className="text-[11px] font-medium text-gray-400 pb-1.5 pl-1">{t.date ? MONTH_NAMES[Number(t.date.slice(5, 7)) - 1].slice(0, 3) : ''}</span>}
                <button type="button" role="option" aria-selected={i === activeIdx} data-active={i === activeIdx}
                  onClick={() => setActive(i)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-medium whitespace-nowrap border ${isA && isB ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--status-info)] text-white border-transparent'
                    : isA ? 'bg-[var(--brand-primary)] text-white border-transparent'
                      : isB ? 'bg-[var(--status-info)] text-white border-transparent'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                  {t.date ? dayLabel(t.date) : t.label}
                </button>
              </div>
            );
          })}
          {calendarDates?.length > count && <span className="self-center text-[11px] text-gray-400 pl-2 whitespace-nowrap">More dates in the calendar</span>}
        </div>
      )}
      {!isBottomPanelMinimized && centerContent && <div className="px-4 pb-3">{centerContent}</div>}
    </div>
  );
}

/** Small month calendar in a pop-up: green days have a picture; picking one shows its best picture. */
function MonthPopover({ ctx, onClose }) {
  const {
    calendarMonth, calendarYear, calDaysInMonth, calFirstDay, canPrevCal, canNextCal, prevCalMonth, nextCalMonth,
    latestCalDate, jumpToLatestMonth, calendarDates, TIMELINE_DATA, selectDateWithSensor, setSelectedTimelineIndex, selectedTimelineIndex,
  } = ctx;
  const ref = useRef(null);
  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [onClose]);
  const prefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = TIMELINE_DATA[selectedTimelineIndex]?.date;
  const pick = (dateStr) => {
    const cov = (calendarDates || []).find((d) => d.date === dateStr);
    const idx = TIMELINE_DATA.findIndex((t) => t.date === dateStr);
    if (cov) selectDateWithSensor(dateStr, bestSensor(cov.sensors));
    else if (idx !== -1) setSelectedTimelineIndex(idx);
    onClose();
  };
  return (
    <div ref={ref} className="absolute bottom-full right-0 mb-2 z-[1200] w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prevCalMonth} disabled={!canPrevCal} aria-label="Previous month" className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold">{MONTH_NAMES[calendarMonth]} {calendarYear}</span>
        <button type="button" onClick={nextCalMonth} disabled={!canNextCal} aria-label="Next month" className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-[11px] text-gray-400 h-6 leading-6">{d}</span>)}
        {Array.from({ length: calFirstDay }).map((_, i) => <span key={`p${i}`} />)}
        {Array.from({ length: calDaysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${prefix}-${String(day).padStart(2, '0')}`;
          const has = (calendarDates || []).some((d) => d.date === dateStr) || TIMELINE_DATA.some((t) => t.date === dateStr);
          const sel = dateStr === selectedDate;
          return (
            <button key={dateStr} type="button" disabled={!has} onClick={() => pick(dateStr)} aria-label={`${dateStr}${has ? ', picture available' : ''}`}
              className={`h-8 rounded-md text-xs tabular-nums ${sel ? 'bg-[var(--brand-primary)] text-white font-semibold' : has ? 'bg-green-50 text-green-800 font-semibold hover:bg-green-100' : dateStr > today ? 'text-gray-300' : 'text-gray-400'} ${dateStr === today && !sel ? 'ring-1 ring-inset ring-gray-300' : ''}`}>
              {day}
            </button>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-50 border border-green-200" />Picture available</span>
        {latestCalDate && latestCalDate.slice(0, 7) !== prefix && <button type="button" onClick={jumpToLatestMonth} className="font-medium text-green-800 hover:underline">Latest</button>}
      </div>
    </div>
  );
}
