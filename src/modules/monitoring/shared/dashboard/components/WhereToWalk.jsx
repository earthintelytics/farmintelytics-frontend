// Where to walk: the weak patch inside each block, as the pipeline found it with the latest run (every
// satellite layer at the patch compared with the rest of its block, on several pictures). Each patch has
// its side of the block, its weakest point as a GPS waypoint, and the likely causes to check there.
import { useEffect, useState } from 'react';
import { Copy, Check, Download, MapPin, TrendingDown, Waves } from 'lucide-react';
import { fetchScoutingSpots, downloadScoutingGpx } from '../../../../../services/organizationMonitorApi';

const STRENGTH = { strong: 'Likely', possible: 'Possible' };
const nice = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// eslint-disable-next-line react-refresh/only-export-components
export function useScoutingSpots() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    fetchScoutingSpots()
      .then((d) => { if (active) setData(d); })
      .catch((e) => { if (active) setError(e); });
    return () => { active = false; };
  }, []);
  return { data, error };
}

function CopyGps({ gps }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(gps); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <button type="button" onClick={copy} title="Copy the GPS point"
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 tabular-nums">
      {done ? <Check size={12} className="text-[var(--brand-primary)]" /> : <Copy size={12} />}{gps}
    </button>
  );
}

export default function WhereToWalk({ data, error, onSelect, tenant, unitLabel = 'blocks' }) {
  const [downloading, setDownloading] = useState(false);
  const one = unitLabel === 'blocks' ? 'block' : unitLabel.replace(/s$/, '');
  if (error) return <p className="text-sm text-gray-500">Where to walk could not be loaded.</p>;
  if (!data) return <p className="text-sm text-gray-500">Loading where to walk…</p>;
  const spots = data.spots || [];
  if (!data.images?.length) {
    return <p className="text-sm text-gray-500">Where to walk appears after the next monitoring run.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Weak patches inside the {unitLabel}, from every satellite layer on the pictures of {data.images.map(nice).join(', ')}.
        Each is weak on more than one picture. The causes are what to check on the ground, not a diagnosis.
      </p>
      {!spots.length ? (
        <p className="text-sm text-gray-700">No weak patch inside any {one} on the latest pictures.</p>
      ) : (
        <>
          <button type="button" disabled={downloading}
            onClick={async () => { setDownloading(true); try { await downloadScoutingGpx(tenant); } finally { setDownloading(false); } }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            <Download size={15} />Download GPS points for a phone
          </button>
          <ul className="space-y-3">
            {spots.map((s) => {
              const [first, ...rest] = s.likely_causes || [];
              return (
                <li key={s.plot_id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                  <button type="button" onClick={() => onSelect?.(s)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
                        <MapPin size={14} className="text-[var(--status-warning)] shrink-0" />{s.plot_id} · {s.where}
                      </span>
                      <span className="text-xs font-medium text-gray-600 tabular-nums shrink-0">
                        {s.weak_pct}% weak{s.weak_area_ha ? ` · ${s.weak_area_ha} ha` : ''}
                      </span>
                    </div>
                  </button>
                  {(s.getting_worse || s.standing_water) && (
                    <div className="flex flex-wrap gap-1.5">
                      {s.getting_worse && <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs text-[var(--status-critical)]"><TrendingDown size={12} />Getting worse</span>}
                      {s.standing_water && <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs text-[var(--status-info)]"><Waves size={12} />Standing water</span>}
                    </div>
                  )}
                  {first && (
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-900"><span className="font-medium">{STRENGTH[first.strength] || 'Possible'}:</span> {first.title}</p>
                      <p className="text-gray-700"><span className="text-gray-500">Look for </span>{first.check}.</p>
                      <p className="text-gray-700"><span className="text-gray-500">Do </span>{first.do}.</p>
                      {first.evidence_text?.length > 0 && <p className="text-xs text-gray-500">Why: {first.evidence_text.join('; ')}.</p>}
                      {rest.length > 0 && <p className="text-xs text-gray-500">Also possible: {rest.map((c) => c.title).join('; ')}.</p>}
                    </div>
                  )}
                  <CopyGps gps={s.gps} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
