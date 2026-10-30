// The image dates of the layer on the map: its timeline and tiles, the mini-calendar, compare mode
// (a second date, B) and play. Built from the backend's own dates, never placeholder ones.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../../../../../services/organizationMonitorApi';

const SAR_INDICES = new Set(['rvi', 'dprvi', 'smi', 'flood_mask', 'sar_rvi', 'sar_dprvi', 'sar_smi']);
export const SENSOR_DOT_COLOR = { 'sentinel-2': 'var(--brand-primary)', 'landsat': 'var(--status-warning)', 'sentinel-1': 'var(--status-info)' };
const MAP_PAGES = ['crop-health', 'crop-yield', 'climate', 'land-restoration'];
const isoDate = (d) => d.toISOString().slice(0, 10);

// Farm average of one index on one date, from the blocks' own per-date values.
function blockMean(plots, key, date) {
  let sum = 0, n = 0;
  (plots || []).forEach(p => {
    const v = p.indices?.[key]?.[date];
    if (v != null) { sum += v; n++; }
  });
  return n > 0 ? sum / n : null;
}

export function useImageTimeline({ tenant, cropType, selectedIndex, setSelectedIndex, plots, activeSidebarItem, noteLoadIssue }) {
  const [sliderData, setSliderData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [zarrBounds, setZarrBounds] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  // Whether the mini-calendar's month has been placed on the active pass once: after that only an
  // explicit date pick moves it, so a background refresh never undoes the user's own month navigation.
  const calendarInitializedRef = useRef(false);
  const [selectedTimelineIndex, setSelectedTimelineIndex] = useState(2);
  const [refreshSlider, setRefreshSlider] = useState(0);
  const [selectedSensor, setSelectedSensor] = useState('sentinel-2'); // 'sentinel-2' | 'landsat'
  // Set right before a sensor/index switch triggered by picking a calendar date, and used once the new
  // timeline lands, so the slider goes to that date instead of the most recent one.
  const pendingCalendarDateRef = useRef(null);
  // { date, sensors } while a calendar day with images from more than one satellite awaits a choice.
  const [satellitePicker, setSatellitePicker] = useState(null);
  const [TIMELINE_DATA, setTIMELINE_DATA] = useState([]);
  const [tileRefreshing, setTileRefreshing] = useState(false);
  // Every image date across all satellites, so the calendar shows everything the archive holds.
  const [calendarDates, setCalendarDates] = useState([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareTimelineIndex, setCompareTimelineIndex] = useState(3);
  const [activeDateSlot, setActiveDateSlot] = useState('A');
  const [isPlaying, setIsPlaying] = useState(false);

  const isSarIndex = SAR_INDICES.has((selectedIndex || '').toLowerCase());
  // Radar layers are always Sentinel-1; optical layers use the chosen satellite.
  const effectiveSensor = isSarIndex ? 'sentinel-1' : selectedSensor;

  // Moves the map to a calendar date on a given satellite. If that satellite isn't the active one,
  // switches the layer first and lands on the date once the timeline reloads.
  const selectDateWithSensor = (dateStr, sensor) => {
    const alreadyActive = sensor === 'sentinel-1' ? isSarIndex : (!isSarIndex && sensor === selectedSensor);
    if (alreadyActive) {
      const idx = TIMELINE_DATA.findIndex(t => t.date === dateStr);
      if (idx !== -1) setSelectedTimelineIndex(idx);
      return;
    }
    pendingCalendarDateRef.current = dateStr;
    if (sensor === 'sentinel-1') {
      setSelectedIndex('rvi');
    } else {
      if (isSarIndex) setSelectedIndex('ndvi');
      setSelectedSensor(sensor);
    }
  };

  // Timeline and tiles of the layer on the map, a rolling six months to today. The previous tiles stay
  // on screen while the new ones load, so the map never blinks blank. A block click does not reload it.
  useEffect(() => {
    async function loadSliderData() {
      setTimelineLoading(true);
      try {
        const windowEnd = new Date();
        const windowStart = new Date();
        windowStart.setMonth(windowStart.getMonth() - 6);
        const data = await api.fetchTimeseriesSlider({
          farm: tenant || 'farm_1',
          index: (selectedIndex || 'ndvi').toLowerCase(),
          start: isoDate(windowStart),
          end: isoDate(windowEnd),
          sensor: isSarIndex ? 'sentinel-1' : selectedSensor,
          // Crop pages colour tiles with the crop's classes; without a crop the generic classes apply.
          cropType,
        });
        setSliderData(data);
        // Keep the image extent in step with the layer (radar and optical extents may differ)
        if (data?.zarr_bounds) setZarrBounds(data.zarr_bounds);
      } catch (err) {
        noteLoadIssue('satellite dates', err);
      } finally {
        setTimelineLoading(false);
      }
    }
    loadSliderData();
  }, [selectedIndex, tenant, refreshSlider, selectedSensor, noteLoadIssue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true;
    api.fetchTimeseriesCalendar({ farm: tenant || 'farm_1' })
      .then(data => { if (active) setCalendarDates(data?.dates || []); })
      .catch(err => noteLoadIssue('the image calendar', err));
    return () => { active = false; };
  }, [tenant, noteLoadIssue]);

  // The timeline comes from sliderData only, so a timeline date always has its tile.
  useEffect(() => {
    if (!sliderData) return;
    setTimelineLoading(false); // eslint-disable-line react-hooks/set-state-in-effect
    if (!sliderData.timeline?.length) {
      setTIMELINE_DATA([]);
      return;
    }
    const entries = sliderData.timeline.map((t) => {
      const mean = (key) => blockMean(plots, key, t.date);
      return {
        date: t.date,
        label: t.label,
        satellite: t.satellite || null,
        quality: '—',
        source: t.source || (t.is_estimated ? 'radar_estimate' : null),
        is_estimated: Boolean(t.is_estimated || t.source === 'radar_estimate'),
        ndvi: mean('ndvi') ?? (t.ndvi ?? 0),
        ndmi: mean('ndmi') ?? (t.ndmi ?? 0),
        evi: mean('evi') ?? 0,
        chlorophyll: mean('cvi') ?? 0,
        ndwi: mean('ndwi') ?? 0,
        color: '#16A34A',
        tileUrl: (sliderData.tiles || {})[t.date] || null,
      };
    });
    setTIMELINE_DATA(entries);
    // Land on a date just picked from the calendar, else the newest.
    const pending = pendingCalendarDateRef.current;
    pendingCalendarDateRef.current = null;
    const pendingIdx = pending ? entries.findIndex(e => e.date === pending) : -1;
    const targetIdx = pendingIdx !== -1 ? pendingIdx : entries.length - 1;
    setSelectedTimelineIndex(targetIdx);
    // Move the calendar's month only on a date pick or the first load: this runs on every refresh,
    // and moving it each time undid the user's own month navigation.
    if (pendingIdx !== -1 || !calendarInitializedRef.current) {
      const d = new Date(entries[targetIdx].date);
      setCalendarMonth(d.getMonth());
      setCalendarYear(d.getFullYear());
    }
    calendarInitializedRef.current = true;
  }, [sliderData, plots]);

  // The map follows the slider shortly after it stops moving, so dragging doesn't ask for a tile per
  // frame; the slider position itself updates at once.
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(2);
  const [activeCompareTimelineIndex, setActiveCompareTimelineIndex] = useState(3);
  const [sliderPending, setSliderPending] = useState(false);
  const sliderTimerA = useRef(null);
  const sliderTimerB = useRef(null);
  useEffect(() => {
    setSliderPending(true); // eslint-disable-line react-hooks/set-state-in-effect
    clearTimeout(sliderTimerA.current);
    sliderTimerA.current = setTimeout(() => {
      setActiveTimelineIndex(selectedTimelineIndex);
      setSliderPending(false);
    }, 400);
    return () => clearTimeout(sliderTimerA.current);
  }, [selectedTimelineIndex]);
  useEffect(() => {
    clearTimeout(sliderTimerB.current);
    sliderTimerB.current = setTimeout(() => setActiveCompareTimelineIndex(compareTimelineIndex), 400);
    return () => clearTimeout(sliderTimerB.current);
  }, [compareTimelineIndex]);

  const clampA = Math.min(activeTimelineIndex, TIMELINE_DATA.length - 1);
  const currentTimelineA = TIMELINE_DATA[clampA >= 0 ? clampA : 0];
  const clampB = Math.min(activeCompareTimelineIndex, TIMELINE_DATA.length - 1);
  const currentTimelineB = TIMELINE_DATA[clampB >= 0 ? clampB : 0];
  const currentTimeline = currentTimelineA;

  // The tile of each slot's date (sliderData holds every date of the timeline).
  const tileFor = (entry) => (entry ? (sliderData?.tiles?.[entry.date] || entry.tileUrl || null) : null);
  const currentTileUrl = useMemo(() => tileFor(currentTimeline), [sliderData, currentTimeline]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentTileUrlB = useMemo(() => tileFor(currentTimelineB), [sliderData, currentTimelineB]); // eslint-disable-line react-hooks/exhaustive-deps

  // Brief flash to show the tiles are refreshing when the tile changes
  useEffect(() => {
    if (!currentTileUrl) return;
    setTileRefreshing(true); // eslint-disable-line react-hooks/set-state-in-effect
    const t = setTimeout(() => setTileRefreshing(false), 1800);
    return () => clearTimeout(t);
  }, [currentTileUrl]);

  // Reset timeline selection to the middle when the month or year changes
  useEffect(() => {
    setSelectedTimelineIndex(2); // eslint-disable-line react-hooks/set-state-in-effect
  }, [calendarMonth, calendarYear]);

  // Play: advance one date every 10 s, on slot A or, in compare mode, the active slot.
  useEffect(() => {
    if (!isPlaying) return;
    const step = (prev) => {
      if (prev >= TIMELINE_DATA.length - 1) { setIsPlaying(false); return prev; }
      return prev + 1;
    };
    const id = setInterval(() => {
      if (isCompareMode && activeDateSlot !== 'A') setCompareTimelineIndex(step);
      else setSelectedTimelineIndex(step);
    }, 10000);
    return () => clearInterval(id);
  }, [isPlaying, isCompareMode, activeDateSlot, TIMELINE_DATA.length]);

  // Stop playing when leaving the map pages
  useEffect(() => {
    if (!MAP_PAGES.includes(activeSidebarItem)) setIsPlaying(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [activeSidebarItem]);
  const togglePlay = () => setIsPlaying(p => !p);

  // The calendar stays between the oldest image of this layer and this month: no future months, and
  // no empty months before the data starts.
  const calMonthKey = calendarYear * 12 + calendarMonth;
  const nowMonthKey = new Date().getFullYear() * 12 + new Date().getMonth();
  const sortedDates = useMemo(() => (TIMELINE_DATA || []).map(t => t.date).filter(Boolean).sort(), [TIMELINE_DATA]);
  const oldestMonthKey = useMemo(() => {
    if (!sortedDates.length) return nowMonthKey;
    const [y, m] = sortedDates[0].split('-').map(Number);
    return y * 12 + (m - 1);
  }, [sortedDates, nowMonthKey]);
  const canPrevCal = calMonthKey > oldestMonthKey;
  const canNextCal = calMonthKey < nowMonthKey;
  const prevCalMonth = () => {
    if (!canPrevCal) return;
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  };
  const nextCalMonth = () => {
    if (!canNextCal) return;
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  };
  // Newest image held, so the calendar can jump straight to it.
  const latestCalDate = sortedDates.length ? sortedDates[sortedDates.length - 1] : null;
  const jumpToLatestMonth = () => {
    if (!latestCalDate) return;
    const [y, m] = latestCalDate.split('-').map(Number);
    setCalendarYear(y);
    setCalendarMonth(m - 1);
  };
  const calFirstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const calDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calTrailing = 42 - calFirstDay - calDaysInMonth;

  return {
    sliderData, TIMELINE_DATA, timelineLoading, zarrBounds, calendarDates, calendarMonth, calendarYear,
    setCalendarMonth, setCalendarYear, calendarInitializedRef, pendingCalendarDateRef, selectedTimelineIndex,
    setSelectedTimelineIndex, setRefreshSlider, selectedSensor, effectiveSensor, isSarIndex, satellitePicker,
    setSatellitePicker, selectDateWithSensor, isCompareMode, setIsCompareMode, compareTimelineIndex,
    setCompareTimelineIndex, activeDateSlot, setActiveDateSlot, sliderPending, currentTimeline, currentTimelineA,
    currentTimelineB, currentTileUrl, currentTileUrlB, tileRefreshing, isPlaying, togglePlay, canPrevCal,
    canNextCal, prevCalMonth, nextCalMonth, latestCalDate, jumpToLatestMonth, calFirstDay, calDaysInMonth,
    calTrailing, SENSOR_DOT_COLOR,
  };
}
