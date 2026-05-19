import { useCallback, useState } from 'react';

/**
 * Returns `[refreshKey, refresh]`. Include `refreshKey` in a useEffect/useDexie
 * deps array to make the effect re-fire when `refresh()` is called.
 *
 * @returns {[number, () => void]}
 */
export function useRefreshable() {
  const [n, setN] = useState(0);
  const refresh = useCallback(() => setN((x) => x + 1), []);
  return [n, refresh];
}
