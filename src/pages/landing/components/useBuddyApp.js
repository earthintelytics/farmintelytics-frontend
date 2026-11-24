import { useEffect, useState } from 'react';

// What is offered comes from /downloads/farm-buddy.json, written when the APK is published.
const INFO = '/downloads/farm-buddy.json';

/** The published Buddy app ({file, version, bytes, built}), or null while there is none. */
export function useBuddyApp() {
  const [app, setApp] = useState(null);
  useEffect(() => {
    let active = true;
    fetch(INFO, { cache: 'no-store' })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
      .then((info) => { if (active && info?.file) setApp(info); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return app;
}

/** The download address of the published app. */
export const appHref = (app) => (app ? `/downloads/${encodeURIComponent(app.file)}` : '');
