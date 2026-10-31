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

export const alertSpeech = (a) => {
  const advice = adviceOf(a);
  return [`${severityOf(a).label}.`, a.plot_id ? `${a.plot_id}.` : '', sentence(a.message), advice ? `What to do: ${sentence(advice)}` : ''].filter(Boolean).join(' ');
};

export const spotSpeech = (s) => {
  const c = s.likely_causes?.[0];
  return [
    `${s.plot_id}${s.where ? `, ${s.where}` : ''}.`,
    s.weak_pct != null ? `${s.weak_pct} percent of it is weak.` : '',
    s.getting_worse ? 'It is getting worse.' : '',
    s.standing_water ? 'There is standing water.' : '',
    c ? `${STRENGTH[c.strength] || 'Possible cause'}: ${sentence(c.title)}` : '',
    c?.check ? `Look for ${sentence(c.check)}` : '',
    c?.do ? `What to do: ${sentence(c.do)}` : '',
  ].filter(Boolean).join(' ');
};

/** The question "Ask about this" writes in for the farmer. */
export const alertQuestion = (a) => `About ${a.plot_id || 'the farm'}: "${String(a.message || '').trim()}" What does this mean and what should I do?`;

// Android opens geo: links in the phone's maps app; elsewhere Google Maps in the browser.
export const mapsLink = (lat, lon) => (/Android/i.test(navigator.userAgent)
  ? `geo:${lat},${lon}?q=${lat},${lon}`
  : `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`);
