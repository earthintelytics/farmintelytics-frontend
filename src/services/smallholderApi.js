/** Smallholder groups, members and parcels (contract "Smallholder", G30). */
import { serviceCall, query } from './serviceClient';

export const fetchGroups = () => serviceCall('/smallholder/groups');
export const fetchMembers = (params) => serviceCall(`/smallholder/members${query(params)}`);
export const updateMember = (id, member) => serviceCall(`/smallholder/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: member });

export const fetchParcels = (params) => serviceCall(`/smallholder/parcels${query({ format: 'geojson', ...params })}`);

export const fetchCarbonSummary = (params) => serviceCall(`/smallholder/carbon-summary${query(params)}`);

export const exportMember = (id) => serviceCall(`/smallholder/members/${encodeURIComponent(id)}/export`);

export const deleteMember = (id, params) => serviceCall(`/smallholder/members/${encodeURIComponent(id)}${query(params)}`, { method: 'DELETE' });



// The members' EUDR check (monitoring/router/smallholder_eudr.py).
export const checkParcelsEudr = (parcelIds) => serviceCall('/smallholder/eudr/check', { method: 'POST', body: { parcel_ids: parcelIds || null } });
export const fetchEudrSummary = () => serviceCall('/smallholder/eudr/summary');
export const fetchEudrFileForEu = () => serviceCall('/smallholder/eudr/export');
