const read = (key) => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

export function normalizePortalRole(raw) {
  const r = String(raw || '').trim().toLowerCase();
  if (!r) return 'View';
  if (['super admin', 'superadmin', 'owner', 'team'].includes(r)) return 'Super Admin';
  if (['admin', 'manager', 'edit'].includes(r)) return 'Manager';
  return 'View';
}

export const getRole = () => {
  const ffbRole = read('fi_ffb_role');
  if (ffbRole) return normalizePortalRole(ffbRole);
  const fiRole = read('fi_role');
  if (fiRole) return normalizePortalRole(fiRole);
  if (!read('fi_token') && read('fi_admin_token')) return 'Super Admin';
  return 'View';
};

export const getUserEmail = () => read('fi_email') || read('fi_admin_email') || 'team@earthintelytics.com';

export const getEstateScope = () => (getRole() === 'Super Admin' ? '' : read('fi_ffb_estate'));

export const isManager = () => ['Manager', 'Super Admin'].includes(getRole());

export const estateLabel = () => getEstateScope() || 'All Estates';

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

export function saveSession(user) {
  try {
    if (user?.role) localStorage.setItem('fi_ffb_role', normalizePortalRole(user.role));
    localStorage.setItem('fi_ffb_estate', getRole() === 'Super Admin' ? '' : user?.estate || '');
  } catch {
    /* ignore storage errors */
  }
}
