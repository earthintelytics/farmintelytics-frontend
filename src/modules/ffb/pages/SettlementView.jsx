import { useState, useEffect, useMemo, useCallback } from 'react';
import { CalendarCheck, Search, Download, Lock, Unlock, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, Scissors, Truck, Boxes, Users } from 'lucide-react';
import { API } from '../services/api';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { fmtNumber } from '../utils/formatters';
import { getRole, getEstateScope } from '../utils/access';
import { scrollPageTop } from '../utils/scroll';
import { EstateOptions } from '../components/EstateOptions';
import ExportColumnsModal from '../components/ExportColumnsModal';
import { ConfirmModal } from '../components/CustomToast';

const ROLES = ['Cutter', 'Carrier', 'Picker'];
const PAGE_SIZE = 50;

// Columns of the CSV (keys match the server's export registry).
const EXPORT_COLS = [
  { key: 'period', header: 'Pay Month' }, { key: 'from', header: 'From' }, { key: 'to', header: 'To' },
  { key: 'worker_id', header: 'Worker ID' }, { key: 'worker_name', header: 'Worker Name', isName: true },
  { key: 'role', header: 'Role' }, { key: 'estate', header: 'Estate' }, { key: 'contractor', header: 'Contractor' },
  { key: 'records', header: 'Records' }, { key: 'bunches', header: 'Bunches' }, { key: 'unripe', header: 'Unripe' },
  { key: 'rotten', header: 'Rotten' }, { key: 'kg', header: 'Loose Fruit (kg)' }, { key: 'status', header: 'Month Status' },
];

