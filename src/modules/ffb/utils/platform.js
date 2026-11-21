// One way to show a platform on every page. Stored IDs look like EST1-B3.2_edge_1_248; each plot numbers its
// own platforms from 1, so people see the plot with the number: "B3.2 · Platform 248" (other parts of a plot
// in several pieces: "B3.2 · Platform 2-17"), never the word "edge". Same rule as the backend (rules.py _pn).
const ID = /(?:\bplatform\s+)?(?:[A-Z]{3}\d{2}-)?([\w.]+?)_edge_(\d+)_(\d+)/gi;
const name = (plot, part, n) => `${plot} · Platform ${part === '1' ? n : `${part}-${n}`}`;

/** "B3.2 · Platform 248"; no platform (inside the field) says so. */
export function fmtPlatform(id) {
  if (!id || id === 'interior') return 'Inside the field (no platform)';
  const m = /^(?:.*-)?([^-_]+)_edge_(\d+)_(\d+)$/.exec(String(id));
  return m ? name(m[1], m[2], m[3]) : String(id);
}

/** Just the number ("248"), for small labels on the map where the plot is already shown. */
export const platformNumber = (id) => fmtPlatform(id).split('Platform ').pop();

/** Platform IDs inside a sentence (scoring messages) written the same way. */
export const platformText = (text) => String(text || '').replace(ID, (_, plot, part, n) => name(plot, part, n));
