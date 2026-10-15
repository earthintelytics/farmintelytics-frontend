/**
 * tokens.js
 * Helpers for resolving design tokens and CSS custom properties dynamically.
 * Rule: never hardcode hex colours in components or map overlays.
 */

export const TOKEN_FALLBACKS = {
  '--brand-primary': '#3F8432',
  '--brand-primary-dark': '#2D6A2C',
  '--brand-leaf': '#5AA041',
  '--brand-forest': '#034321',
  '--status-live': '#3F8432',
  '--status-good': '#3F8432',
  '--status-warning': '#D97706',
  '--status-critical': '#DC2626',
  '--status-info': '#2563EB',
  '--bg-main': '#f8fafc',
  '--bg-card': '#ffffff',
  '--text-main': '#0f172a',
  '--text-muted': '#64748b',
  '--border-light': '#e2e8f0',
};

/**
 * Reads a CSS variable/token from document root with an optional fallback.
 * Resolves nested `var(--...)` declarations if present.
 * Example: getCssToken('--status-critical') -> "#DC2626"
 */
export function getCssToken(tokenName, fallback = '') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback || TOKEN_FALLBACKS[tokenName] || '';
  }
  const name = tokenName.startsWith('--') ? tokenName : `--${tokenName}`;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const val = raw ? raw.trim() : '';
  if (val) {
    if (val.startsWith('var(')) {
      const inner = val.slice(4, -1).trim();
      return getCssToken(inner, fallback);
    }
    return val;
  }
  return fallback || TOKEN_FALLBACKS[name] || '';
}

/**
 * Returns a CSS var() reference string for use in CSS/inline styles.
 * Example: cssVar('--status-warning') -> "var(--status-warning, #D97706)"
 */
export function cssVar(tokenName, fallback = '') {
  const name = tokenName.startsWith('--') ? tokenName : `--${tokenName}`;
  const fb = fallback || TOKEN_FALLBACKS[name];
  return fb ? `var(${name}, ${fb})` : `var(${name})`;
}
