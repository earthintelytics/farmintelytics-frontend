import { useSearchParams } from 'react-router-dom';
import PublicLayout, { Section } from './PublicLayout';

/**
 * Privacy notice in plain words, one tab per kind of data. Keep it true to what the platform does;
 * review with counsel before launch. Tabs are in the address (?tab=) so a link can open one.
 */
const contact = <a href="/contact" className="text-[var(--brand-primary)] underline">contact page</a>;

const TABS = [
  {
    id: 'overview', label: 'Overview',
    sections: [
      ['In short', <>
        <p>FarmIntelytics collects what it needs to monitor your farm and run the services your organisation chose. We do not sell your data, we do not use it for advertising, and nobody in another organisation can see it.</p>
        <p>The tabs above explain each kind of data: who it is about, why we hold it, who can see it and how long we keep it.</p>
      </>],
      ['Who is responsible', <p>Earthintelytics runs FarmIntelytics. For farm and member data, your organisation decides what is collected and why; we process it on its behalf. For accounts and the website, we are responsible.</p>],
      ['The law we follow', <p>The Nigeria Data Protection Act 2023 (NDPA). Where a client is in another country, we also follow the rules that apply to it, as set out in its agreement with us.</p>],
    ],
  },
  {
    id: 'accounts', label: 'Accounts',
    sections: [
      ['What we hold', <p>Name, email address and role for each person your organisation adds, and records of sign-ins and changes made in the platform.</p>],
      ['Why', <p>To let the right people in, show each person what their role allows, and keep a record of who changed what, to fix problems and keep the service secure.</p>],
      ['Who can see it', <p>Administrators in your organisation, and the FarmIntelytics team when setting up or supporting your account.</p>],
    ],
  },
  {
    id: 'farm', label: 'Farm and field data',
    sections: [
      ['What we hold', <p>Estate and field boundaries, crops, planting dates and any farm records you upload, such as yields or field visits, plus the monitoring results we produce for them.</p>],
      ['Why', <p>To run the services your organisation chose: satellite monitoring, alerts, advice, reports, deforestation checks and suitability analyses.</p>],
      ['Who can see it', <p>People in your organisation, within their role, and the FarmIntelytics team to support you. Each organisation&apos;s data is kept apart; nobody in another organisation can see it.</p>],
    ],
  },
  {
    id: 'members', label: 'Smallholder members',
    sections: [
      ['What we hold', <p>When a co-operative registers members, the details its form asks for, for example name, phone number, parcel boundary and photos. Members give these with their consent.</p>],
      ['Why', <p>To keep the co-operative&apos;s member and parcel register, monitor member farms and run checks such as deforestation checks for buyers.</p>],
      ['Choices for members', <p>A member can ask the co-operative, or us directly, to see, correct or delete their details. The co-operative can export or delete member records at any time.</p>],
    ],
  },
  {
    id: 'advisor', label: 'Farm advisor (AI)',
    sections: [
      ['What is sent', <p>When you ask the farm advisor a question, your question, the last few turns of the chat and a summary of your own farm&apos;s results are sent to the AI provider your organisation&apos;s service uses (for example Google, OpenAI or Anthropic) to write the answer.</p>],
      ['What is never sent', <p>Data from any other organisation, passwords, and member contact details.</p>],
      ['Your chat history', <p>Recent chats are kept on your own device so you can pick up where you left off. Signing out clears them.</p>],
    ],
  },
  {
    id: 'satellite', label: 'Satellite and public data',
    sections: [
      ['Where it comes from', <p>Satellite imagery and maps come from public sources such as Copernicus (Sentinel-1 and Sentinel-2), USGS and NASA (Landsat 8 and 9), CHIRPS rainfall and SoilGrids, and from map providers for the background map.</p>],
      ['What we send them', <p>Only the area to look at. Never your name, your organisation or any personal data.</p>],
    ],
  },
  {
    id: 'cookies', label: 'Cookies and storage',
    sections: [
      ['What we store in your browser', <p>Your sign-in and simple preferences (for example a panel you closed), so the platform works and remembers your choices. Signing out removes your sign-in.</p>],
      ['What we do not use', <p>No advertising cookies and no tracking across other websites.</p>],
    ],
  },
  {
    id: 'sharing', label: 'Sharing and security',
    sections: [
      ['Who we share with', <p>Only the providers that help run the service: hosting and storage, the AI provider for the farm advisor, and email delivery. Each handles data only to provide that service. We share with authorities only when the law requires it.</p>],
      ['How we protect it', <p>Each organisation&apos;s data is kept apart, every request is checked against the signed-in organisation, and connections are encrypted. Access by our team is limited to setting up and supporting accounts.</p>],
    ],
  },
  {
    id: 'retention', label: 'Keeping and deleting',
    sections: [
      ['How long we keep it', <p>For as long as your organisation uses the service, or as your agreement with us says.</p>],
      ['When an organisation leaves', <p>We delete its data, or return it first on request.</p>],
    ],
  },
  {
    id: 'rights', label: 'Your rights',
    sections: [
      ['What you can ask', <p>To see, correct, export or delete your personal data, and to object to how it is used. Smallholder members can ask their co-operative or us directly.</p>],
      ['How to ask', <p>Write to us from the {contact}. We reply within the time the NDPA sets.</p>],
      ['Changes to this notice', <p>When this notice changes, the date at the top changes too, and we tell organisations about important changes.</p>],
    ],
  },
];

export default function PrivacyPage() {
  const [params, setParams] = useSearchParams();
  const active = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  return (
    <PublicLayout eyebrow="Privacy" title="Privacy notice" wide
      intro="What FarmIntelytics collects, why, who can see it and what you can ask us to do with it. Last updated 12 October 2026.">
      <div role="tablist" aria-label="Privacy topics" className="flex gap-1 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={active.id === t.id} onClick={() => setParams({ tab: t.id })}
            className={`shrink-0 px-3 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap ${active.id === t.id ? 'border-[var(--brand-primary)] text-gray-900 font-semibold' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="max-w-3xl mt-8">
        {active.sections.map(([title, body]) => <Section key={title} title={title}>{body}</Section>)}
      </div>
    </PublicLayout>
  );
}
