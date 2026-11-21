// Canonical worker role groups. Mirrors FUNCTION_GROUPS in backend fetch_records.py.
// Every stored/displayed role is one of these five; anything else is unknown.
export const ROLE_GROUPS = ['Cutter', 'Carrier', 'Picker', 'Loading Clerk', 'Harvesting Clerk'];

const FUNCTION_GROUPS = {
  'cutter': 'Cutter', 'harvesting': 'Cutter', 'agric worker': 'Cutter', 'agric man': 'Cutter',
  'ag.man': 'Cutter', 'agricultural worker': 'Cutter', 'agric': 'Cutter',
  'carrier': 'Carrier',
  'loose fruit picker': 'Picker', 'picker': 'Picker',
  'counter': 'Loading Clerk', 'loading clerk': 'Loading Clerk',
  'ffb loading clerk': 'Loading Clerk', 'load clerk': 'Loading Clerk',
  'recorder': 'Harvesting Clerk', 'recording clerk': 'Harvesting Clerk',
  'harvesting clerk': 'Harvesting Clerk', 'harvest clerk': 'Harvesting Clerk',
};

/** Returns the canonical group for a raw function value, or null if unknown. */
export function roleGroup(fn) {
  const key = String(fn || '').toLowerCase().split(/\s+/).filter(Boolean).join(' ');
  return FUNCTION_GROUPS[key] || null;
}
