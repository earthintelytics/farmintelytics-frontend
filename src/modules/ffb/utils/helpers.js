

// ============================================================
// helpers.js — Generic utility helpers
// ============================================================

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} delay  ms
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Check if a value is set (not null/undefined).
 */
export function hasValue(v) {
  return v !== null && v !== undefined;
}

/**
 * Emit a custom DOM event.
 * @param {string} eventName
 * @param {*} detail
 */
export function emit(eventName, detail = null) {
  const event = new CustomEvent(eventName, { detail, bubbles: true });
  document.dispatchEvent(event);
}

/**
 * Subscribe to a custom DOM event.
 * @param {string} eventName
 * @param {Function} handler
 */
export function on(eventName, handler) {
  document.addEventListener(eventName, handler);
}

/**
 * Deep-clone a plain object / array.
 * @param {*} obj
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Safe element query — returns null (not throws) if missing.
 * @param {string} selector
 * @param {Element} [ctx]
 */
export function qs(selector, ctx = document) {
  return ctx.querySelector(selector);
}

/**
 * Returns all matching elements as a real Array.
 * @param {string} selector
 * @param {Element} [ctx]
 */
export function qsAll(selector, ctx = document) {
  return [...ctx.querySelectorAll(selector)];
}

/**
 * Clamp a value between min and max.
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Generate a unique local ID (not cryptographically strong).
 */
export function uid() {
  return `_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Capitalise first letter of a string.
 */
export function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Return true if a string is blank / null / undefined.
 */
export function isBlank(val) {
  return val == null || String(val).trim() === '';
}

/**
 * Paginate an array.
 * @param {Array} arr
 * @param {number} page   1-indexed
 * @param {number} size
 */
export function paginate(arr, page, size) {
  const start = (page - 1) * size;
  return arr.slice(start, start + size);
}

/**
 * Build query-string from a plain object (undefined values are omitted).
 */
export function toQueryString(params = {}) {
  return Object.entries(params)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/**
 * Compute data status based on data quality, discrepancies and role.
 * Works with both individual_analytics and raw Clerk records.
 * @param {Object} record
 * @returns {string}
 */
export function getDataStatus(record) {
  // If it's a plot_analytics record, status might already be set
  if (record.status || record.approval_status) {
    const s = (record.status || record.approval_status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'VALID') return 'valid';
    if (s === 'PENDING' || s === 'WARNING') return 'warning';
    if (s === 'REJECTED' || s === 'ERROR') return 'error';
  }

  const role = (record.role || record.h_worker_role || '').toLowerCase();
  
  // Weights-based status for Pickers
  if (role === 'picker' || role === 'loose fruit picker') {
    const w = record.weight_kg ?? record.h_weight_kg ?? 0;
    return (w > 0) ? 'valid' : 'warning';
  }

  // Count-based status for Cutters/Carriers
  const h_count = record.h_total_count ?? record.total_harvest_count ?? record.total_count ?? 0;
  const l_count = record.l_total_count ?? record.total_weight_kg ?? null; // Simplified fallback
  const ai_count = record.ai_count ?? record.h_ai_detected_count ?? record.total_ai_count ?? h_count;

  // If no loading data yet
  if (!hasValue(l_count) && !record.loaders_count) return 'warning';

  const diff_ai = Math.abs(h_count - ai_count);
  
  // Status priority: Error > Warning > Valid
  if (diff_ai > (h_count * 0.15)) return 'error'; // > 15% AI variance is error
  if (diff_ai > 0) return 'warning';

  return 'valid';
}

/**
 * Calculate discrepancy between loading/validation and harvesting.
 * @param {Object} record
 * @returns {number|null}
 */
export function computeDiscrepancy(record) {
  const h = record.h_total_count ?? record.total_harvest_count ?? record.total_count ?? 0;
  const l = record.l_total_count ?? record.total_weight_kg ?? null; 
  
  if (!hasValue(l)) return null;
  return l - h;
}
