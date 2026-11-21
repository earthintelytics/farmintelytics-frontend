// One rule for "go to the top": the window does not scroll in the portal (#main-content does, and some pages
// scroll their own .view-container), so window.scrollTo alone left a new page or table page where it was.

/** Scroll the page to the top: on opening a page and on every pagination click. */
export function scrollPageTop(behavior = 'smooth') {
  if (typeof document === 'undefined') return;
  window.scrollTo({ top: 0, behavior });
  document.querySelectorAll('#main-content, .view-container').forEach(el => {
    if (el.scrollTop > 0) el.scrollTo({ top: 0, behavior });
  });
}

/** A table inside a page: bring its top into view when its page changes. */
export function scrollToTopOf(el, behavior = 'smooth') {
  if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior });
}
