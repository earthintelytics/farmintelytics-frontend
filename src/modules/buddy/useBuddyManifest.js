// The portal has one index.html whose manifest installs the Field app. On the Farm Buddy pages the
// manifest link and the phone's app title point at Farm Buddy instead, so "Add to home screen" here
// installs Farm Buddy (start page /buddy); leaving restores the portal's own.
import { useEffect } from 'react';

const swap = (selector, attr, value) => {
  const el = document.querySelector(selector);
  if (!el) return () => {};
  const before = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return () => { if (before == null) el.removeAttribute(attr); else el.setAttribute(attr, before); };
};

export function useBuddyManifest() {
  useEffect(() => {
    const undo = [
      swap('link[rel="manifest"]', 'href', '/buddy.webmanifest'),
      swap('meta[name="apple-mobile-web-app-title"]', 'content', 'Farm Buddy'),
    ];
    const title = document.title;
    document.title = 'Farm Buddy';
    return () => { undo.forEach((f) => f()); document.title = title; };
  }, []);
}
