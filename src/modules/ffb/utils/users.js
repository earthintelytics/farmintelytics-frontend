// ============================================================
// users.js — Centralized Identity & Role Store
// ============================================================

export const PORTAL_USERS = [
  // Super Administrator (Access to /admin)
  {
    id: 'ADMIN001',
    email: 'admin@ffb.com',
    password: 'admin123',
    role: 'Super Admin',
    status: 'Active',
    created_at: '2026-01-01'
  },
  
  // Standard Dashboard Users (Access to analytics)
  {
    id: 'USR001',
    email: 'supervisor@ffb.com',
    password: 'password123',
    role: 'Manager', // Can approve/reject
    status: 'Active',
    created_at: '2026-02-15'
  },
  {
    id: 'USR002',
    email: 'viewer@ffb.com',
    password: 'viewer123',
    role: 'View', // Read-only
    status: 'Active',
    created_at: '2026-03-10'
  }
];

export const ROLE_PERMISSIONS = {
  'Super Admin': 'Complete control over system identities and access protocols.',
  'Manager': 'Full operational analytics, record approval and the Monthly Settlement, for all estates or one assigned estate.',
  'View': 'Standard analytical access, read-only data, and reporting capabilities, for all estates or one assigned estate.'
};
