import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, CalendarDays, Printer, Check, ChevronDown, X } from 'lucide-react';
import { API } from '../services/api';
import { LOGO_ICON } from '../utils/icons';
import { fmtNumber } from '../utils/formatters';

// Public page (no sign-in): choose one or more harvester roles (the recorders) from a searchable dropdown, pick dates (the last
// 30 days), and see what each clerk recorded in four tabs: Approved (the default), Pending, Mismatch and Rejected. The
// server returns totals only (see api/route/public_lookup.py).

const GREEN = '#3F8432';
const AMBER = '#B45309';
const RED = '#B91C1C';
const SLATE = '#334155';   // Rejected: dark slate, never red, so it cannot be mistaken for a mismatch (same as the dashboard)
const INK = '#0f172a';
const TABS = [['approved', 'Approved', GREEN], ['pending', 'Pending', AMBER], ['mismatch', 'Mismatch', RED], ['rejected', 'Rejected', SLATE]];

const label = { fontSize: '12px', fontWeight: 500, color: INK, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '6px', display: 'block' };
const field = { width: '100%', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 12px', fontSize: '15px', fontWeight: 400, color: INK, background: '#ffffff', fontFamily: 'inherit' };
const th = { textAlign: 'left', fontSize: '12px', fontWeight: 500, color: INK, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '12px 14px', borderBottom: `2px solid ${INK}` };
const num = { textAlign: 'right' };
const td = { padding: '13px 14px', fontSize: '14px', color: INK, borderBottom: '1px solid #e2e8f0' };
const quick = { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '999px', padding: '7px 15px', fontSize: '13px', fontWeight: 500, color: INK, cursor: 'pointer', fontFamily: 'inherit' };

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
// The calendar cannot go back further than 30 days (today and the 29 days before it), nor forward past today.
const LOOKBACK_DAYS = 30;
const minDate = () => daysAgo(LOOKBACK_DAYS - 1);
const clampDate = (v) => (!v ? v : v < minDate() ? minDate() : v > daysAgo(0) ? daysAgo(0) : v);

const COLS = [['records', 'Records'], ['bunches', 'Bunches'], ['unripe', 'Unripe'], ['rotten', 'Rotten'], ['kg', 'Loose Fruit (kg)']];
const NUM_COLS = COLS.map(([k]) => k);
const LABEL = Object.fromEntries(COLS);

// Zeros are not shown: a dash on a computer, nothing at all on a phone (the cell is hidden there).
const isZero = (v) => !Number(v);
const PAGE_SIZE_PHONE = 5;
const PAGE_SIZE_COMPUTER = 20;

// The clerks' rows of one status, and how many different operators have something in it (a clerk counts once, however
// many records they have).
const rowsOf = (data, status) => data.clerks.map(c => (status === 'approved' ? c : { ...c, ...(c.by_status?.[status] || { workers: 0, plots: [], lines: [], total: { records: 0, bunches: 0, unripe: 0, rotten: 0, kg: 0 } }) }));
// The printout: each clerk is their own table (name at the top), one line per record.
const when = (t) => {
  const d = t ? new Date(t) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};
const LINE_COLS = [['bunches', 'Bunches'], ['unripe', 'Unripe'], ['rotten', 'Rotten'], ['kg', 'Loose Fruit (kg)']];

// Every record of the clerk, whatever its status, with the status beside it: approved first, then pending, mismatch
// and rejected, each in time order.
const linesOfClerk = (c) => TABS.flatMap(([key, name], order) =>
  ((key === 'approved' ? c.lines : c.by_status?.[key]?.lines) || []).map(l => ({ ...l, status: name, order })))
  .sort((x, y) => x.order - y.order || String(x.time).localeCompare(String(y.time)));

function PrintedLines({ operators }) {
  const blocks = operators.map(c => ({ ...c, all: linesOfClerk(c) })).filter(c => c.all.length > 0);
  if (blocks.length === 0) return <p style={{ fontSize: '13px', fontWeight: 500 }}>No records on these dates.</p>;
  return blocks.map(c => {
    const counts = TABS.map(([, name]) => [name, c.all.filter(l => l.status === name).length]).filter(([, n]) => n > 0);
    return (
      <div key={c.clerk_id} className="lk-clerk-block">
        <div className="lk-clerk-head">
          {c.name || 'Clerk'} · {c.clerk_id}
          <span style={{ fontWeight: 400 }}> · {c.all.length} record{c.all.length === 1 ? '' : 's'} ({counts.map(([n, k]) => `${k} ${n.toLowerCase()}`).join(', ')})</span>
        </div>
        <table data-no-tools className="lk-lines">
          <thead>
            <tr>
              <th>#</th><th>Status</th><th>Date and time</th><th>Plot</th><th>Cutter</th><th>Carrier</th><th>Picker (loose fruit)</th>
              {LINE_COLS.map(([k, h]) => <th key={k} className="lk-num">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {c.all.map((l, i) => (
              <tr key={`${l.status}-${l.time}-${i}`}>
                <td>{i + 1}</td>
                <td className="lk-status" style={{ fontWeight: 500 }}><span data-status={l.status}>{l.status}</span></td>
                <td>{when(l.time)}</td><td>{l.plot || '—'}</td>
                <td>{l.cutter || '—'}</td><td>{l.carrier || '—'}</td><td>{l.picker || '—'}</td>
                {LINE_COLS.map(([k]) => <td key={k} className="lk-num">{isZero(l[k]) ? '—' : fmtNumber(l[k])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  });
}

const clerksIn = (data, status) => rowsOf(data, status).filter(c => (c.total.records || 0) > 0).length;

// One aggregate table (a row per worker) for the open tab, in pages so a phone is never one long scroll. Printing
// always prints every row.
function AggTable({ rows, empty, phone, onlyWithRecords }) {
  const [page, setPage] = useState(0);
  // A clerk with nothing is left out on a phone, and always on the Pending, Mismatch and Rejected tabs.
  const shown = phone || onlyWithRecords ? rows.filter(w => w.total.records > 0) : rows;
  const size = phone ? PAGE_SIZE_PHONE : PAGE_SIZE_COMPUTER;
  const pages = Math.max(1, Math.ceil(shown.length / size));
  const current = Math.min(page, pages - 1);
  const pager = { ...quick, minHeight: '40px', padding: '6px 20px' };
  if (shown.length === 0) return <div style={{ fontSize: '15px', fontWeight: 500, padding: '28px 0' }}>{empty}</div>;
  return (
    <div className="lk-summary" style={{ overflowX: 'auto' }}>
      <table data-no-tools className="lk-stack" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
        <thead>
          <tr><th style={th}>Clerk</th><th style={th}>Plots</th><th style={{ ...th, ...num }}>Workers</th>{COLS.map(([k, h]) => <th key={k} style={{ ...th, ...num }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {shown.map((w, i) => (
            <tr key={w.clerk_id} className={Math.floor(i / size) === current ? undefined : 'lk-pg-hide'}>
              <td data-label="Clerk" style={td}><span><span style={{ fontWeight: 500 }}>{w.name || 'Clerk'}</span> <span style={{ fontWeight: 400 }}>· {w.clerk_id}</span></span></td>
              <td data-label="Plots" data-empty={w.plots?.length ? undefined : '1'} style={td}>{w.plots?.length ? w.plots.join(', ') : '—'}</td>
              <td data-label="Workers" data-empty={isZero(w.workers) ? '1' : undefined} style={{ ...td, ...num, fontWeight: isZero(w.workers) ? 600 : 800 }}>{isZero(w.workers) ? '—' : fmtNumber(w.workers)}</td>
              {NUM_COLS.map(k => (
                <td key={k} data-label={LABEL[k]} data-empty={isZero(w.total[k]) ? '1' : undefined} style={{ ...td, ...num, fontWeight: isZero(w.total[k]) ? 600 : 800 }}>
                  {isZero(w.total[k]) ? '—' : fmtNumber(w.total[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 && (
        <div className="lk-screen lk-pager" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '16px' }}>
          <button type="button" className="lk-quick" style={{ ...pager, opacity: current === 0 ? 0.4 : 1 }} disabled={current === 0} onClick={() => setPage(current - 1)}>Previous</button>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Page {current + 1} of {pages}</span>
          <button type="button" className="lk-quick" style={{ ...pager, opacity: current >= pages - 1 ? 0.4 : 1 }} disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}

// What the page looks like on a phone and on paper.
const PAGE_CSS = `
.lk-print-only { display: none; }
tr.lk-pg-hide { display: none !important; }
.lk-quick:hover:not(:disabled) { background: #f1f5f9 !important; }
.lk-tab:focus-visible, .lk-quick:focus-visible { outline: 2px solid ${INK}; outline-offset: 2px; }
/* The search box lives inside the dropdown's own box: no second ring from the portal's global input focus style. */
.lk-page .lk-combo-input, .lk-page .lk-combo-input:focus, .lk-page .lk-combo-input:focus-visible { outline: none !important; box-shadow: none !important; border: none !important; background: transparent !important; }
.lk-tabs { display: flex; flex-wrap: wrap; gap: 10px; }
.lk-tab:not([aria-selected="true"]):hover { background: #f1f5f9 !important; }
.lk-summary tbody tr:hover td { background: #f8fafc; }
/* Phones: no sideways scrolling. Every table row becomes a small list of "label  value" lines. */
@media screen and (max-width: 640px) {
  .lk-page { padding: 18px 16px 48px !important; }
  .lk-title { font-size: 22px !important; }
  .lk-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .lk-tab { width: 100%; justify-content: space-between !important; }
  .lk-page input, .lk-page textarea { font-size: 16px !important; }
  .lk-submit { width: 100% !important; height: 48px !important; }
  .lk-quick { min-height: 40px; }
  .lk-summary { overflow: visible !important; }
  .lk-stack { min-width: 0 !important; }
  .lk-stack, .lk-stack tbody { display: block; width: 100%; }
  .lk-stack thead { display: none; }
  .lk-stack tr { display: block; padding: 10px 0; border-bottom: 1px solid #cbd5e1; }
  .lk-stack td { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0 !important; border-bottom: none !important; text-align: right !important; }
  .lk-stack td::before { content: attr(data-label); font-weight: 500; text-align: left; flex: 0 0 auto; }
  .lk-stack td[data-empty="1"] { display: none; }
}
@media print {
  /* The portal's own print sheet (QR badge cards, polish.css) hides the whole app: show this page again. */
  html.lk-active #root { display: block !important; visibility: visible !important; position: static !important; }
  html.lk-active #root * { visibility: visible !important; }
  @page { size: A4; margin: 14mm; }
  html, body { background: #ffffff !important; }
  body * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .lk-screen { display: none !important; }
  .lk-print-only { display: block !important; }
  tr.lk-pg-hide { display: table-row !important; }
  .lk-root { min-height: 0 !important; }   /* a full-screen height would add a blank second page */
  .lk-page { padding: 0 !important; max-width: none !important; }
  .lk-clerk-block { margin: 0 0 18px; }
  /* The clerk's name: a grey band above their table. */
  .lk-clerk-head { font-size: 13px; font-weight: 500; color: #0f172a !important; background: #e5e7eb !important; border: 1.5px solid #111827; border-bottom: none;
                   padding: 7px 8px; break-after: avoid; }
  .lk-lines { width: 100%; border-collapse: collapse !important; border: 1.5px solid #111827 !important; font-size: 10px; }
  /* Grey heading row and clear, dark grid lines (forced over the portal's own table styles). */
  .lk-lines th { background: #d1d5db !important; color: #0f172a !important; border: 1px solid #111827 !important; padding: 6px !important;
                 text-align: left; font-size: 9.5px !important; font-weight: 500 !important; text-transform: uppercase; }
  .lk-lines td { background: #ffffff !important; color: #0f172a !important; border: 1px solid #4b5563 !important; padding: 5px 6px !important; vertical-align: top; }
  .lk-lines tbody tr:nth-child(even) td { background: #f3f4f6 !important; }   /* every other line in light grey */
  .lk-lines .lk-num { text-align: right !important; white-space: nowrap; }
  .lk-lines td, .lk-lines td *, .lk-lines th * { color: #0f172a !important; }   /* black text only, whatever the portal's table styles say */
  .lk-lines span[data-status="Approved"] { color: #3F8432 !important; }
  .lk-lines span[data-status="Pending"] { color: #B45309 !important; }
  .lk-lines span[data-status="Mismatch"] { color: #B91C1C !important; }
  .lk-lines span[data-status="Rejected"] { color: #334155 !important; }
  .lk-summary table { min-width: 0 !important; width: 100% !important; font-size: 11px; border-collapse: collapse !important; border: 1.5px solid #0f172a !important; }
  .lk-summary th { background: #d1d5db !important; border: 1px solid #111827 !important; padding: 6px 8px !important; font-size: 10.5px !important; }
  .lk-summary td { border: 1px solid #4b5563 !important; padding: 6px 8px !important; font-size: 11px !important; display: table-cell !important; }
  .lk-summary tbody tr:nth-child(even) td { background: #f3f4f6 !important; }
  .lk-summary tr { display: table-row !important; }
  .lk-summary thead { display: table-header-group !important; }
  .lk-summary table, .lk-summary tbody { display: table !important; }
  .lk-summary tbody { display: table-row-group !important; }
  .lk-summary td::before { content: none !important; }
  .lk-summary td[data-empty="1"] { display: table-cell !important; }
  .lk-summary tbody tr:hover td { background: transparent; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
}`;

// The dropdown of harvester roles: always the current list (read from the server each time the page opens and each
// time the list is opened). It shows names only; an ID appears only when two operators share a name. Typing a name (or an
// ID) filters the list and shows the matching letters in bold. Chosen operators come first. Several can be chosen; with
// many chosen the box shows two names and "+N more". Done closes the list and runs the search. Big tap targets and a
// 16 px search box so a phone neither zooms in nor mis-taps.
const CHIPS_SHOWN = 2;

// The typed text in bold inside a name (no tinted background, per the portal's colour rules).
function Highlight({ text, find }) {
  const t = find.trim().toLowerCase();
  const at = t ? text.toLowerCase().indexOf(t) : -1;
  if (at < 0) return text;
  return <>{text.slice(0, at)}<span style={{ fontWeight: 500, textDecoration: 'underline' }}>{text.slice(at, at + t.length)}</span>{text.slice(at + t.length)}</>;
}

function ClerkPicker({ options, selected, onChange, status, onOpen, onRetry, onDone }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const box = useRef(null);
  const activeRow = useRef(null);

  // A name is enough, unless two operators share it: then the ID tells them apart.
  const labelOf = useMemo(() => {
    const seen = new Map();
    options.forEach(o => seen.set(o.name.toLowerCase(), (seen.get(o.name.toLowerCase()) || 0) + 1));
    const byId = new Map(options.map(o => [o.clerk_id, (seen.get(o.name.toLowerCase()) > 1 || !o.name) ? `${o.name || 'Clerk'} (${o.clerk_id})` : o.name]));
    return (id) => byId.get(id) || id;
  }, [options]);

  // What the list shows: matches for the typed text (name or ID), or everyone with the chosen operators first.
  const typed = text.trim().toLowerCase();
  const rows = useMemo(() => {
    if (typed) return options.filter(o => `${o.name} ${o.clerk_id}`.toLowerCase().includes(typed));
    const chosen = options.filter(o => selected.includes(o.clerk_id));
    return [...chosen, ...options.filter(o => !selected.includes(o.clerk_id))];
  }, [options, selected, typed]);
  const chosenCount = typed ? 0 : rows.filter(o => selected.includes(o.clerk_id)).length;

  // Close when the visitor taps or clicks anywhere else.
  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('touchstart', away);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('touchstart', away); };
  }, []);
  useEffect(() => { activeRow.current?.scrollIntoView({ block: 'nearest' }); }, [active, open]);

  const show = () => { if (!open) { setOpen(true); onOpen(); } };
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  const selectShown = () => onChange([...new Set([...selected, ...rows.map(o => o.clerk_id)])]);
  const done = () => { setOpen(false); setText(''); onDone(); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); show(); setActive(i => Math.min(i + 1, rows.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); if (rows[active]) toggle(rows[active].clerk_id); }   // Enter chooses, it does not search
    else if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'Backspace' && !text && selected.length) onChange(selected.slice(0, -1));
  };

  const loadingList = status === 'loading';
  const failed = status === 'error';
  const chip = { display: 'inline-flex', alignItems: 'center', gap: '4px', maxWidth: '100%', background: '#f1f5f9', borderRadius: '999px', padding: '4px 4px 4px 12px', fontSize: '13px', fontWeight: 500, color: INK };
  const section = { padding: '10px 14px 6px', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK, background: '#ffffff' };
  const hidden = Math.max(0, selected.length - CHIPS_SHOWN);
  const collapsed = selected.length > CHIPS_SHOWN + 1;   // 3 names fit; from 4, show 2 and "+N more"
  const chips = collapsed ? selected.slice(0, CHIPS_SHOWN) : selected;

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div onClick={() => { show(); box.current?.querySelector('input')?.focus(); }} style={{
        ...field, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', minHeight: '48px', padding: '6px 10px', cursor: 'text',
        borderColor: open ? INK : '#cbd5e1',
      }}>
        {chips.map(id => (
          <span key={id} style={chip}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelOf(id)}</span>
            <button type="button" aria-label={`Remove ${labelOf(id)}`} onClick={(e) => { e.stopPropagation(); toggle(id); }}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', padding: '5px', color: INK }}>
              <X size={14} />
            </button>
          </span>
        ))}
        {collapsed && <span style={{ ...chip, padding: '6px 12px' }}>+{hidden} more</span>}
        <input
          className="lk-combo-input" role="combobox" aria-expanded={open} aria-controls="clerk-list" aria-autocomplete="list" autoComplete="off"
          value={text} disabled={loadingList}
          onChange={(e) => { setText(e.target.value); setActive(0); show(); }} onFocus={show} onKeyDown={onKey}
          placeholder={loadingList ? 'Loading the operators...' : selected.length ? 'Add another clerk' : 'Search a clerk by name'}
          style={{ flex: '1 1 140px', minWidth: '120px', border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', fontWeight: 400, color: INK, fontFamily: 'inherit', padding: '8px 4px' }}
        />
        <ChevronDown size={18} color={INK} style={{ flex: '0 0 auto', transform: open ? 'rotate(180deg)' : 'none' }} aria-hidden="true" />
      </div>

      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 2px)', zIndex: 20, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
          {failed ? (
            <div style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>
              Could not load the clerk list. <button type="button" onClick={onRetry} style={{ ...quick, marginLeft: '8px' }}>Try again</button>
            </div>
          ) : (
            <ul id="clerk-list" role="listbox" aria-multiselectable="true" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 'min(320px, 45vh)', overflowY: 'auto' }}>
              {rows.length === 0 && (
                <li style={{ padding: '16px', fontSize: '14px', fontWeight: 500 }}>{options.length === 0 ? 'No harvester roles yet.' : `No clerk called "${text.trim()}".`}</li>
              )}
              {rows.map((o, i) => {
                const on = selected.includes(o.clerk_id);
                return [
                  !typed && i === 0 && chosenCount > 0 ? <li key="h-chosen" aria-hidden="true" style={section}>Chosen ({chosenCount})</li> : null,
                  !typed && i === chosenCount && chosenCount > 0 ? <li key="h-all" aria-hidden="true" style={{ ...section, borderTop: '1px solid #e2e8f0' }}>All operators</li> : null,
                  <li key={o.clerk_id} ref={i === active ? activeRow : undefined} role="option" aria-selected={on}
                    onMouseDown={(e) => e.preventDefault()} onClick={() => toggle(o.clerk_id)} onMouseEnter={() => setActive(i)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '48px', padding: '8px 14px', cursor: 'pointer', fontSize: '15px', color: INK, background: i === active ? '#f1f5f9' : '#ffffff' }}>
                    <span aria-hidden="true" style={{ flex: '0 0 22px', height: '22px', borderRadius: '6px', border: `1.5px solid ${on ? GREEN : '#94a3b8'}`, background: on ? GREEN : '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <Check size={14} color="#ffffff" strokeWidth={1.5} />}
                    </span>
                    <span style={{ minWidth: 0, fontWeight: on ? 800 : 600 }}><Highlight text={labelOf(o.clerk_id)} find={text} /></span>
                  </li>,
                ];
              })}
            </ul>
          )}
          {!failed && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '10px 12px', borderTop: '1px solid #cbd5e1', background: '#ffffff' }}>
              <span style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="lk-quick" style={quick} disabled={rows.length === 0} onClick={selectShown}>Select all{typed ? ' shown' : ''}</button>
                {selected.length > 0 && <button type="button" className="lk-quick" style={quick} onClick={() => onChange([])}>Clear</button>}
              </span>
              <button type="button" className="lk-quick" style={{ ...quick, background: GREEN, color: '#ffffff', borderColor: GREEN }} onClick={done}>
                {selected.length ? `Show ${selected.length} clerk${selected.length === 1 ? '' : 's'}` : 'Done'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// The last search is remembered on this device: coming back, or refreshing, shows it again.
const SAVED_KEY = 'fi_ffb_harvest_last_search_v3';   // v3: the operators are chosen from a list (ids), not typed
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || 'null') || {}; } catch { return {}; } };
const saveLast = (v) => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(v)); } catch { /* storage blocked: nothing to remember */ } };

const tabOf = (v) => (TABS.some(([k]) => k === v) ? v : 'approved');

export function ClerkLookup() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  // A shared link wins (its operators= list); otherwise the last search of this device.
  const linked = params.get('clerks') || '';
  const saved = useMemo(() => (linked ? {} : loadSaved()), [linked]);
  const [selected, setSelected] = useState(() => (linked ? linked.split(/[,;\n]+/).map(x => x.trim().toUpperCase()).filter(Boolean) : (saved.clerks || [])));
  const [options, setOptions] = useState([]);
  const [optionsStatus, setOptionsStatus] = useState('loading');
  const [from, setFrom] = useState(clampDate(params.get('from') || saved.from) || daysAgo(0));
  const [to, setTo] = useState(clampDate(params.get('to') || saved.to) || daysAgo(0));
  const [tab, setTab] = useState(tabOf(params.get('tab') || saved.tab));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 640px)').matches);

  // Marks the page while it is open so the print rules above apply only here (badge printing is untouched).
  useEffect(() => {
    document.documentElement.classList.add('lk-active');
    return () => document.documentElement.classList.remove('lk-active');
  }, []);

  // Phone or computer layout follows the screen (rotating a phone changes it).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // The operators to choose from, read fresh from the server (never cached): when the page opens and when the list is opened.
  const loadOptions = useCallback(async () => {
    try {
      const r = await API.clerkOptions();
      setOptions(r.clerks || []);
      setOptionsStatus('ready');
    } catch {
      setOptionsStatus(prev => (prev === 'ready' ? 'ready' : 'error'));   // keep the list we already have if a refresh fails
    }
  }, []);
  useEffect(() => { loadOptions(); }, [loadOptions]);

  const remember = (over = {}) => {
    const v = { operators: selected, from, to, tab, ...over };
    saveLast(v);
    window.history.replaceState(null, '', `${window.location.pathname}?${new URLSearchParams({ operators: v.clerks.join(','), from: v.from, to: v.to, tab: v.tab })}`);
  };

  const search = async (e, override) => {
    if (e) e.preventDefault();
    const f = clampDate(override?.from ?? from);
    const t = clampDate(override?.to ?? to);
    if (selected.length === 0) { setError('Choose at least one harvester role.'); return; }
    setLoading(true); setError('');
    try {
      const res = await API.lookupClerks(selected.join(','), f, t);
      setData(res);
      remember({ from: f, to: t });
    } catch (err) {
      setData(null); setError(err.message || 'Could not search. Try again.');
    } finally { setLoading(false); }
  };

  // Coming back (or refreshing): the remembered search runs again so its result is there straight away.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (selected.length) search(); }, []);

  const pick = (a, b) => { setFrom(a); setTo(b); if (selected.length) search(null, { from: a, to: b }); };
  const openTab = (key) => { setTab(key); if (data) remember({ tab: key }); };

  // Print: the browser's print dialog (also saves as PDF) for the open tab. The page title becomes the PDF's file name.
  const printReport = () => {
    const old = document.title;
    document.title = `FarmIntelytics Staff Activity ${data.from}${data.from === data.to ? '' : ` to ${data.to}`}`;
    const restore = () => { document.title = old; window.removeEventListener('afterprint', restore); };
    window.addEventListener('afterprint', restore);
    window.print();
  };

  const ready = !!data && data.clerks.length > 0;
  const actionStyle = { ...quick, display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: ready ? 1 : 0.4, cursor: ready ? 'pointer' : 'default' };

  return (
    <div className="lk-root" style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', sans-serif", color: INK }}>
      <style>{PAGE_CSS}</style>
      <div className="lk-page" style={{ maxWidth: '1040px', margin: '0 auto', padding: '40px 20px 72px' }}>
        <header className="lk-screen" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <img src={LOGO_ICON} alt="FarmIntelytics" style={{ width: '48px' }} />
          <div>
            <h1 className="lk-title" style={{ fontSize: '28px', fontWeight: 500, margin: 0, letterSpacing: '-0.01em' }}>Staff Activity</h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 400 }}>
              Choose one or more harvester roles, pick the dates, and see what each clerk recorded.
            </p>
          </div>
        </header>

        <form className="lk-screen" onSubmit={search} style={{ marginBottom: '8px' }}>
          <label style={label}>Harvester Roles</label>
          <ClerkPicker options={options} selected={selected} onChange={setSelected} status={optionsStatus} onOpen={loadOptions} onRetry={loadOptions}
            onDone={() => { if (selected.length) search(); }} />
          <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '6px' }}>
            Tap to open the list, type a name to find a clerk. You can choose several.
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '20px', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label htmlFor="lookup-from" style={label}>From</label>
              <input id="lookup-from" type="date" value={from} min={minDate()} max={to || daysAgo(0)} onChange={(e) => setFrom(clampDate(e.target.value))} style={field} />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label htmlFor="lookup-to" style={label}>To</label>
              <input id="lookup-to" type="date" value={to} min={from || minDate()} max={daysAgo(0)} onChange={(e) => setTo(clampDate(e.target.value))} style={field} />
            </div>
            <button type="submit" disabled={loading} className="lk-submit" style={{
              flex: '0 0 auto', height: '44px', padding: '0 28px', borderRadius: '10px', border: 'none', background: GREEN,
              color: '#ffffff', fontSize: '15px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit',
            }}>
              <Search size={18} /> {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 400, marginTop: '8px' }}>You can look back up to 30 days.</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', alignItems: 'center' }}>
            <CalendarDays size={16} color={GREEN} />
            <button type="button" className="lk-quick" style={quick} onClick={() => pick(daysAgo(0), daysAgo(0))}>Today</button>
            <button type="button" className="lk-quick" style={quick} onClick={() => pick(daysAgo(1), daysAgo(1))}>Yesterday</button>
            <button type="button" className="lk-quick" style={quick} onClick={() => pick(daysAgo(6), daysAgo(0))}>Last 7 days</button>
            <button type="button" className="lk-quick" style={quick} onClick={() => pick(minDate(), daysAgo(0))}>Last 30 days</button>
            <button type="button" className="lk-quick" style={actionStyle} disabled={!ready} onClick={printReport} aria-label="Print">
              <Printer size={15} color={GREEN} /> Print
            </button>
          </div>
        </form>

        {error && <div role="alert" className="lk-screen" style={{ margin: '16px 0', fontSize: '14px', fontWeight: 500, color: RED }}>{error}</div>}

        {data && (
          <section aria-live="polite" style={{ marginTop: '24px' }}>
            <div className="lk-print-only" style={{ marginBottom: '14px', borderBottom: `2px solid ${INK}`, paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={LOGO_ICON} alt="" style={{ width: '40px' }} />
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 500 }}>FarmIntelytics · Staff Activity · All statuses</div>
                  <div style={{ fontSize: '12px', fontWeight: 400 }}>
                    Period: {data.from === data.to ? data.from : `${data.from} to ${data.to}`} · {data.clerks.length} clerk{data.clerks.length === 1 ? '' : 's'} · Printed {new Date().toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* The four tabs: Approved (default), Pending, Mismatch, Rejected, each with how many different operators it holds. */}
            <div className="lk-screen lk-tabs" role="tablist" aria-label="Record status">
              {TABS.map(([key, name, color]) => {
                const active = tab === key;
                return (
                  <button key={key} type="button" role="tab" aria-selected={active} className="lk-tab" onClick={() => openTab(key)} style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '46px', padding: '8px 16px',
                    borderRadius: '12px', fontFamily: 'inherit', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                    border: `1.5px solid ${active ? color : '#cbd5e1'}`, background: active ? color : '#ffffff', color: active ? '#ffffff' : INK,
                  }}>
                    <span>{name}</span>
                    <span style={{
                      minWidth: '26px', padding: '2px 8px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, textAlign: 'center',
                      background: active ? '#ffffff' : '#f1f5f9', color: active ? color : INK,
                    }}>{fmtNumber(clerksIn(data, key))}</span>
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" className="lk-screen" style={{ marginTop: '20px' }}>
              <AggTable key={`${tab}-${data.from}-${data.to}-${data.clerks.length}-${phone}`} rows={rowsOf(data, tab)} onlyWithRecords={tab !== 'approved'}
                empty={data.clerks.length === 0 ? 'No operators found.' : `No ${tab} records on these dates.`} phone={phone} />
            </div>

            {/* On paper: each clerk's own table, line by line (the screen keeps the summary above). */}
            <div className="lk-print-only">
              <PrintedLines operators={data.clerks} />
              {data.lines_truncated && <p style={{ fontSize: '12px', fontWeight: 500 }}>Only the first 3,000 records are printed. Pick fewer days or fewer operators.</p>}
            </div>

            {data.not_found.length > 0 && (
              <div style={{ marginTop: '24px', fontSize: '14px', fontWeight: 500 }}>
                Not found: {data.not_found.join(', ')}
              </div>
            )}
            {data.truncated && (
              <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 500 }}>Showing the first 100 operators. Search fewer names to see the rest.</div>
            )}
            <p style={{ marginTop: '24px', fontSize: '13px', fontWeight: 400 }}>{data.note}</p>
          </section>
        )}
      </div>
    </div>
  );
}
