// FarmIntelytics Buddy's talk with the farm advisor (POST /ai/query, style "conversation"). No service is chosen:
// the advisor gets the whole organisation and asks which farm when the question does not say, and it
// receives the earlier turns so it can follow the talk. The chat shows the farmer's own words; the
// advisor also gets the chosen answer language, which the farmer never sees. Kept in memory only: a
// shared phone keeps no chat after the app is closed.
import { useCallback, useEffect, useRef, useState } from 'react';
import { queryAiAgent } from '../../services/organizationMonitorApi';
import { plainText } from './plainText';

const HISTORY_TURNS = 8;
const promptFor = (question, language) => `Answer in ${language.answer}.\n\n${question}`;
const historyOf = (messages) => messages.filter((m) => !m.failed && m.text)
  .slice(-HISTORY_TURNS).map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }));

export function useBuddyChat({ language, onAnswer }) {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const busyRef = useRef(false);
  const messagesRef = useRef([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const ask = useCallback(async (question, { bubble = true } = {}) => {
    const q = String(question || '').trim();
    if (!q || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    seq.current += 1;
    const n = seq.current;
    const history = historyOf(messagesRef.current);
    if (bubble) setMessages((m) => [...m, { id: `q${n}`, from: 'me', text: q }]);
    let reply;
    try {
      const res = await queryAiAgent(promptFor(q, language), { style: 'conversation', history });
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
  }, [language, onAnswer]);

  const retry = useCallback((failed) => {
    setMessages((m) => m.filter((x) => x.id !== failed.id));
    ask(failed.question, { bubble: false });
  }, [ask]);

  return { messages, busy, ask, retry };
}
