import { exportFileName } from './exportName';
import { RECON_STATUS } from './reconStatus';
// Plot reconciliation rows (harvester bunches and picker kg) as a CSV download.
// Shared by the Approval Center and the Geospatial Intel reconciliation view.

// Same labels as the pages (utils/reconStatus.js).
export const RECON_STATUS_TEXT = Object.fromEntries(Object.entries(RECON_STATUS).map(([k, v]) => [k, v.label]));

export const RECONCILIATION_EXPORT_COLS = [
  { key: 'plot_id', header: 'Plot' },
  { key: 'work_date', header: 'Date' },
  { key: 'mode', header: 'Mode' },
  { key: 'harvested', header: 'Harvested' },
  { key: 'loaded', header: 'Loaded' },
  { key: 'rotten', header: 'Rotten' },
  { key: 'variance', header: 'Variance' },
  { key: 'unit', header: 'Unit' },
  { key: 'status', header: 'Status' },
  { key: 'harvesting_clerk_ids', header: 'Harvester Role ID' },
  { key: 'loading_clerk_ids', header: 'Loading Role ID' },
];

const csvCell = (v) => {
  const t = v == null ? '' : String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function downloadReconciliationCsv(rows, selectedKeys = null) {
  const activeCols = selectedKeys
    ? RECONCILIATION_EXPORT_COLS.filter(c => selectedKeys.includes(c.key))
    : RECONCILIATION_EXPORT_COLS;

  const headers = activeCols.map(c => c.header);
  const body = rows.map(p => {
    const kg = p.mode === 'picker';
    const rowMap = {
      plot_id: p.plot_id,
      work_date: p.work_date,
      mode: kg ? 'Picker' : 'Harvester',
      harvested: kg ? p.harvester_weight : p.harvester_count,
      loaded: kg ? p.loader_weight : p.loader_count,
      rotten: kg ? '' : (p.harvester_rotten ?? ''),
      variance: p.variance,
      unit: kg ? 'kg' : 'bunches',
      status: RECON_STATUS_TEXT[p.status] || p.status,
      harvesting_clerk_ids: p.harvesting_clerk_ids,
      loading_clerk_ids: p.loading_clerk_ids,
    };
    return activeCols.map(c => rowMap[c.key]);
  });
  const csv = [headers, ...body].map(r => r.map(csvCell).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  link.download = exportFileName('approval_plot_reconciliation');
  link.click();
}
