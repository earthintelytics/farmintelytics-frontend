// Universal rule for a record's bunch count across portal views & exports:
//  1. Supervisor Approved Count: If supervisor accepted typed or kept AI on approval, that approved_count is final.
//  2. AI Detected Count: If no supervisor override exists, the AI photo scan count is the official count.
//  3. Clerk Typed Count: Used only as a fallback when AI detected 0 bunches.
//  - If both AI and typed are > 0 and differ, the record is flagged and held for supervisor review.
//  - Backend SQL equivalent: COALESCE(approved_count, NULLIF(h_ai_detected_count, 0), h_total_count, 0)

const n = (v) => Math.max(0, Number(v) || 0);

/** { main, typed (null = no brackets), diff (typed − AI, 0 = agrees or confirmed) } */
export function bunchCount(ai, typed, approved = null) {
  if (approved != null) return { main: n(approved), typed: null, diff: 0 };
  const a = n(ai);
  const t = n(typed);
  const both = a > 0 && t > 0;
  return { main: a > 0 ? a : t, typed: both ? t : null, diff: both ? t - a : 0 };
}

/** "Typed 16, AI counted 9 (+7)" or '' when the counts agree (or a supervisor confirmed one). */
export function countFlag(ai, typed, approved = null) {
  const c = bunchCount(ai, typed, approved);
  if (!c.diff) return '';
  return `Typed ${c.typed}, AI counted ${c.main} (${c.diff > 0 ? '+' : ''}${c.diff})`;
}

/** Which count the supervisor confirmed: "Typed count confirmed (typed 33, AI 30)", or ''. */
export function confirmedNote(source, ai, typed) {
  if (!source) return '';
  return `${source === 'typed' ? 'Typed' : 'AI'} count confirmed (typed ${n(typed)}, AI ${n(ai)})`;
}
