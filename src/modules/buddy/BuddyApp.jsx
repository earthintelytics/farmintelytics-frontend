// FarmIntelytics Buddy: the farmers' phone app (/buddy, /buddy/alerts). Talk with the farm advisor by voice or
// text, and see the farm's open alerts and where to walk. No service is chosen: the advisor gets the
// whole organisation and asks which farm when the question does not say. Everything comes from the
// sign-in and the API; App.jsx sends anyone not signed in to the sign-in first.
import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import BuddyShell from './BuddyShell';
import BuddyMenu from './BuddyMenu';
import LanguageSheet from './LanguageSheet';
import AskScreen from './AskScreen';
import AlertsScreen from './AlertsScreen';
import { languageById, readLanguage, saveLanguage } from './languages';
import { useBuddyChat } from './useBuddyChat';
import { useReadAloud } from './useReadAloud';
import { canListen } from './useListen';
import { useBuddyManifest } from './useBuddyManifest';
import { readOrgProfile, personName } from '../../pages/org/orgProfile';
import { CROP_PHOTOS, SERVICE_PHOTOS } from '../../constants/servicePhotos';
import { clearTenantSession } from '../../services/session';


export default function BuddyApp() {
  useBuddyManifest();
  const navigate = useNavigate();
  const [profile] = useState(readOrgProfile);
  const [langId, setLangId] = useState(readLanguage);
  const [sheet, setSheet] = useState(null); // 'language' | 'menu' | null
  const language = languageById(langId);
  // The whole organisation: requests carry no service (a portal page may have left one in the session).
  useEffect(() => { try { sessionStorage.removeItem('fi_module'); } catch { /* storage blocked */ } }, []);

  const voice = useReadAloud();
  const { speak } = voice;
  const onAnswer = useCallback((m) => speak(m.id, m.text, languageById(m.lang)), [speak]);
  const chat = useBuddyChat({ language, onAnswer });

  const closeSheet = useCallback(() => setSheet(null), []);
  const pickLanguage = (id) => { saveLanguage(id); setLangId(id); setSheet(null); };
  const signOut = () => { voice.stop(); clearTenantSession(); navigate('/login?next=buddy', { replace: true }); };

  const screen = { language, voice };
  const person = personName(profile);
  // A picture of this farm's crop on the Ask screen (the organisation's first crop, else the advisor's).
  const photo = CROP_PHOTOS[(profile.crops || [])[0]] || SERVICE_PHOTOS.advisor;
  return (
    <BuddyShell subtitle={profile.name} language={language}
      onLanguage={() => setSheet('language')} onMenu={() => setSheet('menu')}>
      <Routes>
        <Route index element={<AskScreen chat={chat} person={person} photo={photo} {...screen} />} />
        <Route path="alerts" element={<AlertsScreen tenant={profile.tenant} {...screen} />} />
        <Route path="*" element={<Navigate to="/buddy" replace />} />
      </Routes>
      {sheet === 'language' && (
        <LanguageSheet current={langId} onPick={pickLanguage} onClose={closeSheet} availability={voice.availability} canSpeak={canListen()} />
      )}
      {sheet === 'menu' && (
        <BuddyMenu orgName={profile.name} person={person} onSignOut={signOut} onClose={closeSheet} />
      )}
    </BuddyShell>
  );
}
