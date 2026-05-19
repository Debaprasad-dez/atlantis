import { useEffect, useState } from 'react';

/**
 * Subscribe to a media-query and return its current match state.
 *
 *   const isNarrow = useMediaQuery('(max-width: 1023px)');
 *
 * Falls back to `false` on the server / in jsdom when matchMedia isn't real.
 *
 * @param {string} query
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const get = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  };
  const [match, setMatch] = useState(get);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const fn = (e) => setMatch(e.matches);
    setMatch(mql.matches);
    // Modern browsers
    if (mql.addEventListener) mql.addEventListener('change', fn);
    else mql.addListener(fn);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', fn);
      else mql.removeListener(fn);
    };
  }, [query]);

  return match;
}
