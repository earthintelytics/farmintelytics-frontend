// One weak patch inside a block: where it is, the likely cause, what to look for and what to do, with
// "Listen", "Open in maps" and "Copy GPS".
import { useState } from 'react';
import { Check, Copy, MapPin, Navigation, TrendingDown, Waves } from 'lucide-react';
import ListenButton from './ListenButton';
import { STRENGTH, cap, mapsLink, sentence, spotSpeech } from './farmText';
import { btnLine, muted } from './ui';

function CopyGps({ gps }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(gps); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* clipboard blocked */ }
  };
  return (
    <button type="button" onClick={copy} className={btnLine} aria-label={`Copy GPS point ${gps}`}>
      {done ? <Check size={18} className="text-[var(--brand-primary)]" aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
      {done ? 'Copied' : 'Copy GPS'}
    </button>
  );
}

export default function WalkSpotCard({ spot, language, voice }) {
  const [first, ...rest] = spot.likely_causes || [];
  const hasPoint = Number.isFinite(Number(spot.worst_lat)) && Number.isFinite(Number(spot.worst_lon)) && spot.worst_lat !== null && spot.worst_lon !== null;
  return (
    <li className="rounded-xl border border-[var(--border-light)] bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold inline-flex items-center gap-2">
            <MapPin size={18} className="shrink-0 text-[var(--status-warning)]" aria-hidden="true" />{spot.plot_id}
          </p>
          {spot.where && <p className="text-base mt-0.5">{cap(spot.where)}</p>}
        </div>
        {spot.weak_pct != null && <p className={`text-sm ${muted} shrink-0`}><span className="font-mono">{spot.weak_pct}%</span> weak</p>}
      </div>
      {(spot.getting_worse || spot.standing_water) && (
        <div className="flex flex-wrap gap-2">
          {spot.getting_worse && <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-light)] px-3 py-1 text-sm text-[var(--status-critical)]"><TrendingDown size={16} aria-hidden="true" />Getting worse</span>}
          {spot.standing_water && <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-light)] px-3 py-1 text-sm text-[var(--status-info)]"><Waves size={16} aria-hidden="true" />Standing water</span>}
        </div>
      )}
      {first && (
        <dl className="space-y-2 text-base">
          <div><dt className={`text-sm ${muted}`}>{STRENGTH[first.strength] || 'Possible cause'}</dt><dd>{sentence(cap(first.title))}</dd></div>
          {first.check && <div><dt className={`text-sm ${muted}`}>What to look for</dt><dd>{sentence(cap(first.check))}</dd></div>}
          {first.do && <div><dt className={`text-sm ${muted}`}>What to do</dt><dd>{sentence(cap(first.do))}</dd></div>}
          {rest.length > 0 && <div><dt className={`text-sm ${muted}`}>Also possible</dt><dd>{rest.map((c) => c.title).join('; ')}</dd></div>}
        </dl>
      )}
      <div className="flex flex-wrap gap-2">
        <ListenButton id={`spot:${spot.plot_id}:${spot.where}`} text={spotSpeech(spot)} language={language} voice={voice} showNote={false} />
        {hasPoint && (
          <a href={mapsLink(spot.worst_lat, spot.worst_lon)} target="_blank" rel="noreferrer" className={btnLine}>
            <Navigation size={18} className="text-[var(--brand-primary)]" aria-hidden="true" />Open in maps
          </a>
        )}
        {spot.gps && <CopyGps gps={spot.gps} />}
      </div>
      {spot.gps && <p className={`text-sm ${muted}`}>GPS <span className="font-mono">{spot.gps}</span></p>}
    </li>
  );
}
