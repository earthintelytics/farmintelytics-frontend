// A tab keeps running the code it loaded. Every few minutes compare the main script of the
// live page with ours; when a new release is deployed, show a small "Reload" bar.
const CHECK_EVERY_MS = 3 * 60 * 1000;

function mainScript(html) {
  const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
  return m ? m[0] : null;
}

function showBar() {
  if (document.getElementById('fi-ffb-update-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'fi-ffb-update-bar';
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:10000;background:#0f172a;color:#fff;'
    + 'padding:10px 14px;border-radius:10px;font:500 13px Inter,sans-serif;display:flex;gap:12px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.2)';
  bar.textContent = 'A new version of the portal is available.';
  const btn = document.createElement('button');
  btn.textContent = 'Reload';
  btn.style.cssText = 'background:#034321;color:#fff;border:none;border-radius:6px;padding:6px 12px;font:600 13px Inter,sans-serif;cursor:pointer';
  btn.onclick = () => window.location.reload();
  bar.appendChild(btn);
  document.body.appendChild(bar);
}

export function installVersionCheck() {
  const current = [...document.scripts].map(s => s.getAttribute('src') || '').find(src => /\/assets\/index-/.test(src));
  if (!current) return;   // dev server
  const check = async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const res = await fetch('/', { cache: 'no-store' });
      const live = mainScript(await res.text());
      if (live && !current.endsWith(live)) showBar();
    } catch { /* offline: try again later */ }
  };
  setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', check);
}
