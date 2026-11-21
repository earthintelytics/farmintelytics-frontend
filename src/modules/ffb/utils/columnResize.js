// Excel-style column resizing for every table in the portal.
// Drag the right edge of any header cell to resize that column; double-click the edge to reset.
// Installed once at startup; new tables (and re-rendered headers) are picked up automatically.
// Opt a table out with <table data-no-resize>.

const HANDLE_CLASS = 'col-resizer';
const MIN_WIDTH = 48;

function freezeWidths(table) {
  if (table.dataset.resized === '1') return;
  const ths = table.querySelectorAll(':scope > thead > tr:first-child > th');
  // Pin every column to its current width first, so resizing one does not reflow the others.
  const widths = Array.from(ths, th => th.getBoundingClientRect().width);
  ths.forEach((th, i) => { th.style.width = `${widths[i]}px`; });
  table.style.tableLayout = 'fixed';
  table.style.width = `${widths.reduce((a, b) => a + b, 0)}px`;
  table.style.minWidth = '0';
  table.dataset.resized = '1';
}

function resetTable(table) {
  table.querySelectorAll(':scope > thead > tr:first-child > th').forEach(th => { th.style.width = ''; });
  table.style.tableLayout = '';
  table.style.width = '';
  table.style.minWidth = '';
  delete table.dataset.resized;
}

function startDrag(e, th, table) {
  e.preventDefault();
  e.stopPropagation();
  freezeWidths(table);
  const startX = e.clientX;
  const startW = th.getBoundingClientRect().width;
  const startTableW = table.getBoundingClientRect().width;
  document.body.classList.add('col-resizing');

  const onMove = ev => {
    const w = Math.max(MIN_WIDTH, startW + (ev.clientX - startX));
    th.style.width = `${w}px`;
    table.style.width = `${startTableW + (w - startW)}px`;
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.body.classList.remove('col-resizing');
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

function addHandles(root) {
  root.querySelectorAll('table:not([data-no-resize]) > thead > tr:first-child > th').forEach(th => {
    if (th.querySelector(`:scope > .${HANDLE_CLASS}`)) return;
    if (getComputedStyle(th).position === 'static') th.style.position = 'relative';
    const handle = document.createElement('span');
    handle.className = HANDLE_CLASS;
    handle.title = 'Drag to resize column (double-click to reset)';
    handle.addEventListener('pointerdown', e => startDrag(e, th, th.closest('table')));
    handle.addEventListener('click', e => e.stopPropagation()); // don't trigger header sorting
    handle.addEventListener('dblclick', e => { e.stopPropagation(); resetTable(th.closest('table')); });
    th.appendChild(handle);
  });
}

export function installColumnResize() {
  if (typeof window === 'undefined' || window.__ffbColumnResize) return;
  window.__ffbColumnResize = true;
  let queued = false;
  const scan = () => { queued = false; addHandles(document); };
  new MutationObserver(() => {
    if (!queued) { queued = true; requestAnimationFrame(scan); }
  }).observe(document.body, { childList: true, subtree: true });
  scan();
}
