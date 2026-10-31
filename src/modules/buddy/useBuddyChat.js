// Farm Buddy's conversation with the farm advisor (POST /ai/query). The chat shows the farmer's own
// words; the advisor also gets the chosen answer language and the service, which the farmer never
// sees. Kept in memory only: a shared phone keeps no chat after the app is closed.
import { useCallback, useRef, useState } from 'react';
import { queryAiAgent } from '../../services/organizationMonitorApi';
import { plainText } from './plainText';

const promptFor = (question, language, serviceTitle) => [
  `Answer in ${language.answer}.`,
  '',
  question,
  '',
  `Context: asked in the Farm Buddy phone app${serviceTitle ? `; service: ${serviceTitle}` : ''}. Keep the answer short and in plain farm words.`,
].join('\n');

export function useBuddyChat({ language, serviceTitle, onAnswer }) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const busyRef = useRef(false);

  const ask = useCallback(async (question, { bubble = true } = {}) => {
    const q = String(question || '').trim();
    if (!q || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    seq.current += 1;
    const n = seq.current;
    if (bubble) setMessages((m) => [...m, { id: `q${n}`, from: 'me', text: q }]);
    let reply;
    try {
      const res = await queryAiAgent(promptFor(q, language, serviceTitle));
      const text = plainText(res?.response);
      reply = text
        ? { id: `a${n}`, from: 'buddy', text, lang: language.id }
        : { id: `a${n}`, from: 'buddy', failed: true, question: q, text: 'The advisor gave no answer. Try asking again.' };
    } catch {
      reply = { id: `a${n}`, from: 'buddy', failed: true, question: q, text: 'Could not reach the advisor, try again.' };
    }
    setMessages((m) => [...m, reply]);
    busyRef.current = false;
    setBusy(false);
    if (!reply.failed) onAnswer?.(reply);
  }, [language, serviceTitle, onAnswer]);

  const retry = useCallback((failed) => {
    setMessages((m) => m.filter((x) => x.id !== failed.id));
    ask(failed.question, { bubble: false });
  }, [ask]);

  return { messages, busy, ask, retry };
}
