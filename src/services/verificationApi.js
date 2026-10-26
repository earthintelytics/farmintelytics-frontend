import { serviceCall } from './serviceClient';

/** GET /verification?kind= → { checks, outstanding }, or null when the backend has no result yet. */
// The service open in this page scopes the boundary checks to its own blocks.
const currentModule = () => { try { return sessionStorage.getItem('fi_module') || ''; } catch { return ''; } };
export const fetchVerification = (kind) => {
  const m = currentModule();
  return serviceCall(`/verification?kind=${encodeURIComponent(kind)}${m ? `&module=${encodeURIComponent(m)}` : ''}`).catch(() => null);
};
