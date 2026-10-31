// Farm Buddy's shared class names: big touch targets (48px and up), token colours only, solid focus
// rings, no shadows.
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)]';

export const btn = `inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl text-[15px] font-semibold select-none disabled:opacity-60 ${focus}`;
export const btnPrimary = `${btn} bg-[var(--brand-primary)] text-white active:bg-[var(--brand-primary-dark)]`;
export const btnLine = `${btn} border border-[var(--border-light)] bg-white text-[var(--text-main)] active:bg-[var(--bg-subtle)]`;
export const btnQuiet = `${btn} text-[var(--text-main)] active:bg-[var(--bg-subtle)]`;
export const rowButton = `w-full text-left flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-xl border border-[var(--border-light)] bg-white active:bg-[var(--bg-subtle)] ${focus}`;
export const inputBox = 'w-full rounded-xl border border-[var(--border-light)] bg-white px-4 py-3 text-base text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]';
export const muted = 'text-[var(--text-muted)]';
export const main = 'text-[var(--text-main)]';
