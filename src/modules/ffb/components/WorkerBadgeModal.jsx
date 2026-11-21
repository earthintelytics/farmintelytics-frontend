import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, QrCode, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { roleGroup } from '../utils/roleGroups';

function getWorkerName(emp) {
  if (!emp) return '';
  const first = (emp.first_name || '').trim();
  const last = (emp.last_name || '').trim();
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return emp.worker_name || emp.employee_name || emp.name || emp.full_name || '';
}

const BADGES_PER_PAGE = 8; // print layout: 8 badges on each A4 sheet
const COPY_OPTIONS = [1, 2, 4, 8];

const BLOCKED_FUNCTIONS = new Set([
  'headman',
  'headperson',
  'headwoman',
  'field hand',
  'prunning',
  'pruning',
  'tapping',
  'unknown'
]);

export function isEligibleForBadge(emp) {
  if (!emp) return false;
  const status = (emp.worker_status || emp.service || 'Active').trim().toLowerCase();
  if (status === 'inactive' || status === 'suspended' || status === 'deactivated' || status === 'terminated') {
    return false;
  }
  const fn = (emp.function || '').trim().toLowerCase();
  if (!fn || BLOCKED_FUNCTIONS.has(fn)) {
    return false;
  }
  return true;
}

export default function WorkerBadgeModal({ isOpen, onClose, workers = [] }) {
  const { tenantMeta, tenantSlug } = useAppContext();
  const orgBadgeLabel = (tenantMeta?.display_name || tenantSlug || 'FarmIntelytics FFB').toUpperCase();
  const [printBatchSize, setPrintBatchSize] = useState(24);
  const [printBatchPage, setPrintBatchPage] = useState(1);
  const [printAllMode, setPrintAllMode] = useState(false);
  // The admin's copies choice, remembered for the workers it was made for. A different selection
  // starts again from the automatic page fill (null = fill the A4 sheet).
  const selectionKey = (workers || []).map((w) => w.employee_id || w.id).join(',');
  const [copiesChoice, setCopiesChoice] = useState({ key: '', n: null });
  const copiesOverride = copiesChoice.key === selectionKey ? copiesChoice.n : null;
  const setCopiesOverride = (n) => setCopiesChoice({ key: selectionKey, n });

  if (!isOpen) return null;

  const eligibleWorkers = (workers || []).filter(isEligibleForBadge);

  // If a single worker was selected but is restricted/blocked, show an informative alert modal
  if (workers.length === 1 && eligibleWorkers.length === 0) {
    const blockedWorker = workers[0];
    const roleName = blockedWorker.function || 'Unknown / Blocked';
    return (
      <div 
        className="no-print"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '2px solid #EF4444',
            textAlign: 'center'
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <X size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 500, color: '#1E293B' }}>
            QR Badge Not Allowed
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
            Worker <strong style={{ color: '#0F172A' }}>{getWorkerName(blockedWorker)}</strong> (ID #{blockedWorker.employee_id}) has role <strong style={{ color: '#DC2626' }}>{roleName.toUpperCase()}</strong>.
            <br />
            Unknown, supervisory, or restricted roles do not require field QR badges.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#0F172A',
              color: '#FFFFFF',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (eligibleWorkers.length === 0) return null;

  const effectiveWorkers = eligibleWorkers;

  const isBatch = effectiveWorkers.length > 1;
  const totalBatchPages = Math.ceil(effectiveWorkers.length / printBatchSize);
  
  // Workers to display in preview (paginated by batch for smooth rendering)
  const previewWorkers = isBatch
    ? effectiveWorkers.slice((printBatchPage - 1) * printBatchSize, printBatchPage * printBatchSize)
    : effectiveWorkers;

  // Workers to send to print engine
  const printableWorkers = printAllMode ? effectiveWorkers : previewWorkers;

  // Copies per worker. A4 sheets hold 8 badges, so for a few workers the sheet is filled with
  // copies instead of left mostly empty: 1 worker -> 8 copies, 2 -> 4 each, 3-4 -> 2 each.
  const autoCopies = effectiveWorkers.length < BADGES_PER_PAGE
    ? Math.max(1, Math.floor(BADGES_PER_PAGE / effectiveWorkers.length))
    : 1;
  const copies = copiesOverride ?? autoCopies;
  const printCards = printableWorkers.flatMap((emp) =>
    Array.from({ length: copies }, (_, c) => ({ emp, key: `${emp.employee_id || emp.id}-${c}` }))
  );
  const printPages = Math.ceil(printCards.length / BADGES_PER_PAGE);

  const triggerPrint = (isAll) => {
    const origTitle = document.title;
    if (!isBatch && effectiveWorkers.length === 1) {
      const emp = effectiveWorkers[0];
      document.title = `FarmIntelytics-Worker-ID-${emp.employee_id}`;
    } else if (isAll) {
      document.title = `FarmIntelytics-Field-Worker-ID-Cards_All_${effectiveWorkers.length}_Records`;
    } else {
      document.title = `FarmIntelytics-Worker-ID-Cards_Batch_${printBatchPage}_of_${totalBatchPages}`;
    }
    setPrintAllMode(isAll);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = origTitle;
      }, 1000);
    }, 150);
  };

  const handlePrintCurrentBatch = () => triggerPrint(false);
  const handlePrintAll = () => triggerPrint(true);

  return (
    <>
      {/* 1. SCREEN INTERACTIVE MODAL (Hidden during print by @media print) */}
      <div 
        className="no-print"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div 
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: isBatch ? '1100px' : '640px',
            height: '88vh',
            maxHeight: '900px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            border: '2px solid #E2E8F0'
          }}
        >
          {/* Top Header */}
          <div 
            style={{
              padding: '16px 24px',
              borderBottom: '2px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#3F8432',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <QrCode size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 500, color: '#000000' }}>
                  {isBatch ? `Worker QR Badges (${effectiveWorkers.length} Active Records)` : 'Worker QR Badge & ID'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#000000', fontWeight: 500 }}>
                  Official FarmIntelytics Field Identification Token
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                color: '#000000',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Batch Selector Bar */}
          {isBatch && (
            <div style={{
              padding: '12px 24px',
              background: '#FFFFFF',
              borderBottom: '2px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <span style={{ color: '#000000', fontWeight: 500 }}>
                Showing Batch {printBatchPage} of {totalBatchPages} ({previewWorkers.length} cards in this batch):
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#000000', fontWeight: 500, fontSize: '12px' }}>Per Batch:</span>
                  <select
                    value={printBatchSize}
                    onChange={(e) => {
                      setPrintBatchSize(Number(e.target.value));
                      setPrintBatchPage(1);
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '2px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#000000',
                      fontWeight: 500,
                      fontSize: '12px'
                    }}
                  >
                    <option value="12">12 cards (2 pages)</option>
                    <option value="24">24 cards (4 pages)</option>
                    <option value="48">48 cards (8 pages)</option>
                    <option value="96">96 cards (16 pages)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => setPrintBatchPage(p => Math.max(p - 1, 1))}
                    disabled={printBatchPage === 1}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '2px solid #CBD5E1',
                      background: printBatchPage === 1 ? '#F1F5F9' : '#FFFFFF',
                      color: printBatchPage === 1 ? '#94A3B8' : '#000000',
                      fontWeight: 500,
                      fontSize: '12px',
                      cursor: printBatchPage === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>

                  <span style={{ fontWeight: 500, color: '#000000', padding: '0 8px', fontSize: '13px' }}>
                    {printBatchPage} / {totalBatchPages}
                  </span>

                  <button
                    onClick={() => setPrintBatchPage(p => Math.min(p + 1, totalBatchPages))}
                    disabled={printBatchPage === totalBatchPages}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '2px solid #CBD5E1',
                      background: printBatchPage === totalBatchPages ? '#F1F5F9' : '#FFFFFF',
                      color: printBatchPage === totalBatchPages ? '#94A3B8' : '#000000',
                      fontWeight: 500,
                      fontSize: '12px',
                      cursor: printBatchPage === totalBatchPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Body (Widescreen Cards Grid) */}
          <div 
            style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
              display: 'grid',
              gridTemplateColumns: isBatch ? 'repeat(auto-fill, minmax(460px, 1fr))' : '1fr',
              gridAutoRows: 'min-content',
              gap: '20px',
              background: '#F8FAFC'
            }}
          >
            {previewWorkers.map((emp) => {
              const workerName = getWorkerName(emp);
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
                    borderRadius: '12px',
                    border: '2px solid #3F8432',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Clean Top Banner */}
                  <div 
                    style={{
                      background: '#3F8432',
                      padding: '12px 20px',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '3px solid #F59E0B'
                    }}
                  >
                    <span style={{ fontWeight: 500, letterSpacing: '0.06em', fontSize: '13px', textTransform: 'uppercase' }}>
                      {orgBadgeLabel}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', background: '#F59E0B', color: '#000000', padding: '2px 8px', borderRadius: '4px' }}>
                      OFFICIAL FIELD ID
                    </span>
                  </div>

                  {/* Main Card Content */}
                  <div style={{ padding: '18px 22px', display: 'flex', gap: '22px', alignItems: 'center', background: '#FFFFFF', flex: 1 }}>
                    {/* Left: QR Code */}
                    <div 
                      style={{
                        background: '#FFFFFF',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '2px solid #3F8432',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <QRCodeSVG
                        value={qrPayload}
                        size={120}
                        level="H"
                        includeMargin={false}
                      />
                      <span style={{ fontSize: '9px', fontWeight: 500, color: '#3F8432', marginTop: '6px', letterSpacing: '0.05em' }}>SCAN TO VERIFY</span>
                    </div>

                    {/* Right: Metadata */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', overflow: 'hidden' }}>
                      {workerName && (
                        <div style={{ fontSize: '18px', fontWeight: 500, color: '#000000', textTransform: 'uppercase', lineHeight: 1.2, letterSpacing: '0.01em' }}>
                          {workerName}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 500, color: '#3F8432' }}>
                          ID: #{emp.employee_id}
                        </span>
                        <span style={{ color: '#CBD5E1', fontWeight: 500 }}>|</span>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#3F8432', textTransform: 'uppercase' }}>
                          ROLE: {roleGroup(emp.function) || emp.function || 'GENERAL WORKER'}
                        </span>
                      </div>

                      <div style={{ height: '1.5px', background: '#E2E8F0', margin: '2px 0' }} />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: '12px', color: '#000000' }}>
                        <div>Team: <strong style={{ color: '#000000', fontWeight: 500 }}>{emp.team || '—'}</strong></div>
                        <div>Division: <strong style={{ color: '#000000', fontWeight: 500 }}>{emp.division || '—'}</strong></div>
                        <div>Contractor: <strong style={{ color: '#000000', fontWeight: 500 }}>{emp.contractor || 'Direct Staff'}</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Clean Modal Bottom Action Bar */}
          <div 
            style={{
              padding: '16px 24px',
              borderTop: '2px solid #E2E8F0',
              background: '#FFFFFF',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500, color: '#000000', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Copies per worker:
                <select
                  value={copies}
                  onChange={(e) => setCopiesOverride(Number(e.target.value))}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '2px solid #CBD5E1', background: '#FFFFFF', color: '#000000', fontWeight: 500, fontSize: '12px' }}
                >
                  {COPY_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}{n === autoCopies ? ' (fills the page)' : ''}</option>
                  ))}
                </select>
              </label>
              <span>
                Prints {printCards.length} badge{printCards.length === 1 ? '' : 's'} on {printPages} A4 page{printPages === 1 ? '' : 's'} (8 per page).
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={onClose}
                className="btn btn--outline"
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  color: '#000000',
                  border: '2px solid #CBD5E1'
                }}
              >
                Close
              </button>

              {isBatch && effectiveWorkers.length > printBatchSize && (
                <button
                  onClick={handlePrintAll}
                  className="btn btn--outline"
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: '6px',
                    color: '#3F8432',
                    border: '2px solid #3F8432',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Print all active cards across all pages"
                >
                  <Printer size={15} /> Print All ({effectiveWorkers.length * copies} badges)
                </button>
              )}

              <button
                onClick={handlePrintCurrentBatch}
                className="btn btn--primary"
                style={{
                  padding: '8px 22px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#3F8432',
                  color: '#FFFFFF'
                }}
              >
                <Printer size={15} /> {isBatch ? 'Print Batch' : 'Print'} ({previewWorkers.length * copies} badge{previewWorkers.length * copies === 1 ? '' : 's'})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED PRINT PORTAL (Active ONLY during window.print() - 3-Card Sheet Grid per A4) */}
      {createPortal(
        <div id="ffb-print-portal">
          {(() => {
            const pages = [];
            for (let i = 0; i < printCards.length; i += BADGES_PER_PAGE) {
              pages.push(printCards.slice(i, i + BADGES_PER_PAGE));
            }
            return pages.map((pageChunk, pageIdx) => (
              <div key={`print-page-${pageIdx}`} className="print-sheet-page">
                {pageChunk.map(({ emp, key }) => {
                  const workerName = getWorkerName(emp);
                  const qrPayload = JSON.stringify({
                    employee_id: emp.employee_id,
                    first_name: emp.first_name,
                    last_name: emp.last_name,
                    role: roleGroup(emp.function) || emp.function || 'Worker'
                  });

                  return (
                    <div key={key} className="print-card-cutout">
                      {/* Top Header Banner */}
                      <div style={{ background: '#3F8432', borderBottom: '2px solid #F59E0B', padding: '2.5mm 4mm', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, height: '10mm', boxSizing: 'border-box' }}>
                        <span style={{ fontWeight: 500, letterSpacing: '0.04em', fontSize: '8.5pt', textTransform: 'uppercase' }}>
                          {orgBadgeLabel}
                        </span>
                        <span style={{ fontSize: '6.5pt', fontWeight: 500, background: '#F59E0B', color: '#000000', padding: '1.5px 6px', borderRadius: '3px', textTransform: 'uppercase' }}>
                          FIELD ID
                        </span>
                      </div>

                      {/* Card Content - Scaled 85.6mm x 63mm Layout */}
                      <div style={{ padding: '3.5mm 4mm', display: 'flex', gap: '4mm', alignItems: 'center', background: '#FFFFFF', height: '53mm', boxSizing: 'border-box', overflow: 'hidden' }}>
                        {/* Left: QR Code Box */}
                        <div style={{ background: '#FFFFFF', padding: '2mm', borderRadius: '5px', border: '1.2px solid #3F8432', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <QRCodeSVG
                            value={qrPayload}
                            size={84}
                            level="M"
                            includeMargin={false}
                          />
                          <span style={{ fontSize: '6pt', fontWeight: 500, color: '#3F8432', marginTop: '1.5mm', letterSpacing: '0.04em' }}>SCAN VERIFY</span>
                        </div>

                        {/* Right: Worker ID Details */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2mm', justifyContent: 'center', minWidth: 0, overflow: 'hidden' }}>
                          {workerName && (
                            <div style={{ fontSize: '11pt', fontWeight: 500, color: '#000000', textTransform: 'uppercase', lineHeight: 1.15, letterSpacing: '0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={workerName}>
                              {workerName}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '8pt', fontWeight: 500, color: '#3F8432', background: '#F3F8EF', border: '1px solid #86EFAC', padding: '1px 5px', borderRadius: '3px', display: 'inline-block' }}>
                              ID: #{emp.employee_id}
                            </span>
                            <span style={{ fontSize: '7.5pt', fontWeight: 500, color: '#92400E', background: '#FEF3C7', border: '1px solid #F59E0B', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase', display: 'inline-block' }}>
                              {roleGroup(emp.function) || emp.function || 'WORKER'}
                            </span>
                          </div>

                          <div style={{ height: '0.5mm', background: '#3F8432', margin: '0.5mm 0', borderRadius: '0.25mm' }} />

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2mm', fontSize: '7.5pt', color: '#000000', fontWeight: 500, lineHeight: 1.25 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Team: <strong style={{ color: '#000000', fontWeight: 500 }}>{emp.team || '—'}</strong>
                            </div>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Div: <strong style={{ color: '#000000', fontWeight: 500 }}>{emp.division || '—'}</strong>
                            </div>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              Contractor: <strong style={{ color: '#000000', fontWeight: 500 }}>{emp.contractor || 'Direct Staff'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>,
        document.body
      )}
    </>
  );
}
