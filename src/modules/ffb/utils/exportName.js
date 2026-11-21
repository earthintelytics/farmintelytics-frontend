// Hyphenated export filename helper (no underscores)
export function exportFileName(name, from, to, ext = 'csv') {
  const clean = (v) => String(v || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const d = (v) => String(v || '').slice(0, 10);
  const stamp = from && to ? `${d(from)}-to-${d(to)}` : from ? `from-${d(from)}` : to ? `to-${d(to)}` : new Date().toISOString().slice(0, 10);
  const safeName = clean(name) || 'report';
  return `farmintelytics-ffb-${safeName}-${stamp}.${ext}`;
}
