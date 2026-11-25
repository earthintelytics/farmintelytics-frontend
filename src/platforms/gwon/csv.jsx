/**
 * CSV download for GWON's charts: the exact figures a chart draws, one row per point, with its units in the
 * column names. Opens in Excel (UTF-8 with a byte-order mark).
 */
import { Download } from 'lucide-react';
import { downloadCsv } from './csvUtil';

/** A small "CSV" button; rows is an array of plain objects (or a function returning one). */
export function CsvButton({ name, rows, className = '' }) {
  const get = () => (typeof rows === 'function' ? rows() : rows);
  return (
    <button type="button" onClick={() => downloadCsv(name, get())} title="Download these figures as CSV"
      className={`gwon-noprint inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 ${className}`}>
      <Download size={12} /> CSV
    </button>
  );
}

/** Puts the CSV button above a chart, on the right. */
export function WithCsv({ name, rows, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-end"><CsvButton name={name} rows={rows} /></div>
      {children}
    </div>
  );
}
