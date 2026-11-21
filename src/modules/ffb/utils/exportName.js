// Same naming rule as the server exports (backend/api/utils/export_names.py):
// fi_ffb_<page>_<what>_<from>_to_<to>.csv, or fi_ffb_<page>_<what>_<today>.csv without a date range.
export function exportFileName(name, from, to, ext = 'csv') {
  const d = (v) => String(v || '').slice(0, 10);
  const stamp = from && to ? `${d(from)}_to_${d(to)}` : from ? `from_${d(from)}` : to ? `to_${d(to)}` : new Date().toISOString().slice(0, 10);
  return `fi_ffb_${name}_${stamp}.${ext}`;
}
