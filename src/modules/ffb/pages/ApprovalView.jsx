import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { getRole, getUserEmail, getEstateScope } from '../utils/access';
import { EstateOptions } from '../components/EstateOptions';
import { useAppContext } from '../context/AppContext';
import { useSearchParams } from '../utils/portalRouter';
import { fmtDate, fmtTime } from '../utils/formatters';
import { bunchCount, countFlag, confirmedNote } from '../utils/counts';
import { fmtPlatform } from '../utils/platform';
import {
  Search,
  CheckCircle,
  HelpCircle,
  X,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  MapPin,
  ChevronLeft,
  User,
  ArrowUpDown,
  Lock,
} from 'lucide-react';
import { API } from '../services/api';

import { downloadReconciliationCsv, RECONCILIATION_EXPORT_COLS } from '../utils/reconciliationCsv';
import ExportColumnsModal from '../components/ExportColumnsModal';

const APPROVAL_INDIVIDUAL_COLS = [
  { key: 'created_at', header: 'Date' },
  { key: 'plot_id', header: 'Plot' },
  { key: 'worker_id', header: 'Cutter / Worker ID' },
  { key: 'worker_name', header: 'Cutter / Worker Name', isName: true },
  { key: 'carrier_id', header: 'Carrier ID' },
  { key: 'carried_by', header: 'Carrier Name', isName: true },
  { key: 'contractor', header: 'Contractor' },
  { key: 'h_ai_detected_count', header: 'AI Count' },
  { key: 'h_total_count', header: 'Reported FFB' },
  { key: 'status', header: 'Status' },
];

import { MapView } from './MapView';
import { ReviewReasons } from '../components/ReviewReasons';
import { RECON_STATUS, reconStatus, PAIR_STATUS, STATUS_CHOICES, statusMatches, selectedStatuses, isDefaultStatuses, recordIssues, plotDays } from '../utils/reconStatus';
import { StatusFilter } from '../components/StatusFilter';
import { AwaitingRecordersTable } from '../components/AwaitingRecordersTable';
import { scrollPageTop } from '../utils/scroll';

// Records behind a plot status: matched plots hold approved records; pending and mismatch plots hold records
// still waiting for review.
// Records behind a plot status filter: Matched -> approved, Rejected -> rejected, Pending / Mismatch -> pending;
// the default and All list every record still waiting or rejected (approved ones show inside a plot).
const recordStatusFor = (value) => {
  const s = selectedStatuses(value);
  if (s.length === 1 && s[0] === 'valid') return 'APPROVED';
  if (s.length === 1 && s[0] === 'rejected') return 'REJECTED';
  if (s.every(k => k === 'warning' || k === 'error')) return 'PENDING';
  return undefined;
};

