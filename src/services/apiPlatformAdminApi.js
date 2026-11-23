/** Admin, API clients: products, plans, clients, keys and money (api_platform/admin_router.py). */
import { adminFetch } from './adminApi';

const j = (body) => JSON.stringify(body);
export const fetchApiProducts = () => adminFetch('/api-platform/products');
export const fetchApiPlans = () => adminFetch('/api-platform/plans');
export const createApiPlan = (plan) => adminFetch('/api-platform/money/plans', { method: 'POST', body: j(plan) });
export const updateApiPlan = (id, plan) => adminFetch(`/api-platform/money/plans/${id}`, { method: 'PUT', body: j(plan) });
export const fetchApiClients = () => adminFetch('/api-platform/clients');
export const fetchApiClient = (id) => adminFetch(`/api-platform/clients/${id}`);
export const createApiClient = (c) => adminFetch('/api-platform/clients', { method: 'POST', body: j(c) });
export const updateApiClient = (id, c) => adminFetch(`/api-platform/clients/${id}`, { method: 'PATCH', body: j(c) });
export const setApiSubscription = (id, planId) => adminFetch(`/api-platform/money/clients/${id}/subscription`, { method: 'PUT', body: j({ plan_id: planId }) });
export const issueApiKey = (id, name, mode) => adminFetch(`/api-platform/clients/${id}/keys`, { method: 'POST', body: j({ name, mode }) });
export const revokeApiKeyAdmin = (keyId) => adminFetch(`/api-platform/keys/${keyId}/revoke`, { method: 'POST' });
export const topupApiWallet = (id, amountMinor, reference, note) =>
  adminFetch(`/api-platform/money/clients/${id}/topup`, { method: 'POST', body: j({ amount_minor: amountMinor, reference, note }) });
export const adjustApiWallet = (id, amountMinor, reference, note) =>
  adminFetch(`/api-platform/money/clients/${id}/adjust`, { method: 'POST', body: j({ amount_minor: amountMinor, reference, note }) });
export const fetchApiStatement = (id, month) => adminFetch(`/api-platform/clients/${id}/statement${month ? `?month=${month}` : ''}`);
