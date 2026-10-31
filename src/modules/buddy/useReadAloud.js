// Reading answers aloud with the phone's own voices (Web Speech API, speechSynthesis). A voice is used
// only when the phone has one for the language; many phones have none for Hausa, Yoruba or Igbo, and
// then the answer stays text only (never read in another language's voice pretending to be it).
import { useCallback, useEffect, useRef, useState } from 'react';
import { speechChunks } from './plainText';
import { nativePlugins } from './native';

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null);
const norm = (l) => String(l || '').replace('_', '-').toLowerCase();

// Farm Buddy speaks with a deep male voice, Nigerian English first: among the phone's voices for the
// language, one named as male is preferred and those named as female are avoided (phones name voices
// differently, so this is a preference, not a promise). Pitch and speed stay natural: lowering them made
// phone voices sound shaky and unsure (31 Oct 2026).
const MALE = /\bmale\b|\bman\b|abeo|guy|baritone|deep/i;
const FEMALE = /female|woman|girl|ezinne|zira|susan|samantha|karen|tessa|moira|fiona|victoria|hazel|libby|sonia|aria|jenny/i;
const PITCH = 1.0;
const RATE = 1.0;
const score = (v) => (MALE.test(v.name) ? 2 : 0) - (FEMALE.test(v.name) ? 2 : 0) + (v.localService ? 0.5 : 0);

function pickVoice(voices, prefs) {
  for (const p of prefs.map(norm)) {
    const hits = voices.filter((v) => (p.includes('-') ? norm(v.lang) === p : norm(v.lang) === p || norm(v.lang).startsWith(`${p}-`)));
    if (hits.length) return [...hits].sort((a, b) => score(b) - score(a))[0];
  }
  return null;
}

function useWebReadAloud() {
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
      u.rate = RATE;
      u.pitch = PITCH;
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

// The Android app: Android's voices (text-to-speech plugin), the same voice choice and lower pitch.
function useNativeReadAloud() {
  const tts = nativePlugins()?.TextToSpeech;
  const [voices, setVoices] = useState([]);
  const [ready, setReady] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const runRef = useRef(0);

  useEffect(() => {
    let live = true;
    tts?.getSupportedVoices?.()
      .then((r) => { if (live) setVoices((r?.voices || []).map((v, index) => ({ ...v, index }))); })
      .catch(() => {})
      .finally(() => { if (live) setReady(true); });
    return () => { live = false; tts?.stop?.().catch(() => {}); };
  }, [tts]);

  const voiceFor = useCallback((language) => pickVoice(voices, language.voices), [voices]);

  const stop = useCallback(() => {
    runRef.current += 1;
    tts?.stop?.().catch(() => {});
    setSpeakingId(null);
  }, [tts]);

  const speak = useCallback((id, text, language) => {
    const voice = voiceFor(language);
    if (!tts || !voice) return false;
    const parts = speechChunks(text);
    if (!parts.length) return false;
    const run = ++runRef.current;
    setSpeakingId(id);
    (async () => {
      try {
        await tts.stop().catch(() => {});
        for (const part of parts) {
          if (runRef.current !== run) return;
          await tts.speak({ text: part, lang: voice.lang, voice: voice.index, rate: RATE, pitch: PITCH });
        }
      } catch { /* stopped or no voice */ }
      if (runRef.current === run) setSpeakingId(null);
    })();
    return true;
  }, [tts, voiceFor]);

  const availability = useCallback((language) => {
    if (!tts) return 'none';
    if (voiceFor(language)) return 'yes';
    if (!ready) return 'checking';
    return voices.length ? 'no' : 'none';
  }, [tts, ready, voices, voiceFor]);

  return { speak, stop, speakingId, availability };
}

// Android's voices inside the app, the browser's on the web (fixed for the life of the page).
export const useReadAloud = nativePlugins()?.TextToSpeech ? useNativeReadAloud : useWebReadAloud;

/** The plain sentence shown when an answer cannot be read aloud. */
export function readAloudNote(state, language) {
  if (state === 'none') return 'Reading aloud is not available on this phone; the answer is shown as text.';
  if (state === 'no') return `Reading aloud in ${language.label} is not available on this phone; the answer is shown in ${language.label}.`;
  return '';
}
