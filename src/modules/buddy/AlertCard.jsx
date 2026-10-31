// One open alert: the block, what is wrong, what to do (when the alert says), the date, and
// "Listen" / "Ask about this".
import { AlertTriangle, Info, MessageCircle, AlertOctagon } from 'lucide-react';
import ListenButton from './ListenButton';
import { adviceOf, alertDate, alertSpeech, severityOf } from './farmText';
import { btnLine, muted } from './ui';

const TONE = {
  critical: { icon: AlertOctagon, colour: 'text-[var(--status-critical)]' },
  warning: { icon: AlertTriangle, colour: 'text-[var(--status-warning)]' },
  info: { icon: Info, colour: 'text-[var(--status-info)]' },
};

export default function AlertCard({ alert, language, voice, onAsk }) {
  const s = severityOf(alert);
  const tone = TONE[s.tone] || TONE.info;
  const Icon = tone.icon;
  const advice = adviceOf(alert);
  const date = alertDate(alert.timestamp);
  return (
    <li className="rounded-xl border border-[var(--border-light)] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${tone.colour}`}>
          <Icon size={18} aria-hidden="true" />{s.label}
        </span>
        {date && <span className={`text-sm ${muted}`}>{date}</span>}
      </div>
      <h3 className="font-display text-base font-semibold">{alert.plot_id || 'Whole farm'}</h3>
      {alert.message && <p className="text-base leading-relaxed">{alert.message}</p>}
      {advice && (
        <div>
          <p className={`text-sm ${muted}`}>What to do</p>
          <p className="text-base leading-relaxed">{advice}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <ListenButton id={`alert:${alert.alert_id}`} text={alertSpeech(alert)} language={language} voice={voice} showNote={false} />
        <button type="button" onClick={() => onAsk(alert)} className={btnLine}>
          <MessageCircle size={18} className="text-[var(--brand-primary)]" aria-hidden="true" />Ask about this
        </button>
      </div>
    </li>
  );
}