const label = { fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', display: 'block' };
const input = { width: '100%', height: '42px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0 12px', fontSize: '14px', fontWeight: 600 };

const fmtWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export function SettlementView() {
  const tick = useRefreshTick();
  const role = getRole();
  const isSuperAdmin = role === 'Super Admin';
  const scope = getEstateScope();

  const [periods, setPeriods] = useState([]);
  const [period, setPeriod] = useState('');
  const [estate, setEstate] = useState(scope);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmLock, setConfirmLock] = useState(null);   // null | 'lock' | 'unlock': the month change waiting for a yes

  // The pay months: the open month first, then every past month (a locked one opens from its saved copy).
  useEffect(() => {
    let alive = true;
    API.fetchSettlementPeriods()
      .then(list => {
        if (!alive) return;
        setPeriods(list);
        setPeriod(prev => prev || (list.find(p => p.current) || list[0] || {}).period || '');
      })
      .catch(e => alive && setError(e.message || 'Could not load the pay months.'));
    return () => { alive = false; };
  }, [tick]);

  const load = useCallback(() => {
    if (!period) return () => {};
    let alive = true;
    setLoading(true);
    setError('');
    API.fetchSettlement({ period, estate }, { noCache: true })
      .then(d => { if (alive) { setData(d); setLoading(false); } })
      .catch(e => { if (alive) { setError(e.message || 'Could not load the settlement.'); setLoading(false); } });
    return () => { alive = false; };
  }, [period, estate, tick]);

  useEffect(() => load(), [load]);
  useEffect(() => { setPage(1); }, [period, estate, roleFilter, search]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows || []).filter(r =>
      (!roleFilter || r.role === roleFilter) &&
      (!q || String(r.worker_id).toLowerCase().includes(q) || (r.worker_name || '').toLowerCase().includes(q) || (r.contractor || '').toLowerCase().includes(q)));
  }, [data, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const current = periods.find(p => p.period === period);

  const reset = () => { setRoleFilter(''); setSearch(''); setEstate(scope); };

  const runExport = (keys) => {
    window.location.href = API.settlementExportUrl({ period, estate, role: roleFilter, search }, keys);
    setExportOpen(false);
  };

  const changeLock = async (lock) => {
    setConfirmLock(null);
    setBusy(true);
    setError('');
    try {
      if (lock) await API.lockSettlement(period); else await API.unlockSettlement(period);
      API.invalidateCache();
      setPeriods(await API.fetchSettlementPeriods());
      load();
    } catch (e) {
      setError(e.message || 'Could not change the month.');
    } finally {
      setBusy(false);
    }
  };

  const totals = data?.totals || {};
  const waiting = data?.pending_in_month || 0;
  const cards = [
    { key: 'waiting', label: 'Not yet approved', value: fmtNumber(waiting), unit: 'records', icon: <AlertTriangle size={26} />, danger: waiting > 0,
      sub: data?.locked ? 'Month is locked' : waiting > 0 ? 'Captured this month, still waiting for a decision' : 'Everything captured this month is decided' },
    { key: 'cutter', label: 'Cutters', value: fmtNumber(totals.Cutter?.workers || 0), unit: 'workers', icon: <Scissors size={26} />,
      sub: `${fmtNumber(totals.Cutter?.bunches || 0)} bunches · ${fmtNumber(totals.Cutter?.records || 0)} records` },
    { key: 'carrier', label: 'Carriers', value: fmtNumber(totals.Carrier?.workers || 0), unit: 'workers', icon: <Truck size={26} />,
      sub: `${fmtNumber(totals.Carrier?.bunches || 0)} bunches · ${fmtNumber(totals.Carrier?.records || 0)} records` },
    { key: 'picker', label: 'Pickers', value: fmtNumber(totals.Picker?.workers || 0), unit: 'workers', icon: <Boxes size={26} />,
      sub: `${fmtNumber(totals.Picker?.kg || 0)} kg · ${fmtNumber(totals.Picker?.records || 0)} records` },
    { key: 'people', label: 'Total work to be paid for', value: fmtNumber(data?.lines || 0), unit: 'lines', icon: <Users size={26} />,
      sub: `${fmtNumber(data?.people || 0)} people · one line for each role` },
  ];

  return (
    <div className="view-container view-fade-in settlement-view" style={{ padding: '32px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <h1 className="view-title" style={{ fontSize: '26px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarCheck size={28} style={{ color: '#034321' }} /> Monthly Settlement
          </h1>
          <p className="view-subtitle" style={{ marginTop: '6px', maxWidth: '720px' }}>
            Every approved record of the pay month, added up per worker and per role. A pay month runs from the 27th to the 26th and a record
            counts in the month it was approved. Someone who worked as Cutter and as Carrier has a line for each role. Payment is worked out in the ERP.
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: 800, color: '#034321' }}>
          {scope || 'All Estates'}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: '1.6', minWidth: '320px' }}>
          <label style={label}>Pay Month</label>
          <select className="select-input" style={input} value={period} onChange={e => setPeriod(e.target.value)}>
            {periods.map(p => (
              <option key={p.period} value={p.period}>
                {p.label}{p.locked ? ' · Locked' : p.current ? ' · Open' : ''}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={label}>Estate</label>
          <select className="select-input" style={input} value={estate} onChange={e => setEstate(e.target.value)} disabled={!!scope}>
            <EstateOptions allLabel="All Estates" />
          </select>
        </div>
        <div style={{ flex: '1', minWidth: '140px' }}>
          <label style={label}>Role</label>
          <select className="select-input" style={input} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ flex: '1.4', minWidth: '200px' }}>
          <label style={label}>Search Worker</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}><Search size={16} /></span>
            <input type="text" className="select-input" placeholder="ID, name or contractor" style={{ ...input, paddingLeft: '36px' }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn btn--outline" onClick={reset} style={{ height: '42px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}>
            <RotateCcw size={15} /> Reset
          </button>
          <button className="btn btn--primary" onClick={() => setExportOpen(true)} disabled={!data || loading}
            style={{ height: '42px', fontWeight: 800, fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={15} /> Export CSV
          </button>
          {isSuperAdmin && current && (current.locked ? (
            <button className="btn btn--outline" disabled={busy} onClick={() => setConfirmLock('unlock')} title="Work this month out again from the approved records"
              style={{ height: '42px', fontWeight: 800, fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Unlock size={15} /> Reopen Month
            </button>
          ) : (
            <button className="btn btn--outline" disabled={busy || !current.closed} onClick={() => setConfirmLock('lock')}
              title={current.closed ? 'Save this month as it is now' : 'A month can be locked after its 26th'}
              style={{ height: '42px', fontWeight: 800, fontSize: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={15} /> Lock Month
            </button>
          ))}
        </div>
      </div>

      {/* Month status */}
      {data && (
        <div style={{ marginBottom: '20px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
          {data.locked
            ? <>Locked{data.locked_at ? ` on ${fmtWhen(data.locked_at)}` : ''}{data.locked_by ? ` by ${data.locked_by}` : ''}. These are the saved figures of the month.</>
            : <>Open. The figures change as records are approved until the month is locked.</>}
        </div>
      )}

      {error && <div style={{ marginBottom: '16px', color: '#b91c1c', fontWeight: 700 }}>{error}</div>}

      <div style={{ marginBottom: '16px', fontSize: '13px', color: '#0f172a' }}>
        Loose fruit picked by a cutter and carrier together is shared by weight: 40% to the cutter and 60% to the carrier. The same person keeps 100%.
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {cards.map(c => (
          <div key={c.key} style={{
            display: 'flex', alignItems: 'center', gap: '16px', padding: '20px',
            background: c.danger ? '#FEF2F2' : '#FFFFFF', border: `1px solid ${c.danger ? '#FECACA' : '#E2E8F0'}`, borderRadius: '16px'
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', flex: '0 0 52px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', color: c.danger ? '#DC2626' : '#034321'
            }}>{c.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '30px', fontWeight: 900, lineHeight: 1.1, color: c.danger ? '#DC2626' : '#0F172A' }}>
                {c.value} <span style={{ fontSize: '13px', fontWeight: 700, color: c.danger ? '#B91C1C' : '#64748B' }}>{c.unit}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '6px', color: c.danger ? '#B91C1C' : '#0F172A' }}>{c.label}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '2px', color: c.danger ? '#B91C1C' : '#64748B' }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="table-entries-bar">
        <div className="table-entries-bar__left">{fmtNumber(rows.length)} line{rows.length === 1 ? '' : 's'}</div>
        <div className="table-entries-bar__right">
          Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(rows.length, page * PAGE_SIZE)} of {fmtNumber(rows.length)}
        </div>
      </div>

      <div className="worker-table-shell" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading && !data ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: '12px', padding: '40px' }}>
            <div className="loader-spinner"></div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Adding up the month...</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="worker-records-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>Worker ID</th><th>Name</th><th>Role</th><th>Estate</th><th>Contractor</th>
                  <th className="worker-cell--num">Records</th><th className="worker-cell--num">Bunches</th>
                  <th className="worker-cell--num">Unripe</th><th className="worker-cell--num">Rotten</th>
                  <th className="worker-cell--num">Loose Fruit (kg)</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={10} className="worker-empty-state">No approved records in this pay month{estate ? ` for ${estate}` : ''}.</td></tr>
                ) : pageRows.map((r, i) => {
                  const picker = r.role === 'Picker';
                  return (
                    <tr key={`${r.worker_id}-${r.role}-${i}`}>
                      <td className="worker-cell" style={{ fontWeight: 700 }}>{r.worker_id}</td>
                      <td className="worker-cell" style={{ fontWeight: 800 }}>{r.worker_name || '—'}</td>
                      <td className="worker-cell" style={{ fontWeight: 800, color: 'var(--clr-brand-primary)' }}>{r.role}</td>
                      <td className="worker-cell">{r.estate}</td>
                      <td className="worker-cell">{r.contractor || '—'}</td>
                      <td className="worker-cell worker-cell--num">{fmtNumber(r.records)}</td>
                      <td className="worker-cell worker-cell--num" style={{ fontWeight: 700 }}>{picker ? '—' : fmtNumber(r.bunches)}</td>
                      <td className="worker-cell worker-cell--num">{picker ? '—' : fmtNumber(r.unripe)}</td>
                      <td className="worker-cell worker-cell--num">{picker ? '—' : fmtNumber(r.rotten)}</td>
                      <td className="worker-cell worker-cell--num" style={{ fontWeight: 700 }}>{picker ? fmtNumber(r.kg) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', padding: '16px 0' }}>
        <button className="pg-btn" disabled={page <= 1} onClick={() => { setPage(page - 1); scrollPageTop(); }}><ChevronLeft size={14} /> Prev</button>
        <span style={{ fontSize: '13px', fontWeight: 700 }}>Page {page} of {totalPages}</span>
        <button className="pg-btn" disabled={page >= totalPages} onClick={() => { setPage(page + 1); scrollPageTop(); }}>Next <ChevronRight size={14} /></button>
      </div>

      <ConfirmModal
        isOpen={!!confirmLock}
        title={confirmLock === 'lock' ? `Lock ${data?.label || 'this month'}?` : `Reopen ${data?.label || 'this month'}?`}
        message={confirmLock === 'lock'
          ? 'The figures are saved as they are now. Managers can still open and export this month, and a record approved in it can then only be changed by a Super Admin.'
          : 'The saved figures are removed and the month is worked out again from the approved records.'}
        confirmText={confirmLock === 'lock' ? 'Lock Month' : 'Reopen Month'}
        isDanger={confirmLock === 'unlock'}
        onConfirm={() => changeLock(confirmLock === 'lock')}
        onCancel={() => setConfirmLock(null)}
      />

      <ExportColumnsModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export Monthly Settlement — Select Columns"
        columns={EXPORT_COLS}
        onExport={runExport}
      />
    </div>
  );
}
