/**
 * API client scaffold.
 *
 * Today ATLANTIS is offline and every "API call" resolves locally through the
 * repository layer (src/repo/*). This module exists so that when a real backend
 * lands, we flip a single feature flag and the existing repos start delegating
 * to fetch() instead of Dexie.
 *
 * Conventions for the future backend:
 *   - JSON over HTTP
 *   - Bearer auth via Authorization header (token in authStore.token)
 *   - Base URL from import.meta.env.VITE_API_BASE_URL
 *   - Versioned paths: /api/v1/entities
 *   - Errors normalized to { code, message, details }
 */

import { useAuthStore } from '@/stores/authStore';

/**
 * Returns true once VITE_API_BASE_URL is configured. While false, callers must
 * fall back to the local repository implementation.
 */
export const apiEnabled = () =>
  typeof import.meta.env !== 'undefined' && !!import.meta.env.VITE_API_BASE_URL;

/**
 * Build the Authorization header from the persisted auth token. Returns an
 * empty object when no token is set so callers can spread it unconditionally.
 *
 * @returns {Record<string, string>}
 */
export function authHeader() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Thin fetch wrapper. Use sparingly — most call sites should go through a repo.
 *
 * @template T
 * @param {string} path
 * @param {RequestInit} [init]
 * @returns {Promise<T>}
 */
export async function api(path, init = {}) {
  if (!apiEnabled()) {
    throw new Error(
      `api(${path}): no backend configured — set VITE_API_BASE_URL and update the repo to route through here.`,
    );
  }
  const base = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = { code: 'http_' + res.status, message: body };
    }
    const err = new Error(parsed.message || `HTTP ${res.status}`);
    err.code = parsed.code;
    err.details = parsed.details;
    throw err;
  }
  if (res.status === 204) return /** @type {T} */ (undefined);
  return res.json();
}
