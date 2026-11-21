import { AlertTriangle, Clock } from 'lucide-react';
import { RECON_STATUS } from '../utils/reconStatus';
import { platformText } from '../utils/platform';
import { useRecorderPattern } from '../utils/recorderPatterns';

// The nine scoring checks (backend/api/utils/validation_engine), in plain words, with what the
// supervisor should look at when one loses points.
const CHECKS = {
  reconciliation: { name: 'Loading match', weight: 1.5, todo: 'Compare with the loading clerk photos; recount the platform if it is short.' },
  duplicate: { name: 'Duplicate', weight: 1.5, todo: 'Open the other record on this plot and compare the two photos.' },
  spatial_grid: { name: 'GPS on plot edge', weight: 1, todo: 'Check the plot on the map; ask the clerk where the platform was.' },
  temporal: { name: 'Timing', weight: 1, todo: 'Check the times of this worker’s records.' },
  device: { name: 'Device', weight: 1, todo: 'Check which phone and clerk made the records.' },
  behavioral: { name: 'Same count again', weight: 1, todo: 'Check the photo really shows this count.' },
  spatial_density: { name: 'High for plot today', weight: 1, todo: 'Check the photo count against the plot’s other records.' },
  cross_harvester: { name: 'Shared platform', weight: 1, todo: 'Check both workers were really on this platform.' },
  historical_trend: { name: 'High for plot history', weight: 1, todo: 'Check the photo count; a real bumper day is fine.' }
};

/** Failed checks, worst first (points lost = (10 − points) × weight). */
export function reviewReasons(details) {
  return Object.entries(details || {})
    .filter(([key, v]) => CHECKS[key] && v && typeof v === 'object' && (v.score ?? 10) < 10)
    .map(([key, v]) => ({ key, ...CHECKS[key], msg: v.msg || '', lost: Math.round((10 - (v.score ?? 10)) * CHECKS[key].weight * 10) / 10 }))
    .sort((a, b) => b.lost - a.lost);
}

export function ReviewReasons({ score, details, clerkId }) {
  const coaching = useRecorderPattern(clerkId);
  if (!details || typeof details !== 'object') return null;
  const reasons = reviewReasons(details);
  const recon = details.reconciliation || {};
  const waiting = recon.status === 'WAITING_FOR_LOADER';
  const session = details.session;
  const text = { fontSize: '12px', color: '#0f172a', lineHeight: 1.5 };

  return (
    <div className="review-reasons" style={{ margin: '2px 0' }}>
      <div style={{ ...text, display: 'flex', flexWrap: 'wrap', gap: '4px 12px', alignItems: 'center' }}>
        <strong>Score {score ?? '—'}/100</strong>
        {session && session.scans > 1 && <span>One job of {session.scans} scans · total {session.total}</span>}
        {waiting && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: RECON_STATUS.WAITING_FOR_LOADER.dark }}><Clock size={12} /> {RECON_STATUS.WAITING_FOR_LOADER.label}</span>}
      </div>

      {reasons.length === 0 ? null : (
        <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {reasons.map(r => (
            <li key={r.key} style={{ ...text, display: 'flex', gap: '6px' }}>
              <AlertTriangle size={13} color="#dc2626" style={{ flexShrink: 0, marginTop: '3px' }} />
              <span>
                <strong>{r.name}</strong> (−{r.lost}): {platformText(r.msg)}
                <span style={{ display: 'block', color: '#0f172a' }}>Check: {r.todo}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {coaching && (
        <div style={{ ...text, display: 'flex', gap: '6px', marginTop: '6px' }}>
          <AlertTriangle size={13} color="#d97706" style={{ flexShrink: 0, marginTop: '3px' }} />
          <span>
            <strong>Recorder pattern</strong> ({coaching.clerk_name || coaching.clerk_id}, last 30 days): {coaching.reason}
            <span style={{ display: 'block', color: '#0f172a' }}>Check: look at the photo for this count, and talk to the recorder. This recorder may need extra training.</span>
          </span>
        </div>
      )}
    </div>
  );
}
