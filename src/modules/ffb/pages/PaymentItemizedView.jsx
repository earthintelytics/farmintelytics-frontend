import { getRole } from '../utils/access';
import { useRefreshTick } from '../hooks/useRefreshTick';
import { exportFileName } from '../utils/exportName';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { fmtNumber, fmtRole } from '../utils/formatters';
import {
  CheckCircle2,
  Circle,
  Search,
  Calendar,
  Filter,
  Download,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import { API } from '../services/api';
import { useNavigate } from '../utils/portalRouter';
import ExportColumnsModal from '../components/ExportColumnsModal';

const PAYMENT_ITEMIZED_EXPORT_COLS = [
  { key: 'date', header: 'Date' },
  { key: 'worker_id', header: 'Worker ID' },
  { key: 'worker_name', header: 'Worker Name', isName: true },
  { key: 'role', header: 'Role' },
  { key: 'plot_id', header: 'Plot' },
  { key: 'amount', header: 'Amount (NGN)' },
  { key: 'status', header: 'Status' },
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

export function PaymentItemizedView() {
  const navigate = useNavigate();
  const [paidMap, setPaidMap] = useState(() => readJSON(PAID_KEY, {}));
  const refreshTick = useRefreshTick(); // top-bar Refresh reloads this page's data
  const [payoutStats, setPayoutStats] = useState({ items: [], total: 0 });
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const userRole = getRole();
  const isViewer = userRole === 'View';
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '', 
    from: '',
    to: '',
  });

  useEffect(() => {
    const fetchPayoutData = async () => {
        setLoadingPayouts(true);
        try {
            const apiFilters = {
                role: filters.role || undefined,
                search: filters.search || undefined,
                dateRange: { from: filters.from || null, to: filters.to || null }
            };
            const analytics = await API.fetchPayoutAnalytics(apiFilters);
            setPayoutStats({
                items: analytics.items || [],
                total: analytics.total || 0
            });
        } catch (err) {
            console.error('Failed to fetch payout items', err);
        } finally {
            setLoadingPayouts(false);
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
            _amount: item.total_payout,
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

  // Column header filters
  const [colFilters, setColFilters] = useState({});
  const updateColFilter = (key, value) => setColFilters(prev => ({ ...prev, [key]: value }));

  const filteredVisible = useMemo(() => {
    return visible.filter(row => {
      return Object.entries(colFilters).every(([key, val]) => {
        if (!val) return true;
        const q = val.toLowerCase();
        let cell;
        switch (key) {
          case 'date': cell = row.date_from || ''; break;
          case 'worker': cell = `${row.worker_name || ''} ${row.worker_id || ''}`; break;
          case 'role': cell = row._role || ''; break;
          case 'plot': cell = row.plot_id || ''; break;
          case 'wage': cell = String(Math.round(row._amount || 0)); break;
          case 'status': cell = row._paid ? 'paid' : 'unpaid'; break;
          default: return true;
        }
        return cell.toLowerCase().includes(q);
      });
    });
  }, [visible, colFilters]);

  const togglePaid = useCallback((entry) => {
    setPaidMap((prev) => {
      const next = { ...prev };
      if (next[entry.id]) delete next[entry.id];
      else {
        next[entry.id] = {
          paidAt: new Date().toISOString(),
          ref: `PAY-${Date.now().toString(36).toUpperCase()}`,
        };
      }
      return next;
    });
  }, []);

  const handleConfirmExport = (selectedKeys) => {
    const colMap = Object.fromEntries(PAYMENT_ITEMIZED_EXPORT_COLS.map(c => [c.key, c.header]));
    const headers = selectedKeys.map(k => colMap[k] || k);
    const rows = [
      headers,
      ...visible.map((e) =>
        selectedKeys.map(k => {
          let val;
          switch (k) {
            case 'date': val = e.date_from || ''; break;
            case 'worker_id': val = e.worker_id || ''; break;
            case 'worker_name': val = e.worker_name || ''; break;
            case 'role': val = e._role || ''; break;
            case 'plot_id': val = e.plot_id || ''; break;
            case 'amount': val = Math.round(e._amount || 0); break;
            case 'status': val = e._paid ? 'PAID' : 'UNPAID'; break;
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
    a.download = exportFileName('payments_itemized');
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => setFilters({ search: '', role: '', status: '', from: '', to: '' });

  const roleOptions = useMemo(() => {
    const set = new Set(payoutStats.items.map((e) => (e.role || '').toLowerCase()).filter(Boolean));
    return [...set].sort();
  }, [payoutStats.items]);

  return (
    <section className="view payment-view view-fade-in" style={{ padding: '32px' }}>
      <div className="view-header" style={{ marginBottom: '32px' }}>
        <div>
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/payout')} style={{ marginBottom: '12px', paddingLeft: 0, fontWeight: 500 }}>
            <ArrowLeft size={16} /> BACK TO SUMMARY
          </button>
          <h1 className="view-title" style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.02em' }}>
            <Filter size={24} style={{ marginRight: 12, verticalAlign: '-4px', color: '#3F8432' }} />
            Itemized Payout Breakdown
          </h1>
          <p className="view-subtitle" style={{ opacity: 0.6 }}>Granular view of every approved harvest and collection record.</p>
        </div>
        <div className="view-header-actions">
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
            {isViewer ? <Lock size={16} /> : <Download size={16} />} Export CSV
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '32px', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 2 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.4 }} />
            <input
              type="text"
              placeholder="Search worker, plot..."
              style={{ width: '100%', height: '40px', paddingLeft: '40px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 500, fontSize: '14px' }}
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>

          <select 
            style={{ flex: 1, height: '40px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 500, padding: '0 12px', fontSize: '13px' }}
            value={filters.role} 
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="">All Roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{fmtRole(r) || r}</option>
            ))}
          </select>

          <select 
            style={{ flex: 1, height: '40px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 500, padding: '0 12px', fontSize: '13px' }}
            value={filters.status} 
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Status</option>
            <option value="unpaid">Unpaid Only</option>
            <option value="paid">Paid Only</option>
          </select>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '0 12px', borderRadius: '10px', border: '1px solid #cbd5e1', height: '40px' }}>
            <Calendar size={14} style={{ opacity: 0.4 }} />
            <input type="date" style={{ border: 'none', background: 'transparent', fontWeight: 500, fontSize: '12px' }} value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
            <span style={{ opacity: 0.2 }}>→</span>
            <input type="date" style={{ border: 'none', background: 'transparent', fontWeight: 500, fontSize: '12px' }} value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>

          <button className="btn btn--outline" onClick={resetFilters} style={{ height: '40px', borderRadius: '10px', fontWeight: 500 }}>
            RESET
          </button>
        </div>
      </div>

      <div className="card" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
        <div id="payout-itemized-table" className="pay-table-wrap">
          <table className="pay-table">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '20px' }}>Date<br/><input type="text" placeholder="Filter..." value={colFilters.date || ''} onChange={e => updateColFilter('date', e.target.value)} className="col-filter-input" /></th>
                <th>Worker<br/><input type="text" placeholder="Filter..." value={colFilters.worker || ''} onChange={e => updateColFilter('worker', e.target.value)} className="col-filter-input" /></th>
                <th>Role<br/><input type="text" placeholder="Filter..." value={colFilters.role || ''} onChange={e => updateColFilter('role', e.target.value)} className="col-filter-input" /></th>
                <th>Plot<br/><input type="text" placeholder="Filter..." value={colFilters.plot || ''} onChange={e => updateColFilter('plot', e.target.value)} className="col-filter-input" /></th>
                <th>Breakdown</th>
                <th className="num">Wage<br/><input type="text" placeholder="Filter..." value={colFilters.wage || ''} onChange={e => updateColFilter('wage', e.target.value)} className="col-filter-input" /></th>
                <th>Status<br/><input type="text" placeholder="Filter..." value={colFilters.status || ''} onChange={e => updateColFilter('status', e.target.value)} className="col-filter-input" /></th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingPayouts && (
                <tr><td colSpan={8} className="empty" style={{ padding: '60px' }}>Loading itemized data...</td></tr>
              )}
              {!loadingPayouts && filteredVisible.length === 0 && (
                <tr><td colSpan={8} className="empty" style={{ padding: '60px' }}>No itemized records found.</td></tr>
              )}
              {filteredVisible.map((e) => (
                <tr key={e.id} className={e._paid ? 'row-paid' : ''}>
                  <td style={{ padding: '20px', fontWeight: 500, color: '#3F8432' }}>{e.date_from || '—'}</td>
                  <td>
                    <div className="worker-cell">
                      <span className="worker-name" style={{ fontWeight: 500, fontSize: '15px' }}>{e.worker_name || '—'}</span>
                      <span className="worker-id" style={{ fontSize: '11px', opacity: 0.5, fontWeight: 500 }}>{e.worker_id}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 500, color: '#0f172a' }}>{fmtRole(e._role) || e._role}</td>
                  <td style={{ fontWeight: 500 }}>{e.plot_id || '—'}</td>
                  <td>
                    <div className="pay-breakdown" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {e._breakdown.filter((b) => b.qty > 0).map((b) => (
                        <span key={b.label} className={`pay-chip pay-chip--${b.label.toLowerCase()}`} style={{ fontSize: '11px', fontWeight: 500, borderRadius: '6px' }}>
                          {b.label}: {fmtNumber(b.qty)} × {NGN(b.rate)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: 500, color: '#0f172a', fontSize: '16px' }}>{NGN(e._amount)}</td>
                  <td style={{ 
                    background: e._paid ? '#F3F8EF' : '#f1f5f9', 
                    color: e._paid ? '#3F8432' : '#475569', 
                    fontWeight: 500,
                    textAlign: 'center'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                      {e._paid ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                      {e._paid ? 'PAID' : 'UNPAID'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn--sm ${e._paid ? 'btn--ghost' : 'btn--outline'}`}
                      onClick={() => togglePaid(e)}
                      style={{ borderRadius: '10px', fontWeight: 500 }}
                    >
                      {e._paid ? 'MARK UNPAID' : 'MARK PAID'}
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
        columns={PAYMENT_ITEMIZED_EXPORT_COLS}
        onExport={handleConfirmExport}
        isViewer={isViewer}
      />
    </section>
  );
}
