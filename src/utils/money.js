/**
 * Money is kept in minor units (kobo for NGN) as whole numbers; these show it and read it back.
 * naira(150000) -> "₦1,500.00"; toMinor("1,500.50") -> 150050.
 */
const SYMBOL = { NGN: '₦', USD: '$', EUR: '€', GBP: '£' };

export function naira(minor, currency = 'NGN') {
  const v = Number(minor || 0) / 100;
  const s = Math.abs(v).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? '−' : ''}${SYMBOL[currency] || `${currency} `}${s}`;
}

export function toMinor(text) {
  const n = Number(String(text || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
