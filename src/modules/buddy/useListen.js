// Speaking a question: the phone's speech recognition (Web Speech API) while the farmer holds the
// microphone button. Where the phone or browser has none, `supported` is false and only typing shows.
import { useCallback, useEffect, useRef, useState } from 'react';

const Recognition = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null) || null;

const problem = (code, language) => ({
  'not-allowed': 'The microphone is blocked. Allow it for this site in the phone settings, or type your question.',
  'service-not-allowed': 'The microphone is blocked. Allow it for this site in the phone settings, or type your question.',
  'audio-capture': 'No microphone was found. Type your question instead.',
  'no-speech': 'Nothing was heard. Hold the button and speak.',
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
    const rec = new Rec();
    rec.lang = language.listen;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    textRef.current = '';
    setHeard('');
    setError('');
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

  return { supported, listening, heard, error, setError, start, stop };
}
