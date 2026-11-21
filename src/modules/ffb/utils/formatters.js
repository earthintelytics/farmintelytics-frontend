
import { ROLE_LABELS } from './constants.js';
import { capitalize } from './helpers.js';

// ============================================================
// formatters.js — Display formatting utilities
// ============================================================

/**
 * Format a number with comma-separated thousands.
 */
export function fmtNumber(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-NG');
}

/**
 * Format a weight value (kg) with one decimal place.
 */
export function fmtWeight(n) {
  if (n == null || isNaN(n)) return '—';
  return `${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

/**
 * One date rule for every page.
 *  - "2026-09-25" (a day, no time) is that calendar day: never shifted by time zone, shown without a time.
 *  - A timestamp without a zone ("2026-09-25T12:15:01") is the plantation's local time, as recorded.
 *  - A timestamp with a zone (…Z / +01:00) is converted to the viewer's local time.
 * Shown as "25 Sept 2026" and "25 Sept 2026, 12:15 PM" (12-hour clock with AM / PM).
 */
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  if (DAY_ONLY.test(text)) {
    const [y, m, d] = text.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(text.includes(' ') && !text.includes('T') ? text.replace(' ', 'T') : text);
  return Number.isNaN(d.getTime()) ? null : d;
}

const isDayOnly = (value) => typeof value === 'string' && DAY_ONLY.test(value.trim());

/** "25 Sept 2026" */
export function fmtDate(value) {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

const clock = (d, seconds = false) => d.toLocaleTimeString('en-US', {
  hour: 'numeric', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hour12: true,
});

/** "12:15 PM" */
export function fmtTime(value) {
  const d = parseDate(value);
  if (!d || isDayOnly(value)) return '—';
  return clock(d);
}

/** "25 Sept 2026, 12:15 PM"; a day without a time shows the date only (never a made-up 1:00 AM). */
export function fmtDateTime(value, { seconds = false } = {}) {
  const d = parseDate(value);
  if (!d) return '—';
  if (isDayOnly(value)) return fmtDate(value);
  return `${fmtDate(d)}, ${clock(d, seconds)}`;
}

/** Chart axis label: "25 Sept" */
export function fmtDayShort(value) {
  const d = parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

/**
 * Return a human-readable role label.
 */
export function fmtRole(role) {
  return ROLE_LABELS[role] || capitalize(role || '—');
}

/**
 * Return a badge HTML span for a data_status value.
 * Handles both legacy valid/warning/error and approval Approved/Pending/Rejected values.
 */
export function fmtStatusBadge(status) {
  const map = {
    // Legacy data quality statuses
    valid:    { label: 'Valid',    color: '#3F8432' },
    warning:  { label: 'Warning',  color: '#d97706' },
    error:    { label: 'Error',    color: '#dc2626' },
    // Approval workflow statuses
    Approved: { label: 'Approved', color: '#3F8432' },
    Pending:  { label: 'Pending',  color: '#d97706' },
    Rejected: { label: 'Rejected', color: '#dc2626' },
    // Lowercase variants
    approved: { label: 'Approved', color: '#3F8432' },
    pending:  { label: 'Pending',  color: '#d97706' },
    rejected: { label: 'Rejected', color: '#dc2626' },
  };
  const cfg = map[status] || { label: status || '—', color: '#64748b' };
  return `<span style="font-weight: 800; font-size: 13px; color: ${cfg.color};">${cfg.label}</span>`;
}

/**
 * Return a short relative time string ("2 hours ago").
 */
export function fmtRelativeTime(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/**
 * Map technical field names to human-readable display names.
 */
export const FIELD_LABELS = {
  // Harvesting Clerk (H_)
  h_total_count:        'Harvested FFB',
  h_ai_detected_count:  'FFB Bunches (AI)',
  h_rotten_count:       'Rotten FFB',
  h_unripe_count:       'Unripe FFB',
  h_worker_id:          'Harvester ID',
  h_plot_id:            'Plot ID',
  h_weight:             'Loose Fruit Weight',
  
  // Loading Clerk (L_)
  l_total_count:        'Loaded FFB',
  l_ai_detected_count:  'Loaded Bunches (AI)',
  l_worker_id:          'Loader ID',
  l_weight:             'Loaded Weight',

  // Other shared
  total_count:          'Aggregate Count',
  plot_id:              'Plot ID',
  created_at:           'Time Captured',
};

/**
 * Return human-readable field label from technical key.
 */
export function fmtFieldName(field) {
  return FIELD_LABELS[field] || capitalize(field.replace(/_/g, ' '));
}

/**
 * Abbreviate large numbers (1500 → 1.5K).
 */
export function fmtAbbrev(n) {
  if (n == null || isNaN(n)) return '—';
  const val = Number(n);
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
  return String(val);
}
