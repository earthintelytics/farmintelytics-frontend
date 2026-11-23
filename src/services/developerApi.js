/** The organisation's Developer and API page: its API account, keys, callback and statement (api_platform/client_router.py). */
import { serviceCall, query } from './serviceClient';

export const fetchDeveloperOverview = () => serviceCall('/developer/overview');
export const createApiKey = (name, mode) => serviceCall('/developer/keys', { method: 'POST', body: { name, mode } });
export const revokeApiKey = (id) => serviceCall(`/developer/keys/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: {} });
export const rotateApiKey = (id) => serviceCall(`/developer/keys/${encodeURIComponent(id)}/rotate`, { method: 'POST', body: {} });
export const saveWebhook = (callbackUrl, newSecret = false) =>
  serviceCall('/developer/webhook', { method: 'PUT', body: { callback_url: callbackUrl, new_secret: newSecret } });
export const fetchDeveloperStatement = (month) => serviceCall(`/developer/statement${query(month ? { month } : {})}`);
