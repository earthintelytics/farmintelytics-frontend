import { useEffect, useState } from 'react';
import { API } from '../services/api';

// One request for the whole Approval Center (not one per record card), shared and kept for 5 minutes.
let cache = { at: 0, promise: null };

function load() {
  if (!cache.promise || Date.now() - cache.at > 300000) {
    cache = { at: Date.now(), promise: API.fetchRecorderPatterns({ days: 30 }).then(d => new Map((d.recorders || []).map(r => [r.clerk_id, r]))).catch(() => new Map()) };
  }
  return cache.promise;
}

/** The coaching hint for one recorder (or null). A failed load just shows no hint; nothing else depends on it. */
export function useRecorderPattern(clerkId) {
  const [pattern, setPattern] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!clerkId) return undefined;
    load().then(map => { if (alive) setPattern(map.get(clerkId) || null); });
    return () => { alive = false; };
  }, [clerkId]);
  return pattern && pattern.needs_training ? pattern : null;
}
