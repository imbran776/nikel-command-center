import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEMO_USERS,
  findUserByCredentials,
  initialsFromName,
  publicUser,
  type PublicAuthUser,
} from '../data/authUsers';
import type { NavItemId } from '../types/fms';

const STORAGE_KEY = 'mineops_fms_session_v1';
const PROFILES_KEY = 'mineops_fms_profiles_v1';

export type ProfilePatch = {
  name?: string;
  avatarUrl?: string | null;
  site?: string;
  status?: 'Active' | 'Idle' | 'Offline';
};

interface AuthContextValue {
  user: PublicAuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  loginAsDemo: (userId: string) => void;
  logout: () => void;
  canAccess: (nav: NavItemId) => boolean;
  demoUsers: PublicAuthUser[];
  directory: PublicAuthUser[];
  updateProfile: (userId: string, patch: ProfilePatch) => void;
  updateCurrentUser: (patch: ProfilePatch) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileStore = Record<string, ProfilePatch>;

function loadProfiles(): ProfileStore {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProfileStore;
  } catch {
    return {};
  }
}

function saveProfiles(store: ProfileStore) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function mergeUser(base: PublicAuthUser, patch?: ProfilePatch): PublicAuthUser {
  if (!patch) return base;
  const name = patch.name?.trim() || base.name;
  return {
    ...base,
    name,
    site: patch.site ?? base.site,
    status: patch.status ?? base.status,
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : base.avatarUrl,
    avatarInitials: initialsFromName(name),
  };
}

function buildDirectory(profiles: ProfileStore): PublicAuthUser[] {
  return DEMO_USERS.map((u) => mergeUser(publicUser(u), profiles[u.id]));
}

function loadSession(profiles: ProfileStore): PublicAuthUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id: string };
    const full = DEMO_USERS.find((u) => u.id === parsed.id);
    if (!full) return null;
    return mergeUser(publicUser(full), profiles[full.id]);
  } catch {
    return null;
  }
}

function saveSession(user: PublicAuthUser | null) {
  try {
    if (!user) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: user.id }));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<ProfileStore>(() => loadProfiles());
  const [sessionId, setSessionId] = useState<string | null>(() => {
    const s = loadSession(loadProfiles());
    return s?.id ?? null;
  });

  const directory = useMemo(() => buildDirectory(profiles), [profiles]);

  const user = useMemo(() => {
    if (!sessionId) return null;
    return directory.find((u) => u.id === sessionId) ?? null;
  }, [sessionId, directory]);

  const updateProfile = useCallback((userId: string, patch: ProfilePatch) => {
    setProfiles((prev) => {
      const next = {
        ...prev,
        [userId]: { ...prev[userId], ...patch },
      };
      saveProfiles(next);
      return next;
    });
  }, []);

  const updateCurrentUser = useCallback(
    (patch: ProfilePatch) => {
      if (!sessionId) return;
      updateProfile(sessionId, patch);
    },
    [sessionId, updateProfile],
  );

  const login = useCallback((email: string, password: string) => {
    if (!email.trim() || !password) {
      return { ok: false as const, error: 'Enter email and password.' };
    }
    const found = findUserByCredentials(email, password);
    if (!found) {
      return { ok: false as const, error: 'Invalid credentials or account not provisioned.' };
    }
    setSessionId(found.id);
    saveSession(publicUser(found));
    return { ok: true as const };
  }, []);

  const loginAsDemo = useCallback((userId: string) => {
    const found = DEMO_USERS.find((u) => u.id === userId);
    if (!found) return;
    setSessionId(found.id);
    saveSession(publicUser(found));
  }, []);

  const logout = useCallback(() => {
    setSessionId(null);
    saveSession(null);
  }, []);

  const canAccess = useCallback(
    (nav: NavItemId) => {
      if (!user) return false;
      return user.modules.includes(nav);
    },
    [user],
  );

  const demoUsers = directory;

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      loginAsDemo,
      logout,
      canAccess,
      demoUsers,
      directory,
      updateProfile,
      updateCurrentUser,
    }),
    [
      user,
      login,
      loginAsDemo,
      logout,
      canAccess,
      demoUsers,
      directory,
      updateProfile,
      updateCurrentUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