export function ApprovalView() {

  // View mode tab: 'exceptions' (Plot exceptions + Map) or 'individual' (Legacy records review)
  const [viewMode, setViewMode] = useState('individual');   // tabs: Individual Records, Field Audit Map
  const { filters: appFilters, updateFilters: updateAppFilters } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();
  // New syncs show without clicking around: reload every minute while the tab is visible,
  // and straight away when the top-bar Refresh is pressed.
  const [refreshTick, setRefreshTick] = useState(0);
  const silentReload = useRef(false);   // background reloads keep the page on screen (no spinner)
  useEffect(() => {
    const bump = () => { API.invalidateCache(); silentReload.current = true; setRefreshTick(t => t + 1); };
    const timer = setInterval(() => { if (document.visibilityState === 'visible') bump(); }, 60000);
    window.addEventListener('ffb:refresh', bump);
    return () => { clearInterval(timer); window.removeEventListener('ffb:refresh', bump); };
  }, []);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [lightbox, setLightbox] = useState(null); // { url, title }
  // Approve / Reject asks for the verification note in a pop-up: { op, status, text }
  const [noteDialog, setNoteDialog] = useState(null);
  const [rotation, setRotation] = useState(0);

  const userRole = getRole();
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Filters state (shared with the Field Audit Map tab through the app filters, see switchTab).
  // Arriving from Geospatial Intel (?plot=&date=) the page starts on that plot-day, so the first
  // load is already the plot's records (no unfiltered load that could finish later and replace them).
  const [localFilters, setLocalFilters] = useState(() => {
    const plot = searchParams.get('plot') || '';
    const date = searchParams.get('date') || '';
    return {
      search: '',
      status: null, // ticked statuses (utils/reconStatus.js); null = Pending, Mismatch, Rejected
      plot: plot && date ? plot : '',
      from: plot && date ? date : '',
      to: plot && date ? date : '',
      estate: getEstateScope()
    };
  });
  // Each loader keeps only the answer to its latest request: an older, slower response (for
  // example "all issues" while a plot is being opened) must never overwrite a newer one.
  const latestRecordsReq = useRef(0);
  const latestExceptionsReq = useRef(0);
  const latestStatsReq = useRef(0);

  // Local state data
  const [plotExceptions, setPlotExceptions] = useState([]);
  const [pickerExceptions, setPickerExceptions] = useState([]);   // picker (kg) plot-days, for the waiting table
  const [individualRecords, setIndividualRecords] = useState([]);
  // Plot view: records already approved (automatically or by a supervisor). Shown read-only so the
  // harvester role's data and photos are always visible, but they need no action.
  const [approvedPlotRecords, setApprovedPlotRecords] = useState([]);
  const [totalIndividualCount, setTotalIndividualCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalIndividualCount / pageSize));
  const [localChanges, setLocalChanges] = useState({}); // id -> { status, comment, saved }
  const [, setApprovalStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });   // kept for the counters
  const [plotDrilldown, setPlotDrilldown] = useState(null);

  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [drilldownFailed, setDrilldownFailed] = useState(false);   // the plot's loads could not be loaded
  const [drilldownTry, setDrilldownTry] = useState(0);             // "Retry" reloads them

  const [lightboxCompare, setLightboxCompare] = useState(false);
  const [selectedLoaderImageIdx, setSelectedLoaderImageIdx] = useState(0);

  const loaderImages = useMemo(() => {
    if (!plotDrilldown || !plotDrilldown.loaders) return [];
    return plotDrilldown.loaders
      .map(l => ({
        id: l.id,
        url: API.resolveImageUrl(l.image_url),
        worker_name: l.worker_name || `Clerk ${l.worker_id}`,
        time: l.time
      }))
      .filter(l => l.url);
  }, [plotDrilldown]);

  // Fetch plot drilldown data when a specific plot and date are selected
  useEffect(() => {
    let active = true;
    const fetchDrilldown = async () => {
      if (!localFilters.plot || !localFilters.from) {
        setPlotDrilldown(null);
        return;
      }
      setLoadingDrilldown(true);
      setDrilldownFailed(false);
      setPlotDrilldown(null);   // never show another plot's loads while this one loads
      // One quiet retry on a failed request (weak network), then a visible "Retry".
      for (let attempt = 0; attempt < 2 && active; attempt++) {
        try {
          const res = await API.fetchPlotDrilldown(localFilters.plot, localFilters.from);
          if (active) setPlotDrilldown(res);
          if (active) setLoadingDrilldown(false);
          return;
        } catch (err) {
          console.error("Failed to load plot drilldown", err);
          if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
        }
      }
      if (active) { setDrilldownFailed(true); setLoadingDrilldown(false); }
    };
    fetchDrilldown();
    return () => { active = false; };
  }, [localFilters.plot, localFilters.from, drilldownTry]);

  // Harvest record id -> the load it pairs with (from the drilldown; same rule as the map and exports)
  const harvestPairs = useMemo(() => Object.fromEntries((plotDrilldown?.harvesters || []).map(h => [h.id, h])), [plotDrilldown]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [localFilters, viewMode]);

  // Load Plot Reconciliation data (always, needed for mismatch card)
  const loadPlotExceptions = useCallback(async () => {
    // Reconciliation data feeds the waiting table and plot summary; it loads without a spinner.
    const reqId = ++latestExceptionsReq.current;
    try {
      const query = {
        dateRange: { from: localFilters.from, to: localFilters.to },
        search: localFilters.plot || localFilters.search || undefined,
        estate: localFilters.estate || undefined,
      };
      const [res, pickerRes] = await Promise.all([
        API.fetchPlotExceptions(query),
        API.fetchPlotExceptions({ ...query, mode: 'picker' }).catch(() => [])
      ]);
      if (reqId !== latestExceptionsReq.current) return;   // a newer request replaced this one
      setPlotExceptions(res || []);
      setPickerExceptions(pickerRes || []);
    } catch (err) {
      console.error('Failed to load plot exceptions', err);
    } finally {
      if (viewMode !== 'individual') silentReload.current = false;
    }
  }, [viewMode, localFilters.from, localFilters.to, localFilters.plot, localFilters.search, localFilters.estate, refreshTick]);

  // Load Individual Records (Legacy Parity)
  const loadIndividualRecords = useCallback(async () => {
    if (viewMode !== 'individual') return;
    if (!silentReload.current) setLoading(true);
    const reqId = ++latestRecordsReq.current;
    const isLatest = () => reqId === latestRecordsReq.current;
    try {
      const toDecide = localFilters.plot
        ? selectedStatuses(localFilters.status).filter(k => k !== 'valid')
        : selectedStatuses(localFilters.status);

      const fetchPending = (localFilters.plot && !toDecide.length)
        ? Promise.resolve({ items: [], total: 0 })
        : API.fetchApprovalRecords({
            plot: localFilters.plot || undefined,
            status: recordStatusFor(toDecide),
            search: localFilters.search || undefined,
            estate: localFilters.estate || undefined,
            dateRange: { from: localFilters.from, to: localFilters.to },
            page: currentPage,
            size: pageSize
          });

      const fetchApproved = (localFilters.plot && (isDefaultStatuses(localFilters.status) || selectedStatuses(localFilters.status).includes('valid')))
        ? API.fetchApprovalRecords({
            plot: localFilters.plot, status: 'APPROVED',
            dateRange: { from: localFilters.from, to: localFilters.to }, page: 1, size: 100
          }).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });

      const [res, ar] = await Promise.all([fetchPending, fetchApproved]);
      if (!isLatest()) return;   // the filters changed while this was loading: keep the newer result

      const mappedApproved = (ar.items || []).map(r => ({
        ...r,
        plot_id: r.h_plot_id,
        worker_id: r.h_worker_id,
        worker_name: r.worker_name || `Worker ${r.h_worker_id}`,
        role: r.h_worker_role,
        team: r.team,
        contractor: r.contractor,
        total_count: r.h_total_count,
        ai_count: r.h_ai_detected_count,
        weight_kg: r.h_weight_kg,
        duration_mins: r.duration,
        platform_id: r.platform_id || r.validation_details?.spatial_grid?.grid_cell_id || null,
        data_status: 'valid'
      }));

      const mapped = (res.items || [])
        .filter(r => !localFilters.plot || String(r.status || '').toLowerCase() !== 'approved')
        .map(r => ({
          ...r,
          plot_id: r.h_plot_id,
          worker_id: r.h_worker_id,
          worker_name: r.worker_name || `Worker ${r.h_worker_id}`,
          role: r.h_worker_role,
          team: r.team,
          contractor: r.contractor,
          total_count: r.h_total_count,
          ai_count: r.h_ai_detected_count,
          weight_kg: r.h_weight_kg,
          duration_mins: r.duration,
          platform_id: r.platform_id || r.validation_details?.spatial_grid?.grid_cell_id || null,
          data_status: r.status?.toUpperCase() === 'APPROVED' ? 'valid' : (r.status?.toUpperCase() === 'REJECTED' ? 'error' : 'warning')
        }));

      setApprovedPlotRecords(mappedApproved);
      setIndividualRecords(mapped);
      setTotalIndividualCount(res.total || 0);
    } catch (err) {
      if (isLatest()) console.error('Failed to load individual records', err);
    } finally {
      if (isLatest()) {
        setLoading(false);
        silentReload.current = false;
      }
    }
  }, [viewMode, localFilters, currentPage, refreshTick]);

  useEffect(() => {
    loadPlotExceptions();
  }, [loadPlotExceptions]);

  useEffect(() => {
    loadIndividualRecords();
  }, [loadIndividualRecords]);

  // Load stats counters
  useEffect(() => {
    const loadStats = async () => {
      const reqId = ++latestStatsReq.current;
      try {
        const res = await API.fetchApprovalTotals({
          plot: localFilters.plot || undefined,
          search: localFilters.search || undefined,
          estate: localFilters.estate || undefined,
          dateRange: { from: localFilters.from, to: localFilters.to }
        });
        if (reqId !== latestStatsReq.current) return;
        setApprovalStats({
          total: res.total || 0, pending: res.pending || 0, approved: res.approved || 0, rejected: res.rejected || 0,
        });
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    };
    loadStats();
  }, [localFilters, localChanges]);

  // Location, search and dates are applied by the server (same filters as the counters above).
  const filteredIndividualRecords = individualRecords;

  // All plot reconciliation exceptions/summaries: displayed in the table on the main screen (Image 2)
  const allPlotExceptions = useMemo(() => {
    // Location and search are applied by the server (same rule as the records list and counters).
    // One plot-day per plot, date and mode: the same list the sidebar badge counts (utils/reconStatus.js).
    let list = plotDays(plotExceptions, pickerExceptions);
    if (localFilters.from) {
      list = list.filter(p => String(p.work_date) >= localFilters.from);
    }
    if (localFilters.to) {
      list = list.filter(p => String(p.work_date) <= localFilters.to);
    }
    return list;
  }, [plotExceptions, pickerExceptions, localFilters]);
  // The table: plot-days passing the status filter (by default Pending, Mismatch and Rejected; Matched when chosen).
  // The summary cards count every status (plotDaysAll), so Matched is still counted while hidden.
  const plotDaysAll = allPlotExceptions;
  const shownPlotDays = useMemo(() => plotDaysAll.filter(p => statusMatches(localFilters.status, p.status)),
    [plotDaysAll, localFilters.status]);

  // Click handler to select an exception and transition to Individual Records
  const listFiltersRef = useRef(null);   // filters of the list view, restored by "Back to all records"
  const handleSelectException = useCallback((plotId, workDate) => {
    setIndividualRecords([]);
    setApprovedPlotRecords([]);
    setLoading(true);
    setLocalFilters(prev => {
      if (!prev.plot) listFiltersRef.current = prev;
      return {
      ...prev,
      plot: plotId,
      from: workDate,
      to: workDate
      };
    });
    setViewMode('individual');
  }, []);

  // Arriving from Geospatial Intel ("Open in Approval Center"): open that plot-day once.
  useEffect(() => {
    const plot = searchParams.get('plot');
    const date = searchParams.get('date');
    if (plot && date) {
      handleSelectException(plot, date);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, handleSelectException]);

  const handleBackToList = useCallback(() => {
    setIndividualRecords([]);
    setApprovedPlotRecords([]);
    setLoading(true);
    const saved = listFiltersRef.current;
    listFiltersRef.current = null;
    setLocalFilters(prev => saved ? { ...saved } : { ...prev, plot: '', from: '', to: '' });
  }, []);

  // Click handler to select a plot and date directly from an individual record
  const handleSelectPlotAndDate = useCallback((plotId, workDate) => {
    setIndividualRecords([]);
    setApprovedPlotRecords([]);
    setLoading(true);
    const d = workDate ? new Date(workDate).toISOString().split('T')[0] : '';
    setLocalFilters(prev => {
      if (!prev.plot) listFiltersRef.current = prev;
      return { ...prev, plot: plotId, from: d, to: d };
    });
  }, []);

  // Both tabs use the same filters: Location, Search, dates and plot status go with you when you switch.
  const switchTab = (mode) => {
    if (mode === viewMode) return;
    if (mode === 'errors') {
      updateAppFilters({
        estate: localFilters.estate || null,
        search: localFilters.search || '',
        dateRange: { from: localFilters.from || null, to: localFilters.to || null },
        reconStatus: localFilters.status || null,
      });
    } else {
      setLocalFilters(prev => ({
        ...prev,
        estate: appFilters.estate || '',
        search: appFilters.search || '',
        from: appFilters.dateRange?.from || '',
        to: appFilters.dateRange?.to || '',
        status: appFilters.reconStatus || null,
      }));
    }
    setViewMode(mode);
  };

  // Legacy single decision save
  const handleSaveDecision = async (id, status, comment, countChoice = null) => {
    if (userRole === 'View') {
      setErrorMsg('Your Viewer role does not authorize you to update decisions.');
      return;
    }
    if (!(comment || '').trim()) {
      setErrorMsg('Write a note on what you checked before approving or rejecting.');
      return;
    }
    try {
      setLoading(true);
      const supervisorId = getUserEmail() || 'Supervisor';
      await API.updateApproval(id, {
        approval_status: status,
        reviewer_comment: comment,
        reviewer_id: supervisorId,
        count_choice: countChoice
      });

      setLocalChanges(prev => ({
        ...prev,
        [id]: { status, comment, saved: true }
      }));

      // Reload lists and counts
      loadIndividualRecords();
      loadPlotExceptions();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save decision: ' + (err.message || 'Error occurred'));
    } finally {
      setLoading(false);
    }
  };



  const [exportModalOpen, setExportModalOpen] = useState(false);
  const isViewer = userRole === 'View';

  const handleConfirmExport = (selectedKeys) => {
    if (viewMode === 'individual') {
      window.location.href = API.approvalRecordsExportUrl({
        plot: localFilters.plot || undefined,
        status: recordStatusFor(localFilters.status),
        search: localFilters.search || undefined,
        dateRange: { from: localFilters.from, to: localFilters.to },
        columns: selectedKeys.join(',')
      });
      return;
    }
    downloadReconciliationCsv([...plotExceptions, ...pickerExceptions], selectedKeys);
  };

  // Map Audit: the Field Audit Map on this record's plot and day, zoomed to its platform.
  const openMapAudit = useCallback((op) => {
    const day = String(op.created_at || '').slice(0, 10);
    updateAppFilters({
      estate: null, role: null, reconStatus: STATUS_CHOICES.map(c => c.value),   // the audited record shows whatever its plot's status
      search: op.plot_id || '',
      dateRange: { from: day || null, to: day || null },
      mapFocus: {
        plot: op.plot_id,
        platform: op.platform_id || op.validation_details?.spatial_grid?.grid_cell_id || null,
        lat: op.latitude, lng: op.longitude, t: Date.now(),
      },
    });
    setViewMode('errors');
  }, [updateAppFilters]);

  const decidedStatus = useCallback((r) => {
    if (!r) return 'warning';
    const dec = localChanges[r.id];
    if (dec && dec.status) return dec.status;
    if (String(r.status || '').toUpperCase() === 'REJECTED' || r.data_status === 'error') return 'error';
    if (String(r.status || '').toUpperCase() === 'APPROVED' || r.data_status === 'valid') return 'valid';
    return 'warning';
  }, [localChanges]);

  const renderReviewCard = useCallback((op, readOnlyProp = false) => {
    if (!op) return null;
    const isAlreadyApproved = readOnlyProp ||
      String(op.status || op.approval_status || '').toUpperCase() === 'APPROVED' ||
      String(op.data_status || '').toLowerCase() === 'valid';
    const readOnly = isAlreadyApproved;
    const decision = localChanges[op.id] || {};
    const currentStatus = decision.status || op.data_status || (isAlreadyApproved ? 'valid' : 'warning');
    const currentComment = decision.comment !== undefined ? decision.comment : (op.comment || '');
    // A decision already saved (this visit or before) shows as decided, with Change Decision; not as waiting.
    const isSaved = decision.saved ?? (currentStatus === 'error' || currentStatus === 'valid');

    const role = (op.role || '').toLowerCase();
    const isPicker = role.includes('picker');

    const imageUrl = API.resolveImageUrl(op.image_url); // no photo -> the photo area stays empty

    return (
      <div
        key={op.id}
        className={`review-card review-card--${currentStatus}${readOnly ? ' review-card--compact' : ''}`}
        style={{
          margin: 0,
          width: '100%',
          border: op.is_duplicate ? '2px dashed #d97706' : undefined,
          boxShadow: op.is_duplicate ? '0 0 10px rgba(217, 119, 6, 0.1)' : undefined
        }}
      >
        {/* Left: Interactive Image Thumbnail */}
        <div className="review-card__left">
          <div
            className="review-card__thumb"
            style={imageUrl ? undefined : { background: '#f1f5f9' }}
            onClick={() => {
              setRotation(0);
              setLightboxCompare(false);
              setSelectedLoaderImageIdx(0);
              setLightbox({
                url: imageUrl,
                title: `${op.recorder_name || op.harvesting_clerk_id} (Harvester Role) - Plot ${op.plot_id}`,
                type: 'harvester',
                harvesterUrl: imageUrl,
                // the load this record pairs with first, then the other loads of the plot
                loaderUrls: [...loaderImages]
                  .sort((a, b) => Number(b.id === harvestPairs[op.id]?.paired_id) - Number(a.id === harvestPairs[op.id]?.paired_id))
                  .map(li => li.url)
              });
            }}
          >
            {imageUrl && <img src={imageUrl} alt="Evidence" onError={(e) => { e.target.style.display = 'none'; }} />}
          </div>
        </div>

        {/* Middle: Operations Details & Data Telemetry */}
        <div className="review-card__body">
          <div className="review-card__identity">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* The card belongs to the harvester role who made the record (like the loading role cards). */}
              <h3 className="review-card__name" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>{op.recorder_name || 'Harvester Role'}{op.harvesting_clerk_id && <span className="card-person-id"> ({op.harvesting_clerk_id})</span>}</span>
                {op.is_duplicate && (
                  <span style={{
                    padding: '2px 8px',
                    background: '#fffbeb',
                    color: '#d97706',
                    fontSize: '10px',
                    fontWeight: 500,
                    borderRadius: '999px',
                    border: '1px solid #fde68a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <AlertTriangle size={12} /> Potential Duplicate
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="review-card__plot-row" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1d4ed8', fontWeight: 500 }}>
              <MapPin size={12} /> {fmtPlatform(op.platform_id || op.validation_details?.spatial_grid?.grid_cell_id)}
            </span>
            <span>•</span>
            <span>Harvest scan: <strong>{fmtDate(op.created_at)} · {fmtTime(op.created_at)}</strong></span>
          </div>

          {/* Who carried the bunches and who recorded them */}
          {readOnly ? (
          <div className="review-card__people review-card__people--compact" style={{ fontSize: '12.5px', color: '#0f172a', lineHeight: 1.45 }}>
            <div>
              {isPicker ? 'Picker:' : 'Cutter:'} <strong style={{ color: '#0f172a' }} title={op.team ? `Team: ${op.team}` : undefined}>{op.worker_name}</strong> <span style={{ color: '#0f172a' }}>({op.worker_id})</span>
              {!isPicker && <><span style={{ color: '#94a3b8' }}> · </span>Carried by <strong style={{ color: '#0f172a' }} title={op.carrier_id ? `ID ${op.carrier_id}` : undefined}>{(op.carried_by || 'Self') === 'Self' ? 'Self' : op.carrier_name || op.carried_by}</strong></>}
            </div>
          </div>
          ) : (
          <div className="review-card__people" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', fontSize: '12.5px', color: '#0f172a', lineHeight: 1.45 }}>
            <span>{isPicker ? 'Picker:' : 'Cutter:'} <strong style={{ color: '#0f172a' }}>{op.worker_name}</strong>
              <span style={{ color: '#0f172a' }}> ({op.worker_id}{op.team ? ` · ${op.team}` : ''})</span>
            </span>
            {!isPicker && (
              <span>Carried by <strong style={{ color: '#0f172a' }}>{(op.carried_by || 'Self') === 'Self' ? 'Self' : op.carrier_name || op.carried_by}</strong>
                {op.carrier_id && (op.carried_by || 'Self') !== 'Self' && <span style={{ color: '#0f172a' }}> ({op.carrier_id})</span>}
              </span>
            )}
          </div>
          )}

          {/* Why this record is here: score, worst failed checks and what to look at */}
          {!readOnly && <ReviewReasons score={op.validation_score} details={op.validation_details} clerkId={op.harvesting_clerk_id} />}


          {/* Counts on one line */}
            <div className="review-card__counts" style={{ fontSize: '13px', color: '#0f172a', display: 'flex', flexWrap: 'wrap', gap: '4px 14px', alignItems: 'baseline' }}>
              {isPicker ? (
                <span><strong style={{ color: '#86198f', fontSize: '15px' }}>{op.weight_kg}</strong> kg</span>
              ) : (
                <>
                  <span><strong style={{ color: '#3F8432', fontSize: '15px' }}>{bunchCount(op.ai_count, op.total_count, op.approved_count).main}</strong> bunches{bunchCount(op.ai_count, op.total_count, op.approved_count).typed != null ? ` (typed ${bunchCount(op.ai_count, op.total_count, op.approved_count).typed})` : ''}</span>
                  <span><strong style={{ color: '#d97706', fontSize: '15px' }}>{op.h_rotten_count || 0}</strong> rotten</span>
                  <span><strong style={{ color: '#dc2626', fontSize: '15px' }}>{op.h_unripe_count || 0}</strong> unripe</span>
                </>
              )}
            </div>
          {!isPicker && countFlag(op.ai_count, op.total_count, op.approved_count) && (
            <div style={{ fontSize: '12.5px', fontWeight: 500, color: RECON_STATUS.DISCREPANCY.dark, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <AlertTriangle size={13} /> {countFlag(op.ai_count, op.total_count, op.approved_count)}: held for a supervisor
            </div>
          )}
          {!isPicker && confirmedNote(op.count_source, op.ai_count, op.total_count) && (
            <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#3F8432' }}>{confirmedNote(op.count_source, op.ai_count, op.total_count)}</div>
          )}
          {/* The load this record pairs with: closest in time on the same plot, day and work type */}
          {(() => {
            const pair = harvestPairs[op.id];
            if (!pair?.paired_id) return null; // no load paired: nothing to show
            const ps = PAIR_STATUS[pair.pair_status] || PAIR_STATUS.MATCHED;
            const picker = isPicker;
            const diff = !picker && pair.paired_count != null
              ? bunchCount(op.ai_count, op.total_count, op.approved_count).main - (pair.paired_count + (op.h_rotten_count || 0)) : null;
            return (
              <div className="review-card__pair" style={{ fontSize: '12.5px', color: '#0f172a', display: 'flex', flexWrap: 'wrap', gap: '2px 8px', alignItems: 'baseline' }}>
                <strong style={{ color: ps.dark }}>{ps.label}{pair.pair_status === 'COUNT_DIFFERS' && diff ? ` (${diff > 0 ? '+' : ''}${diff})` : ''}</strong>
                {pair.paired_time && (
                  <span>
                    Load: <strong style={{ color: '#0f172a' }}>{fmtDate(pair.paired_time)} · {fmtTime(pair.paired_time)}</strong>
                    {' · '}<strong style={{ color: '#1d4ed8' }}>{picker ? `${pair.paired_weight} kg` : `${pair.paired_count} FFB`}</strong>
                  </span>
                )}
              </div>
            );
          })()}
          {readOnly && (
        <div className="review-card__approved" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
          <span style={{ color: '#3F8432', fontWeight: 500, fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} /> {String(op.reviewer_id || '').toLowerCase() === 'system' ? 'Approved automatically' : `Approved by ${op.reviewer_id || 'supervisor'}`}
            {op.validation_score != null && <span style={{ color: '#0f172a', fontWeight: 500 }}> · Score {op.validation_score}/100</span>}
          </span>
          {/* The system's own note repeats the line above; a supervisor's note is kept. */}
          {op.comment && String(op.reviewer_id || '').toLowerCase() !== 'system' && <span style={{ fontSize: '12px', color: '#0f172a' }}>Note: {op.comment}</span>}
        </div>
          )}
        </div>

        {/* Right: Decision Panel (approved records show their approval inside the details instead) */}
        {readOnly ? null : (
        <div className="review-card__right review-card__actions">
          {isSaved ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
              <div style={{
                textAlign: 'center', fontSize: '11px', color: currentStatus === 'valid' ? '#3F8432' : '#991b1b', fontWeight: 500,
                background: currentStatus === 'valid' ? '#F3F8EF' : '#fee2e2', padding: '6px', borderRadius: '4px',
                textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                {currentStatus === 'valid' ? <CheckCircle size={14} /> : <X size={14} />}
                {currentStatus === 'valid' ? 'Approved' : 'Rejected'}
              </div>
              {currentComment && <div style={{ fontSize: '11.5px', color: '#0f172a', overflowWrap: 'anywhere' }}>Note: {currentComment}</div>}
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setLocalChanges(prev => ({
                    ...prev,
                    [op.id]: { ...prev[op.id], saved: false }
                  }));
                }}
                style={{ height: '24px', fontSize: '11px', fontWeight: 500, padding: 0, color: '#0f172a', textDecoration: 'underline' }}
              >
                Change Decision
              </button>
            </div>
          ) : (
            <>
              <button
                className="btn btn--primary review-action review-action--approve"
                disabled={userRole === 'View'}
                title={userRole === 'View' ? 'Viewers cannot approve' : 'Approve (asks for your note)'}
                onClick={() => setNoteDialog({ op, status: 'valid', text: currentComment })}
              >
                <CheckCircle size={15} /> Approve
              </button>
              <button
                className="btn review-action review-action--reject"
                disabled={userRole === 'View'}
                title={userRole === 'View' ? 'Viewers cannot reject' : 'Reject (asks for your note)'}
                onClick={() => setNoteDialog({ op, status: 'error', text: currentComment })}
              >
                <X size={15} /> Reject
              </button>
              <button
                className="btn review-action review-action--map"
                title="Open this record's platform on the Field Audit Map"
                onClick={() => openMapAudit(op)}
              >
                <MapPin size={15} /> Map Audit
              </button>
            </>
          )}
        </div>
        )}
      </div>
    );
  }, [localChanges, userRole, handleSelectPlotAndDate, loaderImages, harvestPairs, openMapAudit]);

  // Loading Role card (plot view, right column of the paired table).
  const renderLoaderCard = (load) => {
    const loadImg = API.resolveImageUrl(load.image_url); // no photo -> empty
    return (
                              <div
                                key={load.id}
                                className="loader-ref-card"
                                style={{
                                  display: 'grid', gridTemplateColumns: '170px minmax(0, 1fr)', background: 'white',
                                  border: load.is_duplicate ? '2px dashed #d97706' : 'none'
                                }}
                              >
                                {/* Photo (same layout as the harvest cards) */}
                                <div
                                  style={{ position: 'relative', overflow: 'hidden', cursor: 'zoom-in', background: '#f1f5f9', minHeight: '150px' }}
                                  onClick={() => {
                                    setRotation(0);
                                    setLightboxCompare(false);
                                    setSelectedLoaderImageIdx(0);
                                    const pairedHarvest = [...filteredIndividualRecords, ...approvedPlotRecords].find(r => r.id === load.paired_id);
                                    setLightbox({
                                      url: loadImg,
                                      title: `${load.worker_name} (Loading Role) - Plot ${localFilters.plot}`,
                                      type: 'loader',
                                      harvesterUrl: pairedHarvest ? API.resolveImageUrl(pairedHarvest.image_url) : null,
                                      harvesterName: pairedHarvest ? (pairedHarvest.recorder_name || pairedHarvest.harvesting_clerk_id) : null,
                                      loaderUrls: loadImg ? [loadImg] : []
                                    });
                                  }}
                                >
                                  {loadImg && <img src={loadImg} alt="Loading Role photo" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />}
                                </div>

                                {/* Details */}
                                <div className="loader-ref-card__body" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 14px', color: '#0f172a', minWidth: 0 }}>
                                  <div className="loader-ref-card__name">
                                    <span>{load.worker_name}{load.worker_id && <span className="card-person-id"> ({load.worker_id})</span>}</span>
                                    {load.is_duplicate && (
                                      <span style={{ color: '#d97706', fontSize: '11px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <AlertTriangle size={11} /> Duplicate
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ color: '#0f172a', fontWeight: 400 }}>
                                    {['picker', 'loose fruit picker'].includes(String(load.role || '').toLowerCase()) ? 'Picker sacks' : 'Harvested bunches'}
                                  </div>
                                  <div>Load scan: <strong style={{ color: '#0f172a' }}>{load.time ? `${fmtDate(load.time)} · ${fmtTime(load.time)}` : '—'}</strong></div>
                                  {load.paired_id && (() => {
                                    const ps = PAIR_STATUS[load.pair_status] || PAIR_STATUS.MATCHED;
                                    return (
                                      <div>
                                        <strong style={{ color: ps.dark }}>{ps.label}</strong>
                                        {load.paired_time && <> · harvest scan {fmtTime(load.paired_time)}</>}
                                      </div>
                                    );
                                  })()}
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1d4ed8', fontWeight: 500 }}>
                                    <MapPin size={12} /> {fmtPlatform(load.platform_id)}
                                  </div>
                                  <div style={{ marginTop: 'auto', display: 'flex', gap: '14px', alignItems: 'baseline' }}>
                                    <span><strong style={{ color: '#1d4ed8', fontSize: '18px' }}>{bunchCount(load.ai_count ?? load.total_count, load.typed_count).main}</strong> FFB loaded{bunchCount(load.ai_count, load.typed_count).typed != null ? ` (typed ${bunchCount(load.ai_count, load.typed_count).typed})` : ''}</span>
                                    {load.weight_kg > 0 && <span><strong style={{ color: '#86198f', fontSize: '18px' }}>{load.weight_kg}</strong> kg</span>}
                                  </div>
                                </div>
                              </div>
    );
  };

  return (
    <div className="view-container view-fade-in approval-view" style={{ padding: '32px', display: 'flex', flexDirection: 'column', minHeight: '100%', overflowY: 'auto' }}>

      {errorMsg && (
        <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '13px', fontWeight: 500 }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} aria-label="Dismiss error" style={{ background: 'transparent', border: 'none', color: '#991B1B', fontWeight: 500, fontSize: '16px', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Title Header */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 className="view-title" style={{ fontSize: '26px', fontWeight: 500 }}>Verification Queue</h1>
          <p className="view-subtitle" style={{ color: 'var(--text-muted)' }}>Reconcile harvester role submissions against haulage and loading role records.</p>
        </div>

        {/* View Mode Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            className={`btn ${viewMode === 'individual' ? 'btn--primary' : ''}`}
            onClick={() => switchTab('individual')}
            style={{
              border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 500,
              background: viewMode === 'individual' ? 'white' : 'transparent',
              color: viewMode === 'individual' ? '#3F8432' : '#64748b',
              boxShadow: viewMode === 'individual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <User size={14} style={{ marginRight: '6px' }} />
            Individual Records
          </button>
          <button
            className={`btn ${viewMode === 'errors' ? 'btn--primary' : ''}`}
            onClick={() => switchTab('errors')}
            style={{
              border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 500,
              background: viewMode === 'errors' ? 'white' : 'transparent',
              color: viewMode === 'errors' ? '#3F8432' : '#64748b',
              boxShadow: viewMode === 'errors' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <AlertTriangle size={14} style={{ marginRight: '6px' }} />
            Field Audit Map
          </button>
        </div>
      </div>

      {viewMode === 'errors' && <MapView mode="errors" embedded />}

      {/* Exceptions & individual records stay mounted (hidden) so their state survives tab switches */}
      <div style={{ display: viewMode === 'errors' ? 'none' : 'contents' }}>

      {/* Filter Bar: hidden while one plot is open (the filters are kept for "Back to all records") */}
      <div className="analytics-filter-bar" style={{ display: viewMode === 'individual' && localFilters.plot ? 'none' : 'flex', alignItems: 'flex-end', gap: '16px', padding: '12px 16px', marginBottom: '20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
        <div className="filter-group" style={{ flex: 1 }}>
          <label className="filter-label">Search</label>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}><Search size={14} /></span>
            <input
              type="search"
              className="search-input"
              style={{ paddingLeft: '32px', width: '100%', height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              placeholder="Search plot..."
              value={localFilters.search}
              onChange={e => setLocalFilters({ ...localFilters, search: e.target.value })}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Plantation Location</label>
          <select
            className="select-input"
            style={{ width: '150px', height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            value={localFilters.estate}
            onChange={e => setLocalFilters({ ...localFilters, estate: e.target.value })}
          >
            <EstateOptions allLabel="All Locations" />
          </select>
        </div>

        {viewMode === 'individual' && (
          <div className="filter-group">
            <label className="filter-label">Reconciliation Status</label>
            {/* Plot status, same as the summary cards: Pending = waiting for a clerk. */}
            <StatusFilter value={localFilters.status}
              onChange={v => setLocalFilters({ ...localFilters, status: v })} />
          </div>
        )}

        <div className="filter-group">
          <label className="filter-label">Start Date</label>
          <input
            type="date"
            className="date-input"
            style={{ width: '140px', height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            value={localFilters.from}
            onChange={e => setLocalFilters({ ...localFilters, from: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">End Date</label>
          <input
            type="date"
            className="date-input"
            style={{ width: '140px', height: '38px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            value={localFilters.to}
            onChange={e => setLocalFilters({ ...localFilters, to: e.target.value })}
          />
        </div>

        <button
          className="btn btn--outline btn--sm"
          onClick={() => setLocalFilters({ search: '', status: null, plot: '', from: '', to: '', estate: getEstateScope() })}
          style={{ height: '38px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 12px' }}
        >
          Reset Filters
        </button>

        <button
          className="btn btn--primary btn--sm"
          onClick={isViewer ? undefined : () => setExportModalOpen(true)}
          disabled={isViewer}
          title={userRole === 'View' ? 'Viewer accounts cannot export CSV from the portal' : 'Export CSV'}
          style={{
            height: '38px', borderRadius: '8px', padding: '0 16px',
            background: userRole === 'View' ? '#94a3b8' : '#3F8432',
            borderColor: userRole === 'View' ? '#94a3b8' : '#3F8432',
            cursor: userRole === 'View' ? 'not-allowed' : 'pointer',
            opacity: userRole === 'View' ? 0.7 : 1,
            fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          {userRole === 'View' ? <Lock size={14} /> : null} Export CSV
        </button>
      </div>

      {/* Main Workspace Panels */}
      <div className="approval-workspace" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Right Column (order: 2): Exceptions Queue and Drilldown Audit Panel */}
        {viewMode !== 'exceptions' && (
        <div style={{ order: 2, flex: '1', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Individual Records: count cards (list) or Back button (plot open), outside the records panel */}
          {viewMode === 'individual' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {localFilters.plot ? (
                  <button
                    type="button"
                    onClick={handleBackToList}
                    style={{ alignSelf: 'flex-start', padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#FFFFFF', color: '#0f172a', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ChevronLeft size={15} /> Back to all records
                  </button>
                ) : (
                /* Summary cards (list view only). Every card counts plot-days, the same rows as the table below,
                   worked out from each plot's own status, so a matched plot never shows as pending. */
                (() => {
                  const byStatus = (...st) => plotDaysAll.filter(p => st.includes(p.status)).length;
                  // Card colours come from the shared status palette (same as the map and the Open buttons).
                  const tone = (t) => ({ bg: `#3F8432`, fg: t.dark, lb: t.dark });
                  const cards = [
                    { key: 'pending', label: 'Pending', n: byStatus('WAITING_FOR_LOADER', 'WAITING_FOR_RECORDER'), icon: AlertTriangle,
                      ...tone(RECON_STATUS.WAITING_FOR_LOADER), sub: 'Waiting for a clerk to sync' },
                    { key: 'matched', label: 'Matched', n: byStatus('RECONCILED'), icon: CheckCircle,
                      ...tone(RECON_STATUS.RECONCILED), sub: 'Harvested = loaded, approved' },
                    { key: 'mismatch', label: 'Mismatch', n: byStatus('DISCREPANCY'), icon: ShieldAlert,
                      ...tone(RECON_STATUS.DISCREPANCY), sub: 'Totals differ, review needed' },
                    { key: 'rejected', label: 'Rejected', n: byStatus('REJECTED'), icon: ShieldAlert,
                      ...tone(RECON_STATUS.REJECTED), sub: 'Records rejected' },
                  ];
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      {cards.map(c => {
                        const Icon = c.icon;
                        return (
                          <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '14px 18px' }}>
                            <div style={{ width: '40px', height: '40px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon size={18} color="white" />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '22px', fontWeight: 500, color: c.fg, lineHeight: 1 }}>{c.n}</div>
                              <div style={{ fontSize: '11px', fontWeight: 500, color: c.lb, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '3px' }}>
                                {c.label}{c.key !== 'rejected' ? ` plot${c.n === 1 ? '' : 's'}` : ''}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#0f172a', marginTop: '2px', overflowWrap: 'anywhere' }}>{c.sub}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
                )}
            </div>
          )}

          {/* Exceptions Queue or Legacy Individual Queue */}
          <div style={{ display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: '12px' }}>
                <div className="loader-spinner"></div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Fetching Data...</span>
              </div>
            )}

            {/* Legacy Individual Auditing List */}
            {!loading && viewMode === 'individual' && (
              <>
                {(() => {
                  const activePlotInfo = (() => {
                    const plotId = localFilters.plot || (localFilters.search && localFilters.search.trim());
                    if (!plotId) return null;
                    const targetDate = localFilters.from;
                    // Harvester plot-days first, then picker ones (a plot may only have picker work).
                    const all = [...plotExceptions, ...pickerExceptions];
                    const same = p => p.plot_id.toLowerCase() === plotId.toLowerCase();
                    return all.find(p => same(p) && (!targetDate || p.work_date === targetDate)) || all.find(same);
                  })();

                  return (
                    <>
                      {activePlotInfo && (
                        <div style={{
                          display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px',
                          background: '#3F8432',
                          border: '1px solid #cbd5e1', borderRadius: '16px', marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h3 style={{ fontSize: '15px', fontWeight: 950, color: '#0f172a', margin: 0 }}>Plot {activePlotInfo.plot_id} Summary</h3>
                              <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: 400 }}>Date: {fmtDate(activePlotInfo.work_date)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                padding: '4px 8px', borderRadius: '6px', fontSize: '17px', fontWeight: 500,
                                background: 'transparent',
                                color: reconStatus(activePlotInfo.status).dark
                              }}>
                                {reconStatus(activePlotInfo.status).label}{activePlotInfo.status === 'DISCREPANCY' ? ` (${activePlotInfo.variance})` : ''}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ fontSize: '10px', color: '#0f172a', fontWeight: 500, textTransform: 'uppercase' }}>Harvester Total</div>
                              <div style={{ fontSize: '18px', fontWeight: 500, color: '#3F8432', marginTop: '2px' }}>
                                {activePlotInfo.mode === 'picker' ? `${activePlotInfo.harvester_weight} kg` : `${activePlotInfo.harvester_count} FFB`}
                              </div>
                            </div>
                            <div style={{ width: '1px', background: '#cbd5e1' }} />
                            <div style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ fontSize: '10px', color: '#0f172a', fontWeight: 500, textTransform: 'uppercase' }}>Loaded Total</div>
                              <div style={{ fontSize: '18px', fontWeight: 500, color: '#1d4ed8', marginTop: '2px' }}>
                                {activePlotInfo.mode === 'picker' ? `${activePlotInfo.loader_weight} kg` : `${activePlotInfo.loader_count} FFB`}
                              </div>
                            </div>
                          </div>

                          {/* Record by record: the ones that passed every check are not issues; only the held ones are. */}
                          {activePlotInfo.harvester_records > 0 && (() => {
                            const { matched, issues, rejected } = recordIssues(activePlotInfo);
                            return (
                              <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                                Records: <span style={{ color: '#3F8432' }}>{matched} matched</span>
                                {' · '}<span style={{ color: issues ? RECON_STATUS.DISCREPANCY.dark : '#64748b' }}>{issues} {issues === 1 ? 'issue' : 'issues'}</span>
                                {rejected > 0 && <>{' · '}<span style={{ color: RECON_STATUS.REJECTED.dark }}>{rejected} rejected</span></>}
                              </div>
                            );
                          })()}

                          {/* "Investigate": platform-by-platform balance, opened only when the supervisor clicks it.
                              Red when some platforms don't balance, green when all do; hovering shows the count. */}
                          {(plotDrilldown?.cells || []).length > 0 && (() => {
                            const off = plotDrilldown.cells.filter(c => c.status !== 'CLEAN').length;
                            const total = plotDrilldown.cells.length;
                            // Plot total balances: platform differences only mean bunches were loaded from a
                            // nearby platform. The records are approved; nothing to investigate.
                            const plotMatched = !['DISCREPANCY', 'WAITING_FOR_LOADER', 'WAITING_FOR_RECORDER'].includes(activePlotInfo.status);
                            const tip = !off
                              ? `All ${total} platform${total === 1 ? '' : 's'} balance. Click to see the counts.`
                              : plotMatched
                                ? `The plot balances. ${off} platform${off === 1 ? '' : 's'} differ only because bunches were loaded from a nearby platform. No action needed.`
                                : `${off} of ${total} platform${total === 1 ? '' : 's'} don't balance. Click to see which.`;
                            const calm = !off || plotMatched;
                            return (
                            <details className="platform-hint">
                              <summary className={`investigate-link ${calm ? 'investigate-link--ok' : 'investigate-link--off'}`} data-tip={tip} aria-label={`${calm ? 'Platform detail' : 'Investigate'}. ${tip}`}>
                                <HelpCircle size={14} /> {calm ? 'Platform detail' : 'Investigate'}
                              </summary>
                              <div style={{ marginTop: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px' }}>
                                <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '8px' }}>
                                  Bunches are scanned and loaded on a platform. Each row compares what was harvested on a platform with what was loaded from it.
                                  {plotMatched && off > 0 ? (
                                    <> The plot total balances, so every record of this plot passed the Loading match and is approved.
                                      {' '}{off} of {total} platforms differ only because the loading role scanned a nearby platform when collecting the bunches. No action needed.</>
                                  ) : (
                                    <> {off} of {total} platforms don't balance.
                                      {' '}A harvest record on a balanced platform passes the Loading match even when the plot total is off.</>
                                  )}
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#0f172a' }}>
                                    <thead>
                                      <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                                        <th style={{ padding: '8px 10px' }}>Platform Code</th>
                                        <th style={{ padding: '8px 10px' }}>Mode</th>
                                        <th style={{ padding: '8px 10px' }}>Harvested</th>
                                        <th style={{ padding: '8px 10px' }}>Rotten</th>
                                        <th style={{ padding: '8px 10px' }}>Loaded</th>
                                        <th style={{ padding: '8px 10px' }}>Difference</th>
                                        <th style={{ padding: '8px 10px' }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {plotDrilldown.cells.map(c => {
                                        const picker = c.mode === 'picker';
                                        const ok = c.status === 'CLEAN';
                                        const platformName = fmtPlatform(c.grid_cell_id);
                                        const isHarvOnly = c.harv_platform_id && !c.load_platform_id;
                                        const isLoadOnly = !c.harv_platform_id && c.load_platform_id;
                                        const isBoth = Boolean(c.harv_platform_id && c.load_platform_id);

                                        return (
                                          <tr key={`${c.grid_cell_id}-${c.mode}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
                                              <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '12px', color: '#0f172a' }}>
                                                {platformName}
                                              </div>
                                              <div style={{ marginTop: '1px', lineHeight: 1.2 }}>
                                                {isBoth && (
                                                  <span style={{ fontSize: '11px', color: '#3F8432', fontWeight: 500 }}>
                                                    Scanned by both
                                                  </span>
                                                )}
                                                {isHarvOnly && (
                                                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 500 }}>
                                                    Harvester scan only (no load recorded)
                                                  </span>
                                                )}
                                                {isLoadOnly && (
                                                  <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 500 }}>
                                                    Loader scan only (no harvest recorded)
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td style={{ padding: '5px 10px' }}>{picker ? 'Picker (kg)' : 'Bunches'}</td>
                                            <td style={{ padding: '5px 10px' }}>
                                              <div style={{ fontWeight: 500 }}>{picker ? `${c.harvester_weight} kg` : c.harvester_count}</div>
                                              {c.harv_workers && (
                                                <div style={{ fontSize: '10px', color: '#0f172a' }} title="Harvester ID(s)">
                                                  Worker: {c.harv_workers}
                                                </div>
                                              )}
                                            </td>
                                            <td style={{ padding: '5px 10px' }}>{picker ? '—' : c.harvester_rotten}</td>
                                            <td style={{ padding: '5px 10px' }}>
                                              <div style={{ fontWeight: 500 }}>{picker ? `${c.loader_weight} kg` : c.loader_count}</div>
                                              {c.load_workers ? (
                                                <div style={{ fontSize: '10px', color: '#0f172a' }} title="Loading Role ID(s)">
                                                  Clerk: {c.load_workers}
                                                </div>
                                              ) : isHarvOnly ? (
                                                <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>0 loaded</div>
                                              ) : null}
                                            </td>
                                            <td style={{ padding: '5px 10px', fontWeight: 500, color: ok ? '#0f172a' : plotMatched ? '#b45309' : (c.variance > 0 ? '#b45309' : '#dc2626') }}>
                                              {c.variance > 0 ? `+${c.variance}` : c.variance}
                                            </td>
                                            <td style={{ padding: '5px 10px', color: ok ? '#3F8432' : plotMatched ? '#b45309' : '#dc2626', fontWeight: 500 }}>
                                              {ok ? 'Balanced' : plotMatched ? (c.variance > 0 ? 'Loaded at a nearby platform' : 'Loaded from a nearby platform') : 'Not balanced'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                {(() => {
                                  const extra = plotDrilldown.cells.filter(c => c.status !== 'CLEAN' && c.variance > 0);
                                  const short = plotDrilldown.cells.filter(c => c.status !== 'CLEAN' && c.variance < 0);
                                  if (!extra.length || !short.length) return null;
                                  const list = (cells) => cells.map(c => `${fmtPlatform(c.grid_cell_id)} (${c.variance > 0 ? '+' : ''}${c.variance})`).join(', ');
                                  return (
                                    <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#0f172a', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                      {plotMatched
                                        ? <CheckCircle size={14} style={{ color: '#3F8432', flexShrink: 0, marginTop: '2px' }} />
                                        : <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />}
                                      <div>
                                        <strong>{plotMatched ? 'Why platforms differ:' : 'Investigation clue:'}</strong> extra bunches were harvested at <code>{list(extra)}</code> and
                                        {' '}loaded at <code>{list(short)}</code>. {plotMatched
                                          ? 'The totals cancel out: the loading role collected them from a nearby platform.'
                                          : 'Check whether bunches were collected while standing at or scanning a nearby platform code.'}
                                      </div>
                                    </div>
                                  );
                                })()}
                                <div style={{ fontSize: '11px', color: '#0f172a', marginTop: '8px' }}>Difference = harvested − (loaded + rotten).</div>
                              </div>
                            </details>
                          );
                          })()}

                        </div>
                      )}

                      {!localFilters.plot ? (
                        <AwaitingRecordersTable rows={shownPlotDays} onOpen={handleSelectException} />
                      ) : (
                        <div className="approval-plot-columns plot-pair-table">
                          {/* One table: each harvest record sits beside the load it pairs with (closest in
                              time on the same plot, day and work type). Waiting records (with Approve / Reject)
                              come first, then approved ones; loads without a harvest record come last. */}
                          <div className="plot-pair-table__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              Harvester Role records ({filteredIndividualRecords.length + approvedPlotRecords.length})
                              <span style={{ fontWeight: 500, color: '#0f172a', textTransform: 'none', letterSpacing: 0 }}>
                                {' '}· {filteredIndividualRecords.filter(r => decidedStatus(r) !== 'error').length} waiting for review{filteredIndividualRecords.some(r => decidedStatus(r) === 'error') ? ` · ${filteredIndividualRecords.filter(r => decidedStatus(r) === 'error').length} rejected` : ''} · {approvedPlotRecords.length} approved
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'none', fontWeight: 400 }}>
                              <ArrowUpDown size={13} /> Platform → Count
                            </span>
                          </div>
                          <div className="plot-pair-table__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>Loading Role records{plotDrilldown ? ` (${plotDrilldown.loaders?.length || 0})` : ''}</div>
                            <span style={{ fontSize: '11px', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'none', fontWeight: 400 }}>
                              <ArrowUpDown size={13} /> Platform → Count
                            </span>
                          </div>
                          {(() => {
                            const parsePlatformNum = (p) => {
                              if (!p) return 999999;
                              // The platform's own number is the last one (EST1-B3.3_edge_1_102 -> 102), not EST1's.
                              const m = String(p).match(/(\d+)$/);
                              return m ? parseInt(m[1], 10) : 999999;
                            };

                            const byPlatformThenNumber = (a, b) => {
                              const platA = parsePlatformNum(a.platform_id || a.validation_details?.spatial_grid?.grid_cell_id || a.grid_cell_id);
                              const platB = parsePlatformNum(b.platform_id || b.validation_details?.spatial_grid?.grid_cell_id || b.grid_cell_id);
                              if (platA !== platB) return platA - platB;

                              const numA = Number(a.total_count ?? a.ai_count ?? a.final_count ?? a.weight_kg ?? 0);
                              const numB = Number(b.total_count ?? b.ai_count ?? b.final_count ?? b.weight_kg ?? 0);
                              if (numA !== numB) return numB - numA;

                              return String(a.created_at || a.time || '').localeCompare(String(b.created_at || b.time || ''));
                            };

                            const byLoaderPlatformThenNumber = (a, b) => {
                              const platA = parsePlatformNum(a.platform_id || a.grid_cell_id);
                              const platB = parsePlatformNum(b.platform_id || b.grid_cell_id);
                              if (platA !== platB) return platA - platB;

                              const numA = Number(a.total_count ?? a.ai_count ?? a.weight_kg ?? 0);
                              const numB = Number(b.total_count ?? b.ai_count ?? b.weight_kg ?? 0);
                              if (numA !== numB) return numB - numA;

                              return String(a.time || a.created_at || '').localeCompare(String(b.time || b.created_at || ''));
                            };

                            const harvests = [
                              ...[...filteredIndividualRecords].sort(byPlatformThenNumber).map(op => ({ op, readOnly: false })),
                              ...[...approvedPlotRecords].sort(byPlatformThenNumber).map(op => ({ op, readOnly: true })),
                            ];
                            const loads = loadingDrilldown ? [] : [...(plotDrilldown?.loaders || [])]
                              .sort(byLoaderPlatformThenNumber);
                            const loadById = new Map(loads.map(l => [l.id, l]));
                            const used = new Set();
                            const left = [];
                            const right = [];
                            harvests.forEach(({ op, readOnly }) => {
                              left.push(renderReviewCard(op, readOnly));
                              const load = loadById.get(harvestPairs[op.id]?.paired_id);
                              if (load && !used.has(load.id)) { used.add(load.id); right.push(renderLoaderCard(load)); }
                              else right.push(null);
                            });
                            loads.filter(l => !used.has(l.id)).forEach(l => { left.push(null); right.push(renderLoaderCard(l)); });
                            const emptyLeft = activePlotInfo?.status === 'WAITING_FOR_RECORDER'
                              ? 'Awaiting harvester role records: the loads are on the right; once the harvester role syncs, the plot reconciles here.'
                              : 'No harvester role records for this plot and date.';
                            const emptyRight = loadingDrilldown ? 'Loading…'
                              : drilldownFailed ? (
                                <span>Could not load the loading role records.{' '}
                                  <button type="button" className="btn btn--ghost" style={{ height: '28px', padding: '0 10px', fontWeight: 500 }}
                                    onClick={() => setDrilldownTry(t => t + 1)}>Retry</button>
                                </span>
                              )
                              : 'No loading role records synced for this plot and date yet.';
                            const rows = Math.max(left.length, right.length, 1);
                            const hasLeft = left.some(Boolean);
                            const hasRight = right.some(Boolean);
                            return Array.from({ length: rows }, (_, i) => (
                              <div className="plot-pair-table__row" key={i} style={{ display: 'contents' }}>
                                <div className="plot-pair-table__cell">
                                  {left[i] || (i === 0 && !hasLeft ? <div className="plot-pair-table__empty">{emptyLeft}</div> : null)}
                                </div>
                                <div className="plot-pair-table__cell">
                                  {right[i] || (i === 0 && !hasRight ? <div className="plot-pair-table__empty">{emptyRight}</div> : null)}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                )}

                {/* Pagination footer for open plot view */}
                {localFilters.plot && totalPages > 1 && (
                  <div className="table-pagination-bar" style={{ marginTop: '24px', justifyContent: 'center' }}>
                    <div className="table-pagination-bar__controls">
                      <button
                        className="pg-btn"
                        disabled={currentPage === 1}
                        onClick={() => {
                          setCurrentPage(p => Math.max(1, p - 1));
                          scrollPageTop();
                        }}
                      >
                        Previous
                      </button>
                      <span className="pg-ellipsis" style={{ fontSize: '13px', fontWeight: 500, padding: '0 12px' }}>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        className="pg-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => {
                          setCurrentPage(p => Math.min(totalPages, p + 1));
                          scrollPageTop();
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
                    </>
                  );
                })()}
              </>
            )}
          </div>


        </div>
        )}

      </div>

      {/* Verification note pop-up: opened by Approve / Reject; the decision is saved only with a note. */}
      {noteDialog && (() => {
        const approve = noteDialog.status === 'valid';
        const nop = noteDialog.op;
        // Approving a record whose typed count differs from the AI count: the supervisor accepts one of the two.
        const needsCount = approve && !String(nop.role || '').toLowerCase().includes('picker') && !!countFlag(nop.ai_count, nop.total_count);
        const ok = noteDialog.text.trim().length > 0 && (!needsCount || !!noteDialog.countChoice);
        const close = () => setNoteDialog(null);
        const save = () => {
          if (!ok) return;
          const { op, status, text, countChoice } = noteDialog;
          setLocalChanges(prev => ({ ...prev, [op.id]: { ...prev[op.id], comment: text } }));
          setNoteDialog(null);
          handleSaveDecision(op.id, status, text.trim(), needsCount ? countChoice : null);
        };
        return (
          <div className="note-dialog__backdrop" onClick={close} role="presentation">
            <div className="note-dialog" role="dialog" aria-modal="true" aria-labelledby="note-dialog-title" onClick={(e) => e.stopPropagation()}>
              <h3 id="note-dialog-title" style={{ margin: 0, fontSize: '16px', fontWeight: 500, color: approve ? '#3F8432' : '#b91c1c' }}>
                {approve ? 'Approve' : 'Reject'} {noteDialog.op.recorder_name || noteDialog.op.harvesting_clerk_id}'s record
              </h3>
              <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px' }}>
                {noteDialog.op.plot_id} · {fmtDate(noteDialog.op.created_at)} · {noteDialog.op.total_count != null ? bunchCount(noteDialog.op.ai_count, noteDialog.op.total_count).main : noteDialog.op.weight_kg} {noteDialog.op.total_count != null ? 'bunches' : 'kg'}
              </div>
              {needsCount && (
                <div className="count-choice" role="radiogroup" aria-label="Which count is right" style={{ marginTop: '14px' }}>
                  <div className="review-field-label" style={{ marginBottom: '6px' }}>Which count is right? (required)</div>
                  <div style={{ fontSize: '12px', color: RECON_STATUS.DISCREPANCY.dark, fontWeight: 500, marginBottom: '8px' }}>{countFlag(nop.ai_count, nop.total_count)}</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[['typed', `Accept typed (${Number(nop.total_count) || 0})`], ['ai', `Keep AI (${Number(nop.ai_count) || 0})`]].map(([v, label]) => (
                      <button key={v} type="button" role="radio" aria-checked={noteDialog.countChoice === v}
                        className={`btn ${noteDialog.countChoice === v ? 'btn--primary' : 'btn--outline'}`}
                        style={{ fontWeight: 500 }}
                        onClick={() => setNoteDialog(d => ({ ...d, countChoice: v }))}>{label}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#0f172a', marginTop: '6px' }}>The count you accept is paid in Approved Workers.</div>
                </div>
              )}
              <label htmlFor="note-dialog-text" className="review-field-label" style={{ display: 'block', marginTop: '14px' }}>Verification note (required)</label>
              <textarea
                id="note-dialog-text"
                autoFocus
                rows={3}
                className="note-dialog__input"
                placeholder="What did you check? (photo, count, plot, loader record...)"
                value={noteDialog.text}
                onChange={(e) => setNoteDialog(d => ({ ...d, text: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') close();
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
                }}
              />
              {!noteDialog.text.trim() && <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '4px' }}>Write what you checked to {approve ? 'approve' : 'reject'} this record.</div>}
              {needsCount && !noteDialog.countChoice && <div style={{ fontSize: '11.5px', color: '#b45309', marginTop: '4px' }}>Choose the typed or the AI count to approve.</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                <button className="btn btn--ghost" onClick={close}>Cancel</button>
                <button
                  className="btn"
                  disabled={!ok}
                  onClick={save}
                  style={{ background: approve ? '#3F8432' : '#ef4444', borderColor: approve ? '#3F8432' : '#ef4444', color: 'white', fontWeight: 500, opacity: ok ? 1 : 0.5 }}
                >
                  {approve ? <CheckCircle size={14} /> : <X size={14} />} {approve ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Audit Lightbox */}
      {lightbox && (
        <div
          className="audit-lightbox"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => { setLightbox(null); setLightboxCompare(false); }}
        >
          <div style={{ position: 'absolute', top: '30px', right: '30px', zIndex: 10001 }}>
            <button
              style={{
                background: 'white', color: '#be123c', border: 'none', borderRadius: '50%',
                width: '50px', height: '50px', fontSize: '24px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
              onClick={() => { setLightbox(null); setLightboxCompare(false); }}
            >
              ×
            </button>
          </div>

          {!lightboxCompare ? (lightbox.url && (
            <img
              src={lightbox.url}
              alt={lightbox.title}
              style={{
                maxWidth: '85%', maxHeight: '85%', objectFit: 'contain',
                border: '4px solid white', borderRadius: '8px',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: `rotate(${rotation}deg)`
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )) : (
            <div style={{ display: 'flex', gap: '30px', width: '90%', height: '80%', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
              {/* Left Column: Harvester Image */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
                <div style={{ color: 'white', marginBottom: '10px', fontSize: '16px', fontWeight: 500, background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '20px', border: '1px solid #334155' }}>
                  Harvester Evidence{lightbox.type === 'loader' && lightbox.harvesterName ? ` · ${lightbox.harvesterName}` : ''}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%' }}>
                  {(lightbox.harvesterUrl || lightbox.url) && <img
                    src={lightbox.harvesterUrl || lightbox.url}
                    alt="Harvester"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      border: '4px solid white',
                      borderRadius: '8px',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: `rotate(${rotation}deg)`
                    }}
                  />}
                </div>
              </div>

              {/* Right Column: Loader Image */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
                <div style={{ color: 'white', marginBottom: '10px', fontSize: '16px', fontWeight: 500, background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: '20px', border: '1px solid #334155', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span>Loading Role Photos</span>
                  {lightbox.loaderUrls && lightbox.loaderUrls.length > 1 && (
                    <select
                      value={selectedLoaderImageIdx}
                      onChange={(e) => setSelectedLoaderImageIdx(parseInt(e.target.value, 10))}
                      style={{ background: '#1e293b', color: 'white', border: '1px solid #475569', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 500 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lightbox.loaderUrls.map((_, idx) => (
                        <option key={idx} value={idx}>Photo {idx + 1}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100%' }}>
                  {lightbox.loaderUrls?.[selectedLoaderImageIdx] && <img
                    src={lightbox.loaderUrls[selectedLoaderImageIdx]}
                    alt="Loading Role photo"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      border: '4px solid white',
                      borderRadius: '8px',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: `rotate(${rotation}deg)`
                    }}
                  />}
                </div>
              </div>
            </div>
          )}

          <div style={{
            position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '15px', alignItems: 'center', zIndex: 10001
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              background: 'white', padding: '10px 24px', borderRadius: '99px', fontSize: '15px', fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              {lightbox.title}
            </div>

            {(lightbox.type === 'loader' ? Boolean(lightbox.harvesterUrl) : (lightbox.loaderUrls && lightbox.loaderUrls.length > 0)) && (
              <button
                style={{
                  background: lightboxCompare ? '#ef4444' : '#1d4ed8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '99px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
                onClick={(e) => { e.stopPropagation(); setLightboxCompare(!lightboxCompare); }}
              >
                {lightboxCompare ? 'Single View' : (lightbox.type === 'loader' ? 'Compare with Harvester' : 'Compare with Loading Role')}
              </button>
            )}

            <button
              style={{
                background: 'white', color: 'black', border: 'none', borderRadius: '99px',
                padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => { e.stopPropagation(); setRotation(0); }}
            >
              RESET
            </button>
            <button
              style={{
                background: '#3F8432', color: 'white', border: 'none', borderRadius: '99px',
                padding: '10px 20px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
              onClick={(e) => { e.stopPropagation(); setRotation(r => (r + 90) % 360); }}
            >
              <RotateCcw size={18} /> ROTATE 90°
            </button>
          </div>
        </div>
      )}
      </div>

      <ExportColumnsModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        columns={viewMode === 'individual' ? APPROVAL_INDIVIDUAL_COLS : RECONCILIATION_EXPORT_COLS}
        onExport={handleConfirmExport}
        isViewer={isViewer}
      />
    </div>
  );
}
