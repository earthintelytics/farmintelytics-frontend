// Reading answers aloud with the phone's own voices (Web Speech API, speechSynthesis). A voice is used
// only when the phone has one for the language; many phones have none for Hausa, Yoruba or Igbo, and
// then the answer stays text only (never read in another language's voice pretending to be it).
import { useCallback, useEffect, useRef, useState } from 'react';
import { speechChunks } from './plainText';

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null);
const norm = (l) => String(l || '').replace('_', '-').toLowerCase();

function pickVoice(voices, prefs) {
  for (const p of prefs.map(norm)) {
    const hits = voices.filter((v) => (p.includes('-') ? norm(v.lang) === p : norm(v.lang) === p || norm(v.lang).startsWith(`${p}-`)));
    if (hits.length) return hits.find((v) => v.localService) || hits[0];
  }
  return null;
}

export function useReadAloud() {
  const s = synth();
  const [voices, setVoices] = useState(() => (s ? s.getVoices() : []));
  const [ready, setReady] = useState(() => !s || s.getVoices().length > 0);
  const [speakingId, setSpeakingId] = useState(null);
  const runRef = useRef(0);

  useEffect(() => {
    if (!s) return undefined;
    const load = () => { const v = s.getVoices(); setVoices(v); if (v.length) setReady(true); };
    s.addEventListener?.('voiceschanged', load);
    // Some phones never fire "voiceschanged"; after a moment, what is there is all there is.
    const t = setTimeout(() => { load(); setReady(true); }, 1500);
    return () => { clearTimeout(t); s.removeEventListener?.('voiceschanged', load); s.cancel(); };
  }, [s]);

  const voiceFor = useCallback((language) => pickVoice(voices, language.voices), [voices]);

  const stop = useCallback(() => {
    runRef.current += 1;
    s?.cancel();
    setSpeakingId(null);
  }, [s]);

  const speak = useCallback((id, text, language) => {
    const voice = voiceFor(language);
    if (!s || !voice) return false;
    s.cancel();
    const run = ++runRef.current;
    const parts = speechChunks(text);
    if (!parts.length) return false;
    setSpeakingId(id);
    parts.forEach((part, i) => {
      const u = new window.SpeechSynthesisUtterance(part);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = 0.95;
      if (i === parts.length - 1) u.onend = () => { if (runRef.current === run) setSpeakingId(null); };
      u.onerror = () => { if (runRef.current === run) setSpeakingId(null); };
      s.speak(u);
    });
    return true;
  }, [s, voiceFor]);

  // 'yes' | 'no' (no voice for this language on this phone) | 'none' (no reading aloud at all) | 'checking'
  const availability = useCallback((language) => {
    if (!s) return 'none';
    if (voiceFor(language)) return 'yes';
    if (!ready) return 'checking';
    return voices.length ? 'no' : 'none';
  }, [s, ready, voices, voiceFor]);

  return { speak, stop, speakingId, availability };
}

/** The plain sentence shown when an answer cannot be read aloud. */
export function readAloudNote(state, language) {
  if (state === 'none') return 'Reading aloud is not available on this phone; the answer is shown as text.';
  if (state === 'no') return `Reading aloud in ${language.label} is not available on this phone; the answer is shown in ${language.label}.`;
  return '';
}
