// Farm Buddy: the farmers' phone app (/buddy, /buddy/alerts). Ask the farm advisor by voice or text,
// and see the farm's open alerts and where to walk. The organisation, its services and all content
// come from the sign-in and the API; App.jsx sends anyone not signed in to the sign-in first.
import { useCallback, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import BuddyShell from './BuddyShell';
import BuddyMenu from './BuddyMenu';
import LanguageSheet from './LanguageSheet';
import ServicePicker from './ServicePicker';
import AskScreen from './AskScreen';
import AlertsScreen from './AlertsScreen';
import { languageById, readLanguage, saveLanguage } from './languages';
import { buddyServices, clearBuddyService, pointRequestsAt, readBuddyService, saveBuddyService } from './buddyService';
import { useBuddyChat } from './useBuddyChat';
import { useReadAloud } from './useReadAloud';
import { useBuddyManifest } from './useBuddyManifest';
import { readOrgProfile } from '../../pages/org/orgProfile';
import { clearTenantSession } from '../../services/session';

const canListen = () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export default function BuddyApp() {
  useBuddyManifest();
  const navigate = useNavigate();
  const [profile] = useState(readOrgProfile);
  const [services] = useState(buddyServices);
  const [serviceId, setServiceId] = useState(() => readBuddyService(services));
  const [langId, setLangId] = useState(readLanguage);
  const [sheet, setSheet] = useState(null); // 'language' | 'menu' | null
  const language = languageById(langId);
  const service = services.find((s) => s.id === serviceId) || null;
  pointRequestsAt(service?.id);

  const voice = useReadAloud();
  const { speak } = voice;
  const onAnswer = useCallback((m) => speak(m.id, m.text, languageById(m.lang)), [speak]);
  const chat = useBuddyChat({ language, serviceTitle: service?.title, onAnswer });

  const closeSheet = useCallback(() => setSheet(null), []);
  const pickLanguage = (id) => { saveLanguage(id); setLangId(id); setSheet(null); };
  const pickService = (id) => { saveBuddyService(id); setServiceId(id); };
  const signOut = () => { voice.stop(); clearBuddyService(); clearTenantSession(); navigate('/login?next=buddy', { replace: true }); };

  if (!service) {
    return (
      <BuddyShell subtitle={profile.name}>
        <ServicePicker services={services} onPick={pickService} onSignOut={signOut} />
      </BuddyShell>
    );
  }

  const screen = { language, voice };
  return (
    <BuddyShell subtitle={[profile.name, service.title].filter(Boolean).join(' · ')} language={language}
      onLanguage={() => setSheet('language')} onMenu={() => setSheet('menu')}>
      <Routes>
        <Route index element={<AskScreen chat={chat} {...screen} />} />
        <Route path="alerts" element={<AlertsScreen tenant={profile.tenant} serviceId={service.id} {...screen} />} />
        <Route path="*" element={<Navigate to="/buddy" replace />} />
      </Routes>
      {sheet === 'language' && (
        <LanguageSheet current={langId} onPick={pickLanguage} onClose={closeSheet} availability={voice.availability} canSpeak={canListen()} />
      )}
      {sheet === 'menu' && (
        <BuddyMenu orgName={profile.name} serviceTitle={service.title} canChangeService={services.length > 1}
          onChangeService={() => { clearBuddyService(); setServiceId(null); setSheet(null); }}
          onSignOut={signOut} onClose={closeSheet} />
      )}
    </BuddyShell>
  );
}
