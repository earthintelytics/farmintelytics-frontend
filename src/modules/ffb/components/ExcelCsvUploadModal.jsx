import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, 
  ArrowRight, X, Table, Check, RefreshCw, Users, ShieldAlert,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import { API } from '../services/api';

const SYSTEM_FIELDS = [
  { key: 'employee_id', label: 'Employee ID *', required: true, aliases: ['employee_id', 'employeeid', 'employe_id', 'employeid', 'emp_id', 'id', 'worker_id', 'staff_id', 'staff_no'] },
  { key: 'first_name', label: 'First Name *', required: true, aliases: ['first_name', 'firstname', 'first', 'fname'] },
  { key: 'last_name', label: 'Last Name / Name *', required: true, aliases: ['last_name', 'lastname', 'surname', 'lname', 'name'] },
  { key: 'function', label: 'Role / Operation / Function', required: false, aliases: ['function', 'role', 'designation', 'operation', 'job'] },
  { key: 'division', label: 'Division / Sector', required: false, aliases: ['division', 'dept', 'sector'] },
  { key: 'team', label: 'Team / Group', required: false, aliases: ['team', 'gang', 'unit'] },
  { key: 'contractor', label: 'Contractor / Company', required: false, aliases: ['contractor', 'company', 'agency'] },
  { key: 'worker_status', label: 'Status (Active / Inactive)', required: false, aliases: ['worker_status', 'workerstatus', 'status', 'is_active', 'active', 'state', 'condition', 'employment_status', 'employmentstatus', 'active_status'] },
  { key: 'date_added', label: 'Date Added / Registered', required: false, aliases: ['date_added', 'date', 'created_at', 'registered', 'joined'] },
];

import { normalizeWorkerStatus } from '../utils/workerStatus';
export { normalizeWorkerStatus };


// Operator IDs look like HAC30148 / CL00038; worker IDs are numeric.
const looksLikeEmployeeId = (v) => /^[A-Za-z]{0,4}\d{3,}$/.test(String(v || '').trim());

