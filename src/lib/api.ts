/**
 * Central API configuration.
 * In production, VITE_API_URL points to the Railway backend.
 * In development, falls back to '' (same-origin, handled by Vite middleware).
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  // path should start with /api/...
  return `${API_BASE}${path}`;
}
