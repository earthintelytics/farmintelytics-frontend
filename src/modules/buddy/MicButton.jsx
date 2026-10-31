// The big "tap to speak" button. Tap, speak, and the words are typed into the question box; tap again
// when done (it also stops after a pause). The farmer checks the words and presses send.
import { Mic, Square } from 'lucide-react';
import { btn } from './ui';

export default function MicButton({ listen, disabled, onBeforeStart }) {
  const on = listen.listening;
  const tap = () => {
    if (disabled) return;
    if (!on) onBeforeStart?.();
    listen.toggle();
  };
  return (
    <button type="button" disabled={disabled} onClick={tap} aria-pressed={on}
      className={`${btn} w-full min-h-[64px] text-base ${on ? 'bg-[var(--status-critical)] text-white' : 'bg-[var(--brand-primary)] text-white active:bg-[var(--brand-primary-dark)]'}`}>
      {on ? <Square size={22} aria-hidden="true" /> : <Mic size={26} aria-hidden="true" />}
      {on ? 'Listening… tap when you finish' : 'Tap to speak'}
    </button>
  );
}
