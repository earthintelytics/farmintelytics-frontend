import { getRole } from '../utils/access';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { exportFileName } from '../utils/exportName';
import { useState, useMemo, useEffect, useCallback } from 'react';

import { fmtNumber, fmtRole } from '../utils/formatters';
import { Wallet, CheckCircle2, Circle, Search, Calendar, Banknote, Users, Receipt, RotateCcw, ShieldCheck, Lock, ListFilter, FileDown } from 'lucide-react';
import { API } from '../services/api';
import { useNavigate } from '../utils/portalRouter';
import ExportColumnsModal from '../components/ExportColumnsModal';

const PAYMENT_SUMMARY_EXPORT_COLS = [
  { key: 'date', header: 'Date' },
  { key: 'worker_id', header: 'Worker ID' },
  { key: 'worker_name', header: 'Worker Name', isName: true },
  { key: 'role', header: 'Role' },
  { key: 'plot_id', header: 'Plot' },
  { key: 'qty', header: 'Quantity' },
  { key: 'unit', header: 'Unit' },
  { key: 'amount', header: 'Amount (NGN)' },
  { key: 'status', header: 'Status' },
  { key: 'paid_at', header: 'Paid At' },
  { key: 'reference', header: 'Reference' },
];

const PAID_KEY   = 'fi_ffb_pay_paid_v1';
const NGN = (n) => `₦${fmtNumber(Math.round(n || 0))}`;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}


