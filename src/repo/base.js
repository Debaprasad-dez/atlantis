/**
 * Repo helpers — try API first when configured, fall back to a local resolver.
 * Each repo provides `apiPath` + `local` and delegates here.
 */
import { api, apiEnabled } from '@/lib/api';

/**
 * @template T
 * @param {() => Promise<T>} local
 * @param {() => Promise<T>} [remote]
 */
export async function tryRemoteThenLocal(local, remote) {
  if (apiEnabled() && remote) {
    try {
      return await remote();
    } catch {
      // Backend unreachable / failed — fall through to local cache.
    }
  }
  return local();
}
