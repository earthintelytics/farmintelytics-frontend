// Choosing the language of the answers. Each language says plainly whether this phone can read it
// aloud, so nobody waits for a voice that is not there.
import { Check } from 'lucide-react';
import Sheet from './Sheet';
import { LANGUAGES } from './languages';
import { rowButton, muted, main } from './ui';

const voiceLine = (state, lang) => {
  if (state === 'yes') return lang.voiceNote || 'Can be read aloud on this phone';
  if (state === 'checking') return 'Checking the voices on this phone…';
  return 'Text only on this phone';
};

export default function LanguageSheet({ current, onPick, onClose, availability, canSpeak }) {
  return (
    <Sheet title="Answer language" onClose={onClose}>
      <p className={`text-sm ${muted} mb-3`}>The advisor answers in the language you choose.{canSpeak ? ' You can also speak in it.' : ''}</p>
      <ul className="space-y-2">
        {LANGUAGES.map((l) => {
          const on = l.id === current;
          return (
            <li key={l.id}>
              <button type="button" onClick={() => onPick(l.id)} aria-pressed={on}
                className={`${rowButton} ${on ? 'border-[var(--brand-primary)]' : ''}`}>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[15px] font-semibold ${main}`}>{l.label}{l.own !== l.label && <span className={`font-normal ${muted}`}> · {l.own}</span>}</span>
                  <span className={`block text-sm ${muted} mt-0.5`}>{voiceLine(availability(l), l)}</span>
                </span>
                {on && <Check size={20} className="shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
