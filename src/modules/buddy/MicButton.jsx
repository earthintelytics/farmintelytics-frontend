// The big "hold to speak" button. Press and hold, speak, let go: what was heard is sent as the
// question. Works with touch, mouse and keyboard (hold Space or Enter).
import { useRef } from 'react';
import { Mic } from 'lucide-react';
import { btn } from './ui';

export default function MicButton({ listen, disabled, onBeforeStart }) {
  const pressedAt = useRef(0);

  const begin = () => {
    if (disabled || pressedAt.current) return;
    pressedAt.current = Date.now();
    onBeforeStart?.();
    listen.start();
  };
  const end = () => {
    if (!pressedAt.current) return;
    const short = Date.now() - pressedAt.current < 400;
    pressedAt.current = 0;
    listen.stop();
    if (short) listen.setError('Hold the button down while you speak, then let go.');
  };

  const on = listen.listening;
  return (
    <button type="button" disabled={disabled}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); begin(); }}
      onPointerUp={end} onPointerCancel={end}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } }}
      onContextMenu={(e) => e.preventDefault()}
      aria-pressed={on}
      className={`${btn} w-full min-h-[64px] text-base touch-none ${on ? 'bg-[var(--status-critical)] text-white' : 'bg-[var(--brand-primary)] text-white active:bg-[var(--brand-primary-dark)]'}`}>
      <Mic size={26} aria-hidden="true" />
      {on ? 'Listening… let go to send' : 'Hold to speak'}
    </button>
  );
}
