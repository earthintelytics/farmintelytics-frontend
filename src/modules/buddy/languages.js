// The languages Farm Buddy offers. `listen` is the code given to the phone's speech recognition,
// `voices` the voice languages that may read an answer aloud, best first. Pidgin has no voice of its
// own, so it is read with an English voice (said in the menu). Remembered on this phone.
export const LANGUAGES = [
  { id: 'en', label: 'English', own: 'English', answer: 'English', listen: 'en-NG', voices: ['en-NG', 'en-GB', 'en-ZA', 'en-KE', 'en-IN', 'en-US', 'en'] },
  { id: 'pcm', label: 'Nigerian Pidgin', own: 'Naijá', answer: 'Nigerian Pidgin', listen: 'en-NG', voices: ['en-NG', 'en-GB', 'en-ZA', 'en-US', 'en'], voiceNote: 'Read aloud with an English voice' },
  { id: 'ha', label: 'Hausa', own: 'Harshen Hausa', answer: 'Hausa', listen: 'ha-NG', voices: ['ha-NG', 'ha'] },
  { id: 'yo', label: 'Yoruba', own: 'Èdè Yorùbá', answer: 'Yoruba', listen: 'yo-NG', voices: ['yo-NG', 'yo'] },
  { id: 'ig', label: 'Igbo', own: 'Asụsụ Igbo', answer: 'Igbo', listen: 'ig-NG', voices: ['ig-NG', 'ig'] },
  { id: 'fr', label: 'French', own: 'Français', answer: 'French', listen: 'fr-FR', voices: ['fr-FR', 'fr-BE', 'fr-CH', 'fr-CA', 'fr'] },
];

const KEY = 'fi_buddy_lang';

export const languageById = (id) => LANGUAGES.find((l) => l.id === id) || LANGUAGES[0];

export function readLanguage() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && LANGUAGES.some((l) => l.id === saved)) return saved;
  } catch { /* storage blocked */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || '';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export function saveLanguage(id) {
  try { localStorage.setItem(KEY, id); } catch { /* storage blocked: kept for this visit only */ }
}
