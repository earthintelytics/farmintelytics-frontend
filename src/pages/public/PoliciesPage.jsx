import { useSearchParams } from 'react-router-dom';
import PublicLayout, { Section, CapsuleTabs } from './PublicLayout';

/**
 * Policies: three sub-pages behind capsule buttons, the terms of service, the privacy policy and the
 * credits the data sources ask for (docs/DATA_SOURCES.md section 8). The full terms are in each
 * organisation's agreement. Keep every line true to what the platform does; review with counsel
 * before launch.
 */
const CREDITS = [
  ['Satellite imagery', [
    ['Copernicus Sentinel-1 and Sentinel-2', 'European Union and European Space Agency, open data.', 'Contains modified Copernicus Sentinel data 2026, processed by FarmIntelytics.'],
    ['Landsat 8 and Landsat 9', 'U.S. Geological Survey and NASA, public domain.', 'Landsat imagery courtesy of NASA / USGS.'],
  ]],
  ['Weather and climate', [
    ['CHIRPS rainfall', 'Climate Hazards Center, UC Santa Barbara.', 'CHIRPS, Climate Hazards Center, UC Santa Barbara.'],
    ['ERA5-Land', 'ECMWF, Copernicus Climate Change Service, CC BY 4.0.', 'Generated using Copernicus Climate Change Service information 2026.'],
  ]],
  ['Terrain, soil and water', [
    ['Copernicus DEM GLO-30', 'European Space Agency.', 'Produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved.'],
    ['SoilGrids 250 m', 'ISRIC - World Soil Information, CC BY 4.0.', 'SoilGrids, ISRIC (CC BY 4.0).'],
    ['JRC Global Surface Water', 'European Commission Joint Research Centre.', 'JRC Global Surface Water, European Commission.'],
  ]],
  ['Land cover and forest', [
    ['JRC Global Forest Cover 2020', 'European Commission Joint Research Centre.', 'JRC GFC2020, European Commission.'],
    ['Hansen Global Forest Change', 'University of Maryland, Google, USGS and NASA, CC BY 4.0.', 'Hansen/UMD/Google/USGS/NASA.'],
    ['RADD forest disturbance alerts', 'Wageningen University, CC BY 4.0.', 'RADD alerts, Wageningen University (CC BY 4.0).'],
    ['ESA WorldCover', 'European Space Agency, CC BY 4.0.', 'ESA WorldCover (CC BY 4.0).'],
  ]],
  ['Protected areas', [
    ['World Database on Protected Areas (WDPA)', 'UNEP-WCMC and IUCN, Protected Planet.', 'UNEP-WCMC and IUCN, Protected Planet: The World Database on Protected Areas, October 2026, Cambridge, UK.'],
  ]],
  ['Maps on this website', [
    ['Satellite background imagery', 'Esri and its partners.', 'Imagery © Esri, Maxar, Earthstar Geographics.'],
    ['Street map', 'OpenStreetMap contributors, ODbL.', '© OpenStreetMap contributors.'],
  ]],
];

function Terms() {
  return (
    <>
      <Section title="Your data stays yours">
        <p>Organisations keep ownership of their boundaries, uploaded records, drone images and settings. The FarmIntelytics software and its analysis methods belong to FarmIntelytics / Earthintelytics.</p>
      </Section>
      <Section title="Results are decision support">
        <p>Satellite results, alerts, suitability classes and yield estimates help you decide where to look and what to plan. They depend on clear images (cloud can delay them for weeks in the rainy season) and are not a substitute for checking in the field before large decisions.</p>
        <p>Deforestation checks report what the data shows; they are not a legal certificate of compliance.</p>
      </Section>
      <Section title="Fair use">
        <p>Use the service for your organisation&apos;s own land and members. Do not try to reach other organisations&apos; data, share your sign-in, or resell results without our agreement.</p>
      </Section>
      <Section title="The full terms">
        <p>Your organisation&apos;s agreement with us sets out the full terms: the services, fees, support, data protection and how either side can end the agreement. Ask your administrator for a copy, or write to us from the <a href="/contact" className="text-[var(--brand-primary)] underline">contact page</a>.</p>
      </Section>
    </>
  );
}

function Privacy() {
  return (
    <>
      <Section title="What we collect">
        <p>Names, email addresses and roles of the people your organisation adds; your farm boundaries, crops and the records you upload; and, for co-operatives, the member details their forms ask for, given with consent.</p>
      </Section>
      <Section title="How we use it">
        <p>Only to run the services your organisation chose: monitoring, alerts, advice, reports and checks. We do not sell your data or use it for advertising, and we use no advertising or tracking cookies.</p>
      </Section>
      <Section title="Who can see it">
        <p>People in your organisation, within their role, and our team to support you. Nobody in another organisation. When you ask the farm advisor a question, your question and a summary of your own farm&apos;s results go to the AI provider your service uses to write the answer.</p>
      </Section>
      <Section title="How long we keep it">
        <p>For as long as your organisation uses the service. When it leaves, we delete its data or return it first on request.</p>
      </Section>
      <Section title="Your rights">
        <p>Under the Nigeria Data Protection Act 2023 you can ask to see, correct, export or delete your personal data. Write to us from the <a href="/contact" className="text-[var(--brand-primary)] underline">contact page</a>.</p>
      </Section>
    </>
  );
}

function Credits() {
  return (
    <>
      <p className="text-[15px] text-gray-700 leading-relaxed mb-8">FarmIntelytics is built on open data from public missions and research centres. These are the sources and the credit each one asks for. The same credits appear on maps and in reports where the data is used.</p>
      {CREDITS.map(([group, items]) => (
        <Section key={group} title={group}>
          <ul className="space-y-4">
            {items.map(([name, who, line]) => (
              <li key={name}>
                <p className="font-semibold text-gray-900">{name}</p>
                <p className="text-gray-700">{who}</p>
                <p className="text-sm text-gray-500 mt-0.5">Credit: {line}</p>
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </>
  );
}

const TABS = [
  { id: 'terms', label: 'Terms of service', title: 'Terms of service', intro: "The main points of using FarmIntelytics. Your organisation's agreement with us sets out the full terms.", Body: Terms },
  { id: 'privacy', label: 'Privacy policy', title: 'Privacy policy', intro: 'What we collect, why, who can see it and what you can ask us to do. Last updated 12 October 2026.', Body: Privacy },
  { id: 'credits', label: 'Data credits', title: 'Data credits', intro: 'The open data FarmIntelytics is built on, and the credit each source asks for.', Body: Credits },
];

export default function PoliciesPage() {
  const [params, setParams] = useSearchParams();
  const active = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  const { Body } = active;
  return (
    <PublicLayout eyebrow="Policies" title={active.title} intro={active.intro}>
      <CapsuleTabs label="Policies" tabs={TABS} active={active.id} onChange={(id) => setParams({ tab: id })} />
      <div className="mt-10"><Body /></div>
    </PublicLayout>
  );
}
