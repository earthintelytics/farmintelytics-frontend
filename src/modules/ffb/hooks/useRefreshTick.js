import { useEffect, useState } from 'react';
import { API } from '../services/api';

/**
 * A number that goes up every time the top-bar Refresh finishes ('ffb:refresh').
 * Put it in a page's data-loading effect dependencies and that page reloads its data on Refresh.
 */
export function useRefreshTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => { API.invalidateCache(); setTick(t => t + 1); };
    window.addEventListener('ffb:refresh', bump);
    return () => window.removeEventListener('ffb:refresh', bump);
  }, []);
  return tick;
}
