// Alerts and updates: first "Where to walk" (the weak patches inside blocks), then the farm's open
// alerts, most urgent and newest first, for the whole organisation. Everything comes from the API.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import AlertCard from './AlertCard';
import WalkSpotCard from './WalkSpotCard';
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
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Problem({ text, onRetry }) {
  return (
    <div className="space-y-3">
      <p className="text-base text-[var(--status-critical)]">{text}</p>
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-8">
      {language.id !== 'en' && (
        <p className={`text-[15px] ${muted}`}>Alerts are written in English. Tap “Ask about this” to have one explained in {language.label}.</p>
      )}

      <Section title="Where to walk">
        {spots.error ? <Problem text="Could not load where to walk. Check the connection and try again." onRetry={spots.retry} />
          : !spots.data ? <p className={`text-base ${muted}`} role="status">Loading where to walk…</p>
          : !spots.data.images?.length ? <p className={`text-base ${muted}`}>Where to walk shows after the next check of your farm.</p>
          : !walk.length ? <p className="text-base">No weak patch inside any {unit} on the latest pictures of the farm.</p>
          : (
            <>
              <p className={`text-[15px] ${muted}`}>Weak patches inside your {plural(unit)}. The causes are what to check on the ground, not a diagnosis.</p>
              <ul className="space-y-3">
                {walk.map((s) => <WalkSpotCard key={`${s.plot_id}:${s.where}`} spot={s} language={ENGLISH} voice={voice} />)}
              </ul>
            </>
          )}
      </Section>

      <Section title={open.length ? `Alerts (${open.length} open)` : 'Alerts'}>
        {alerts.error ? <Problem text="Could not load the alerts. Check the connection and try again." onRetry={alerts.retry} />
          : !alerts.data ? <p className={`text-base ${muted}`} role="status">Loading alerts…</p>
          : !open.length ? <p className="text-base">No open alerts.</p>
          : (
            <ul className="space-y-3">
              {open.map((a) => <AlertCard key={a.alert_id} alert={a} language={ENGLISH} voice={voice} onAsk={ask} />)}
            </ul>
          )}
      </Section>
    </div>
  );
}
