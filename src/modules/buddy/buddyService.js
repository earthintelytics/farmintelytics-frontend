// Which of the organisation's services Farm Buddy reads (alerts, where to walk, the advisor). The
// list is the one the organisation hub shows (licensed at onboarding). The choice is kept on this
// phone per organisation, so an installed app opens straight on it, and copied into the session's
// `fi_module`, which the API helpers send with each request.
import { readOrgProfile, licensedServices } from '../../pages/org/orgProfile';
import { tenantKey } from '../../services/session';

const KEY = 'fi_buddy_service';

export const buddyServices = () => licensedServices(readOrgProfile());

export function readBuddyService(services) {
  const ids = services.map((s) => s.id);
  const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
  const saved = read(localStorage, tenantKey(KEY));
  if (saved && ids.includes(saved)) return saved;
  const open = read(sessionStorage, 'fi_module');
  if (open && ids.includes(open)) return open;
  return ids.length === 1 ? ids[0] : null;
}

export function saveBuddyService(id) {
  try { localStorage.setItem(tenantKey(KEY), id); } catch { /* storage blocked */ }
}

export function clearBuddyService() {
  try { localStorage.removeItem(tenantKey(KEY)); } catch { /* storage blocked */ }
}

/** Point the API helpers at this service; called while rendering, before any child fetches. */
export function pointRequestsAt(id) {
  if (!id) return;
  try { if (sessionStorage.getItem('fi_module') !== id) sessionStorage.setItem('fi_module', id); } catch { /* storage blocked */ }
}
