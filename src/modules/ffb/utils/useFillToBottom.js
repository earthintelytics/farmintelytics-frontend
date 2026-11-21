import { useLayoutEffect } from 'react';

/**
 * Stretch an element down to the bottom of the window (minus `gap`), so a map fills
 * the screen with no empty strip below it and no page scroll. Re-fits on window resize.
 */
export function useFillToBottom(ref, { gap = 28, min = 360, enabled = true } = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;
    let last = 0;
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const h = Math.max(min, Math.floor(window.innerHeight - top - gap));
      if (h !== last) {
        last = h;
        el.style.setProperty('height', `${h}px`, 'important');
        window.dispatchEvent(new Event('resize')); // Leaflet redraws its tiles at the new size
      }
    };
    fit();
    const t = setTimeout(fit, 300); // after fonts/filters settle
    const onResize = () => { last = 0; requestAnimationFrame(fit); };
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
  }, [ref, gap, min, enabled]);
}
