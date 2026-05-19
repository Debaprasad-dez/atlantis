import { useEffect, useState } from 'react';

/**
 * Run a Dexie query, returning {data, loading, error}.
 * The query function is memoized via deps.
 *
 * @template T
 * @param {() => Promise<T>} queryFn
 * @param {Array<any>} deps
 * @returns {{data: T|null, loading: boolean, error: Error|null}}
 */
export function useDexie(queryFn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    Promise.resolve()
      .then(queryFn)
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((error) => !cancelled && setState({ data: null, loading: false, error }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
