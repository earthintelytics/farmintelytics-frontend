// Speaking a question: the phone's speech recognition (Web Speech API) types what the farmer says into
// the question box; nothing is sent until the farmer checks it and presses send. Tap to start, tap again
// to finish (it also stops on its own after a pause). Where the phone or browser has none, `supported` is
// false and only typing shows. Browsers allow the microphone only on a secure (https) address.
import { useCallback, useEffect, useRef, useState } from 'react';

const Recognition = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null) || null;
const secure = () => typeof window === 'undefined' || window.isSecureContext !== false;

const problem = (code, language) => ({
  insecure: 'Speaking needs a secure (https) address. Type your question for now.',
  'not-allowed': 'The microphone is blocked. Allow it for this site in the phone settings, or type your question.',
  'service-not-allowed': 'The microphone is blocked. Allow it for this site in the phone settings, or type your question.',
  'audio-capture': 'No microphone was found. Type your question instead.',
  'no-speech': 'Nothing was heard. Tap the button and speak.',
  network: 'Speaking needs an internet connection. Type your question instead.',
  'language-not-supported': `Speaking in ${language.label} is not available on this phone. Type your question instead.`,
}[code] || 'Could not hear the question. Try again or type it.');

export function useListen({ language, onText }) {
  const supported = !!Recognition();
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const recRef = useRef(null);
  const textRef = useRef('');
  const onTextRef = useRef(onText);
  useEffect(() => { onTextRef.current = onText; }, [onText]);
  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* already stopped */ } }, []);

  const start = useCallback(() => {
    const Rec = Recognition();
    if (!Rec || recRef.current) return;
    setError('');
    if (!secure()) { setError(problem('insecure', language)); return; }
    const rec = new Rec();
    rec.lang = language.listen;
    // One utterance at a time: phones repeat words in continuous mode. Tap again to add more.
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    textRef.current = '';
    setHeard('');
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i += 1) text += e.results[i][0].transcript;
      textRef.current = text.trim();
      setHeard(textRef.current);
    };
    rec.onerror = (e) => { if (e.error !== 'aborted') setError(problem(e.error, language)); };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setHeard('');
      if (textRef.current) onTextRef.current?.(textRef.current);
      textRef.current = '';
    };
    recRef.current = rec;
    try { rec.start(); setListening(true); } catch { recRef.current = null; setError(problem('', language)); }
  }, [language]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* not started yet */ }
  }, []);

  const toggle = useCallback(() => (recRef.current ? stop() : start()), [start, stop]);

  return { supported, listening, heard, error, setError, start, stop, toggle };
}
