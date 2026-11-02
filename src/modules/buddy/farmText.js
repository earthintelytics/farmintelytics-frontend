// Words for alerts and weak patches: what the cards show and what "Listen" reads. All of it comes
// from the API; nothing here is made up.
import { SEVERITY } from '../monitoring/shared/dashboard/alerts/alertCatalog';

export const STRENGTH = { strong: 'Likely cause', possible: 'Possible cause' };
export const sentence = (s) => { const t = String(s || '').trim(); return t && !/[.!?]$/.test(t) ? `${t}.` : t; };
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const severityOf = (a) => SEVERITY[a.severity] || SEVERITY.Info;
// Some alerts carry their own advice; the field name differs between alert sources.
export const adviceOf = (a) => a.action || a.recommendation || a.what_to_do || a.advice || '';
// Handled alerts (acknowledged, scout sent, resolved, dismissed) are not open.
export const isOpenAlert = (a) => !a.acknowledged && !['scout_assigned', 'resolved', 'dismissed', 'Acknowledged'].includes(a.status);

export function alertDate(ts) {
  const day = String(ts || '').split(/[ T]/)[0];
  const d = new Date(`${day}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// "Listen" is spoken like an adviser explaining to a farmer, not the card read out: full sentences,
// block names said the way people say them, shares in words, and what to do last.
const spokenName = (id) => String(id || '').replace(/[_-]+/g, ' ').replace(/\b0+(\d)/g, '$1').trim();
const shareWords = (pct) => (pct == null ? 'part' : pct <= 7 ? 'a small part' : pct <= 15 ? 'about a tenth'
  : pct <= 35 ? 'about a quarter' : pct <= 65 ? 'about half' : 'most');
const SAY_CAUSE = {
  too_much_water: 'there is too much water sitting in that part of the field',
  too_little_water: 'the crop there is not getting enough water',
  nutrient_shortage: 'the plants there are short of nitrogen or another nutrient',
  heat: 'that part of the field is running hotter than the rest',
  sudden_damage: 'something damaged the crop there recently, like pests, disease, animals, or plants falling over',
  long_standing_weak_patch: 'that patch has been weak since the start, maybe from gaps in planting or poor soil',
};
const SAY_SEVERITY = { Critical: 'This one needs action now', Warning: 'Keep an eye on this one', Info: 'For your information' };
const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const clause = (s) => lower(String(s || '').trim().replace(/[.!?]+$/, ''));

export const alertSpeech = (a) => {
  const advice = adviceOf(a);
  const where = a.plot_id ? ` on ${spokenName(a.plot_id)}` : '';
  return [`${SAY_SEVERITY[a.severity] || 'For your information'}${where}.`, sentence(a.message),
    advice ? `What I would do: ${sentence(clause(advice))}` : ''].filter(Boolean).join(' ');
};

export const spotSpeech = (s, first = true) => {
  const c = s.likely_causes?.[0];
  const said = c && SAY_CAUSE[c.cause];
  const lines = [
    `${first ? "Let's start with" : 'Next,'} ${spokenName(s.plot_id)}.`,
    `${s.where ? `In the ${s.where}, ` : ''}${shareWords(s.weak_pct)} of the field is weaker than the rest of it${s.getting_worse ? ', and it has been getting worse' : ''}.`,
    s.standing_water ? 'The radar also saw standing water there.' : '',
    said ? (c.strength === 'strong' ? `Most likely, ${said}.` : `It may be that ${said}.`) : "From the pictures I can't tell why.",
    // A known cause: what to look for, then what to do. Unclear: look closely and record what you see.
    said && c?.check ? `When you get there, look for ${clause(c.check)}.` : '',
    said && c?.do ? `If that is what you find, ${clause(c.do)}.` : '',
    !said ? `When you get there, look closely at ${clause(c?.check || 'the leaves, the soil and the water')}, and record what you see as a field visit, so the next advice can use it.` : '',
  ];
  return lines.filter(Boolean).join(' ');
};

/** The question "Ask about this" writes in for the farmer. */
export const alertQuestion = (a) => `About ${a.plot_id || 'the farm'}: "${String(a.message || '').trim()}" What does this mean and what should I do?`;

// Walking directions in Google Maps from where the phone is now (no starting point given) to the point,
// on the satellite view (!3m1!1e3) so the farmer sees the fields (the Maps app opens it on phones that
// have it, the browser elsewhere).
export const directionsLink = (lat, lon) =>
  `https://www.google.com/maps/dir//${lat},${lon}/@${lat},${lon},18z/data=!3m1!1e3!4m2!4m1!3e2`;

// GPS points written in an answer ("GPS 7.883791, 8.330234"): at least four decimals, within the globe.
const GPS = /(?:GPS\s*(?:point\s*)?[:(]?\s*)?(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})\)?/gi;

/** The GPS points in an answer, each once, at most three. */
export function gpsPoints(text) {
  const seen = new Set();
  const out = [];
  for (const m of String(text || '').matchAll(GPS)) {
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    const key = `${m[1]},${m[2]}`;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180 || seen.has(key)) continue;
    seen.add(key);
    out.push({ lat: m[1], lon: m[2] });
  }
  return out.slice(0, 3);
}

/** An answer as it is read aloud: GPS points and links are tapped, never spoken. */
export const spokenAnswer = (text) => String(text || '')
  .replace(/https?:\/\/\S+/g, '')
  .replace(GPS, 'the map button')
  .replace(/\s{2,}/g, ' ')
  .trim();
