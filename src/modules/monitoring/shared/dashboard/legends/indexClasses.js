import { useEffect, useState } from 'react';

/**
 * The classes each satellite index is painted with on the map: the crop's index profile (the admin's
 * thresholds), published by the dashboard once loaded. The map layers panel reads them, so its legend
 * shows exactly the map's colours and ranges instead of a generic gradient.
 */
let classes = {};
const listeners = new Set();

export function setIndexClasses(map) {
  classes = map || {};
  listeners.forEach((fn) => fn());
}

/** [{ label, range: [lo, hi], color }] for an index, or null when it has no classes. */
export function indexClassesFor(key) {
  const list = classes[String(key || '').toLowerCase()];
  return list && list.length ? list : null;
}

/** Re-render when the classes arrive or change. */
export function useIndexClasses() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
}
