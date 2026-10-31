// "Listen" / "Stop" for one piece of text, and the plain note when this phone cannot read it aloud.
import { Square, Volume2 } from 'lucide-react';
import { btnLine } from './ui';
import { readAloudNote } from './useReadAloud';

export default function ListenButton({ id, text, language, voice, label = 'Listen', showNote = true }) {
  const state = voice.availability(language);
  const speaking = voice.speakingId === id;
  if (state !== 'yes') {
    const note = showNote ? readAloudNote(state, language) : '';
    return note ? <p className="text-sm text-[var(--text-muted)]">{note}</p> : null;
  }
  return speaking ? (
    <button type="button" onClick={voice.stop} className={btnLine} aria-label="Stop reading aloud">
      <Square size={18} className="text-[var(--status-critical)]" aria-hidden="true" />Stop
    </button>
  ) : (
    <button type="button" onClick={() => voice.speak(id, text, language)} className={btnLine}>
      <Volume2 size={18} className="text-[var(--brand-primary)]" aria-hidden="true" />{label}
    </button>
  );
}
