// Speaking a question: the phone's speech recognition (Web Speech API) types what the farmer says into
// the question box; nothing is sent until the farmer checks it and presses send. Tap to start, tap again
// to finish (it also stops on its own after a pause). Where the phone or browser has none, `supported` is
// false and only typing shows. Browsers allow the microphone only on a secure (https) address.
import { useCallback, useEffect, useRef, useState } from 'react';
import { nativePlugins } from './native';

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

function useWebListen({ language, onText }) {
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

// The Android app: Android's own speech recognition (speech-recognition plugin; no https needed), the
// same tap to start, live words in the box, tap or a pause to stop. The plugin's stop() never reports back
// and a failed recognition sends no event, so finishing never waits on it: a tap finishes at once with the
// words heard so far, and while listening the phone is asked every second whether it still is.
function useNativeListen({ language, onText }) {
  const sr = nativePlugins()?.SpeechRecognition;
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const textRef = useRef('');
  const onTextRef = useRef(onText);
  const activeRef = useRef(false);   // from the first tap (also while the microphone is starting) to the finish
  const pollRef = useRef(null);
  useEffect(() => { onTextRef.current = onText; }, [onText]);

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearInterval(pollRef.current);
    pollRef.current = null;
    setListening(false);
    setHeard('');
    sr?.removeAllListeners?.()?.catch?.(() => {});
    if (textRef.current) onTextRef.current?.(textRef.current);
    textRef.current = '';
  }, [sr]);
  useEffect(() => () => { clearInterval(pollRef.current); sr?.stop?.()?.catch?.(() => {}); sr?.removeAllListeners?.()?.catch?.(() => {}); }, [sr]);

  const start = useCallback(async () => {
    if (!sr || activeRef.current) return;
    activeRef.current = true;
    setError('');
    textRef.current = '';
    setHeard('');
    setListening(true);
    try {
      const perm = await sr.requestPermissions();
      if (perm?.speechRecognition && perm.speechRecognition !== 'granted') { setError(problem('not-allowed', language)); finish(); return; }
      const { available } = await sr.available();
      if (!available) { setError(problem('language-not-supported', language)); finish(); return; }
      if (!activeRef.current) return;   // tapped again while the microphone was starting
      await sr.addListener('partialResults', (d) => {
        const t = String(d?.matches?.[0] || '').trim();
        if (t && activeRef.current) { textRef.current = t; setHeard(t); }
      });
      // Stopped by a pause: Android sends its final words just after, so finish a moment later.
      const settle = () => { clearInterval(pollRef.current); setTimeout(finish, 700); };
      await sr.addListener('listeningState', (d) => { if (d?.status === 'stopped') settle(); });
      await sr.start({ language: language.listen, maxResults: 1, partialResults: true, popup: false });
      if (!activeRef.current) { sr.stop?.()?.catch?.(() => {}); return; }
      pollRef.current = setInterval(async () => {
        try { const r = await sr.isListening(); if (!r?.listening) settle(); } catch { finish(); }
      }, 1000);
    } catch (e) {
      const msg = String(e?.message || e || '');
      setError(/permission/i.test(msg) ? problem('not-allowed', language) : /language/i.test(msg) ? problem('language-not-supported', language) : problem('no-speech', language));
      finish();
    }
  }, [sr, language, finish]);

  const stop = useCallback(() => {
    sr?.stop?.()?.catch?.(() => {});   // not awaited: the plugin never answers it
    finish();
  }, [sr, finish]);

  const toggle = useCallback(() => (activeRef.current ? stop() : start()), [start, stop]);

  return { supported: !!sr, listening, heard, error, setError, start, stop, toggle };
}

// Android's recognition inside the app, the browser's on the web (fixed for the life of the page).
export const useListen = nativePlugins()?.SpeechRecognition ? useNativeListen : useWebListen;

/** Whether this phone or browser can turn speech into text at all. */
export const canListen = () => !!(nativePlugins()?.SpeechRecognition || Recognition());
