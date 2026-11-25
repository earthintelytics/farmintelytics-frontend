/** CSV text and download for GWON's charts (UTF-8 with a byte-order mark, so Excel reads it). */
const cell = (v) => {
  if (v == null) return '';
  const s = typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows) {
  if (!rows?.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
}

export function downloadCsv(name, rows) {
  const blob = new Blob([`${String.fromCharCode(0xfeff)}${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${String(name || 'gwon-data').replace(/[^\w.-]+/g, '-').toLowerCase()}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

