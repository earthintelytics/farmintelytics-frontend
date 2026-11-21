// Sorting and column filters for every table in the portal (installed once at startup, like columnResize).
//
//  - Sort: every header gets a sort icon (up and down arrows). Click the header (or the icon): ascending
//    (up arrow lit), again: descending (down arrow lit),
//    a third time: back to the original order. Numbers, dates and text each sort the right way.
//  - Filter: a column that already has a "Filter..." box gets a dropdown list of that column's values;
//    a table without filter boxes gets a dropdown filter under each header.
//
// Rows are only reordered or hidden, never rebuilt, so the page's own code keeps working. A row whose
// first cell spans several columns (a detail row) stays with the row above it. New and re-rendered
// tables are picked up automatically; the chosen sort is kept when the page reloads its rows.
// Opt out with <table data-no-sort> / <table data-no-filter>. Rules & Methodology tables are left as is.

const SKIP = '.mth-page table, table[data-no-tools]';
const MAX_OPTIONS = 60;
let listSeq = 0;

// Sort icon: an up arrow and a down arrow side by side; the chosen direction is highlighted in CSS.
const SORT_SVG = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">'
  + '<g class="col-sort__up"><path d="M5 2 L8.2 5.6 H6 V14 H4 V5.6 H1.8 Z"/></g>'
  + '<g class="col-sort__down"><path d="M11 14 L7.8 10.4 H10 V2 H12 V10.4 H14.2 Z"/></g></svg>';

const headerCells = (table) => Array.from(table.querySelectorAll(':scope > thead > tr:first-child > th'));
const bodyRows = (table) => Array.from(table.querySelectorAll(':scope > tbody > tr'));
const isDetailRow = (tr) => tr.cells.length > 0 && tr.cells[0].colSpan > 1;

/** Text of a header without the tools we added to it. */
function headerLabel(th) {
  const clone = th.cloneNode(true);
  clone.querySelectorAll('input, select, .col-sort, .col-resizer, datalist').forEach(n => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').trim();
}

function cellText(tr, index) {
  const cell = tr.cells[index];
  return cell ? cell.textContent.replace(/\s+/g, ' ').trim() : '';
}

const DATE_RE = /^(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2} \w{3,9} \d{4})/;
/** A comparable value: number, date (ms) or lower-case text. */
function sortValue(text) {
  const t = text.trim();
  if (!t || t === '—' || t === '-') return { kind: 'empty' };
  const num = t.replace(/[,\s]/g, '').replace(/^\+/, '').replace(/(kg|%|ffb|₦|ngn)$/i, '');
  if (/^-?\d+(\.\d+)?$/.test(num)) return { kind: 'num', v: parseFloat(num) };
  if (DATE_RE.test(t)) {
    const d = Date.parse(t.replace('Sept', 'Sep').replace(/(\d{1,2}) (\w{3,9}) (\d{4})/, '$2 $1 $3'));
    if (!Number.isNaN(d)) return { kind: 'num', v: d };
  }
  return { kind: 'text', v: t.toLowerCase() };
}

function compare(a, b) {
  if (a.kind === 'empty' || b.kind === 'empty') return a.kind === b.kind ? 0 : a.kind === 'empty' ? 1 : -1; // blanks last
  if (a.kind === 'num' && b.kind === 'num') return a.v - b.v;
  return String(a.v).localeCompare(String(b.v), undefined, { numeric: true });
}

/** Rows grouped with their detail rows, in the current order. */
function rowGroups(table) {
  const groups = [];
  bodyRows(table).forEach(tr => {
    if (isDetailRow(tr) && groups.length) groups[groups.length - 1].push(tr);
    else groups.push([tr]);
  });
  return groups;
}

function applySort(table) {
  const col = table.dataset.sortCol;
  const dir = table.dataset.sortDir;
  const tbody = table.tBodies[0];
  if (!tbody) return;
  const groups = rowGroups(table).filter(g => !(g.length === 1 && isDetailRow(g[0]))); // empty-state rows stay
  groups.forEach((g, i) => { if (!g[0].dataset.origIndex) g[0].dataset.origIndex = String(i); });
  let ordered;
  if (col === undefined || !dir) {
    ordered = [...groups].sort((a, b) => Number(a[0].dataset.origIndex) - Number(b[0].dataset.origIndex));
  } else {
    const idx = Number(col);
    const sign = dir === 'desc' ? -1 : 1;
    ordered = groups.map((g, i) => ({ g, i, v: sortValue(cellText(g[0], idx)) }))
      .sort((a, b) => (compare(a.v, b.v) * sign) || (a.i - b.i))
      .map(x => x.g);
  }
  const current = groups.flat();
  const next = ordered.flat();
  if (current.every((tr, i) => tr === next[i])) return; // already in order
  table.__sorting = true;
  next.forEach(tr => tbody.appendChild(tr));
  table.__sorting = false;
}

function updateIcons(table) {
  headerCells(table).forEach((th, i) => {
    const icon = th.querySelector(':scope > .col-sort');
    if (!icon) return;
    const on = table.dataset.sortCol === String(i) && table.dataset.sortDir;
    icon.classList.toggle('col-sort--on', Boolean(on));
    icon.classList.toggle('col-sort--asc', Boolean(on) && table.dataset.sortDir === 'asc');
    icon.classList.toggle('col-sort--desc', Boolean(on) && table.dataset.sortDir === 'desc');
    th.setAttribute('aria-sort', !on ? 'none' : table.dataset.sortDir === 'asc' ? 'ascending' : 'descending');
  });
}

