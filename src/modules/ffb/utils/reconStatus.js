// One colour and label per plot reconciliation status, used by every page (map, Approval Center
// cards, Open buttons, plot header). Change them here only.
export const RECON_STATUS = {
  DISCREPANCY: { label: 'Mismatch', color: '#ef4444', dark: '#b91c1c' },
  WAITING_FOR_LOADER: { label: 'Awaiting Loading Role', color: '#facc15', dark: '#eab308' },  // bright yellow
  WAITING_FOR_RECORDER: { label: 'Awaiting Recorders', color: '#a855f7', dark: '#7e22ce' },
  RECONCILED: { label: 'Matched', color: '#5AA041', dark: '#3F8432' },
  // Every record decided and a supervisor rejected some (dark slate, never looks like a mismatch)
  REJECTED: { label: 'Rejected', color: '#475569', dark: '#334155' },
};

// The status filter, the same in the Approval Center and the Field Audit Map (components/StatusFilter.jsx):
// a dropdown of checkboxes. By default Pending, Mismatch and Rejected are ticked ("All issues");
// tick Matched to see matched plots too.
export const STATUS_CHOICES = [
  { value: 'warning', label: 'Pending' },
  { value: 'error', label: 'Mismatch' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'valid', label: 'Matched' },
];
export const DEFAULT_STATUSES = ['warning', 'error', 'rejected'];
const STATUS_KEY = { WAITING_FOR_LOADER: 'warning', WAITING_FOR_RECORDER: 'warning', DISCREPANCY: 'error', REJECTED: 'rejected', RECONCILED: 'valid' };

/** The ticked statuses (nothing chosen yet = the default). */
export const selectedStatuses = (value) => (Array.isArray(value) && value.length ? value : DEFAULT_STATUSES);
export const isDefaultStatuses = (value) => {
  const s = selectedStatuses(value);
  return s.length === DEFAULT_STATUSES.length && DEFAULT_STATUSES.every(k => s.includes(k));
};

/** An issue = anything not matched. */
export const isIssue = (status) => status !== 'RECONCILED';

/** Records of a plot-day: every record that passed its checks (or was approved) is matched; only the records
 *  still held for a supervisor are issues. 30 records, 25 approved = 25 matched · 5 issues. */
/** Approved vs not approved (pending + rejected) of rows that carry approval_status, summing value(row).
 *  Approved is what Approved Workers pays; the rest is still waiting or rejected. */
export function approvalSplit(rows, value) {
  let approved = 0, notApproved = 0;
  for (const r of rows || []) {
    const v = Number(value(r)) || 0;
    if (!r.approval_status || String(r.approval_status).toUpperCase() === 'APPROVED') approved += v; else notApproved += v;
  }
  return { approved, notApproved };
}

export function recordIssues(plot) {
  const total = Number(plot?.harvester_records) || 0;
  const issues = Number(plot?.pending_records) || 0;
  const rejected = Number(plot?.rejected_records) || 0;
  return { matched: Math.max(0, total - issues - rejected), issues, rejected };
}

/** Does a plot status pass the ticked statuses? */
export const statusMatches = (value, status) => selectedStatuses(value).includes(STATUS_KEY[status] || 'valid');

/**
 * The Approval Center's plot-days: harvester and picker rows from /approval/plot-exceptions,
 * one per plot, date and mode, newest first. Used by the Approval Center table and by the
 * sidebar badge, so both count the same plot-days.
 */
export function plotDays(harvesterRows, pickerRows) {
  const seen = new Set();
  const out = [];
  for (const p of [...(harvesterRows || []), ...(pickerRows || [])]) {
    const mode = p.mode || 'harvester';
    const key = `${p.plot_id}|${p.work_date}|${mode}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ ...p, mode });
    }
  }
  return out.sort((a, b) => String(b.work_date).localeCompare(String(a.work_date)));
}

/** Plot-days shown under "All issues" (Pending, Mismatch, Rejected: everything except Matched). */
export const issuePlotDays = (days) => (days || []).filter(p => statusMatches(null, p.status));

/** Text on the closed dropdown: "All statuses" when all are selected, "All issues" by default, otherwise the ticked names. */
export function statusSummary(value) {
  const s = selectedStatuses(value);
  if (s.length === STATUS_CHOICES.length) return 'All statuses';
  if (isDefaultStatuses(value)) return 'All issues';
  return STATUS_CHOICES.filter(c => s.includes(c.value)).map(c => c.label).join(', ');
}

/** Status info; anything unknown counts as matched (the backend's default). */
export const reconStatus = (status) => RECON_STATUS[status] || RECON_STATUS.RECONCILED;

// Rejected records: the same dark slate as the Rejected plot status.
export const REJECTED_COLOR = RECON_STATUS.REJECTED;

// One harvest record and the load it pairs with (closest in time, same plot, day and work type;
// backend api/crud/utils/pairing.py). Same colours as the plot statuses.
export const PAIR_STATUS = {
  MATCHED: { label: 'Load matches', color: RECON_STATUS.RECONCILED.color, dark: RECON_STATUS.RECONCILED.dark },
  COUNT_DIFFERS: { label: 'Load count differs', color: RECON_STATUS.DISCREPANCY.color, dark: RECON_STATUS.DISCREPANCY.dark },
  // A record without a pair shows no pair line (NO_LOAD / NO_HARVEST have no label).
};

// Validation filter -> API approval_status (backend api/crud/utils/statuses.py): Approved, or Not approved =
// every other record (pending, rejected or any other status). Older saved values map the same way.
export function approvalStatusParam(v) {
  const s = String(v || '').toLowerCase();
  if (s === 'approved' || s === 'valid') return 'approved';
  if (s === 'not_approved' || s === 'warning' || s === 'error' || s === 'pending' || s === 'rejected') return 'not_approved';
  return undefined;
}
