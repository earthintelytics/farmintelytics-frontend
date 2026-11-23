import { useState, useEffect } from 'react';
import { Download, X, Lock } from 'lucide-react';

/**
 * Reusable modal popup allowing users to select which columns to export to CSV.
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {() => void} onClose - Callback to close modal
 * @param {string} [title="Export CSV — Select Columns"] - Modal header title
 * @param {string} [subtitle="Choose which columns you want included in your exported CSV file."] - Header description
 * @param {Array<{key: string, header: string, isName?: boolean}>} columns - List of available columns
 * @param {Set<string>|Array<string>} [initialSelectedKeys] - Keys selected on open
 * @param {Set<string>|Array<string>} [tableVisibleKeys] - Keys currently visible in parent table
 * @param {(selectedKeys: string[]) => void} onExport - Callback with array of selected keys
 * @param {boolean} [isViewer=false] - Whether current user is a viewer (locks name columns)
 */
export default function ExportColumnsModal({
  isOpen,
  onClose,
  title = 'Export CSV — Select Columns',
  subtitle = 'Choose which columns you want included in your exported CSV file.',
  columns = [],
  initialSelectedKeys,
  tableVisibleKeys,
  onExport,
  isViewer = false,
}) {
  const [selectedCols, setSelectedCols] = useState(new Set());

  // Initialize selection when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const initial = new Set();
    const sourceKeys = initialSelectedKeys
      ? (Array.isArray(initialSelectedKeys) ? initialSelectedKeys : Array.from(initialSelectedKeys))
      : columns.map(c => c.key);

    sourceKeys.forEach(k => {
      const col = columns.find(c => c.key === k);
      if (col && !(col.isName && isViewer)) {
        initial.add(k);
      }
    });

    // If initial is empty, select all non-restricted columns
    if (initial.size === 0) {
      columns.forEach(c => {
        if (!(c.isName && isViewer)) initial.add(c.key);
      });
    }

    setSelectedCols(initial);
  }, [isOpen, columns, initialSelectedKeys, isViewer]);

  if (!isOpen) return null;

  const toggleCol = (key) => {
    setSelectedCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    const next = new Set();
    columns.forEach(c => {
      if (!(c.isName && isViewer)) next.add(c.key);
    });
    setSelectedCols(next);
  };

  const matchVisible = () => {
    const next = new Set();
    const visibleArr = tableVisibleKeys
      ? (Array.isArray(tableVisibleKeys) ? tableVisibleKeys : Array.from(tableVisibleKeys))
      : columns.map(c => c.key);

    visibleArr.forEach(k => {
      const col = columns.find(c => c.key === k);
      if (col && !(col.isName && isViewer)) next.add(k);
    });
    setSelectedCols(next);
  };

  const clearAll = () => {
    setSelectedCols(new Set());
  };

  const handleConfirm = () => {
    if (selectedCols.size === 0) return;
    // Preserve the original columns array order
    const orderedSelected = columns
      .filter(c => selectedCols.has(c.key))
      .map(c => c.key);
    onExport(orderedSelected);
    onClose();
  };

  return (
    <div className="export-modal-backdrop" onClick={onClose}>
      <div className="export-modal-card" onClick={e => e.stopPropagation()}>
        <div className="export-modal-header">
          <div>
            <h3 className="export-modal-title">
              <Download size={20} color="var(--clr-brand-primary)" />
              {title}
            </h3>
            <p className="export-modal-subtitle">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            className="export-modal-close"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="export-modal-toolbar">
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>
            Quick Selection:
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="export-modal-btn-pill" onClick={selectAll}>
              Select All
            </button>
            <button type="button" className="export-modal-btn-pill" onClick={matchVisible}>
              Match Table Visible
            </button>
            <button type="button" className="export-modal-btn-pill" onClick={clearAll}>
              Clear All
            </button>
          </div>
        </div>

        <div className="export-modal-body">
          {columns.map(col => {
            const isChecked = selectedCols.has(col.key);
            const isRestricted = col.isName && isViewer;
            return (
              <label
                key={col.key}
                className={`export-col-option ${isChecked ? 'export-col-option--selected' : ''} ${isRestricted ? 'export-col-option--disabled' : ''}`}
                title={isRestricted ? 'Viewer accounts cannot export worker names' : undefined}
                onClick={e => {
                  if (isRestricted) {
                    e.preventDefault();
                  }
                }}
              >
                <input
                  type="checkbox"
                  className="export-col-checkbox"
                  checked={isRestricted ? false : isChecked}
                  disabled={isRestricted}
                  onChange={() => toggleCol(col.key)}
                />
                <span style={{ flex: 1 }}>{col.header}</span>
                {isRestricted && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                    <Lock size={11} /> Locked
                  </span>
                )}
              </label>
            );
          })}
        </div>

        <div className="export-modal-footer">
          <span className="export-modal-summary">
            {selectedCols.size} of {columns.length} columns selected
          </span>
          <div className="export-modal-actions">
            <button
              type="button"
              className="btn btn--outline"
              style={{ height: '38px', padding: '0 16px', fontSize: '13px', borderRadius: '8px', fontWeight: 500 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={selectedCols.size === 0}
              style={{
                height: '38px', padding: '0 18px', fontSize: '13px', borderRadius: '8px', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '8px',
                opacity: selectedCols.size === 0 ? 0.5 : 1,
                cursor: selectedCols.size === 0 ? 'not-allowed' : 'pointer'
              }}
              onClick={handleConfirm}
            >
              <Download size={15} />
              Export {selectedCols.size > 0 ? `(${selectedCols.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
