// One message in the Ask chat: the farmer's question, or the advisor's answer with "Listen again" /
// "Stop", or an honest failure with "Try again".
import { RotateCcw } from 'lucide-react';
import ListenButton from './ListenButton';
import { languageById } from './languages';
import { btnLine } from './ui';

export default function ChatBubble({ message, voice, onRetry }) {
  if (message.from === 'me') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-xl bg-green-50 px-4 py-3 text-base leading-relaxed whitespace-pre-line break-words">{message.text}</p>
      </div>
    );
  }
  if (message.failed) {
    return (
      <div className="max-w-[90%] rounded-xl border border-[var(--border-light)] bg-white px-4 py-3 space-y-3">
        <p className="text-base text-[var(--status-critical)]">{message.text}</p>
        <button type="button" onClick={() => onRetry(message)} className={btnLine}>
          <RotateCcw size={18} aria-hidden="true" />Try again
        </button>
      </div>
    );
  }
  return (
    <div className="max-w-[90%] rounded-xl border border-[var(--border-light)] bg-white px-4 py-3 space-y-3">
      <p className="text-base leading-relaxed whitespace-pre-line break-words">{message.text}</p>
      <ListenButton id={message.id} text={message.text} language={languageById(message.lang)} voice={voice} label="Listen again" />
    </div>
  );
}
