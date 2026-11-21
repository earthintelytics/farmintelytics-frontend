import { fmtDateTime } from '../utils/formatters';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from '../utils/portalRouter';
import { 
  Shield, UserPlus, Trash2, Mail, Lock, CheckCircle, XCircle, 
  Search, Edit2, LogOut, Key, AlertCircle, Loader2, UploadCloud, 
  RefreshCw, QrCode, Printer, Filter, Users, LayoutGrid, 
  List, ChevronLeft, ChevronRight, CheckCircle2, X,
  ArrowUpDown, ArrowUp, ArrowDown, Scissors, Truck, Boxes, ArrowRight,
  UserCheck, UserX, Power, Save, Check, Calendar, Copy, Sparkles, Eye, EyeOff,
  Terminal, FileSpreadsheet
} from 'lucide-react';
import MultiSelectFilter from '../components/MultiSelectFilter';
import { QRCodeSVG } from 'qrcode.react';
import { API } from '../services/api';
import { roleGroup, ROLE_GROUPS } from '../utils/roleGroups';
import WorkerBadgeModal, { isEligibleForBadge } from '../components/WorkerBadgeModal';
import { AdminLogsAndAlerts } from '../components/AdminLogsAndAlerts';
import { ToastContainer, ConfirmModal, NoticeModal } from '../components/CustomToast';
import { LOGO_ICON } from '../utils/icons';
import { copyText } from '../utils/access';
import ExcelCsvUploadModal from '../components/ExcelCsvUploadModal';
import { ClearDatabasePanel } from '../components/ClearDatabasePanel';
import { scrollPageTop } from '../utils/scroll';

