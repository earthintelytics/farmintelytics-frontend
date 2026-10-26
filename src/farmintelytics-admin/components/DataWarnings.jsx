import { AlertTriangle } from 'lucide-react';

/**
 * What the boundary check found after an upload: each point says what was found and what to do.
 * The upload has gone through; these are things to look at before the boundary is used.
 * warnings: [{ kind, message, action }] from the backend (services/boundary_checks.py).
 */
export default function DataWarnings({ warnings, title = 'Check this boundary' }) {
  if (!warnings?.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} className="shrink-0 text-amber-700" />{title}</p>
      <ul className="mt-2 space-y-2">
        {warnings.map((w, i) => (
          <li key={`${w.kind}-${i}`}>
            <span>{w.message}</span>
            {w.action && <span className="block text-xs text-amber-800 mt-0.5">{w.action}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
