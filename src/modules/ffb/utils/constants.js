// ============================================================
// constants.js — Application-wide constants
// ============================================================

export const ROLES = Object.freeze({
  H_CLERK: 'harvester role',
  CUTTER:  'cutter',
  CARRIER: 'carrier',
  PICKER:  'picker',
  L_CLERK: 'loading role',
});

export const STATUSES = Object.freeze({
  VALID:   'valid',
  WARNING: 'warning',
  ERROR:   'error',
});

// Key metric per role: 'count' | 'weight'
export const ROLE_KEY_METRIC = Object.freeze({
  'harvester role': 'count',
  cutter:     'count',
  carrier:    'count',
  'loading role':'count',
  picker:     'weight',
  recorder:   null,
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.H_CLERK]:  'Harvester Role',
  [ROLES.CUTTER]:   'Harvester (Cutter)',
  [ROLES.CARRIER]:  'Carrier',
  [ROLES.PICKER]:   'Loose Fruit Picker',
  [ROLES.L_CLERK]:  'Loading Role',
});

export const SOURCE_LABELS = Object.freeze({
  harvesting_clerk_record: 'Harvester Role',
  loading_clerk_record:    'Loading Role (FFB)',
});

export const VIEWS = Object.freeze({
  DASHBOARD:  'dashboard',
  MAP:        'map',
  DATA:       'data',
  YIELD:      'yield',
  AI_QUALITY: 'ai-quality',
  EFFICIENCY: 'efficiency',
  WORKERS:    'workers',
  PLOTS:      'plots',
  APPROVAL:   'approval',
  PAYOUT:     'payout',
  PAYOUT_ITEMIZED: 'payout-itemized',
});
