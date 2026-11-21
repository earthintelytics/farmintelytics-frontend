import { fmtDateTime } from '../utils/formatters';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePageScroll } from '../hooks/usePageScroll';
import {
  Terminal, Bell, Send, Download, Trash2, RefreshCw,
  AlertTriangle, AlertCircle, CheckCircle2, XCircle, Info,
  Search, Filter, Plus, Clock, Copy, Check, Eye, X,
  ShieldCheck, ShieldAlert, Zap, Server, ChevronLeft, ChevronRight,
  ExternalLink, Mail, UserPlus, Power, Play, Pause, FileText
} from 'lucide-react';
import { API } from '../services/api';
import { ConfirmModal } from './CustomToast';

export function AdminLogsAndAlerts({ section }) {
  // Custom Confirm Modal State
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isDanger: false
  });
  const closeConfirmModal = () => setConfirmModalState(prev => ({ ...prev, isOpen: false }));

  // Subtab navigation within Logs & Alerts ('logs' | 'recipients' | 'history')
  const [subTabState, setActiveSubTab] = useState('logs');
  // When the admin sidebar picks a section ('logs' | 'recipients' | 'history'), that section is shown and the inner tab bar is hidden.
  const activeSubTab = section || subTabState;

  // --- System Logs State ---
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [page, setPage] = useState(1);
  const topRef = usePageScroll(page);
  const [pageSize, setPageSize] = useState(50);
  const [totalLogs, setTotalLogs] = useState(0);
  const [metrics, setMetrics] = useState({
    total: 0,
    error_count: 0,
    critical_count: 0,
    warning_count: 0,
    info_count: 0
  });

  // Filter states
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0); // 0 = off, 5, 10, 30
  const [selectedLogForModal, setSelectedLogForModal] = useState(null);
  const [copiedLogId, setCopiedLogId] = useState(null);

  // Clear modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearDays, setClearDays] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState('');

  // --- Alert Recipients State ---
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [showAddRecipientModal, setShowAddRecipientModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    email: '',
    name: '',
    is_active: true,
    notify_errors: true,
    notify_critical: true,
    notify_warnings: false,
    notify_security: true
  });
  const [addRecipientLoading, setAddRecipientLoading] = useState(false);
  const [addRecipientError, setAddRecipientError] = useState('');

  // --- Test Alert State ---
  const [testEmail, setTestEmail] = useState('');
  const [testLevel, setTestLevel] = useState('ERROR');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // --- SMTP Edit State ---
  const [smtpSaveMsg, setSmtpSaveMsg] = useState('');
  const [smtpForm, setSmtpForm] = useState({ host: '', port: 587, user: '', password: '', from_email: '' });

  // --- Alert History State ---
  const [alertHistory, setAlertHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
  const [confirmHistoryDelete, setConfirmHistoryDelete] = useState(false);
  const [historyDeleting, setHistoryDeleting] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch System Logs
  const fetchLogs = useCallback(async (isBackground = false) => {
    if (!isBackground) setLogsLoading(true);
    setLogsError('');
    try {
      const params = {
        page,
        size: pageSize,
        level: levelFilter !== 'ALL' ? levelFilter : undefined,
        search: debouncedSearch.trim() || undefined
      };
      const res = await API.fetchSystemLogs(params);
      setLogs(res.items || []);
      setTotalLogs(res.total || 0);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      setLogsError(err.message || 'Failed to fetch system logs.');
    } finally {
      if (!isBackground) setLogsLoading(false);
    }
  }, [page, pageSize, levelFilter, debouncedSearch]);

  useEffect(() => {
    if (activeSubTab === 'logs') {
      fetchLogs();
    }
  }, [fetchLogs, activeSubTab]);

  // Auto-refresh interval effect
  useEffect(() => {
    if (activeSubTab !== 'logs' || autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [activeSubTab, autoRefreshInterval, fetchLogs]);

  // Fetch Alert Recipients & SMTP Status
  const fetchRecipientsAndStatus = useCallback(async () => {
    setRecipientsLoading(true);
    try {
      const [recs, status] = await Promise.all([
        API.fetchAlertRecipients(),
        API.fetchAlertStatus()
      ]);
      setRecipients(recs || []);
      setSmtpStatus(status || null);
      // Fill the boxes with what is saved (empty when nothing is), so Save sends what the boxes show.
      if (status) {
        setSmtpForm(prev => ({
          ...prev,
          host: status.host && status.host !== 'Not configured' ? status.host : '',
          port: status.port || 587,
          user: status.smtp_user || '',
          from_email: status.configured ? (status.from_email || '') : '',
        }));
      }
    } catch (err) {
      console.error('Failed to load alert recipients:', err);
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  // Fetch Alert History
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await API.fetchAlertHistory({ page: historyPage, size: 25 });
      setAlertHistory(res.items || []);
      setHistoryTotal(res.total || 0);
      setSelectedHistoryIds([]);
      setConfirmHistoryDelete(false);
    } catch (err) {
      console.error('Failed to fetch alert history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    if (activeSubTab === 'recipients') {
      fetchRecipientsAndStatus();
    } else if (activeSubTab === 'history') {
      fetchHistory();
    }
  }, [activeSubTab, fetchRecipientsAndStatus, fetchHistory]);

  const toggleHistorySelected = (id) => {
    setConfirmHistoryDelete(false);
    setSelectedHistoryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // First click arms the button, second click deletes.
  const handleDeleteSelectedHistory = async () => {
    if (!selectedHistoryIds.length) return;
    if (!confirmHistoryDelete) {
      setConfirmHistoryDelete(true);
      return;
    }
    setHistoryDeleting(true);
    try {
      await API.deleteAlertHistory(selectedHistoryIds);
      await fetchHistory();
    } catch (err) {
      console.error('Failed to delete alert history:', err);
    } finally {
      setHistoryDeleting(false);
      setConfirmHistoryDelete(false);
    }
  };

  // Add Recipient Handler
  const handleAddRecipient = async (e) => {
    e.preventDefault();
    if (!newRecipient.email || !newRecipient.email.includes('@')) {
      setAddRecipientError('Please provide a valid email address.');
      return;
    }
    setAddRecipientLoading(true);
    setAddRecipientError('');
    try {
      await API.createAlertRecipient(newRecipient);
      setShowAddRecipientModal(false);
      setNewRecipient({
        email: '',
        name: '',
        is_active: true,
        notify_errors: true,
        notify_critical: true,
        notify_warnings: false,
        notify_security: true
      });
      fetchRecipientsAndStatus();
    } catch (err) {
      setAddRecipientError(err.message || 'Failed to add alert recipient.');
    } finally {
      setAddRecipientLoading(false);
    }
  };

  // Toggle Recipient Active
  const handleToggleRecipient = async (recipient) => {
    try {
      await API.updateAlertRecipient(recipient.id, { is_active: !recipient.is_active });
      fetchRecipientsAndStatus();
    } catch (err) {
      setAddRecipientError('Failed to update recipient: ' + err.message);
    }
  };

  // Delete Recipient
  const handleDeleteRecipient = (recipientId, email) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Remove Alert Recipient',
      message: `Are you sure you want to remove '${email}' from alert recipients?`,
      isDanger: true,
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await API.deleteAlertRecipient(recipientId);
          fetchRecipientsAndStatus();
        } catch (err) {
          setAddRecipientError('Failed to delete recipient: ' + err.message);
        }
      }
    });
  };

  // Send Test Alert
  const handleSendTestAlert = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await API.sendTestAlert({
        recipient_email: testEmail.trim() || undefined,
        level: testLevel
      });
      setTestResult({
        success: res.success,
        message: res.message || 'Test alert processed.'
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to dispatch test alert.'
      });
    } finally {
      setTestLoading(false);
    }
  };

  // Clear Logs Handler
  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const res = await API.clearSystemLogs(clearDays === 0 ? null : clearDays, clearDays === 0);
      const n = res?.deleted ?? 0;
      setClearSuccessMsg(
        n > 0
          ? `${n} log${n === 1 ? '' : 's'} deleted.`
          : clearDays === 0 ? 'There were no logs to delete.' : 'No logs were older than the selected range, so nothing was deleted.'
      );
      setTimeout(() => {
        setShowClearModal(false);
        setClearSuccessMsg('');
        fetchLogs();
      }, 1500);
    } catch (err) {
      setClearSuccessMsg('Failed to clear logs: ' + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  // Copy log entry
  const handleCopyLog = (log) => {
    const textToCopy = `[${log.timestamp}] ${log.level} in ${log.module || 'app'}:${log.line_number || '0'}\n${log.message}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // Export CSV download
  const handleExportCSV = () => {
    const url = API.getExportLogsUrl({
      level: levelFilter !== 'ALL' ? levelFilter : undefined,
      search: debouncedSearch.trim() || undefined
    });
    window.open(url, '_blank');
  };

  const totalPages = Math.ceil(totalLogs / pageSize) || 1;
  const historyTotalPages = Math.ceil(historyTotal / 25) || 1;

  return (
    <div ref={topRef} className="view-fade-in" style={{ width: '100%' }}>

      {/* Subtab navigation header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {!section ? (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          background: '#FFFFFF',
          padding: '4px',
          borderRadius: '10px',
          border: '2px solid #E2E8F0',
          gap: '6px'
        }}>
          <button
            onClick={() => setActiveSubTab('logs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeSubTab === 'logs' ? 'var(--clr-brand-primary, #034321)' : 'transparent',
              color: activeSubTab === 'logs' ? '#FFFFFF' : '#0F172A',
              transition: 'all 0.15s ease'
            }}
          >
            <Terminal size={16} />
            <span>System Logs Viewer</span>
            {(metrics.error_count + metrics.critical_count) > 0 && (
              <span style={{
                background: activeSubTab === 'logs' ? '#DC2626' : '#FEE2E2',
                color: activeSubTab === 'logs' ? '#FFFFFF' : '#DC2626',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 900
              }}>
                {metrics.error_count + metrics.critical_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('recipients')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeSubTab === 'recipients' ? 'var(--clr-brand-primary, #034321)' : 'transparent',
              color: activeSubTab === 'recipients' ? '#FFFFFF' : '#0F172A',
              transition: 'all 0.15s ease'
            }}
          >
            <Bell size={16} />
            <span>Email Alerting & Recipients</span>
            <span style={{
              background: activeSubTab === 'recipients' ? '#FFFFFF' : '#E2E8F0',
              color: activeSubTab === 'recipients' ? '#034321' : '#0F172A',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 900
            }}>
              {recipients.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: activeSubTab === 'history' ? 'var(--clr-brand-primary, #034321)' : 'transparent',
              color: activeSubTab === 'history' ? '#FFFFFF' : '#0F172A',
              transition: 'all 0.15s ease'
            }}
          >
            <Clock size={16} />
            <span>Alert Dispatch History</span>
          </button>
        </div>
        ) : <div />}

        {/* Quick action buttons on right */}
        {activeSubTab === 'logs' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleExportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#F1F5F9',
                border: 'none',
                color: '#0F172A',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer'
              }}
              title="Download filtered logs"
            >
              <Download size={15} />
              <span>Export Logs</span>
            </button>

            <button
              onClick={() => setShowClearModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#DC2626',
                border: '2px solid #DC2626',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer'
              }}
              title="Purge or clear old logs"
            >
              <Trash2 size={15} />
              <span>Clear Logs</span>
            </button>
          </div>
        )}

        {activeSubTab === 'recipients' && (
          <button
            onClick={() => setShowAddRecipientModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              borderRadius: '8px',
              background: 'var(--clr-brand-primary, #034321)',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(3, 67, 33, 0.25)'
            }}
          >
            <UserPlus size={16} />
            <span>Add Alert Recipient</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: LIVE SYSTEM LOGS VIEWER                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'logs' && (
        <div>
          {/* KPI Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
            marginBottom: '20px',
            width: '100%'
          }}>
            {/* KPI 1: Total Logs */}
            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '2px solid #E2E8F0', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'transparent', color: '#034321', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Terminal size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#000000', lineHeight: 1 }}>{metrics.total}</div>
                  <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total System Logs
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 2: Errors & Criticals */}
            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '2px solid #FCA5A5', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'transparent', color: '#DC2626', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#DC2626', lineHeight: 1 }}>
                    {metrics.error_count + metrics.critical_count}
                  </div>
                  <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Errors & Criticals
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 3: Warnings */}
            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '2px solid #FDE68A', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'transparent', color: '#D97706', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#D97706', lineHeight: 1 }}>{metrics.warning_count}</div>
                  <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    System Warnings
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 4: Operational / Info */}
            <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '10px', border: '2px solid #E2E8F0', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: 'transparent', color: '#034321', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#034321', lineHeight: 1 }}>{metrics.info_count}</div>
                  <div style={{ fontSize: '11px', color: '#14532D', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    INFO
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search, Level Filters & Live Auto-Refresh Toolbar */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #E2E8F0',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: 'var(--shadow-panel)'
          }}>
            {/* Search Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px', minWidth: '240px' }}>
              <div style={{
                position: 'relative',
                width: '100%',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: '#0f172a' }} />
                <input
                  type="text"
                  placeholder="Search logs by message, module, or logger..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 36px 9px 36px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8'
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Level Selector Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginRight: '4px' }}>Level:</span>
              {['ALL', 'ERROR', 'CRITICAL', 'WARNING', 'INFO'].map((lvl) => {
                const isActive = levelFilter === lvl;
                let activeBg = '#034321';
                if (lvl === 'ERROR' || lvl === 'CRITICAL') activeBg = '#DC2626';
                if (lvl === 'WARNING') activeBg = '#D97706';
                if (lvl === 'INFO') activeBg = '#034321';

                return (
                  <button
                    key={lvl}
                    onClick={() => { setLevelFilter(lvl); setPage(1); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: isActive ? `1.5px solid ${activeBg}` : '1.5px solid #E2E8F0',
                      background: isActive ? activeBg : '#FFFFFF',
                      color: isActive ? '#FFFFFF' : '#0F172A',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>

            {/* Auto-refresh Controls & Manual Refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} style={{ color: '#0f172a' }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Auto-refresh:</span>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: autoRefreshInterval > 0 ? '#E8F2E5' : '#FFFFFF',
                    color: autoRefreshInterval > 0 ? '#034321' : '#0F172A',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0}>Off (Manual)</option>
                  <option value={5}>Every 5s</option>
                  <option value={10}>Every 10s</option>
                  <option value={30}>Every 30s</option>
                </select>
              </div>

              <button
                onClick={() => fetchLogs()}
                disabled={logsLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: logsLoading ? 'not-allowed' : 'pointer',
                  color: '#0F172A'
                }}
              >
                <RefreshCw size={14} className={logsLoading ? 'sync-spinning' : ''} />
                <span>{logsLoading ? 'Refreshing' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #E2E8F0',
            boxShadow: 'var(--shadow-panel)',
            overflow: 'hidden'
          }}>
            {logsError && (
              <div style={{ padding: '16px 20px', background: '#FEF2F2', color: '#DC2626', fontSize: '13px', fontWeight: 700, borderBottom: '1px solid #FECACA' }}>
                {logsError}
              </div>
            )}

            <div style={{ overflowX: 'auto', maxHeight: '600px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 10, borderBottom: '2px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', width: '100px' }}>LEVEL</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', width: '170px' }}>TIMESTAMP (UTC)</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', width: '180px' }}>MODULE</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a' }}>MESSAGE</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', width: '120px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: '#0f172a' }}>
                        {logsLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 700 }}>
                            <RefreshCw size={18} className="sync-spinning" /> Loading system logs
                          </div>
                        ) : (
                          <div>
                            <CheckCircle2 size={32} style={{ color: '#3F8432', margin: '0 auto 10px auto' }} />
                            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '15px' }}>No log entries found</div>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your search query or level filters.</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => {
                      const lvl = (log.level || 'INFO').toUpperCase();
                      let badgeColor = '#034321';
                      let badgeBorder = '#86EFAC';
                      if (lvl === 'ERROR' || lvl === 'CRITICAL') {
                        badgeColor = '#DC2626';
                        badgeBorder = '#FECACA';
                      } else if (lvl === 'WARNING' || lvl === 'WARN') {
                        badgeColor = '#D97706';
                        badgeBorder = '#FDE68A';
                      }

                      const formattedTime = fmtDateTime(log.timestamp, { seconds: true });

                      return (
                        <tr
                          key={log.id || idx}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Level Badge */}
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 900,
                              background: 'transparent',
                              color: badgeColor,
                              border: `1px solid ${badgeBorder}`
                            }}>
                              {lvl}
                            </span>
                          </td>

                          {/* Timestamp */}
                          <td style={{ padding: '12px 16px', color: '#0f172a', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {formattedTime}
                          </td>

                          {/* Module */}
                          <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 700, fontSize: '12px' }}>
                            <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                              {log.module || log.logger_name || 'app'}
                              {log.line_number ? `:${log.line_number}` : ''}
                            </span>
                          </td>

                          {/* Message */}
                          <td style={{ padding: '12px 16px', color: '#0F172A', fontWeight: 500 }}>
                            <div style={{
                              maxWidth: '650px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily: 'Consolas, monospace',
                              fontSize: '12px',
                              color: lvl === 'ERROR' || lvl === 'CRITICAL' ? '#991B1B' : '#0F172A'
                            }}>
                              {log.message}
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                onClick={() => setSelectedLogForModal(log)}
                                style={{
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#0F172A',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="View full message & stack trace"
                              >
                                <Eye size={12} />
                                <span>Details</span>
                              </button>

                              <button
                                onClick={() => handleCopyLog(log)}
                                style={{
                                  background: copiedLogId === log.id ? '#E8F2E5' : '#F8FAFC',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: copiedLogId === log.id ? '#034321' : '#64748B'
                                }}
                                title="Copy log entry to clipboard"
                              >
                                {copiedLogId === log.id ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: '2px solid #E2E8F0',
              background: '#F8FAFC',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                Showing <strong>{logs.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(page * pageSize, totalLogs)}</strong> of <strong>{totalLogs}</strong> logs
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>Page size:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '12px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1.5px solid #CBD5E1',
                      background: page <= 1 ? '#F1F5F9' : '#FFFFFF',
                      cursor: page <= 1 ? 'not-allowed' : 'pointer',
                      color: page <= 1 ? '#94A3B8' : '#0F172A',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', padding: '0 6px' }}>
                    {page} / {totalPages}
                  </span>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      border: '1.5px solid #CBD5E1',
                      background: page >= totalPages ? '#F1F5F9' : '#FFFFFF',
                      cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                      color: page >= totalPages ? '#94A3B8' : '#0F172A',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: EMAIL ALERTING & RECIPIENTS                                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'recipients' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Column 1: SMTP Health & Instant Test Alert */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* SMTP Status Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Server size={20} style={{ color: '#034321' }} />
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#000000' }}>SMTP Engine Status</span>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 900,
                  background: 'transparent',
                  color: smtpStatus?.configured ? '#034321' : '#475569'
                }}>
                  {smtpStatus?.configured ? 'Active' : 'Standby'}
                </span>
              </div>

              {smtpSaveMsg && (
                <div style={{ padding: '8px 0', background: 'transparent', border: 'none', borderRadius: '6px', color: '#034321', fontSize: '12px', fontWeight: 800, marginBottom: '12px' }}>
                  {smtpSaveMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>SMTP Host</label>
                  <input
                    type="text"
                    placeholder="e.g. smtp.gmail.com"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, host: e.target.value }))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontWeight: 800, fontSize: '13px', color: '#000000' }}
                  />
                </div>
                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Port</label>
                  <input
                    type="number"
                    placeholder="587"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, port: Number(e.target.value) }))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontWeight: 800, fontSize: '13px', color: '#000000' }}
                  />
                </div>
                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <label style={{ color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>SMTP Username / Email</label>
                  <input
                    type="text"
                    placeholder="alerts@ffb.com"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm(prev => ({ ...prev, user: e.target.value, from_email: prev.from_email || e.target.value }))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontWeight: 800, fontSize: '13px', color: '#000000' }}
                  />
                </div>
                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', position: 'relative' }}>
                  <label style={{ color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>App Password</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {/* Always masked; the saved password never reaches the browser. Blank = keep saved one. */}
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={smtpStatus?.password_set ? '•••••••• saved (leave blank to keep)' : 'App Password'}
                      value={smtpForm.password}
                      onChange={(e) => setSmtpForm(prev => ({ ...prev, password: e.target.value }))}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontWeight: 800, fontSize: '13px', color: '#000000' }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await API.updateSmtpConfig(smtpForm);
                    setSmtpForm(prev => ({ ...prev, password: '' }));
                    setSmtpSaveMsg('✓ SMTP credentials saved successfully!');
                    fetchRecipientsAndStatus();
                    setTimeout(() => setSmtpSaveMsg(''), 3000);
                  } catch (e) {
                    setSmtpSaveMsg('Failed to save SMTP: ' + e.message);
                  }
                }}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '9px',
                  background: '#034321',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Save SMTP Credentials
              </button>
            </div>

            {/* Test Alert Dispatcher Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '2px solid #E2E8F0',
              padding: '20px',
              boxShadow: 'var(--shadow-panel)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Send size={18} style={{ color: '#034321' }} />
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#000000' }}>Dispatch Instant Test Alert</span>
              </div>
              <div style={{ fontSize: '12px', color: '#0f172a', marginBottom: '16px', lineHeight: 1.4 }}>
                Send a sample alert notification to verify your SMTP pipeline and email rendering.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                    Target Email (Optional — defaults to active recipients)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. admin@ffb.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                    Severity Level
                  </label>
                  <select
                    value={testLevel}
                    onChange={(e) => setTestLevel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none',
                      background: '#FFFFFF'
                    }}
                  >
                    <option value="ERROR">ERROR (High Priority)</option>
                    <option value="CRITICAL">CRITICAL (System Outage)</option>
                    <option value="WARNING">WARNING (Operational)</option>
                    <option value="SECURITY">SECURITY (Auth Incident)</option>
                  </select>
                </div>

                <button
                  onClick={handleSendTestAlert}
                  disabled={testLoading}
                  style={{
                    marginTop: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: 'var(--clr-brand-primary, #034321)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: testLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {testLoading ? <RefreshCw size={15} className="sync-spinning" /> : <Send size={15} />}
                  <span>{testLoading ? 'Dispatching Test Email...' : 'Send Test Notification'}</span>
                </button>

                {testResult && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: testResult.success ? '#E8F2E5' : '#FEF2F2',
                    color: testResult.success ? '#034321' : '#DC2626',
                    border: `1px solid ${testResult.success ? '#BBF7D0' : '#FECACA'}`
                  }}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Column 2: Registered Alert Recipients List */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '2px solid #E2E8F0',
            padding: '20px',
            boxShadow: 'var(--shadow-panel)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={20} style={{ color: '#034321' }} />
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 900, color: '#000000' }}>Registered Alert Recipients</span>
                  <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>Emails configured to receive automatic system alerts</div>
                </div>
              </div>
              <span style={{
                background: '#F1F5F9',
                padding: '4px 10px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 900,
                color: '#0F172A'
              }}>
                {recipients.length} Recipient(s)
              </span>
            </div>

            {recipientsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>
                <RefreshCw size={20} className="sync-spinning" style={{ margin: '0 auto 8px auto' }} />
                Loading recipients...
              </div>
            ) : recipients.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#0f172a', border: '1.5px dashed #CBD5E1', borderRadius: '8px' }}>
                <Mail size={32} style={{ color: '#94A3B8', margin: '0 auto 10px auto' }} />
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '14px' }}>No alert recipients registered yet</div>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#0f172a' }}>Add emails using the button above to start receiving alerts.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {recipients.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1.5px solid #E2E8F0',
                      background: rec.is_active ? '#FFFFFF' : '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: rec.is_active ? '#0F172A' : '#64748B' }}>
                          {rec.email}
                        </span>
                        {rec.name && (
                          <span style={{ fontSize: '11px', color: '#0f172a', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            {rec.name}
                          </span>
                        )}
                      </div>

                      {/* Rule tags */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {rec.notify_errors && <span style={{ fontSize: '10px', fontWeight: 900, background: '#FEF2F2', color: '#DC2626', padding: '1px 5px', borderRadius: '3px' }}>ERROR</span>}
                        {rec.notify_critical && <span style={{ fontSize: '10px', fontWeight: 900, background: '#FEF2F2', color: '#991B1B', padding: '1px 5px', borderRadius: '3px' }}>CRITICAL</span>}
                        {rec.notify_security && <span style={{ fontSize: '10px', fontWeight: 900, background: '#F5F3FF', color: '#7C3AED', padding: '1px 5px', borderRadius: '3px' }}>SECURITY</span>}
                        {rec.notify_warnings && <span style={{ fontSize: '10px', fontWeight: 900, background: '#FFFBEB', color: '#D97706', padding: '1px 5px', borderRadius: '3px' }}>WARN</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Active toggle button */}
                      <button
                        onClick={() => handleToggleRecipient(rec)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          border: rec.is_active ? '1px solid #BBF7D0' : '1px solid #CBD5E1',
                          background: rec.is_active ? '#E8F2E5' : '#F1F5F9',
                          color: rec.is_active ? '#034321' : '#64748B',
                          cursor: 'pointer'
                        }}
                      >
                        {rec.is_active ? 'Active' : 'Paused'}
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteRecipient(rec.id, rec.email)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          border: '1px solid #FECACA',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          cursor: 'pointer'
                        }}
                        title="Delete alert recipient"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: ALERT DISPATCH HISTORY                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '10px',
          border: '2px solid #E2E8F0',
          boxShadow: 'var(--shadow-panel)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '2px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#000000' }}>Alert Notifications Dispatch Audit Trail</div>
              <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>History of all automated and manual alerts triggered by the engine</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleDeleteSelectedHistory}
              disabled={!selectedHistoryIds.length || historyDeleting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                background: confirmHistoryDelete ? '#DC2626' : '#FFFFFF',
                border: '1.5px solid #FCA5A5',
                fontSize: '12px',
                fontWeight: 800,
                cursor: !selectedHistoryIds.length || historyDeleting ? 'not-allowed' : 'pointer',
                color: confirmHistoryDelete ? '#FFFFFF' : '#DC2626',
                opacity: !selectedHistoryIds.length ? 0.5 : 1
              }}
            >
              <Trash2 size={14} />
              <span>
                {historyDeleting
                  ? 'Deleting...'
                  : confirmHistoryDelete
                    ? `Confirm delete (${selectedHistoryIds.length})`
                    : `Delete selected (${selectedHistoryIds.length})`}
              </span>
            </button>
            <button
              onClick={() => fetchHistory()}
              disabled={historyLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                background: '#F1F5F9',
                border: '1.5px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 800,
                cursor: historyLoading ? 'not-allowed' : 'pointer',
                color: '#0F172A'
              }}
            >
              <RefreshCw size={14} className={historyLoading ? 'sync-spinning' : ''} />
              <span>Refresh History</span>
            </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 10, borderBottom: '2px solid #E2E8F0' }}>
                <tr>
                  <th style={{ padding: '12px 16px', width: '36px' }}>
                    <input
                      type="checkbox"
                      aria-label="Select all alerts on this page"
                      checked={alertHistory.length > 0 && alertHistory.every(a => selectedHistoryIds.includes(a.id))}
                      onChange={(e) => {
                        setConfirmHistoryDelete(false);
                        setSelectedHistoryIds(e.target.checked ? alertHistory.map(a => a.id) : []);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', width: '160px' }}>TIMESTAMP (UTC)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', width: '90px' }}>LEVEL</th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', width: '200px' }}>RECIPIENT</th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a' }}>SUBJECT / MESSAGE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 900, color: '#0f172a', width: '110px' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {alertHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: '#0f172a' }}>
                      {historyLoading ? 'Loading alert history...' : 'No alert notifications recorded yet.'}
                    </td>
                  </tr>
                ) : (
                  alertHistory.map((item, idx) => {
                    const statusUpper = (item.status || 'SENT').toUpperCase();
                    let statusColor = '#034321';
                    if (statusUpper === 'FAILED') {
                      statusColor = '#DC2626';
                    } else if (statusUpper === 'THROTTLED') {
                      statusColor = '#D97706';
                    }

                    const formattedTime = fmtDateTime(item.timestamp, { seconds: true });

                    return (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="checkbox"
                            aria-label="Select alert"
                            checked={selectedHistoryIds.includes(item.id)}
                            onChange={() => toggleHistorySelected(item.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', color: '#0f172a', fontSize: '12px', fontWeight: 600 }}>
                          {formattedTime}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: '#0F172A' }}>
                            {item.level}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A', fontSize: '12px' }}>
                          {item.recipient_email}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{item.subject}</div>
                          <div style={{ color: '#0f172a', fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>{item.message?.substring(0, 100)}...</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 900,
                            background: 'transparent',
                            color: statusColor,
                            border: `1px solid ${statusColor}`
                          }}>
                            {statusUpper}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* History Pagination */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '2px solid #E2E8F0',
            background: '#F8FAFC'
          }}>
            <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600 }}>
              Total Alerts Logged: <strong>{historyTotal}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  cursor: historyPage <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 800 }}>{historyPage} / {historyTotalPages}</span>
              <button
                onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                disabled={historyPage >= historyTotalPages}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  cursor: historyPage >= historyTotalPages ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FULL LOG DETAIL & STACK TRACE VIEWER                             */}
      {/* ========================================================================= */}
      {selectedLogForModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '2px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Terminal size={20} style={{ color: '#034321' }} />
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                  Log Record Details (ID #{selectedLogForModal.id})
                </span>
              </div>
              <button
                onClick={() => setSelectedLogForModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Metadata strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>Severity Level</div>
                  <div style={{ color: selectedLogForModal.level === 'ERROR' ? '#DC2626' : '#0F172A', fontWeight: 900, fontSize: '14px', marginTop: '2px' }}>
                    {selectedLogForModal.level}
                  </div>
                </div>
                <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>Timestamp (UTC)</div>
                  <div style={{ color: '#0F172A', fontWeight: 800, marginTop: '2px' }}>
                    {selectedLogForModal.timestamp}
                  </div>
                </div>
                <div style={{ background: '#F1F5F9', padding: '10px', borderRadius: '6px' }}>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>Module Source</div>
                  <div style={{ color: '#0F172A', fontWeight: 800, marginTop: '2px', fontFamily: 'monospace' }}>
                    {selectedLogForModal.module || selectedLogForModal.logger_name || 'app'}:{selectedLogForModal.line_number || '0'}
                  </div>
                </div>
              </div>

              {/* Formatted Message */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Log Message / Output:
                </div>
                <pre style={{
                  background: '#FFFFFF',
                  color: '#0F172A',
                  padding: '16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  overflowX: 'auto',
                  fontFamily: 'Consolas, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  border: '1px solid #E2E8F0'
                }}>
                  {selectedLogForModal.message}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 22px',
              borderTop: '2px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC'
            }}>
              <button
                onClick={() => handleCopyLog(selectedLogForModal)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  color: '#0F172A',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {copiedLogId === selectedLogForModal.id ? <Check size={14} style={{ color: '#3F8432' }} /> : <Copy size={14} />}
                <span>{copiedLogId === selectedLogForModal.id ? 'Copied to Clipboard!' : 'Copy Log JSON'}</span>
              </button>

              <button
                onClick={() => setSelectedLogForModal(null)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  background: '#0F172A',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD ALERT RECIPIENT                                              */}
      {/* ========================================================================= */}
      {showAddRecipientModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <form onSubmit={handleAddRecipient}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '2px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserPlus size={18} style={{ color: '#034321' }} />
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>Register New Alert Recipient</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddRecipientModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {addRecipientError && (
                  <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>
                    {addRecipientError}
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'block' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. devops@ffb.com"
                    value={newRecipient.email}
                    onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '4px', display: 'block' }}>
                    Recipient Name / Role (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Samuel (Backend Lead)"
                    value={newRecipient.name}
                    onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Alert Notification Preferences
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newRecipient.notify_errors}
                        onChange={(e) => setNewRecipient({ ...newRecipient, notify_errors: e.target.checked })}
                      />
                      <span>Notify on <strong>ERROR</strong></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newRecipient.notify_critical}
                        onChange={(e) => setNewRecipient({ ...newRecipient, notify_critical: e.target.checked })}
                      />
                      <span>Notify on <strong>CRITICAL</strong></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newRecipient.notify_security}
                        onChange={(e) => setNewRecipient({ ...newRecipient, notify_security: e.target.checked })}
                      />
                      <span>Notify on <strong>SECURITY</strong></span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newRecipient.notify_warnings}
                        onChange={(e) => setNewRecipient({ ...newRecipient, notify_warnings: e.target.checked })}
                      />
                      <span>Notify on <strong>WARNINGS</strong></span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={{
                padding: '14px 20px',
                borderTop: '2px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                background: '#F8FAFC'
              }}>
                <button
                  type="button"
                  onClick={() => setShowAddRecipientModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addRecipientLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: 'var(--clr-brand-primary, #034321)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: addRecipientLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {addRecipientLoading ? 'Saving...' : 'Register Recipient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CLEAR LOGS CONFIRMATION                                          */}
      {/* ========================================================================= */}
      {showClearModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '2px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#FEF2F2'
            }}>
              <Trash2 size={18} style={{ color: '#DC2626' }} />
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#DC2626' }}>Clean & Purge System Logs</span>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {clearSuccessMsg ? (
                <div style={{ padding: '14px', background: 'transparent', color: '#034321', borderRadius: '6px', fontSize: '13px', fontWeight: 800, textAlign: 'center' }}>
                  ✓ {clearSuccessMsg}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '13px', color: '#0F172A', lineHeight: 1.5 }}>
                    Choose the retention range for clearing logs from PostgreSQL storage:
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                      Cleanup Policy
                    </label>
                    <select
                      value={clearDays}
                      onChange={(e) => setClearDays(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '13px',
                        fontWeight: 700,
                        outline: 'none',
                        background: '#FFFFFF'
                      }}
                    >
                      <option value={0}>Clear ALL system logs</option>
                      <option value={1}>Delete logs older than 24 hours</option>
                      <option value={3}>Delete logs older than 3 days</option>
                      <option value={7}>Delete logs older than 7 days</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {!clearSuccessMsg && (
              <div style={{
                padding: '14px 20px',
                borderTop: '2px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                background: '#F8FAFC'
              }}>
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={isClearing}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#DC2626',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: isClearing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isClearing ? 'Clearing...' : 'Confirm Delete'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Confirm Modal Container */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        isDanger={confirmModalState.isDanger}
        onConfirm={confirmModalState.onConfirm}
        onCancel={closeConfirmModal}
      />
    </div>
  );
}
export default AdminLogsAndAlerts;
