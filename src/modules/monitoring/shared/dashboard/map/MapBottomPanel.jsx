/**
 * The strip under every map: which image is on the map, step through images, play them, and a
 * small month calendar in a pop-up. Kept short on purpose so the map keeps the screen.
 * The client never chooses a satellite: the best image of a day is shown.
 */
import MapBottomStrip from './MapBottomStrip';

export function renderMapBottomPanel(ctx, indexValue, centerContent = null, hideCalendarAndSlider = false) {
  if (!ctx.showTimeSliderTool && !ctx.showCalendarTool) return null;
  return <MapBottomStrip ctx={ctx} centerContent={centerContent} hideTimeline={hideCalendarAndSlider} />;
}
