/**
 * src/services/activityApi.js
 * API client for Activity Audit Logs (T49).
 */
import { adminFetch } from './adminApi';

export async function fetchActivityLogs({
  page = 1,
  pageSize = 25,
  organizationId = '',
  targetType = '',
  action = '',
  search = '',
  startDate = '',
  endDate = '',
} = {}) {
  const p = new URLSearchParams();
  if (page) p.set('page', String(page));
  if (pageSize) p.set('page_size', String(pageSize));
  if (organizationId) p.set('organization_id', organizationId);
  if (targetType) p.set('target_type', targetType);
  if (action) p.set('action', action);
  if (search) p.set('search', search);
  if (startDate) p.set('start_date', startDate);
  if (endDate) p.set('end_date', endDate);

  return adminFetch(`/activity?${p.toString()}`);
}

export async function exportActivityLogs(organizationId = '') {
  const p = new URLSearchParams();
  if (organizationId) p.set('organization_id', organizationId);
  return adminFetch(`/activity/export?${p.toString()}`, { method: 'POST' });
}
