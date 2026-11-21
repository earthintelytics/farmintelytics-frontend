import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { STATUS_CHOICES, DEFAULT_STATUSES, selectedStatuses, statusSummary } from '../utils/reconStatus';

/**
 * Reconciliation status filter: a dropdown whose options each have a checkbox on the left.
 * value = ticked statuses (see utils/reconStatus.js); at least one stays ticked.
 */
export function StatusFilter({ value, onChange, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = selectedStatuses(value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const allIssues = DEFAULT_STATUSES.every(k => selected.includes(k));
  const apply = (next) => {
    if (!next.length) return;   // at least one stays ticked
    onChange(STATUS_CHOICES.map(c => c.value).filter(k => next.includes(k)));
  };
  const toggle = (v) => apply(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  // "All issues" ticks / unticks Pending, Mismatch and Rejected together.
  const toggleAllIssues = () => apply(allIssues
    ? selected.filter(k => !DEFAULT_STATUSES.includes(k))
    : [...new Set([...selected, ...DEFAULT_STATUSES])]);

  return (
    <div ref={ref} className="status-filter" style={style}>
      <button type="button" className="select-input status-filter__button" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        <span className="status-filter__text">{statusSummary(value)}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="status-filter__menu" role="listbox" aria-multiselectable="true">
          <label className="status-filter__option status-filter__option--all">
            <input type="checkbox" checked={allIssues} onChange={toggleAllIssues} />
            <span>All issues</span>
          </label>
          {STATUS_CHOICES.map(c => (
            <label key={c.value} className="status-filter__option">
              <input type="checkbox" checked={selected.includes(c.value)} onChange={() => toggle(c.value)} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