export function ExcelCsvUploadModal({ isOpen, onClose, onSuccess, uploadType = 'workers', showToast }) {
  const [step, setStep] = useState(1); // 1 = Mapping, 2 = Preview & Ingest
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetData, setSheetData] = useState([]);
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [previewRows, setPreviewRows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState('');

  const isClerks = uploadType === 'clerks';

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setFile(null);
      setFileName('');
      setWorkbook(null);
      setSheetNames([]);
      setSelectedSheet('');
      setSheetData([]);
      setFileHeaders([]);
      setFieldMapping({});
      setPreviewRows([]);
      setParseError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle file drop or selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setParseError('');
    setStep(1);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Auto-select preferred sheet
        let defaultSheet = wb.SheetNames[0];
        if (isClerks) {
          const clerkSheet = wb.SheetNames.find(s => s.toLowerCase().includes('recorder') || s.toLowerCase().includes('counter') || s.toLowerCase().includes('clerk'));
          if (clerkSheet) defaultSheet = clerkSheet;
        } else {
          const workerSheet = wb.SheetNames.find(s => s.toLowerCase().includes('cutter') || s.toLowerCase().includes('carrier') || s.toLowerCase().includes('worker'));
          if (workerSheet) defaultSheet = workerSheet;
        }

        setSelectedSheet(defaultSheet);
        loadSheetData(wb, defaultSheet);
      } catch (err) {
        setParseError('Failed to parse spreadsheet: ' + (err.message || 'Corrupted file format'));
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Load rows and headers for a sheet
  const loadSheetData = (wb, sheetName) => {
    try {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;

      const rawJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (!rawJson || rawJson.length === 0) {
        setParseError(`Sheet "${sheetName}" is empty.`);
        setSheetData([]);
        setFileHeaders([]);
        return;
      }

      // Find first row with non-empty strings as headers
      let headerIdx = 0;
      for (let i = 0; i < Math.min(5, rawJson.length); i++) {
        const nonEmptyCount = rawJson[i].filter(cell => String(cell).trim().length > 0).length;
        if (nonEmptyCount >= 2) {
          headerIdx = i;
          break;
        }
      }

      // Keep every column at its real position so a mapped header always reads its own column.
      // Blank headers become "Column N"; duplicate names get a numeric suffix.
      const headerRow = rawJson[headerIdx];
      let lastCol = headerRow.length - 1;
      while (lastCol >= 0 && !String(headerRow[lastCol] ?? '').trim()) lastCol--;
      const seen = {};
      const headers = headerRow.slice(0, lastCol + 1).map((h, i) => {
        const base = String(h ?? '').trim() || `Column ${i + 1}`;
        seen[base] = (seen[base] || 0) + 1;
        return seen[base] > 1 ? `${base} (${seen[base]})` : base;
      });
      const rows = rawJson.slice(headerIdx + 1).filter(r => r.some(cell => String(cell).trim().length > 0));

      setFileHeaders(headers);
      setSheetData(rows);

      // Auto-map matching headers to system fields
      // Auto-map matching headers to system fields with strict collision avoidance
      const initialMap = {};
      const usedHeaders = new Set();

      // Special rule: For operators (Recorders & Counters), CONTRACTOR column holds the Employee IDs (e.g. HAC30148, CL00038)
      const contractorH = headers.find(h => /^contractor$/i.test(h.trim()));
      const hasExplicitEmpId = headers.some(h => /^(employee_?id|staff_?id|worker_?id)$/i.test(h.trim()));
      const contractorIdx = contractorH ? headers.indexOf(contractorH) : -1;
      const sampleVals = rows.slice(0, 10).map(r => r[contractorIdx]).filter(v => String(v ?? '').trim());
      const contractorHoldsIds = sampleVals.length > 0 && sampleVals.every(looksLikeEmployeeId);
      if (isClerks && contractorH && !hasExplicitEmpId && contractorHoldsIds) {
        initialMap.employee_id = contractorH;
        usedHeaders.add(contractorH);
      }

      // Priority 1: Exact Matches (cleanH === cleanAlias)
      SYSTEM_FIELDS.forEach(sf => {
        if (initialMap[sf.key]) return;
        for (const alias of sf.aliases) {
          const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = headers.find(h => {
            if (usedHeaders.has(h)) return false;
            if (sf.key === 'employee_id' && /^(s\/?n|no|sn|index)$/i.test(h.trim())) return false;
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanH === cleanAlias;
          });
          if (match) {
            initialMap[sf.key] = match;
            usedHeaders.add(match);
            break;
          }
        }
      });

      // Priority 2: Partial/Contains Matches (preventing first_name / last_name collisions)
      SYSTEM_FIELDS.forEach(sf => {
        if (initialMap[sf.key]) return;
        for (const alias of sf.aliases) {
          const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = headers.find(h => {
            if (usedHeaders.has(h)) return false;
            if (sf.key === 'employee_id' && /^(s\/?n|no|sn|index)$/i.test(h.trim())) return false;
            if (sf.key === 'last_name' && /first/i.test(h)) return false;
            if (sf.key === 'first_name' && /(last|sur)/i.test(h)) return false;
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanH.includes(cleanAlias);
          });
          if (match) {
            initialMap[sf.key] = match;
            usedHeaders.add(match);
            break;
          }
        }
      });

      // Fallback for Operators: if operation column exists, map to function
      if (isClerks && !initialMap.function) {
        const opCol = headers.find(h => /operation/i.test(h));
        if (opCol && !usedHeaders.has(opCol)) initialMap.function = opCol;
      }

      setFieldMapping(initialMap);
      updatePreview(headers, rows, initialMap);
    } catch (err) {
      setParseError('Error parsing sheet rows: ' + err.message);
    }
  };

  const handleSheetChange = (newSheet) => {
    setSelectedSheet(newSheet);
    if (workbook) {
      loadSheetData(workbook, newSheet);
    }
  };

  const handleMappingChange = (sysKey, headerVal) => {
    const updated = { ...fieldMapping, [sysKey]: headerVal };
    setFieldMapping(updated);
    updatePreview(fileHeaders, sheetData, updated);
  };

  // Generate 5-row preview based on current mapping
  const updatePreview = (headers, rows, mapping) => {
    if (!rows || rows.length === 0) {
      setPreviewRows([]);
      return;
    }

    const sample = rows.slice(0, 5).map(row => {
      const getVal = (sysKey) => {
        const mappedHeader = mapping[sysKey];
        if (!mappedHeader) return '';
        const idx = headers.indexOf(mappedHeader);
        return idx !== -1 ? String(row[idx] || '').trim() : '';
      };

      const rawEmpId = getVal('employee_id');
      let rawRole = getVal('function');

      if (isClerks) {
        if (/counter/i.test(rawRole)) rawRole = 'Loading Role';
        else if (/recorder/i.test(rawRole)) rawRole = 'Harvester Role';
      }

      const rawStatus = getVal('worker_status');
      const status = normalizeWorkerStatus(rawStatus);

      // Intelligent name deduplication
      const rawFName = getVal('first_name');
      const rawLName = getVal('last_name');
      let finalFirstName = rawFName;
      let finalLastName = rawLName;
      if (rawFName && (!rawLName || rawFName.toLowerCase() === rawLName.toLowerCase())) {
        const parts = rawFName.trim().split(/\s+/);
        if (parts.length > 1) {
          finalFirstName = parts[0];
          finalLastName = parts.slice(1).join(' ');
        } else {
          finalFirstName = parts[0];
          finalLastName = '';
        }
      }

      return {
        employee_id: rawEmpId,
        first_name: finalFirstName,
        last_name: finalLastName,
        function: rawRole,
        division: getVal('division'),
        team: getVal('team'),
        contractor: getVal('contractor'),
        worker_status: status,
        date_added: getVal('date_added'),
      };
    });

    setPreviewRows(sample);
  };

  const { activeDetectedCount, inactiveDetectedCount } = useMemo(() => {
    if (!sheetData || sheetData.length === 0) return { activeDetectedCount: 0, inactiveDetectedCount: 0 };
    let inactive = 0;
    sheetData.forEach(row => {
      let rawStatus = '';
      if (fieldMapping.worker_status) {
        const idx = fileHeaders.indexOf(fieldMapping.worker_status);
        if (idx !== -1) rawStatus = String(row[idx] || '').trim();
      }
      if (normalizeWorkerStatus(rawStatus) === 'Inactive') {
        inactive++;
      }
    });
    return {
      activeDetectedCount: sheetData.length - inactive,
      inactiveDetectedCount: inactive
    };
  }, [sheetData, fieldMapping, fileHeaders]);

  const handleProceedToPreview = () => {
    if (!fieldMapping.employee_id) {
      if (showToast) showToast('Please map a column for Employee ID.', 'warning');
      return;
    }
    if (!fieldMapping.first_name) {
      if (showToast) showToast('Please map a column for First Name.', 'warning');
      return;
    }
    if (!fieldMapping.last_name) {
      if (showToast) showToast('Please map a column for Last Name.', 'warning');
      return;
    }
    updatePreview(fileHeaders, sheetData, fieldMapping);
    setStep(2);
  };

  // Execute database import
  const handleImport = async () => {
    if (!fieldMapping.employee_id) {
      if (showToast) showToast('Please select a column for Employee ID.', 'warning');
      return;
    }
    if (!fieldMapping.first_name) {
      if (showToast) showToast('Please select a column for First Name.', 'warning');
      return;
    }
    if (!fieldMapping.last_name) {
      if (showToast) showToast('Please select a column for Last Name.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const recordsToImport = sheetData.map(row => {
        const getVal = (sysKey) => {
          const mappedHeader = fieldMapping[sysKey];
          if (!mappedHeader) return '';
          const idx = fileHeaders.indexOf(mappedHeader);
          return idx !== -1 ? String(row[idx] || '').trim() : '';
        };

        const empId = getVal('employee_id');
        if (!empId) return null;

        let role = getVal('function');
        if (isClerks) {
          if (/counter/i.test(role)) role = 'Loading Role';
          else if (/recorder/i.test(role)) role = 'Harvester Role';
        }
        // Role conversion and unknown-role skipping happen on the backend.

        const rawStatus = getVal('worker_status');
        const status = normalizeWorkerStatus(rawStatus);

        const rawDateAdded = getVal('date_added');
        let parsedDateAdded = null;
        if (rawDateAdded) {
          try {
            const d = new Date(rawDateAdded);
            if (!isNaN(d.getTime())) parsedDateAdded = d.toISOString();
          } catch (e) {}
        }

        // Intelligent name deduplication
        const rawFName = getVal('first_name');
        const rawLName = getVal('last_name');
        let finalFirstName = rawFName;
        let finalLastName = rawLName;
        if (rawFName && (!rawLName || rawFName.toLowerCase() === rawLName.toLowerCase())) {
          const parts = rawFName.trim().split(/\s+/);
          if (parts.length > 1) {
            finalFirstName = parts[0];
            finalLastName = parts.slice(1).join(' ');
          } else {
            finalFirstName = parts[0];
            finalLastName = '';
          }
        }

        return {
          employee_id: empId,
          first_name: finalFirstName,
          last_name: finalLastName,
          function: role,
          operation: role,
          division: getVal('division') || null,
          team: getVal('team') || null,
          contractor: getVal('contractor') || null,
          worker_status: status,
          date_added: parsedDateAdded
        };
      }).filter(Boolean);

      if (recordsToImport.length === 0) {
        throw new Error('No valid records found to import. Ensure Employee ID column has values.');
      }

      const res = await API.bulkCreateEmployees(recordsToImport);
      const skippedRoles = (res?.skipped_unknown_role_count || 0) + (res?.skipped_blank_ids || 0);

      if (showToast) {
        const dupNote = res?.duplicates_in_file ? `, ${res.duplicates_in_file} duplicate IDs merged` : '';
        const skipNote = skippedRoles > 0 ? ` ${skippedRoles} row(s) skipped (unknown role or blank ID)${dupNote}.` : (dupNote ? ` ${dupNote.slice(2)}.` : '');
        showToast(`Imported ${res?.processed ?? recordsToImport.length} ${isClerks ? 'clerks' : 'farm workers'} (${res?.inserted ?? 0} new, ${res?.updated ?? 0} updated).${skipNote}`, 'success');
        const invalid = res?.invalid_ids || [];
        if (invalid.length) {
          showToast(
            `${invalid.length} row(s) not imported because the ID is not valid (letters, digits and dashes only): ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? ', …' : ''}.`,
            'error'
          );
        }
        const conflicts = res?.id_conflicts || [];
        if (conflicts.length) {
          const list = conflicts.slice(0, 5).map(c => `${c.employee_id} (clashes with ${c.conflicts_with})`).join(', ');
          showToast(
            `${conflicts.length} row(s) not imported because the ID would scan as another worker's QR: ${list}${conflicts.length > 5 ? ', …' : ''}.`,
            'error'
          );
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setParseError(err.message || 'Failed to import records.');
      if (showToast) showToast(err.message || 'Import failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #E2E8F0',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 500, color: '#0F172A', margin: 0 }}>
                {isClerks ? 'Upload Field Supervisors & Roles' : 'Upload Farm Workers & Harvesters'}
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: '#0f172a', margin: '4px 0 0 0', fontWeight: 400 }}>
              {step === 1 
                ? 'Step 1 of 2: Select file, sheet, and map column headers.'
                : 'Step 2 of 2: Review mapped data preview before synchronizing to database.'}
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* STEP 1: FILE SELECTION & HEADER MAPPING */}
          {step === 1 && (
            <>
              {/* File Picker & Sheet Selector */}
              <div style={{
                background: '#FFFFFF',
                border: '2px dashed #CBD5E1',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                {!file ? (
                  <>
                    <div style={{ background: '#F1F5F9', padding: '14px', borderRadius: '50%', color: '#0F172A' }}>
                      <UploadCloud size={32} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 500, color: '#0F172A' }}>
                        Select an Excel (.xlsx, .xls) or CSV (.csv) file
                      </div>
                      <div style={{ fontSize: '12px', color: '#0f172a', marginTop: '4px' }}>
                        Supports multi-sheet workbooks and standard CSV files.
                      </div>
                    </div>
                    <label style={{
                      background: '#3F8432',
                      color: '#FFFFFF',
                      fontWeight: 500,
                      fontSize: '13px',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <FileSpreadsheet size={16} /> Browse File
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </>
                ) : (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '10px', color: '#0F172A' }}>
                        <FileSpreadsheet size={24} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{fileName}</div>
                        <div style={{ fontSize: '12px', color: '#0f172a' }}>
                          {sheetData.length} data rows found {sheetNames.length > 1 ? `(${sheetNames.length} sheets in workbook)` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {sheetNames.length > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>Sheet:</span>
                          <select
                            value={selectedSheet}
                            onChange={(e) => handleSheetChange(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1.5px solid #3F8432',
                              background: '#FFFFFF',
                              fontWeight: 500,
                              fontSize: '13px',
                              color: '#3F8432'
                            }}
                          >
                            {sheetNames.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <label style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#0F172A',
                        cursor: 'pointer'
                      }}>
                        Change File
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {parseError && (
                <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', padding: '12px 16px', color: '#0F172A', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} /> {parseError}
                </div>
              )}

              {/* Column Mapping Section - 2-Column Scrollable Table */}
              {fileHeaders.length > 0 && (
                <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: '#0f172a', margin: 0 }}>
                        Map each database attribute on the left to its corresponding spreadsheet column on the right.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#3F8432', border: '1px solid #BBF7D0', padding: '4px 10px', borderRadius: '6px' }}>
                        {Object.values(fieldMapping).filter(Boolean).length} of {SYSTEM_FIELDS.length} Fields Mapped
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Mapping Table with Scrollable Body */}
                  <div style={{ border: '1.5px solid #CBD5E1', borderRadius: '10px', overflow: 'hidden', background: '#FFFFFF' }}>
                    {/* Header Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      background: '#F8FAFC',
                      borderBottom: '2px solid #E2E8F0',
                      padding: '12px 18px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#0F172A',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      <div>Database Attribute (System Field)</div>
                      <div>Spreadsheet Column (Mapping)</div>
                    </div>

                    {/* Scrollable Rows */}
                    <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                      {SYSTEM_FIELDS.map((field, idx) => {
                        const isMapped = Boolean(fieldMapping[field.key]);
                        return (
                          <div 
                            key={field.key}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              alignItems: 'center',
                              padding: '12px 18px',
                              borderBottom: idx === SYSTEM_FIELDS.length - 1 ? 'none' : '1px solid #E2E8F0',
                              background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                              gap: '16px',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            {/* Column 1: System Field */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: '12px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A' }}>
                                {field.label}
                              </span>
                              {isMapped ? (
                                <span style={{ fontSize: '11px', color: '#3F8432', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', borderRadius: '4px' }}>
                                  <Check size={12} /> Mapped
                                </span>
                              ) : field.required ? (
                                <span style={{ fontSize: '11px', color: '#B91C1C', fontWeight: 500, background: '#FEE2E2', padding: '2px 8px', borderRadius: '4px' }}>
                                  Required
                                </span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: 500, background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                                  Optional
                                </span>
                              )}
                            </div>

                            {/* Column 2: Map Selector */}
                            <div>
                              <select
                                value={fieldMapping[field.key] || ''}
                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: isMapped ? '1.5px solid #3F8432' : '1.5px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  color: fieldMapping[field.key] ? '#0F172A' : '#64748B',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="">-- Do Not Map --</option>
                                {fileHeaders.map(h => (
                                  <option key={h} value={h}>Column: {h}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: REVIEW PREVIEW & INGEST */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 500, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Table size={18} color="#0F172A" /> Ingestion Preview (First 5 Rows)
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#0f172a' }}>
                      Review how mapped fields will be stored in the database.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#3F8432', fontWeight: 500, background: 'transparent', border: 'none', padding: '4px 10px', borderRadius: '6px' }}>
                      {activeDetectedCount} Active
                    </span>
                    {inactiveDetectedCount > 0 && (
                      <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 500, background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '6px' }}>
                        {inactiveDetectedCount} Inactive
                      </span>
                    )}
                    <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: 500, background: '#F8FAFC', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '6px' }}>
                      {sheetData.length} Total Records
                    </span>
                  </div>
                </div>

                {/* Status rule reminder */}
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '14px',
                  fontSize: '12px',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} color="#3F8432" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Status Rule:</strong> All personnel default to <strong>Active</strong>. Only records explicitly indicated as <em>Inactive / Deactivated / Suspended / Left</em> will be set to Inactive.
                  </span>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>EMP ID</th>
                        <th style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>FULL NAME</th>
                        <th style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>ASSIGNED ROLE</th>
                        <th style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>DIVISION</th>
                        <th style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>CONTRACTOR</th>
                        <th style={{ padding: '10px 14px', color: '#0F172A', fontWeight: 500 }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #E2E8F0', background: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 500, color: '#0F172A' }}>
                            #{r.employee_id || 'MISSING'}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 500, color: '#0F172A' }}>
                            {[r.first_name, r.last_name].filter(Boolean).join(' ') || 'MISSING NAME'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              background: '#F1F5F9',
                              color: '#0F172A',
                              border: '1px solid #CBD5E1'
                            }}>
                              {r.function}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 500 }}>{r.division}</td>
                          <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 500 }}>{r.contractor}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 500,
                              background: r.worker_status === 'Active' ? '#F3F8EF' : '#F1F5F9',
                              color: r.worker_status === 'Active' ? '#3F8432' : '#475569',
                              border: `1px solid ${r.worker_status === 'Active' ? '#BBF7D0' : '#CBD5E1'}`
                            }}>
                              {r.worker_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#FFFFFF'
        }}>
          <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 400 }}>
            {sheetData.length > 0 ? (
              <span>Mapping <strong>{sheetData.length} records</strong> from sheet: <strong style={{ color: '#3F8432' }}>{selectedSheet}</strong></span>
            ) : (
              <span>Please select a file to begin header mapping.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {step === 1 ? (
              <>
                <button
                  onClick={onClose}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleProceedToPreview}
                  disabled={sheetData.length === 0 || !fieldMapping.employee_id}
                  style={{
                    padding: '9px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: sheetData.length > 0 && fieldMapping.employee_id ? '#3F8432' : '#94A3B8',
                    color: '#FFFFFF',
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: sheetData.length > 0 && fieldMapping.employee_id ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Next: Preview Mapped Data <ArrowRight size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep(1)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ChevronLeft size={16} /> Back to Mapping
                </button>

                <button
                  onClick={handleImport}
                  disabled={isSubmitting || sheetData.length === 0 || !fieldMapping.employee_id}
                  style={{
                    padding: '9px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#3F8432',
                    color: '#FFFFFF',
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Ingesting to Database
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Ingest {sheetData.length} Records to DB
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
export default ExcelCsvUploadModal;
