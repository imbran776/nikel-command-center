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

/** Demo accounts — local mock only; swap for JWT/IdP later */
export const DEMO_USERS: AuthUser[] = [
  {
    id: 'u-admin',
    email: 'admin@mineops.local',
    password: 'admin123',
    name: 'K. Okada',
    role: 'admin',
    roleLabel: 'System Admin',
    site: 'Central',
    avatarInitials: 'KO',
    status: 'Offline',
    lastLogin: 'Yesterday',
    modules: ALL,
  },
  {
    id: 'u-ops',
    email: 'alex.r@mineops.local',
    password: 'ops123',
    name: 'Alex R.',
    role: 'ops_lead',
    roleLabel: 'Ops Lead',
    site: 'Pit North',
    avatarInitials: 'AR',
    status: 'Active',
    lastLogin: '14:38 UTC',
    modules: [
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
    ],
  },
  {
    id: 'u-disp',
    email: 'j.brooks@mineops.local',
    password: 'dispatch123',
    name: 'J. Brooks',
    role: 'dispatcher',
    roleLabel: 'Dispatcher',
    site: 'Pit North',
    avatarInitials: 'JB',
    status: 'Active',
    lastLogin: '14:30 UTC',
    modules: [
      'dashboard',
      'live-ops',
      'dispatch',
      'fleet',
      'alerts',
      'operators',
    ],
  },
  {
    id: 'u-maint',
    email: 'm.torres@mineops.local',
    password: 'maint123',
    name: 'M. Torres',
    role: 'maintenance',
    roleLabel: 'Maintenance Supervisor',
    site: 'Pit North',
    avatarInitials: 'MT',
    status: 'Active',
    lastLogin: '13:10 UTC',
    modules: [
      'dashboard',
      'fleet',
      'equipment',
      'equipment-detail',
      'maintenance',
      'fuel',
      'spare-parts',
      'alerts',
    ],
  },
  {
    id: 'u-analyst',
    email: 'a.liu@mineops.local',
    password: 'analyst123',
    name: 'A. Liu',
    role: 'analyst',
    roleLabel: 'Production Analyst',
    site: 'Central',
    avatarInitials: 'AL',
    status: 'Active',
    lastLogin: '09:45 UTC',
    modules: ['dashboard', 'production', 'reports', 'analytics', 'fleet'],
  },
  {
    id: 'u-yard',
    email: 's.park@mineops.local',
    password: 'yard123',
    name: 'S. Park',
    role: 'maintenance',
    roleLabel: 'Yard Technician',
    site: 'Pit North',
    avatarInitials: 'SP',
    status: 'Idle',
    lastLogin: '11:02 UTC',
    modules: ['dashboard', 'maintenance', 'fleet', 'spare-parts', 'alerts'],
  },
];

export function findUserByCredentials(email: string, password: string): AuthUser | null {
  const e = email.trim().toLowerCase();
  const u = DEMO_USERS.find((x) => x.email.toLowerCase() === e && x.password === password);
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