export function PaymentAggregationView() {
  const navigate = useNavigate();

  const [ratesMap, setRatesMap] = useState({});

  const refreshTick = useRefreshTick(); // top-bar Refresh reloads this page's data
  const [paidMap, setPaidMap] = useState(() => readJSON(PAID_KEY, {}));
  const [showRates, setShowRates] = useState(false);
  const [payoutStats, setPayoutStats] = useState({ summary: null, items: [], total: 0 });

  
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '', 
    from: '',
    to: '',
  });

  // Identity — from localStorage for now
  const userRole = getRole();
  const isAdmin = userRole === 'Super Admin' || userRole === 'Admin';
  const isViewer = userRole === 'View';
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    async function loadRates() {
      try {
        const data = await API.fetchPayRates();
        const map = {};
        data.forEach(r => { map[r.role.toLowerCase()] = r; });
        setRatesMap(map);
      } catch (err) {
        console.error('Failed to load backend rates', err);
      }
    }
    loadRates();
  }, []);

  useEffect(() => {
    const fetchPayoutData = async () => {

        try {
            const apiFilters = {
                estate: filters.estate || undefined, // inherit from global if needed, but this view has its own filter state
                role: filters.role || undefined,
                search: filters.search || undefined,
                dateRange: { from: filters.from || null, to: filters.to || null }
            };
            const [summary, analytics] = await Promise.all([
                API.fetchPayoutSummary(apiFilters),
                API.fetchPayoutAnalytics(apiFilters)
            ]);
            setPayoutStats({
                summary: summary,
                items: analytics.items || [],
                total: analytics.total || 0
            });
        } catch (err) {
            console.error('Failed to fetch payout stats', err);
        }
    };
    fetchPayoutData();
  }, [filters, refreshTick]);

  useEffect(() => { localStorage.setItem(PAID_KEY, JSON.stringify(paidMap)); }, [paidMap]);

  const visible = useMemo(() => {
    return payoutStats.items.map(item => {
        const paid = paidMap[item.id];
        return {
            ...item,
            _paid: !!paid,
            _paidAt: paid?.paidAt || null,
            _paidRef: paid?.ref || null,
            // Map backend fields to UI expected fields
            _amount: item.total_payout,
            _qty: item.total_ripe + item.total_unripe + item.total_rotten + item.total_loose_fruit_kg,
            _unit: item.total_loose_fruit_kg > 0 ? 'kg' : 'bunch',
            _role: (item.role || '').toLowerCase(),
            _breakdown: [
                { label: 'Ripe', qty: item.total_ripe, rate: item.rate_ripe, amount: item.total_ripe * item.rate_ripe },
                { label: 'Unripe', qty: item.total_unripe, rate: item.rate_unripe, amount: item.total_unripe * item.rate_unripe },
                { label: 'Rotten', qty: item.total_rotten, rate: item.rate_rotten, amount: item.total_rotten * item.rate_rotten },
                { label: 'LOOSE FRUIT', qty: item.total_loose_fruit_kg, rate: item.rate_kg, amount: item.total_loose_fruit_kg * item.rate_kg }
            ]
        };
    }).filter(e => {
        if (filters.status === 'paid' && !e._paid) return false;
        if (filters.status === 'unpaid' && e._paid) return false;
        return true;
    });
  }, [payoutStats.items, paidMap, filters.status]);

  const kpis = useMemo(() => {
    const s = payoutStats.summary || { grand_total_payout: 0, active_population: 0 };
    let paidAmt = 0;
    visible.forEach(e => { if (e._paid) paidAmt += e._amount; });
    
    return {
      total: s.grand_total_payout,
      paid: paidAmt,
      unpaid: s.grand_total_payout - paidAmt,
      workers: s.active_population,
      entries: payoutStats.total,
      unpaidCount: visible.filter(e => !e._paid).length,
    };
  }, [payoutStats.summary, payoutStats.total, visible]);

  const perWorker = useMemo(() => {
    const map = new Map();
    visible.forEach((e) => {
      const id = e.worker_id || 'UNKNOWN';
      const prev = map.get(id) || {
        worker_id: id,
        worker_name: e.worker_name || '—',
        roles: new Set(),
        entries: 0,
        ffbCount: 0,
        lfWeight: 0,
        owed: 0,
        paid: 0,
        unpaid: 0,
      };
      prev.roles.add(e._role);
      prev.entries += 1;
      
      // Separate bunch count and weight
      if (e._role === 'harvester') {
        prev.ffbCount += (e.total_ripe + e.total_unripe + e.total_rotten);
      } else if (e._role === 'loose fruit picker') {
        prev.lfWeight += e.total_loose_fruit_kg;
      }

      prev.owed += e._amount;
      if (e._paid) prev.paid += e._amount; else prev.unpaid += e._amount;
      map.set(id, prev);
    });
    return [...map.values()].sort((a, b) => b.unpaid - a.unpaid);
  }, [visible]);

  // Column header filters
  const [colFilters, setColFilters] = useState({});
  const updateColFilter = (key, value) => setColFilters(prev => ({ ...prev, [key]: value }));

  const filteredPerWorker = useMemo(() => {
    return perWorker.filter(row => {
      return Object.entries(colFilters).every(([key, val]) => {
        if (!val) return true;
        const q = val.toLowerCase();
        let cell;
        switch (key) {
          case 'worker': cell = `${row.worker_name || ''} ${row.worker_id || ''}`; break;
          case 'role': cell = [...row.roles].join(' '); break;
          case 'entries': cell = String(row.entries ?? ''); break;
          case 'ffb': cell = String(row.ffbCount ?? ''); break;
          case 'lf': cell = String(row.lfWeight ?? ''); break;
          case 'wage': cell = String(Math.round(row.owed || 0)); break;
          case 'paid': cell = String(Math.round(row.paid || 0)); break;
          case 'outstanding': cell = String(Math.round(row.unpaid || 0)); break;
          default: return true;
        }
        return cell.toLowerCase().includes(q);
      });
    });
  }, [perWorker, colFilters]);

  // ---- Actions -----------------------------------------------------


  const markWorkerPaid = useCallback((workerId) => {
    setPaidMap((prev) => {
      const next = { ...prev };
      visible.forEach((e) => {
        if (e.worker_id === workerId && !e._paid) {
          next[e.id] = {
            paidAt: new Date().toISOString(),
            ref: `BATCH-${workerId}-${Date.now().toString(36).toUpperCase()}`,
          };
        }
      });
      return next;
    });
  }, [visible]);

  const handleConfirmExport = (selectedKeys) => {
    const colMap = Object.fromEntries(PAYMENT_SUMMARY_EXPORT_COLS.map(c => [c.key, c.header]));
    const headers = selectedKeys.map(k => colMap[k] || k);
    const rows = [
      headers,
      ...visible.map((e) =>
        selectedKeys.map(k => {
          let val;
          switch (k) {
            case 'date': val = e.created_at?.slice(0, 10) || ''; break;
            case 'worker_id': val = e.worker_id || ''; break;
            case 'worker_name': val = e.worker_name || ''; break;
            case 'role': val = e._role || ''; break;
            case 'plot_id': val = e.plot_id || ''; break;
            case 'qty': val = e._qty ?? ''; break;
            case 'unit': val = e._unit || ''; break;
            case 'amount': val = Math.round(e._amount || 0); break;
            case 'status': val = e._paid ? 'PAID' : 'UNPAID'; break;
            case 'paid_at': val = e._paidAt || ''; break;
            case 'reference': val = e._paidRef || ''; break;
            default: val = e[k] ?? ''; break;
          }
          return val;
        })
      ),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName('payments_summary');
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => setFilters({ search: '', role: '', status: '', from: '', to: '' });

  const roleOptions = useMemo(() => {
    const set = new Set(payoutStats.items.map((e) => (e.role || '').toLowerCase()).filter(Boolean));
    return [...set].sort();
  }, [payoutStats.items]);

  return (
    <section className="view payment-view view-fade-in" aria-label="Payment Planner">
      <div className="view-header">
        <div>
          <h1 className="view-title">
            <Wallet size={22} style={{ marginRight: 8, verticalAlign: '-4px' }} />
            Payment Aggregation
          </h1>
          <p className="view-subtitle">
            Financial reconciliation of <strong>Approved</strong> operations. 
            Only records that passed the Approval Center are listed here.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn--ghost" onClick={() => setShowRates((v) => !v)}>
            {isAdmin ? <Banknote size={16} /> : <Lock size={16} />}
            {showRates ? 'Hide rates' : isAdmin ? 'Edit pay rates' : 'View pay rates'}
          </button>
          <button className="btn btn--ghost" onClick={() => navigate('/payout-itemized')} title="View granular breakdown">
            <ListFilter size={16} /> Itemized Breakdown
          </button>
          <button 
            className="btn btn--primary" 
            onClick={isViewer ? undefined : () => setExportModalOpen(true)}
            disabled={isViewer}
            title={isViewer ? 'Viewer accounts cannot export CSV from the portal' : 'Select columns to export CSV'}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: isViewer ? '#94a3b8' : undefined,
              borderColor: isViewer ? '#94a3b8' : undefined,
              cursor: isViewer ? 'not-allowed' : 'pointer',
              opacity: isViewer ? 0.7 : 1
            }}
          >
            <FileDown size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Rates view — centally managed from backend */}
      {showRates && (
        <div className="card pay-rates-card">
          <div className="pay-rates-head">
            <h3>
              {isAdmin ? <ShieldCheck size={16} /> : <Lock size={16} />}
              Pay rates per role × quality
            </h3>
            <span className="muted">
              {isAdmin
                ? 'Centrally managed rates. Contact Super Admin to modify backend constants.'
                : 'Read-only — only a Super Admin can change these numbers.'}
            </span>
          </div>

          <div className="pay-rates-table-wrap">
            <table className="pay-rates-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th className="num">Ripe (per unit)</th>
                  <th className="num">Unripe (per unit)</th>
                  <th className="num">Rotten (per unit)</th>
                  <th className="num">Loose fruit (per kg)</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(ratesMap).sort().map((role) => {
                  const r = ratesMap[role];
                  return (
                    <tr key={role}>
                      <td><strong>{fmtRole(role) || role}</strong></td>
                      <td className="num">{NGN(r.ripe_rate)}</td>
                      <td className="num">{NGN(r.unripe_rate)}</td>
                      <td className="num">{NGN(r.rotten_rate)}</td>
                      <td className="num">{NGN(r.kg_rate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="pay-kpis">
        <KPI icon={<Receipt size={18} />} label="Approved entries" value={fmtNumber(kpis.entries)} tone="neutral" />
        <KPI icon={<Users size={18} />} label="Workers" value={fmtNumber(kpis.workers)} tone="neutral" />
        <KPI icon={<Wallet size={18} />} label="Total wage" value={NGN(kpis.total)} tone="primary" />
        <KPI icon={<CheckCircle2 size={18} />} label="Already paid" value={NGN(kpis.paid)} tone="success" />
        <KPI icon={<Circle size={18} />} label={`Outstanding · ${kpis.unpaidCount} entries`} value={NGN(kpis.unpaid)} tone="warning" />
      </div>

      {/* Filters */}
      <div className="card pay-filters" style={{ padding: '20px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="pay-filter-search" style={{ flex: 2, marginBottom: 0 }}>
            <Search size={15} />
            <input
              type="text"
              placeholder="Search worker, plot, team…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>

          <select value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))} className="select-input" style={{ flex: 1, height: '40px', borderRadius: '8px' }}>
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{fmtRole(r) || r}</option>
            ))}
          </select>

          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="select-input" style={{ flex: 1, height: '40px', borderRadius: '8px' }}>
            <option value="">All Status</option>
            <option value="unpaid">Unpaid only</option>
            <option value="paid">Paid only</option>
          </select>

          <div className="pay-filter-date" style={{ flex: 2, height: '40px', borderRadius: '8px', marginBottom: 0 }}>
            <Calendar size={14} />
            <input type="date" style={{ border: 'none', background: 'transparent' }} value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
            <span>→</span>
            <input type="date" style={{ border: 'none', background: 'transparent' }} value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>

          <button className="btn btn--outline" onClick={resetFilters} style={{ height: '40px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
            <RotateCcw size={14} style={{ marginRight: '6px' }} /> Reset
          </button>
        </div>
      </div>

      {/* Per-worker summary */}
      <div className="card pay-section">
        <div className="pay-section-head">
          <h3><Users size={16} /> Per-worker summary</h3>
          <span className="muted">{perWorker.length} worker{perWorker.length === 1 ? '' : 's'}</span>
        </div>
        <div id="payout-worker-table" className="pay-table-wrap">
          <table className="pay-table">
            <thead>
              <tr>
                <th>Worker<br/><input type="text" placeholder="Filter..." value={colFilters.worker || ''} onChange={e => updateColFilter('worker', e.target.value)} className="col-filter-input" /></th>
                <th>Role<br/><input type="text" placeholder="Filter..." value={colFilters.role || ''} onChange={e => updateColFilter('role', e.target.value)} className="col-filter-input" /></th>
                <th className="num">Entries<br/><input type="text" placeholder="Filter..." value={colFilters.entries || ''} onChange={e => updateColFilter('entries', e.target.value)} className="col-filter-input" /></th>
                <th className="num">FFB Bunches (AI)<br/><input type="text" placeholder="Filter..." value={colFilters.ffb || ''} onChange={e => updateColFilter('ffb', e.target.value)} className="col-filter-input" /></th>
                <th className="num">Loose Fruit (kg)<br/><input type="text" placeholder="Filter..." value={colFilters.lf || ''} onChange={e => updateColFilter('lf', e.target.value)} className="col-filter-input" /></th>
                <th className="num">Wage<br/><input type="text" placeholder="Filter..." value={colFilters.wage || ''} onChange={e => updateColFilter('wage', e.target.value)} className="col-filter-input" /></th>
                <th className="num">Paid<br/><input type="text" placeholder="Filter..." value={colFilters.paid || ''} onChange={e => updateColFilter('paid', e.target.value)} className="col-filter-input" /></th>
                <th className="num">Outstanding<br/><input type="text" placeholder="Filter..." value={colFilters.outstanding || ''} onChange={e => updateColFilter('outstanding', e.target.value)} className="col-filter-input" /></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPerWorker.length === 0 && (
                <tr><td colSpan={9} className="empty">No approved work matches your filters.</td></tr>
              )}
              {filteredPerWorker.map((w) => (
                <tr key={w.worker_id}>
                  <td>
                    <div className="worker-cell">
                      <span className="worker-name" style={{ fontWeight: 500 }}>{w.worker_name}</span>
                      <span className="worker-id">{w.worker_id}</span>
                    </div>
                  </td>
                  <td>
                    {[...w.roles].map(r => (
                        <div key={r} style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>{fmtRole(r) || r}</div>
                    ))}
                  </td>
                  <td className="num">{fmtNumber(w.entries)}</td>
                  <td className="num">
                    {w.ffbCount > 0 ? (
                      <div style={{ fontWeight: 500 }}>{fmtNumber(w.ffbCount)} <span style={{ fontSize: '11px', opacity: 0.5 }}>bunch</span></div>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td className="num">
                    {w.lfWeight > 0 ? (
                      <div style={{ fontWeight: 500, color: '#f97316' }}>{fmtNumber(w.lfWeight)} <span style={{ fontSize: '11px', opacity: 0.5 }}>kg</span></div>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td className="num strong" style={{ fontSize: '15px' }}>{NGN(w.owed)}</td>
                  <td className="num success">{NGN(w.paid)}</td>
                  <td className={`num ${w.unpaid > 0 ? 'warn' : 'muted'}`}>{NGN(w.unpaid)}</td>
                  <td>
                    <button
                      className="btn btn--sm btn--primary"
                      disabled={w.unpaid === 0}
                      onClick={() => markWorkerPaid(w.worker_id)}
                      style={{ borderRadius: '8px', fontWeight: 500 }}
                    >
                      MARK ALL PAID
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ExportColumnsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        columns={PAYMENT_SUMMARY_EXPORT_COLS}
        onExport={handleConfirmExport}
        isViewer={isViewer}
      />
    </section>
  );
}

function KPI({ icon, label, value, tone = 'neutral' }) {
  return (
    <div className={`pay-kpi pay-kpi--${tone}`}>
      <div className="pay-kpi-icon">{icon}</div>
      <div className="pay-kpi-body">
        <div className="pay-kpi-label">{label}</div>
        <div className="pay-kpi-value">{value}</div>
      </div>
    </div>
  );
}
