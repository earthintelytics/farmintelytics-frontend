import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Dropdown with checkboxes: pick any number of values. An empty selection means "All".
 * options: [{ value, label }] (no counts are shown in dropdowns)
 */
export default function MultiSelectFilter({ label, allLabel, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = (value) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const summary = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label ?? selected[0])
      : `${selected.length} selected`;

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', position: 'relative' }}>
      <span style={{ fontSize: '12px', fontWeight: 900, color: '#000000', whiteSpace: 'nowrap' }}>{label}:</span>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: '100%', minWidth: '150px', height: '38px', fontSize: '12px', fontWeight: 800, color: '#000000',
          border: `2px solid ${selected.length ? 'var(--clr-brand-primary, #3F8432)' : '#CBD5E1'}`,
          borderRadius: '6px', padding: '0 10px', background: '#FFFFFF', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</span>
        <ChevronDown size={14} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 50, minWidth: '240px', maxWidth: '360px',
            background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.12)', padding: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px 8px', borderBottom: '1px solid #E2E8F0', marginBottom: '4px' }}>
            <button type="button" onClick={() => onChange(options.map(o => o.value))}
              style={{ background: 'none', border: 'none', color: 'var(--clr-brand-primary, #3F8432)', fontWeight: 800, fontSize: '12px', cursor: 'pointer', padding: 0 }}>
              Select all
            </button>
            <button type="button" onClick={() => onChange([])} disabled={selected.length === 0}
              style={{ background: 'none', border: 'none', color: selected.length ? '#DC2626' : '#94A3B8', fontWeight: 800, fontSize: '12px', cursor: selected.length ? 'pointer' : 'default', padding: 0 }}>
              Clear
            </button>
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {options.map(o => (
              <label key={o.value}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#000000' }}>
                <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)}
                  style={{ width: '15px', height: '15px', accentColor: 'var(--clr-brand-primary, #3F8432)', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.label}>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
