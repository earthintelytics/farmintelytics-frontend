/**
 * Every new page opens at the top (owner, 25 Nov 2026). Going back keeps the browser's own scroll position, and a
 * link to an anchor on the page (#section) still scrolls to it. Hash changes on the same page (GWON's #tab/page)
 * are handled by that page.
 */
import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const nav = useNavigationType();
  useEffect(() => {
    if (nav === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, nav]);
  return null;
}