function onHeaderClick(e, table, index) {
  if (e.target.closest('input, select, button, a, .col-resizer, label')) return;
  const same = table.dataset.sortCol === String(index);
  const dir = !same ? 'asc' : table.dataset.sortDir === 'asc' ? 'desc' : table.dataset.sortDir === 'desc' ? '' : 'asc';
  table.dataset.sortCol = String(index);
  table.dataset.sortDir = dir;
  applySort(table);
  updateIcons(table);
}

/** Distinct values of one column, for the dropdowns. */
function columnValues(table, index) {
  const seen = new Map();
  bodyRows(table).forEach(tr => {
    if (isDetailRow(tr)) return;
    const t = cellText(tr, index);
    if (t && t !== '—' && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  });
  return [...seen.values()].sort((a, b) => compare(sortValue(a), sortValue(b))).slice(0, MAX_OPTIONS);
}

/** Dropdown list of the column's values on an existing "Filter..." box. */
function refreshDatalists(table) {
  headerCells(table).forEach((th, i) => {
    const input = th.querySelector('input.col-filter-input, input[placeholder^="Filter"]');
    if (!input) return;
    if (!input.getAttribute('list')) {
      const list = document.createElement('datalist');
      list.id = `col-values-${++listSeq}`;
      th.appendChild(list);
      input.setAttribute('list', list.id);
    }
    const list = document.getElementById(input.getAttribute('list'));
    if (!list) return;
    const values = columnValues(table, i);
    const key = values.join('\u0001');
    if (list.dataset.key === key) return;
    list.dataset.key = key;
    list.replaceChildren(...values.map(v => { const o = document.createElement('option'); o.value = v; return o; }));
  });
}

/** Tables without filter boxes: a dropdown filter under each header (hides rows that don't match). */
function applySelectFilters(table) {
  const selects = headerCells(table).map(th => th.querySelector(':scope > select.col-filter-select'));
  rowGroups(table).forEach(g => {
    if (g.length === 1 && isDetailRow(g[0])) return;
    const show = selects.every((sel, i) => !sel || !sel.value || cellText(g[0], i).toLowerCase() === sel.value.toLowerCase());
    g.forEach(tr => { tr.style.display = show ? '' : 'none'; });
  });
}

function refreshSelects(table) {
  headerCells(table).forEach((th, i) => {
    let sel = th.querySelector(':scope > select.col-filter-select');
    if (!sel) {
      if (!headerLabel(th)) return; // action columns have no filter
      sel = document.createElement('select');
      sel.className = 'col-filter-select';
      sel.setAttribute('aria-label', `Filter ${headerLabel(th)}`);
      sel.addEventListener('click', e => e.stopPropagation());
      sel.addEventListener('change', () => applySelectFilters(table));
      th.appendChild(sel);
    }
    const values = columnValues(table, i);
    const key = values.join('\u0001');
    if (sel.dataset.key === key) return;
    sel.dataset.key = key;
    const chosen = sel.value;
    sel.replaceChildren(new Option('All', ''), ...values.map(v => new Option(v, v)));
    sel.value = values.includes(chosen) ? chosen : '';
  });
  applySelectFilters(table);
}

function enhance(table) {
  if (table.matches(SKIP)) return;
  const ths = headerCells(table);
  if (!ths.length || !table.tBodies[0]) return;

  if (!table.hasAttribute('data-no-sort')) {
    ths.forEach((th, i) => {
      if (th.querySelector(':scope > .col-sort') || th.querySelector('svg.lucide-arrow-up-down, svg.lucide-arrow-up, svg.lucide-arrow-down, .sort-icon') || !headerLabel(th)) return;
      const icon = document.createElement('span');
      icon.className = 'col-sort';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = SORT_SVG;
      // the icon goes right after the header text (before any filter box)
      const firstControl = th.querySelector(':scope > br, :scope > input, :scope > select, :scope > .col-resizer');
      th.insertBefore(icon, firstControl);
      th.classList.add('th-sortable');
      th.title = th.title || 'Click to sort';
      th.addEventListener('click', e => onHeaderClick(e, table, i));
    });
    if (table.dataset.sortDir) applySort(table); // keep the chosen order when the page reloads its rows
    updateIcons(table);
  }

  if (!table.hasAttribute('data-no-filter')) {
    const hasBoxes = ths.some(th => th.querySelector('input.col-filter-input, input[placeholder^="Filter"]'));
    if (hasBoxes) refreshDatalists(table);
    else if (bodyRows(table).length > 2) refreshSelects(table);
  }
}

export function installTableTools() {
  if (typeof window === 'undefined' || window.__ffbTableTools) return;
  window.__ffbTableTools = true;
  let queued = false;
  const scan = () => {
    queued = false;
    document.querySelectorAll('table').forEach(t => { if (!t.__sorting) enhance(t); });
  };
  new MutationObserver((muts) => {
    // our own row moves and dropdown refreshes don't need another pass
    if (muts.every(m => m.target.closest?.('table')?.__sorting || m.target.nodeName === 'DATALIST' || m.target.nodeName === 'SELECT')) return;
    if (!queued) { queued = true; requestAnimationFrame(scan); }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  scan();
}
