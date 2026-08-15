import type { NavItemId } from '../types/fms';

/** Application roles used for RBAC in the FMS shell */
export type AppRole =
  | 'ops_lead'
  | 'dispatcher'
  | 'maintenance'
  | 'analyst'
  | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: AppRole;
  roleLabel: string;
  site: string;
  avatarInitials: string;
  /** Optional profile photo (data URL or remote URL) */
  avatarUrl?: string | null;
  status?: 'Active' | 'Idle' | 'Offline';
  lastLogin?: string;
  /** Modules this role may open */
  modules: NavItemId[];
}

const ALL: NavItemId[] = [
  'dashboard',
  'live-ops',
  'dispatch',
  'fleet',
  'production',
  'equipment',
  'equipment-detail',
  'maintenance',
  'fuel',
  'spare-parts',
  'operators',
  'alerts',
  'reports',
  'analytics',
  'users',
  'roles',
  'settings',
  'audit-logs',
];

const OPS_MODULES: NavItemId[] = [
  'dashboard',
  'live-ops',
  'dispatch',
  'fleet',
  'production',
  'equipment',
  'equipment-detail',
  'operators',
  'alerts',
  'reports',
  'analytics',
  'settings',
  'users',
];

/** System operational accounts and site credential directory */
export const DEMO_USERS: AuthUser[] = [
  {
    id: 'u-admin',
    email: 'imbran@mineops.local',
    password: 'admin123',
    name: 'Imbran',
    role: 'admin',
    roleLabel: 'System Admin',
    site: 'Central Command',
    avatarInitials: 'IM',
    status: 'Active',
    lastLogin: 'Just now',
    modules: ALL,
  },
  {
    id: 'u-ops-aldi',
    email: 'aldi@mineops.local',
    password: 'ops123',
    name: 'Aldi',
    role: 'ops_lead',
    roleLabel: 'Ops Lead - Pit North',
    site: 'Pit North',
    avatarInitials: 'AL',
    status: 'Active',
    lastLogin: '14:38 UTC',
    modules: OPS_MODULES,
  },
  {
    id: 'u-ops-dani',
    email: 'dani@mineops.local',
    password: 'ops123',
    name: 'Dani',
    role: 'ops_lead',
    roleLabel: 'Ops Lead - Dispatch',
    site: 'Pit North',
    avatarInitials: 'DA',
    status: 'Active',
    lastLogin: '14:30 UTC',
    modules: OPS_MODULES,
  },
  {
    id: 'u-ops-arsyil',
    email: 'arsyil@mineops.local',
    password: 'ops123',
    name: 'Arsyil',
    role: 'ops_lead',
    roleLabel: 'Ops Lead - Fleet Control',
    site: 'Pit North',
    avatarInitials: 'AR',
    status: 'Active',
    lastLogin: '13:50 UTC',
    modules: OPS_MODULES,
  },
  {
    id: 'u-ops-putri',
    email: 'putri@mineops.local',
    password: 'ops123',
    name: 'Putri',
    role: 'ops_lead',
    roleLabel: 'Ops Lead - Production',
    site: 'Pit North',
    avatarInitials: 'PU',
    status: 'Active',
    lastLogin: '12:15 UTC',
    modules: OPS_MODULES,
  },
];

export function findUserByCredentials(email: string, password: string): AuthUser | null {
  const e = email.trim().toLowerCase();
  // Allow admin@mineops.local alias for imbran
  const u = DEMO_USERS.find(
    (x) =>
      (x.email.toLowerCase() === e || (e === 'admin@mineops.local' && x.id === 'u-admin')) &&
      x.password === password,
  );
  return u ?? null;
}

export function publicUser(u: AuthUser): Omit<AuthUser, 'password'> {
  const { password: _p, ...rest } = u;
  return rest;
}

export type PublicAuthUser = Omit<AuthUser, 'password'>;

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