// 14 chars from an unambiguous alphabet (no 0/O, 1/l/I), always mixing cases, digits and symbols.
function generateStrongPassword(length = 14) {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const rand = (n) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  };
  const chars = sets.map(set => set[rand(set.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function AdminView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Excel/CSV Dual Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadModalType, setUploadModalType] = useState('workers'); // 'workers' | 'clerks'

  // Custom Toast & Confirm Modal States
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    // Errors stay longer so the "View logs" action can be used.
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), type === 'error' ? 8000 : 4000);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    isDanger: false
  });
  const closeConfirmModal = () => setConfirmModalState(prev => ({ ...prev, isOpen: false }));

  // Subpage Navigation Tabs ('badges' | 'identities' | 'sync')
  const initialTab = searchParams.get('tab') || 'badges';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // View Mode for Worker Directory: 'table' vs 'grid'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Sorting State for Table Rows
  const [sortField, setSortField] = useState('employee_id');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Pagination State for Workers Table
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // User Management State
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userApiError, setUserApiError] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'View', estate: '', sendTo: '' });
  const [userSearch, setUserSearch] = useState('');

  // Employee CSV Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(
    localStorage.getItem('fi_ffb_last_employee_sync') || 'Never synchronized'
  );

  // Worker Directory State
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  // Multi-select filters: an empty list means "All".
  const [statusFilter, setStatusFilter] = useState([]); // 'Active' | 'Inactive'
  const [roleFilter, setRoleFilter] = useState([]);
  const [divisionFilter, setDivisionFilter] = useState([]);
  const [contractorFilter, setContractorFilter] = useState([]);
  const filtersActive = Boolean(employeeSearch.trim()) || statusFilter.length > 0 || roleFilter.length > 0
    || divisionFilter.length > 0 || contractorFilter.length > 0;
  const clearFilters = () => {
    setEmployeeSearch('');
    setStatusFilter([]);
    setRoleFilter([]);
    setDivisionFilter([]);
    setContractorFilter([]);
  };
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQrWorkers, setSelectedQrWorkers] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState(new Set());
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Status Dropdown Pending Changes state
  const [pendingStatus, setPendingStatus] = useState({}); // { [employee_id]: 'Active' | 'Inactive' }
  const [savingStatusId, setSavingStatusId] = useState(null);
  const [savedSuccessId, setSavedSuccessId] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(
    fmtDateTime(new Date())
  );
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Drag & Drop CSV Handlers
  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [resetErrorMsg, setResetErrorMsg] = useState('');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'FarmIntelytics#';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setCopiedPassword(false);
  };

  const handleOpenResetPassword = (user) => {
    setResetModalUser(user);
    setNewPassword('');
    setResetSuccessMsg('');
    setResetErrorMsg('');
    setCopiedPassword(false);
    setShowPasswordText(true);
    setShowResetPasswordModal(true);
    generateRandomPassword();
  };

  const handleResetPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.trim().length < 4) {
      setResetErrorMsg('Password must be at least 4 characters long.');
      return;
    }
    setResetLoading(true);
    setResetErrorMsg('');
    setResetSuccessMsg('');
    try {
      await API.resetUserPassword(resetModalUser.id, newPassword.trim());
      setResetSuccessMsg(`Password for ${resetModalUser.email} reset successfully.`);
      setTimeout(() => {
        setShowResetPasswordModal(false);
        setResetModalUser(null);
        setResetSuccessMsg('');
      }, 2000);
    } catch (err) {
      setResetErrorMsg(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!newPassword) return;
    const ok = await copyText(newPassword);
    if (ok) {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } else {
      showToast('Could not copy. Select the password and copy it by hand.', 'warning');
    }
  };

  const isSupportedFile = (filename) => {
    const lower = (filename || '').toLowerCase();
    return lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!isSupportedFile(file.name)) {
        setUploadError('Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError('');
      setUploadResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!isSupportedFile(file.name)) {
        setUploadError('Only CSV (.csv) and Excel (.xlsx, .xls) files are supported.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError('');
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');
    setUploadResult(null);

    try {
      const res = await API.uploadEmployeeCSV(selectedFile, (p) => setUploadProgress(p));
      setUploadResult(res);
      if (res.processed > 0) {
        const now = new Date();
        const formattedDate = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + ' ' +
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0') + ':' +
          String(now.getSeconds()).padStart(2, '0');
        
        localStorage.setItem('fi_ffb_last_employee_sync', formattedDate);
        setLastSyncTime(formattedDate);
        setSelectedFile(null);
        loadEmployees();
      }
    } catch (err) {
      setUploadError(err.message || 'Failed to upload CSV file.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Load employees from backend
  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const res = await API.fetchEmployees('ALL');
      setEmployees(res?.items || []);
      setLastRefreshTime(fmtDateTime(new Date()));
    } catch (err) {
      console.error('Failed to load employees for workforce directory', err);
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  // Live 30-second auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      loadEmployees();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefreshEnabled, loadEmployees]);

  // Load users from backend
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUserApiError('');
    try {
      const data = await API.fetchUsers();
      const filtered = (Array.isArray(data) ? data : []).filter(u => u && u.email && u.role !== 'Super Admin');
      setUsers(filtered);
    } catch (err) {
      setUserApiError('Failed to load users: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadEmployees();
  }, [loadUsers, loadEmployees]);

  // Status Dropdown Handlers
  const handleStatusSelectChange = (empId, newStatus) => {
    setPendingStatus(prev => ({
      ...prev,
      [empId]: newStatus
    }));
  };

  const handleSaveWorkerStatus = async (empId) => {
    const targetEmp = employees.find(e => e.employee_id === empId);
    const newStatus = pendingStatus[empId] || targetEmp?.worker_status || 'Active';

    setSavingStatusId(empId);
    try {
      await API.toggleWorkerStatus(empId, newStatus);
      setEmployees(prev => prev.map(emp => 
        emp.employee_id === empId ? { ...emp, worker_status: newStatus } : emp
      ));
      setPendingStatus(prev => {
        const next = { ...prev };
        delete next[empId];
        return next;
      });
      setSavedSuccessId(empId);
      setTimeout(() => setSavedSuccessId(null), 2500);
      showToast(`Worker status updated to ${newStatus}`, 'success');
    } catch (err) {
      showToast('Failed to save worker status: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSavingStatusId(null);
    }
  };

  // Bulk update worker status
  const handleBulkStatusUpdate = (newStatus) => {
    if (selectedEmpIds.size === 0) return;
    const count = selectedEmpIds.size;
    setConfirmModalState({
      isOpen: true,
      title: 'Bulk Update Worker Status',
      message: `Are you sure you want to set ${count} selected worker(s) to ${newStatus}?`,
      isDanger: newStatus === 'Inactive',
      onConfirm: async () => {
        closeConfirmModal();
        setStatusUpdating(true);
        try {
          const idArray = Array.from(selectedEmpIds);
          await API.bulkUpdateWorkerStatus(idArray, newStatus);
          setEmployees(prev => prev.map(emp => 
            selectedEmpIds.has(emp.employee_id) ? { ...emp, worker_status: newStatus } : emp
          ));
          setSelectedEmpIds(new Set());
          showToast(`Successfully updated ${count} worker(s) to ${newStatus}`, 'success');
        } catch (err) {
          showToast('Failed to bulk update worker status: ' + (err.message || 'Unknown error'), 'error');
        } finally {
          setStatusUpdating(false);
        }
      }
    });
  };

  // Unique divisions & contractors for filtering
  const divisions = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      const div = e.team || e.division;
      if (div) set.add(div);
    });
    return Array.from(set).sort();
  }, [employees]);

  const contractors = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      if (e.contractor) set.add(e.contractor);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Distinct roles/functions list for role filter
  const distinctRoles = useMemo(() => {
    const map = new Map();
    employees.forEach(e => {
      const group = roleGroup(e.function);
      if (group) map.set(group, (map.get(group) || 0) + 1);
    });
    // Only the five role groups, in fixed order.
    return ROLE_GROUPS.map(role => ({ role, count: map.get(role) || 0 }));
  }, [employees]);

  // Counts for status & roles
  const activeWorkersCount = useMemo(() => {
    return employees.filter(e => (e.worker_status || 'Active') === 'Active').length;
  }, [employees]);

  const inactiveWorkersCount = useMemo(() => {
    return employees.filter(e => (e.worker_status || 'Active') === 'Inactive').length;
  }, [employees]);

  // Filtered workers
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = employeeSearch.toLowerCase().trim();
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const empIdStr = String(emp.employee_id || '').toLowerCase();
      const matchesSearch = !q || fullName.includes(q) || empIdStr.includes(q);

      const status = emp.worker_status || 'Active';
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(status);

      const matchesRole = roleFilter.length === 0 || roleFilter.includes(roleGroup(emp.function));

      const div = emp.team || emp.division || '';
      const matchesDivision = divisionFilter.length === 0 || divisionFilter.includes(div);

      const cont = emp.contractor || '';
      const matchesContractor = contractorFilter.length === 0 || contractorFilter.includes(cont);

      return matchesSearch && matchesStatus && matchesRole && matchesDivision && matchesContractor;
    });
  }, [employees, employeeSearch, statusFilter, roleFilter, divisionFilter, contractorFilter]);

  // Selected workers the current filters don't show (they still count for bulk actions).
  const hiddenSelectedCount = useMemo(() => {
    if (selectedEmpIds.size === 0) return 0;
    const visible = new Set(filteredEmployees.map(e => e.employee_id));
    let hidden = 0;
    selectedEmpIds.forEach(id => { if (!visible.has(id)) hidden += 1; });
    return hidden;
  }, [selectedEmpIds, filteredEmployees]);

  // Sorted records
  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'name') {
        valA = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        valB = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      } else if (sortField === 'function' || sortField === 'role') {
        valA = a.function || '';
        valB = b.function || '';
      } else if (sortField === 'division' || sortField === 'team') {
        valA = a.team || a.division || '';
        valB = b.team || b.division || '';
      } else if (sortField === 'contractor') {
        valA = a.contractor || '';
        valB = b.contractor || '';
      } else if (sortField === 'worker_status') {
        valA = a.worker_status || 'Active';
        valB = b.worker_status || 'Active';
      } else if (sortField === 'date_added') {
        valA = a.date_added || '';
        valB = b.date_added || '';
      } else if (sortField === 'employee_id') {
        valA = String(a.employee_id || '');
        valB = String(b.employee_id || '');
      }

      const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredEmployees, sortField, sortDirection]);

  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [employeeSearch, statusFilter, roleFilter, divisionFilter, contractorFilter, pageSize, sortField, sortDirection]);

  // Paginated records
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(sortedEmployees.length / Number(pageSize));
  const paginatedEmployees = useMemo(() => {
    if (pageSize === 'ALL') return sortedEmployees;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return sortedEmployees.slice(start, start + size);
  }, [sortedEmployees, currentPage, pageSize]);

  const totalCutters = employees.filter(e => (e.function || '').toLowerCase().includes('cutter')).length;
  const totalCarriers = employees.filter(e => (e.function || '').toLowerCase().includes('carrier')).length;
  const totalPickers = employees.filter(e => (e.function || '').toLowerCase().includes('picker')).length;
  const totalLoaders = employees.filter(e => (e.function || '').toLowerCase().includes('loader')).length;

  // Edit a user's role and estate in a pop-up; the result is shown in a notice dialog.
  const [editAccess, setEditAccess] = useState(null);   // { user, role, estate }
  const [savingAccess, setSavingAccess] = useState(false);
  const [notice, setNotice] = useState(null);           // { title, message, type }

  const saveAccess = async () => {
    if (!editAccess) return;
    setSavingAccess(true);
    try {
      const saved = await API.updateUserAccess(editAccess.user.id, {
        role: editAccess.role, estate: editAccess.estate, email: editAccess.email.trim(),
        notify: editAccess.notify, portal_url: window.location.origin,
      });
      setUsers(prev => prev.map(x => (x.id === editAccess.user.id ? { ...x, email: saved.email, role: saved.role, estate: saved.estate } : x)));
      setEditAccess(null);
      const mail = !editAccess.notify ? 'The person was not emailed.'
        : saved.credentials_email_status === 'SENT' ? `They were told by email (${saved.email}).`
        : `The email was not sent: ${saved.credentials_email_message || 'email is not set up.'}`;
      setNotice({
        type: 'success', title: 'User updated',
        message: `${saved.email} is now ${saved.role}, working on ${saved.estate || 'all estates'}. ${mail} A signed-in user gets the change within a minute.`,
      });
    } catch (err) {
      setEditAccess(null);
      setNotice({ type: 'error', title: 'Could not save', message: err.message || 'This account could not be changed. Nothing was saved.' });
    } finally {
      setSavingAccess(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const created = await API.createUser({
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        estate: newUser.estate || null,
        status: 'Active',
        send_credentials_to: (newUser.sendTo || newUser.email).trim(),
        portal_url: window.location.origin,
      });
      setUsers([created, ...users]);
      setIsAddingUser(false);
      setNewUser({ email: '', password: '', role: 'View', estate: '', sendTo: '' });
      setShowNewUserPassword(false);
      if (created.credentials_email_status === 'SENT') {
        showToast(`User created. ${created.credentials_email_message}`, 'success');
      } else if (created.credentials_email_status) {
        showToast(`User created, but the login email was not sent: ${created.credentials_email_message}`, 'warning');
      } else {
        showToast('User created.', 'success');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create user.');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const updated = await API.toggleUserStatus(user.id, newStatus);
      setUsers(users.map(u => u.id === user.id ? updated : u));
      showToast(`User ${user.email} status updated to ${newStatus}`, 'success');
    } catch (err) {
      showToast('Failed to update status: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const handleDelete = (user) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Portal User',
      message: `Are you sure you want to delete ${user.email}? This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await API.deleteUser(user.id);
          setUsers(users.filter(u => u.id !== user.id));
          showToast(`User ${user.email} deleted successfully`, 'success');
        } catch (err) {
          showToast('Failed to delete user: ' + (err.message || 'Unknown error'), 'error');
        }
      }
    });
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ color: '#000000', marginLeft: '4px' }} />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp size={12} style={{ color: '#3F8432', marginLeft: '4px', strokeWidth: 3 }} />
      : <ArrowDown size={12} style={{ color: '#3F8432', marginLeft: '4px', strokeWidth: 3 }} />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '2026-09-02';
    try {
      const d = new Date(dateStr);
      return d.toISOString().split('T')[0];
    } catch {
      return String(dateStr).substring(0, 10);
    }
  };

  const SECTIONS = [
    { group: 'Workforce', items: [
      { key: 'badges', label: 'Workforce Directory', icon: <Users size={15} />, count: employees.length },
      { key: 'sync', label: 'Upload Workforce', icon: <UploadCloud size={15} /> },
    ] },
    { group: 'Access', items: [
      { key: 'identities', label: 'Portal Users', icon: <Key size={15} />, count: users.length },
    ] },
    { group: 'Alerts & Logs', items: [
      { key: 'logs', label: 'System Logs', icon: <Terminal size={15} /> },
      { key: 'recipients', label: 'Email Alerts', icon: <Mail size={15} /> },
      { key: 'history', label: 'Alert History', icon: <Calendar size={15} /> },
    ] },
  ];
  const allTabs = SECTIONS.flatMap(g => g.items);
  const sectionTitle = allTabs.find(i => i.key === activeTab)?.label || 'Workforce Directory';

  return (
    <div className="view-fade-in admin-view" style={{
      padding: '8px 4px 32px',
      background: 'transparent',
      minHeight: 'calc(100vh - 96px)',
      color: '#000000',
      fontFamily: 'inherit',
      width: '100%',
      boxSizing: 'border-box'
    }}>

      {/* ========================================================================= */}
      {/* TOP HEADER                                                                */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Left: where you are */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Admin &amp; Alerts &rsaquo; {sectionTitle}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: '#000000', margin: '2px 0 0 0' }}>{sectionTitle}</h1>
        </div>

        {/* Right Top Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { loadEmployees(); loadUsers(); }}
            disabled={employeesLoading || isLoadingUsers}
            style={{
              height: '38px',
              padding: '0 14px',
              background: '#3F8432',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: (employeesLoading || isLoadingUsers) ? 'not-allowed' : 'pointer',
              opacity: (employeesLoading || isLoadingUsers) ? 0.85 : 1,
            }}
            title={`Last refreshed at ${lastRefreshTime}`}
          >
            <RefreshCw size={14} className={(employeesLoading || isLoadingUsers) ? 'spin' : ''} />
            <span>{(employeesLoading || isLoadingUsers) ? 'Refreshing' : `Refresh (${lastRefreshTime})`}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Admin Sub-Navigation Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '6px',
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        marginBottom: '20px',
      }}>
        {allTabs.map(item => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleTabChange(item.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? '#3F8432' : 'transparent',
                color: isActive ? '#FFFFFF' : '#334155',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: isActive ? 'rgba(255,255,255,0.22)' : '#F1F5F9',
                  color: isActive ? '#FFFFFF' : '#475569',
                }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      
      {/* ========================================================================= */}
      {/* SUBPAGE 1: WORKER DIRECTORY                                               */}
      {/* ========================================================================= */}
      {activeTab === 'badges' && (
        <div className="view-fade-in">
          {/* KPI Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
            marginBottom: '20px',
            width: '100%'
          }}>
            <div className="wkpi-card" style={{ background: '#FFFFFF', padding: '20px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'transparent', color: '#3F8432', width: '52px', height: '52px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={26} />
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>{employees.length}</div>
                  <div style={{ fontSize: '12px', color: '#000000', fontWeight: 500, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    TOTAL FIELD WORKERS
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#0f172a', fontWeight: 500, textTransform: 'uppercase', marginTop: '2px' }}>
                    {activeWorkersCount} Active Registered
                  </div>
                </div>
              </div>
            </div>

            <div className="wkpi-card" style={{ background: '#FFFFFF', padding: '20px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'transparent', color: '#3F8432', width: '52px', height: '52px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Scissors size={26} />
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>{totalCutters}</div>
                  <div style={{ fontSize: '12px', color: '#000000', fontWeight: 500, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    HARVESTERS / CUTTERS
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#0f172a', fontWeight: 500, textTransform: 'uppercase', marginTop: '2px' }}>
                    Bunch Cutters
                  </div>
                </div>
              </div>
            </div>

            <div className="wkpi-card" style={{ background: '#FFFFFF', padding: '20px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'transparent', color: '#D97706', width: '52px', height: '52px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Truck size={26} />
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>{totalCarriers}</div>
                  <div style={{ fontSize: '12px', color: '#000000', fontWeight: 500, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ACTIVE CARRIERS
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#0f172a', fontWeight: 500, textTransform: 'uppercase', marginTop: '2px' }}>
                    Field Haulers
                  </div>
                </div>
              </div>
            </div>

            <div className="wkpi-card" style={{ background: '#FFFFFF', padding: '20px 24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-panel)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'transparent', color: '#7C3AED', width: '52px', height: '52px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Boxes size={26} />
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 500, color: '#000000', lineHeight: 1 }}>{totalPickers + totalLoaders}</div>
                  <div style={{ fontSize: '12px', color: '#000000', fontWeight: 500, marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    PICKERS & LOADERS
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#0f172a', fontWeight: 500, textTransform: 'uppercase', marginTop: '2px' }}>
                    Loose Fruit & Loading
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Directory Container */}
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '2px solid #E2E8F0', boxShadow: 'var(--shadow-panel)', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            
            {/* Header with Print & Bulk Actions */}
            <div style={{
              padding: '16px 22px',
              borderBottom: '2px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap'
            }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#000000', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: 'var(--clr-brand-primary)' }} />
                  Worker Directory
                </h2>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#000000', fontWeight: 500 }}>
                  Search, verify, adjust operational status, and print offline QR codes.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* View Mode Toggle */}
                <div style={{ display: 'flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1.5px solid #CBD5E1', gap: '3px', flexShrink: 0 }}>
                  <button
                    onClick={() => setViewMode('table')}
                    title="Table View"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                      color: viewMode === 'table' ? '#3F8432' : '#000000',
                      fontWeight: 500,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: viewMode === 'table' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    <List size={14} /> Table
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    title="QR Card Grid View"
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                      color: viewMode === 'grid' ? '#3F8432' : '#000000',
                      fontWeight: 500,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    <LayoutGrid size={14} /> QR Cards
                  </button>
                </div>

                <button
                  className="btn btn--outline"
                  onClick={() => {
                    const selectedList = employees
                      .filter(e => selectedEmpIds.has(e.employee_id))
                      .filter(isEligibleForBadge);
                    if (selectedList.length === 0) {
                      showToast('Please select at least one active, field-eligible worker (supervisory and blocked roles cannot be printed).', 'warning');
                      return;
                    }
                    setSelectedQrWorkers(selectedList);
                    setQrModalOpen(true);
                  }}
                  disabled={selectedEmpIds.size === 0}
                  style={{ height: '38px', fontWeight: 500, fontSize: '12px', color: '#000000', border: '2px solid #000000', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                >
                  <Printer size={15} /> Print Selected ({selectedEmpIds.size})
                </button>

                {selectedEmpIds.size > 0 && (
                  <>
                    <button
                      className="btn btn--outline"
                      onClick={() => handleBulkStatusUpdate('Active')}
                      disabled={statusUpdating}
                      style={{ height: '38px', color: '#3F8432', fontWeight: 500, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '6px', border: '2px solid #3F8432', background: '#FFFFFF' }}
                    >
                      <UserCheck size={14} /> Set Active ({selectedEmpIds.size})
                    </button>

                    <button
                      className="btn btn--outline"
                      onClick={() => handleBulkStatusUpdate('Inactive')}
                      disabled={statusUpdating}
                      style={{ height: '38px', color: '#0F172A', fontWeight: 500, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '6px', border: '1.5px solid #CBD5E1', background: '#F8FAFC' }}
                    >
                      <UserX size={14} /> Set Inactive ({selectedEmpIds.size})
                    </button>

                    <button
                      className="btn btn--outline"
                      onClick={() => setSelectedEmpIds(new Set())}
                      title="Untick every selected worker, including ones hidden by filters"
                      style={{ height: '38px', color: '#DC2626', fontWeight: 500, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderRadius: '6px', border: '2px solid #FCA5A5', background: '#FFFFFF' }}
                    >
                      <X size={14} /> Clear selection
                    </button>
                  </>
                )}

                {/* Print Active QR Codes Only */}
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    const listToFilter = sortedEmployees.length > 0 ? sortedEmployees : employees;
                    const activeOnlyList = listToFilter.filter(isEligibleForBadge);
                    if (activeOnlyList.length === 0) {
                      showToast('No active, field-eligible workers available to print in the current selection.', 'warning');
                      return;
                    }
                    setSelectedQrWorkers(activeOnlyList);
                    setQrModalOpen(true);
                  }}
                  disabled={employees.filter(isEligibleForBadge).length === 0}
                  style={{ height: '38px', fontWeight: 500, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                >
                  <QrCode size={15} /> Print Active QR Codes ({sortedEmployees.filter(isEligibleForBadge).length})
                </button>
              </div>
            </div>

            {/* Well-adjusted, spacious filter toolbar */}
            <div style={{
              padding: '14px 22px',
              background: '#F8FAFC',
              borderBottom: '2px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap'
            }}>
              {/* Search Box with generous flex basis */}
              <div style={{ position: 'relative', flex: '2 1 280px', minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#000000' }} />
                <input
                  type="text"
                  placeholder="Search worker by name or ID..."
                  className="search-input"
                  style={{ width: '100%', height: '38px', paddingLeft: '36px', fontSize: '13px', fontWeight: 500, color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <MultiSelectFilter
                label="Status"
                allLabel="All Status"
                options={[
                  { value: 'Active', label: 'Active', count: activeWorkersCount },
                  { value: 'Inactive', label: 'Inactive', count: inactiveWorkersCount },
                ]}
                selected={statusFilter}
                onChange={setStatusFilter}
              />

              {/* Role Filter */}
              <MultiSelectFilter
                label="Role"
                allLabel="All Roles"
                options={distinctRoles.map(({ role, count }) => ({ value: role, label: role, count }))}
                selected={roleFilter}
                onChange={setRoleFilter}
              />

              {/* Division Filter */}
              {divisions.length > 0 && (
                <MultiSelectFilter
                  label="Division"
                  allLabel="All Divisions"
                  options={divisions.map(div => ({ value: div, label: div }))}
                  selected={divisionFilter}
                  onChange={setDivisionFilter}
                />
              )}

              {/* Contractor Filter */}
              {contractors.length > 0 && (
                <MultiSelectFilter
                  label="Contractor"
                  allLabel="All Contractors"
                  options={contractors.map(c => ({ value: c, label: c }))}
                  selected={contractorFilter}
                  onChange={setContractorFilter}
                />
              )}

              {filtersActive && (
                <button
                  type="button"
                  onClick={clearFilters}
                  style={{ height: '38px', padding: '0 14px', fontSize: '12px', fontWeight: 500, color: '#DC2626', background: '#FFFFFF', border: '2px solid #FCA5A5', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  title="Clear search and all filters"
                >
                  <X size={14} /> Clear filters
                </button>
              )}
            </div>

            {hiddenSelectedCount > 0 && (
              <div style={{ padding: '10px 22px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13px', fontWeight: 500, color: '#000000', background: '#FFFFFF' }}>
                <span>
                  {selectedEmpIds.size} worker{selectedEmpIds.size === 1 ? '' : 's'} selected
                  {' '}({hiddenSelectedCount} hidden by the current filters).
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedEmpIds(new Set())}
                  style={{ background: 'none', border: 'none', padding: 0, color: '#DC2626', fontWeight: 500, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear selection
                </button>
              </div>
            )}

            {/* Content: Table or Grid */}
            <div>
              {/* Only show the loader on first load; refreshes update the table in place. */}
              {employeesLoading && employees.length === 0 ? (
                <div style={{ padding: '70px', textAlign: 'center', color: '#000000' }}>
                  <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px', color: 'var(--clr-brand-primary)' }} />
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '14px', color: '#000000' }}>Fetching Data...</p>
                </div>
              ) : sortedEmployees.length === 0 ? (
                <div style={{ padding: '70px 20px', textAlign: 'center', color: '#000000' }}>
                  <Users size={48} style={{ color: '#000000', margin: '0 auto 14px' }} />
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '17px', color: '#000000' }}>No matching workers found</p>
                  <p style={{ margin: '6px 0 18px 0', fontSize: '13px', color: '#000000', fontWeight: 500 }}>
                    {employees.length === 0 ? 'Upload an employee CSV in the Sync tab to populate the database.' : 'Try adjusting your search criteria or status/role filters.'}
                  </p>
                  {employees.length === 0 && (
                    <button
                      className="btn btn--primary"
                      onClick={() => handleTabChange('sync')}
                      style={{ height: '40px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '6px' }}
                    >
                      <UploadCloud size={15} /> Go to Database Sync
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* QR Cards Grid View */
                <div style={{ padding: '20px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '16px'
                  }}>
                    {paginatedEmployees.map((emp) => {
                      const isSelected = selectedEmpIds.has(emp.employee_id);
                      const currentStatus = pendingStatus[emp.employee_id] !== undefined ? pendingStatus[emp.employee_id] : (emp.worker_status || 'Active');
                      const isWorkerActive = currentStatus === 'Active';
                      const hasPendingChange = pendingStatus[emp.employee_id] !== undefined && pendingStatus[emp.employee_id] !== (emp.worker_status || 'Active');

                      const qrPayload = JSON.stringify({
                        employee_id: emp.employee_id,
                        first_name: emp.first_name,
                        last_name: emp.last_name,
                        role: roleGroup(emp.function) || emp.function || 'Worker'
                      });

                      return (
                        <div
                          key={emp.employee_id || emp.id}
                          style={{
                            background: '#FFFFFF',
                            borderRadius: '10px',
                            border: isSelected ? '2px solid var(--clr-brand-primary)' : '2px solid #CBD5E1',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newSet = new Set(selectedEmpIds);
                                  if (e.target.checked) newSet.add(emp.employee_id);
                                  else newSet.delete(emp.employee_id);
                                  setSelectedEmpIds(newSet);
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: '#000000', lineHeight: 1.2 }}>
                                  {emp.first_name} {emp.last_name}
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 500, color: '#3F8432', marginTop: '2px' }}>
                                  #{emp.employee_id}
                                </div>
                              </div>
                            </div>

                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 500,
                                background: 'transparent',
                                color: isWorkerActive ? '#3F8432' : '#000000'
                              }}
                            >
                              {isWorkerActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div 
                            style={{
                              background: '#F8FAFC',
                              border: '2px solid #E2E8F0',
                              borderRadius: '8px',
                              padding: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setSelectedQrWorkers([emp]);
                              setQrModalOpen(true);
                            }}
                            title="Click to view & print QR Code"
                          >
                            <QRCodeSVG
                              value={qrPayload}
                              size={110}
                              level="H"
                              includeMargin={false}
                            />
                          </div>

                          <div style={{ fontSize: '11px', color: '#000000', fontWeight: 500, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Role:</span>
                              <strong style={{ color: '#000000', textTransform: 'uppercase' }}>{roleGroup(emp.function) || emp.function || 'Worker'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Team:</span>
                              <strong style={{ color: '#000000', textAlign: 'right', overflowWrap: 'anywhere' }}>{emp.team || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                              <span>Division:</span>
                              <strong style={{ color: '#000000', textAlign: 'right', overflowWrap: 'anywhere' }}>{emp.division || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Contractor:</span>
                              <strong style={{ color: '#000000' }}>{emp.contractor || 'Direct Staff'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Date Added:</span>
                              <strong style={{ color: '#000000' }}>{formatDate(emp.date_added)}</strong>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedQrWorkers([emp]);
                              setQrModalOpen(true);
                            }}
                            style={{
                              width: '100%',
                              height: '34px',
                              background: '#3F8432',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              marginTop: 'auto'
                            }}
                          >
                            <QrCode size={13} /> View QR Code
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Full-Width Table View with Date Added Column & Status Dropdown */
                <div style={{ overflowX: 'auto', maxHeight: pageSize === 'ALL' ? '650px' : 'none', overflowY: pageSize === 'ALL' ? 'auto' : 'visible', width: '100%' }}>
                  {/* data-no-filter data-no-sort: native filters above cover them, and sorting is handled directly by handleSort & renderSortIcon */}
                  <table data-no-filter data-no-sort className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#000000' }}>
                    <thead style={{ background: '#F8FAFC' }}>
                      <tr style={{ borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', width: '36px', borderRight: '1px solid #E2E8F0' }}>
                          <input
                            type="checkbox"
                            checked={sortedEmployees.length > 0 && paginatedEmployees.every(e => selectedEmpIds.has(e.employee_id))}
                            onChange={(e) => {
                              const newSet = new Set(selectedEmpIds);
                              if (e.target.checked) {
                                paginatedEmployees.forEach(emp => newSet.add(emp.employee_id));
                              } else {
                                paginatedEmployees.forEach(emp => newSet.delete(emp.employee_id));
                              }
                              setSelectedEmpIds(newSet);
                            }}
                            style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                        </th>

                        <th 
                          onClick={() => handleSort('employee_id')}
                          style={{ padding: '12px 16px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0', cursor: 'pointer', userSelect: 'none' }}
                          title="Sort by Employee ID"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Employee ID</span>
                            {renderSortIcon('employee_id')}
                          </div>
                        </th>

                        <th 
                          onClick={() => handleSort('name')}
                          style={{ padding: '12px 16px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0', cursor: 'pointer', userSelect: 'none' }}
                          title="Sort by Full Name"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Full Name</span>
                            {renderSortIcon('name')}
                          </div>
                        </th>

                        <th 
                          onClick={() => handleSort('function')}
                          style={{ padding: '12px 16px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0', cursor: 'pointer', userSelect: 'none' }}
                          title="Sort by Role"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Role / Function</span>
                            {renderSortIcon('function')}
                          </div>
                        </th>

                        <th 
                          onClick={() => handleSort('division')}
                          style={{ padding: '12px 16px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0', cursor: 'pointer', userSelect: 'none' }}
                          title="Sort by Team / Division"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Team / Division</span>
                            {renderSortIcon('division')}
                          </div>
                        </th>

                        <th 
                          onClick={() => handleSort('contractor')}
                          style={{ padding: '12px 16px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0', cursor: 'pointer', userSelect: 'none' }}
                          title="Sort by Contractor"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Contractor</span>
                            {renderSortIcon('contractor')}
                          </div>
                        </th>

                        {/* Date Added Column */}
                        <th 
                          onClick={() => handleSort('date_added')}
                          style={{ padding: '12px 16px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0', cursor: 'pointer', userSelect: 'none', minWidth: '120px' }}
                          title="Sort by Date Added"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Date Added</span>
                            {renderSortIcon('date_added')}
                          </div>
                        </th>

                        <th 
                          onClick={() => handleSort('worker_status')}
                          style={{ padding: '12px 16px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0', cursor: 'pointer', userSelect: 'none', minWidth: '180px' }}
                          title="Sort by Status"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>Status</span>
                            {renderSortIcon('worker_status')}
                          </div>
                        </th>

                        <th style={{ padding: '12px 20px', fontWeight: 500, color: '#000000', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEmployees.map((emp) => {
                        const isSelected = selectedEmpIds.has(emp.employee_id);
                        const currentStatus = pendingStatus[emp.employee_id] !== undefined ? pendingStatus[emp.employee_id] : (emp.worker_status || 'Active');
                        const isWorkerActive = currentStatus === 'Active';
                        const hasPendingChange = pendingStatus[emp.employee_id] !== undefined && pendingStatus[emp.employee_id] !== (emp.worker_status || 'Active');
                        const isSuccess = savedSuccessId === emp.employee_id;

                        return (
                          <tr
                            key={emp.employee_id || emp.id}
                            style={{
                              borderBottom: '1px solid #E2E8F0',
                              background: hasPendingChange ? '#F1F5F9' : (isSelected ? '#F3F8EF' : 'transparent'),
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '10px 16px', borderRight: '1px solid #E2E8F0' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newSet = new Set(selectedEmpIds);
                                  if (e.target.checked) newSet.add(emp.employee_id);
                                  else newSet.delete(emp.employee_id);
                                  setSelectedEmpIds(newSet);
                                }}
                                style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '10px 16px', fontWeight: 500, color: '#3F8432', fontSize: '13px', borderRight: '1px solid #E2E8F0' }}>
                              #{emp.employee_id}
                            </td>
                            <td style={{ padding: '10px 16px', fontWeight: 500, color: '#000000', fontSize: '13px', borderRight: '1px solid #E2E8F0' }}>
                              {emp.first_name} {emp.last_name}
                            </td>
                            <td style={{ padding: '10px 16px', fontWeight: 500, color: '#000000', textTransform: 'uppercase', fontSize: '12px', borderRight: '1px solid #E2E8F0' }}>
                              {roleGroup(emp.function) || emp.function || 'General Worker'}
                            </td>
                            <td style={{ padding: '10px 16px', color: '#000000', fontWeight: 500, borderRight: '1px solid #E2E8F0' }}>
                              {emp.team || emp.division || 'Main Estate'}
                            </td>
                            <td style={{ padding: '10px 16px', color: '#000000', fontWeight: 500, borderRight: '1px solid #E2E8F0' }}>
                              {emp.contractor || 'Direct Staff'}
                            </td>

                            {/* Date Added Column */}
                            <td style={{ padding: '10px 16px', color: '#000000', fontWeight: 500, fontSize: '12px', borderRight: '1px solid #E2E8F0' }}>
                              {formatDate(emp.date_added)}
                            </td>
                            
                            {/* Status Column (Clean Read-Only Display Badge) */}
                            <td style={{ padding: '10px 16px', borderRight: '1px solid #E2E8F0' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  background: 'transparent',
                                  color: isWorkerActive ? '#3F8432' : '#000000',
                                  display: 'inline-block'
                                }}
                              >
                                {isWorkerActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>

                            <td style={{ padding: '10px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => {
                                  setSelectedQrWorkers([emp]);
                                  setQrModalOpen(true);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  background: '#3F8432',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}
                              >
                                <QrCode size={13} /> View QR Code
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Full-Width Pagination Bar */}
              {sortedEmployees.length > 0 && (
                <div style={{
                  padding: '12px 20px',
                  borderTop: '2px solid #E2E8F0',
                  background: '#F8FAFC',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  fontSize: '13px'
                }}>
                  <div style={{ color: '#000000', fontWeight: 500 }}>
                    Showing <strong style={{ color: '#000000' }}>
                      {pageSize === 'ALL' ? `1-${sortedEmployees.length}` : `${Math.min((currentPage - 1) * Number(pageSize) + 1, sortedEmployees.length)}-${Math.min(currentPage * Number(pageSize), sortedEmployees.length)}`}
                    </strong> of <strong style={{ color: '#000000' }}>{sortedEmployees.length}</strong> workers
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#000000', fontWeight: 500, fontSize: '12px' }}>Rows:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '4px', border: '2px solid #CBD5E1', fontSize: '12px', fontWeight: 500, color: '#000000', background: '#FFFFFF' }}
                      >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="ALL">Show All</option>
                      </select>
                    </div>

                    {pageSize !== 'ALL' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '2px solid #CBD5E1',
                            background: currentPage === 1 ? '#F1F5F9' : '#FFFFFF',
                            color: currentPage === 1 ? '#94A3B8' : '#000000',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontWeight: 500,
                            fontSize: '12px'
                          }}
                        >
                          <ChevronLeft size={13} /> Prev
                        </button>

                        <span style={{ fontWeight: 500, color: '#000000', padding: '0 4px', fontSize: '12px' }}>
                          {currentPage} / {totalPages}
                        </span>

                        <button
                          onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '2px solid #CBD5E1',
                            background: currentPage === totalPages ? '#F1F5F9' : '#FFFFFF',
                            color: currentPage === totalPages ? '#94A3B8' : '#000000',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontWeight: 500,
                            fontSize: '12px'
                          }}
                        >
                          Next <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBPAGE 2: USER ACCESS & IDENTITIES                                       */}
      {/* ========================================================================= */}
      {activeTab === 'identities' && (
        <div className="view-fade-in">
          {/* User Access Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 500, color: '#000000', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={22} style={{ color: 'var(--clr-brand-primary)' }} />
                System Identities & User Access
              </h2>
              <p style={{ color: '#000000', fontSize: '13px', fontWeight: 500, margin: '2px 0 0 0' }}>
                Manage administrator credentials, authorization roles, and portal passwords.
              </p>
            </div>

            <button
              className="btn btn--primary"
              onClick={() => { setIsAddingUser(true); setFormError(''); }}
              style={{ height: '42px', padding: '0 20px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={16} /> Create User
            </button>
          </div>

          {userApiError && (
            <div style={{ background: '#FEF2F2', border: '2px solid #FEE2E2', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#991B1B', fontWeight: 500, fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertCircle size={16} /> {userApiError}
            </div>
          )}

          {/* User Access Table */}
          <div style={{ background: '#FFFFFF', borderRadius: '10px', border: '2px solid #E2E8F0', overflow: 'hidden', boxShadow: 'var(--shadow-panel)' }}>
            <div style={{ padding: '14px 20px', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '320px' }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#000000' }} />
                <input
                  type="text"
                  placeholder="Filter users by email..."
                  className="search-input"
                  style={{ width: '100%', height: '38px', paddingLeft: '36px', fontSize: '13px', fontWeight: 500, color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF' }}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <button
                className="btn btn--outline"
                onClick={loadUsers}
                style={{ height: '38px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '12px', color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px' }}
              >
                <RefreshCw size={13} className={isLoadingUsers ? 'spin' : ''} /> Refresh
              </button>
            </div>

            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#000000' }}>
              <thead style={{ background: '#FFFFFF' }}>
                <tr style={{ borderBottom: '2px solid #CBD5E1', textAlign: 'left' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0' }}>User Email</th>
                  <th style={{ padding: '12px 18px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0' }}>System Role</th>
                  <th style={{ padding: '12px 18px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0' }}>Estate</th>
                  <th style={{ padding: '12px 18px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0' }}>Created Date</th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#000000', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingUsers ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '50px' }}><Loader2 size={24} className="spin" /></td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#000000', fontWeight: 500 }}>No users found.</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '12px 18px', fontWeight: 500, color: '#000000', borderRight: '1px solid #E2E8F0' }}>{u.email}</td>
                      <td style={{ padding: '12px 18px', borderRight: '1px solid #E2E8F0' }}>
                        <span style={{ fontWeight: 500, fontSize: '13px', color: '#000000' }}>{u.role === 'Edit' ? 'Manager' : u.role}</span>
                      </td>
                      <td style={{ padding: '12px 18px', borderRight: '1px solid #E2E8F0' }}>
                        <span style={{ fontWeight: 500, fontSize: '13px', color: '#000000' }}>{u.estate || 'All Estates'}</span>
                      </td>
                      <td style={{ padding: '12px 18px', borderRight: '1px solid #E2E8F0' }}>
                        <span style={{ fontWeight: 500, fontSize: '11px', color: u.status === 'Active' ? '#3F8432' : '#991B1B' }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 18px', color: '#000000', fontWeight: 500, borderRight: '1px solid #E2E8F0' }}>
                        {formatDate(u.created_at)}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => setEditAccess({ user: u, email: u.email, role: u.role === 'Edit' ? 'Manager' : u.role, estate: u.estate || '', notify: true })}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: '2px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontSize: '11px', fontWeight: 500, color: '#000000', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            title="Change this user's role and estate"
                          >
                            <Edit2 size={13} style={{ color: '#3F8432' }} /> Edit
                          </button>
                          <button
                            onClick={() => handleOpenResetPassword(u)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '2px solid #CBD5E1',
                              background: '#FFFFFF',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 500,
                              color: '#000000',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                            title="Reset password and generate new credentials"
                          >
                            <Key size={13} style={{ color: '#3F8432' }} /> Reset Password
                          </button>
                          <button
                            onClick={() => toggleUserStatus(u)}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: '2px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontSize: '11px', fontWeight: 500, color: '#000000' }}
                          >
                            {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            style={{ padding: '5px 12px', borderRadius: '6px', border: '2px solid #DC2626', background: '#DC2626', color: '#FFFFFF', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBPAGE 3: EMPLOYEE DATABASE CSV SYNC                                     */}
      {/* ========================================================================= */}
      {activeTab === 'sync' && (
        <div className="view-fade-in">
          {/* Sync Header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 500, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={22} style={{ color: '#3F8432' }} />
              Employee Database Ingestion & Sync
            </h2>
            <p style={{ color: '#0f172a', fontSize: '13px', fontWeight: 400, margin: '4px 0 0 0' }}>
              Select an upload path to ingest records with multi-sheet workbook parsing, header mapping, and 2-step verification.
            </p>
          </div>

          {/* Dual Ingestion Launchpad Cards - Clean Black & White */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Path 1: Field Supervisors & Roles & Counters */}
            <div 
              onClick={() => { setUploadModalType('clerks'); setUploadModalOpen(true); }}
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                transition: 'border-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3F8432'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
            >
              <div style={{ background: '#F1F5F9', color: '#0F172A', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <FileSpreadsheet size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#0F172A' }}>
                  Upload Field Supervisors &amp; Roles (.xlsx, .csv)
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', lineHeight: 1.5, fontWeight: 400 }}>
                  Ingest Harvester Role and Loading Role accounts with multi-sheet selector and column mapping.
                </div>
                <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 500, color: '#3F8432', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Launch Roles Header Mapper <ArrowRight size={14} />
                </div>
              </div>
            </div>

            {/* Path 2: Farm Workers & Harvesters */}
            <div 
              onClick={() => { setUploadModalType('workers'); setUploadModalOpen(true); }}
              style={{
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                borderRadius: '12px',
                padding: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                transition: 'border-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3F8432'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#CBD5E1'}
            >
              <div style={{ background: '#F1F5F9', color: '#0F172A', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <UploadCloud size={32} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 500, color: '#0F172A' }}>
                  Upload Farm Workers & Harvesters (.xlsx, .csv)
                </div>
                <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px', lineHeight: 1.5, fontWeight: 400 }}>
                  Ingest Cutters, Carriers, Loose Fruit Pickers, and Loaders with 5-row live data preview and header mapping.
                </div>
                <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: 500, color: '#3F8432', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Launch Workers Header Mapper <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </div>

          {/* Guidelines & Last Sync Summary Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Sync Metadata & Status */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ background: '#F1F5F9', color: '#0F172A', width: '44px', height: '44px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: '#0F172A' }}>{lastSyncTime}</div>
                  <div style={{ fontSize: '12px', color: '#0f172a', fontWeight: 500, marginTop: '2px' }}>
                    Last Successful Database Sync
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn--outline"
                  onClick={() => handleTabChange('badges')}
                  style={{ flex: 1, height: '42px', fontWeight: 500, color: '#0F172A', border: '1.5px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px', background: '#FFFFFF', cursor: 'pointer' }}
                >
                  <Users size={15} /> View Worker Directory ({employees.length})
                </button>
              </div>
            </div>

            {/* Ingestion Standards & Instructions */}
            <div style={{ background: '#FFFFFF', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', margin: '0 0 10px 0' }}>
                Ingestion System Standards:
              </h3>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#334155', lineHeight: 1.8, fontWeight: 400 }}>
                <li><strong>Supported Formats:</strong> Excel workbooks (<code>.xlsx</code>, <code>.xls</code>) and standard CSV (<code>.csv</code>).</li>
                <li><strong>Multi-Sheet Parsing:</strong> Supports workbooks with separate sheets for field workers and Harvester Role / Loading Role rosters.</li>
                <li><strong>Role Mapping:</strong> Roles map cleanly to Cutter, Carrier, Picker, Harvester Role, or Loading Role.</li>
                <li><strong>Active / Inactive Status:</strong> Optional status column mapping updates existing worker status across all tables.</li>
              </ul>
            </div>
          </div>

          <ClearDatabasePanel employeeCount={employees.length} onCleared={loadEmployees} showToast={showToast} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBPAGE 4: SYSTEM LOGS & ALERTS                                           */}
      {/* ========================================================================= */}
      {['logs', 'recipients', 'history'].includes(activeTab) && (
        <AdminLogsAndAlerts section={activeTab} />
      )}

      {/* ========================================================================= */}
      {/* WORKER QR CODE PREVIEW & BATCH PRINT MODAL                                */}
      {/* ========================================================================= */}
      <WorkerBadgeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        workers={selectedQrWorkers}
      />

      {/* ========================================================================= */}
      {/* PROVISION USER FORM MODAL                                                 */}
      {/* ========================================================================= */}
      {isAddingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(10px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="view-fade-in" style={{ background: 'white', width: '460px', maxWidth: '100%', borderRadius: '10px', padding: '28px', boxShadow: 'var(--shadow-modal)', border: '2px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{ background: 'transparent', color: '#3F8432', width: '44px', height: '44px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserPlus size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#000000', margin: 0 }}>Create User</h2>
                <p style={{ color: '#000000', fontSize: '12px', fontWeight: 500, margin: 0 }}>Set up secure system credentials.</p>
              </div>
            </div>

            {formError && (
              <div style={{ background: '#FEF2F2', border: '2px solid #FEE2E2', borderRadius: '6px', padding: '8px 12px', marginBottom: '14px', color: '#991B1B', fontWeight: 500, fontSize: '12px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddUser}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#000000', marginBottom: '4px', textTransform: 'uppercase' }}>Email Address</label>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%', height: '42px', padding: '0 12px', fontSize: '13px', fontWeight: 500, color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px' }}
                  placeholder="name@ffb.com"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 500, color: '#000000', textTransform: 'uppercase' }}>Access Password</label>
                  <button
                    type="button"
                    onClick={() => { setNewUser({ ...newUser, password: generateStrongPassword() }); setShowNewUserPassword(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '6px', border: '1.5px solid #3F8432', background: '#FFFFFF', color: '#3F8432', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Sparkles size={12} /> Generate password
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewUserPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="search-input"
                    style={{ width: '100%', height: '42px', padding: '0 46px 0 12px', fontSize: '13px', fontWeight: 500, color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px', boxSizing: 'border-box' }}
                    placeholder="Enter or generate a password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(v => !v)}
                    title={showNewUserPassword ? 'Hide password' : 'Show password'}
                    aria-label={showNewUserPassword ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#0f172a', cursor: 'pointer', borderRadius: '6px' }}
                  >
                    {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#000000', marginBottom: '4px', textTransform: 'uppercase' }}>Send login details to</label>
                <input
                  type="email"
                  className="search-input"
                  style={{ width: '100%', height: '42px', padding: '0 12px', fontSize: '13px', fontWeight: 500, color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px' }}
                  placeholder={newUser.email || "person's email address"}
                  value={newUser.sendTo}
                  onChange={(e) => setNewUser({ ...newUser, sendTo: e.target.value })}
                />
                <div style={{ fontSize: '11px', color: '#0f172a', fontWeight: 400, marginTop: '4px' }}>
                  The login email and password are emailed here. Leave blank to send to the account email above.
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#000000', marginBottom: '4px', textTransform: 'uppercase' }}>System Role</label>
                <select
                  className="select-input"
                  style={{ width: '100%', height: '42px', border: '2px solid #CBD5E1', fontWeight: 500, color: '#000000', borderRadius: '6px', padding: '0 10px' }}
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="View">View Only (Analytics Access)</option>
                  <option value="Manager">Manager (Approval, Personnel Board, Monthly Settlement)</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#000000', marginBottom: '4px', textTransform: 'uppercase' }}>Division / Block Scope (Optional)</label>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%', height: '42px', border: '1px solid #CBD5E1', fontWeight: 400, color: '#000000', borderRadius: '6px', padding: '0 12px', boxSizing: 'border-box' }}
                  placeholder="Leave blank for All Divisions"
                  value={newUser.estate}
                  onChange={(e) => setNewUser({ ...newUser, estate: e.target.value })}
                />
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 400, marginTop: '4px' }}>
                  Optional label or division restriction for this user account.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setIsAddingUser(false)}
                  style={{ flex: 1, height: '42px', fontWeight: 500, color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px' }}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  style={{ flex: 1, height: '42px', fontWeight: 500, borderRadius: '6px' }}
                  disabled={formLoading}
                >
                  {formLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal Dialog */}
      {showResetPasswordModal && resetModalUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '2px solid #000000',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            position: 'relative',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} style={{ color: '#3F8432' }} />
                Reset User Password
              </h3>
              <button
                onClick={() => { setShowResetPasswordModal(false); setResetModalUser(null); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#000000' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#000000', fontWeight: 500 }}>
              Generate or assign a new password for: <strong style={{ color: '#3F8432' }}>{resetModalUser.email}</strong>
            </p>

            {resetErrorMsg && (
              <div style={{ background: '#FEF2F2', border: '2px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, marginBottom: '14px' }}>
                {resetErrorMsg}
              </div>
            )}

            {resetSuccessMsg && (
              <div style={{ background: 'transparent', border: 'none', color: '#3F8432', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, marginBottom: '14px' }}>
                {resetSuccessMsg}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: '#000000', textTransform: 'uppercase' }}>
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{
                      background: '#F1F5F9',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#000000',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={12} style={{ color: '#3F8432' }} /> Auto-Generate
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 4 chars)"
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 40px 0 12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#000000',
                        border: '2px solid #000000',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        boxSizing: 'border-box'
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#000000'
                      }}
                    >
                      {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    style={{
                      padding: '0 14px',
                      height: '42px',
                      borderRadius: '6px',
                      border: '2px solid #CBD5E1',
                      background: copiedPassword ? '#F3F8EF' : '#FFFFFF',
                      color: copiedPassword ? '#3F8432' : '#000000',
                      fontWeight: 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Copy password to clipboard"
                  >
                    <Copy size={14} /> {copiedPassword ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => { setShowResetPasswordModal(false); setResetModalUser(null); }}
                  style={{
                    flex: 1,
                    height: '42px',
                    fontWeight: 500,
                    color: '#000000',
                    border: '2px solid #CBD5E1',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    cursor: 'pointer'
                  }}
                  disabled={resetLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    height: '42px',
                    fontWeight: 500,
                    borderRadius: '6px',
                    background: '#3F8432',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  disabled={resetLoading}
                >
                  {resetLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Dual-Path Excel/CSV Upload & Header Mapping Modal */}
      <ExcelCsvUploadModal
        isOpen={uploadModalOpen}
        uploadType={uploadModalType}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          loadEmployees();
          loadUsers();
        }}
        showToast={showToast}
      />

      {/* Edit role & estate pop-up */}
      {editAccess && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', zIndex: 999998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <div style={{ display: 'flex' }}><Edit2 size={22} color="#3F8432" /></div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#0F172A', margin: 0 }}>Edit user</h3>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>Login email, role and estate</div>
              </div>
            </div>
            <div style={{ margin: '20px 0 14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#000000', marginBottom: '4px', textTransform: 'uppercase' }}>Login Email (ID)</label>
              <input
                type="email"
                className="search-input"
                style={{ width: '100%', height: '42px', padding: '0 12px', fontSize: '13px', fontWeight: 500, color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px', boxSizing: 'border-box' }}
                value={editAccess.email}
                onChange={(e) => setEditAccess({ ...editAccess, email: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#000000', marginBottom: '4px', textTransform: 'uppercase' }}>System Role</label>
              <select
                className="select-input"
                style={{ width: '100%', height: '42px', border: '2px solid #CBD5E1', fontWeight: 500, color: '#000000', borderRadius: '6px', padding: '0 10px' }}
                value={editAccess.role}
                onChange={(e) => setEditAccess({ ...editAccess, role: e.target.value })}
              >
                <option value="View">View Only (Analytics Access)</option>
                <option value="Manager">Manager (Approval, Personnel Board, Monthly Settlement)</option>
              </select>
            </div>
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#000000', marginBottom: '4px', textTransform: 'uppercase' }}>Division / Block Scope (Optional)</label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', height: '42px', border: '1px solid #CBD5E1', fontWeight: 400, color: '#000000', borderRadius: '6px', padding: '0 12px', boxSizing: 'border-box' }}
                placeholder="Leave blank for All Divisions"
                value={editAccess.estate}
                onChange={(e) => setEditAccess({ ...editAccess, estate: e.target.value })}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#0F172A', marginBottom: '18px', cursor: 'pointer' }}>
              <input type="checkbox" checked={editAccess.notify} onChange={(e) => setEditAccess({ ...editAccess, notify: e.target.checked })} />
              Email the person about this change
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setEditAccess(null)} disabled={savingAccess}
                style={{ flex: 1, height: '42px', fontWeight: 500, color: '#000000', border: '2px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={saveAccess} disabled={savingAccess}
                style={{ flex: 1, height: '42px', fontWeight: 500, color: '#FFFFFF', border: 'none', borderRadius: '6px', background: '#3F8432', cursor: savingAccess ? 'not-allowed' : 'pointer' }}>
                {savingAccess ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      <NoticeModal isOpen={!!notice} title={notice?.title} message={notice?.message} type={notice?.type} onClose={() => setNotice(null)} />

      {/* Custom Toast & Confirm Dialog Containers */}
      <ToastContainer toasts={toasts} removeToast={removeToast} onViewLogs={() => { handleTabChange('logs'); scrollPageTop(); }} />
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
