/**
 * Which workers get an ID badge: active workers in a field role (not headmen, general hands, pruning or
 * tapping, or an unknown role). Shared by the Workers page and the badge printer.
 */
const BLOCKED_FUNCTIONS = new Set([
  'headman',
  'headperson',
  'headwoman',
  'field hand',
  'prunning',
  'pruning',
  'tapping',
  'unknown'
]);

export function isEligibleForBadge(emp) {
  if (!emp) return false;
  const status = (emp.worker_status || emp.service || 'Active').trim().toLowerCase();
  if (status === 'inactive' || status === 'suspended' || status === 'deactivated' || status === 'terminated') {
    return false;
  }
  const fn = (emp.function || '').trim().toLowerCase();
  if (!fn || BLOCKED_FUNCTIONS.has(fn)) {
    return false;
  }
  return true;
}
