/**
 * Normalizes worker status according to the business rule:
 * All records default to "Active" EXCEPT when explicitly set to "Inactive"
 * (or variants: in-active, deactivated, suspended, terminated, 0, false, off, etc.)
 */
export function normalizeWorkerStatus(rawStatus) {
  if (!rawStatus) return 'Active';
  const val = String(rawStatus).trim().toLowerCase();
  if (
    /^(inactive|in-active|in\s+active|deactivated|deactive|disabled|suspend|suspended|disengaged|terminated|left|resigned|no|false|0|off)$/i.test(val) ||
    val.includes('inactive') ||
    val.includes('deactivat') ||
    val.includes('suspend') ||
    val.includes('disengage')
  ) {
    return 'Inactive';
  }
  return 'Active';
}
