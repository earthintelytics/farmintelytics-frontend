// Canonical worker role groups for FarmIntelytics FFB.
export const ROLE_GROUPS = ['Cutter', 'Carrier', 'Picker', 'Loading Role', 'Harvester Role'];

const FUNCTION_GROUPS = {
  'cutter': 'Cutter',
  'harvesting': 'Cutter',
  'harvester': 'Cutter',
  'agric worker': 'Cutter',
  'agric man': 'Cutter',
  'ag.man': 'Cutter',
  'agricultural worker': 'Cutter',
  'agric': 'Cutter',
  'field worker': 'Cutter',
  'carrier': 'Carrier',
  'loose fruit picker': 'Picker',
  'picker': 'Picker',
  'loading role': 'Loading Role',
  'loading officer': 'Loading Role',
  'haulage role': 'Loading Role',
  'counter': 'Loading Role',
  'loading clerk': 'Loading Role',
  'ffb loading clerk': 'Loading Role',
  'load clerk': 'Loading Role',
  'harvester role': 'Harvester Role',
  'harvesting role': 'Harvester Role',
  'harvesting officer': 'Harvester Role',
  'field recorder': 'Harvester Role',
  'recorder': 'Harvester Role',
  'recording clerk': 'Harvester Role',
  'harvesting clerk': 'Harvester Role',
  'harvest clerk': 'Harvester Role',
};

/** Returns the canonical group for a raw function value, or null if unknown. */
export function roleGroup(fn) {
  const key = String(fn || '').toLowerCase().split(/\s+/).filter(Boolean).join(' ');
  return FUNCTION_GROUPS[key] || null;
}
