import { useEffect, useRef } from 'react';
import { scrollPageTop, scrollToTopOf } from '../utils/scroll';

/** Changing page shows the top: a table inside a page scrolls to its own top (returns the ref to put on it);
 *  with { page: true } the whole page goes to the top. Not on the first render. */
export function usePageScroll(page, { page: wholePage = false } = {}) {
  const ref = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (wholePage) scrollPageTop(); else scrollToTopOf(ref.current);
  }, [page, wholePage]);
  return ref;
}
