/**
 * Text helpers for AI answers: block codes as people say them, and the answer as plain text for copying into
 * WhatsApp, email or a document (no Markdown signs; table rows as "a · b · c").
 */

/** "Plot_03" -> "Plot 3", as people say it. */
export const readable = (text) => String(text || '').replace(/\b([A-Za-z]+)_0*(\d+)\b/g, '$1 $2');

const TABLE_RULE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

/** The answer as plain text: bold signs removed, tables as one line per row. */
export function plainText(text) {
  return readable(text)
    .split('\n')
    .filter((line) => !TABLE_RULE.test(line))
    .map((line) => (line.trim().startsWith('|')
      ? line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()).filter(Boolean).join(' · ')
      : line))
    .join('\n')
    .replace(/\*\*|__/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .trim();
}

// ── GPS points to directions ──────────────────────────────────────────────────────────────────────
export const DIRECTIONS_URL = 'https://www.google.com/maps/dir/?api=1&destination=';
// "GPS 7.887955, 8.332405" or "7.887955, 8.332405" (4 or more decimals each); brackets around it are kept.
const GPS_POINT = /(GPS\s*:?\s*)?(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})(?!\d)/g;
// Parts of the text that are links already: left as they are.
const LINKS = /(\[[^\]]*\]\([^)]*\)|https?:\/\/\S+)/;

/** GPS points in an answer as Markdown links to directions (the answer renderer shows them as buttons). */
export function withDirections(text) {
  return String(text || '').split(LINKS).map((part, i) => (i % 2 === 1 ? part : part.replace(GPS_POINT, (whole, _gps, lat, lon) => {
    if (Math.abs(Number(lat)) > 90 || Math.abs(Number(lon)) > 180) return whole;
    return `[${lat}, ${lon}](${DIRECTIONS_URL}${lat},${lon})`;
  }))).join('');
}
