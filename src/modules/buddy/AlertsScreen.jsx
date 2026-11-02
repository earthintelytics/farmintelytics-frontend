// Alerts and updates: first "Where to walk" (the weak patches inside blocks), then the farm's open
// alerts, most urgent and newest first, for the whole organisation. Everything comes from the API.
// At a spot or an alert, "I'm here: check it" records what the person sees (FieldCheckSheet).
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import AlertCard from './AlertCard';
import WalkSpotCard from './WalkSpotCard';
import FieldCheckSheet from './FieldCheckSheet';
import { fetchAlerts, fetchScoutingSpots } from '../../services/organizationMonitorApi';
import { alertCatalogFor } from '../monitoring/shared/dashboard/alerts/alertCatalog';
import { alertQuestion, isOpenAlert, severityOf } from './farmText';
import { LANGUAGES } from './languages';
import { btnLine, muted } from './ui';

// Alert and patch texts come from the API in English, so "Listen" reads them with an English voice.
const ENGLISH = LANGUAGES[0];
const plural = (unit) => (unit.endsWith('s') ? unit : `${unit}s`);

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Problem({ text, onRetry }) {
  return (
    <div className="space-y-3">
      <p className="text-[15px] text-[var(--status-critical)]">{text}</p>
      <button type="button" onClick={onRetry} className={btnLine}><RotateCcw size={18} aria-hidden="true" />Try again</button>
    </div>
  );
}

function useLoad(load) {
  const [state, setState] = useState({ data: null, error: null });
  const [round, setRound] = useState(0);
  useEffect(() => {
    let live = true;
    load().then((data) => { if (live) setState({ data, error: null }); }, (error) => { if (live) setState({ data: null, error }); });
    return () => { live = false; };
  }, [load, round]);
  const retry = useCallback(() => { setState({ data: null, error: null }); setRound((r) => r + 1); }, []);
  return { ...state, retry };
}

export default function AlertsScreen({ tenant, language, voice }) {
  const navigate = useNavigate();
  const unit = alertCatalogFor(null, '').unit; // the whole organisation: the general word for a block
  const alerts = useLoad(useCallback(() => fetchAlerts(tenant), [tenant]));
  const spots = useLoad(fetchScoutingSpots);

  const open = (alerts.data?.feed || []).filter(isOpenAlert)
    .sort((a, b) => severityOf(a).rank - severityOf(b).rank || String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
  const walk = spots.data?.spots || [];
  const ask = (a) => { voice.stop(); navigate('/buddy', { state: { prefill: alertQuestion(a) } }); };
  // The spot or alert being checked, the ones checked in this visit, and the last "saved" note.
  const [checking, setChecking] = useState(null);
  const [checked, setChecked] = useState(() => new Set());
  const [savedNote, setSavedNote] = useState('');
  const spotKey = (s) => `spot:${s.plot_id}:${s.where}`;
  const saved = (res) => {
    setChecked((c) => new Set(c).add(checking.key));
    const far = res?.distance_m;
    setSavedNote(`Check saved for ${checking.plot_id}.${far != null ? ` You were about ${Math.round(far)} m from the spot.` : ''}`);
    setChecking(null);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-6">
      {savedNote && <p className="text-sm font-semibold text-[var(--brand-primary)]" role="status">{savedNote}</p>}
      {language.id !== 'en' && (
        <p className={`text-sm ${muted}`}>Alerts are written in English. Tap “Ask about this” to have one explained in {language.label}.</p>
      )}

      <Section title="Where to walk">
        {spots.error ? <Problem text="Could not load where to walk. Check the connection and try again." onRetry={spots.retry} />
          : !spots.data ? <p className={`text-[15px] ${muted}`} role="status">Loading where to walk…</p>
          : !spots.data.images?.length ? <p className={`text-[15px] ${muted}`}>Where to walk shows after the next check of your farm.</p>
          : !walk.length ? <p className="text-[15px]">No weak patch inside any {unit} on the latest pictures of the farm.</p>
          : (
            <>
              <p className={`text-sm ${muted}`}>Weak patches inside your {plural(unit)}. The causes are what to check on the ground, not a diagnosis.</p>
              <ul className="space-y-3">
                {walk.map((s, i) => <WalkSpotCard key={spotKey(s)} spot={s} isFirst={i === 0} language={ENGLISH} voice={voice} checked={checked.has(spotKey(s))}
                  onCheck={() => setChecking({ key: spotKey(s), plot_id: s.plot_id, where: s.where, lat: s.worst_lat, lon: s.worst_lon })} />)}
              </ul>
            </>
          )}
      </Section>

      <Section title={open.length ? `Alerts (${open.length} open)` : 'Alerts'}>
        {alerts.error ? <Problem text="Could not load the alerts. Check the connection and try again." onRetry={alerts.retry} />
          : !alerts.data ? <p className={`text-[15px] ${muted}`} role="status">Loading alerts…</p>
          : !open.length ? <p className="text-[15px]">No open alerts.</p>
          : (
            <ul className="space-y-3">
              {open.map((a) => <AlertCard key={a.alert_id} alert={a} language={ENGLISH} voice={voice} onAsk={ask} checked={checked.has(`alert:${a.alert_id}`)}
                onCheck={() => setChecking({ key: `alert:${a.alert_id}`, plot_id: a.plot_id || 'the farm', alert_id: a.alert_id, lat: a.lat ?? a.latitude ?? null, lon: a.lon ?? a.longitude ?? null })} />)}
            </ul>
          )}
      </Section>
      {checking && <FieldCheckSheet target={checking} onClose={() => setChecking(null)} onSaved={saved} />}
    </div>
  );
}
