import PublicLayout, { Section } from './PublicLayout';

/** Privacy notice in plain words. Keep it true to what the platform does; review with counsel before launch. */
export default function PrivacyPage() {
  return (
    <PublicLayout eyebrow="Privacy" title="Privacy notice"
      intro="What FarmIntelytics collects, why, who can see it and what you can ask us to do with it. Last updated 12 October 2026.">
      <Section title="What we collect">
        <p><strong>Accounts:</strong> name, email address and role for each person your organisation adds.</p>
        <p><strong>Farm data:</strong> estate and field boundaries, crops, planting dates and any farm records you upload, such as yields or field visits.</p>
        <p><strong>Smallholder records:</strong> when a co-operative uses member registration, the member details its form asks for (for example name, phone, parcel boundary and photos), collected with the member's consent.</p>
        <p><strong>Use of the service:</strong> questions asked to the farm advisor and basic records of sign-ins and changes, to run the service and fix problems.</p>
      </Section>
      <Section title="Why we use it">
        <p>To run the services your organisation chose: satellite monitoring, alerts, advice, reports, deforestation checks and suitability analyses. We do not use your data for advertising and we do not sell it.</p>
      </Section>
      <Section title="Who can see it">
        <p>People in your organisation, within their role. The FarmIntelytics team, to set up and support your account. Nobody in another organisation.</p>
        <p>When you use the farm advisor, your question and a summary of your farm's own results are sent to the AI provider your organisation's service uses (for example Google, OpenAI or Anthropic) to write the answer. Nothing from other organisations is included.</p>
      </Section>
      <Section title="Satellite and public data">
        <p>Satellite pictures and maps come from public sources (Copernicus, Landsat, CHIRPS, SoilGrids and others). We send them only the area to look at, never your personal data.</p>
      </Section>
      <Section title="How long we keep it">
        <p>For as long as your organisation uses the service, or as your agreement with us says. When an organisation leaves, we delete its data or return it on request. Member records can be exported or deleted by the co-operative at any time.</p>
      </Section>
      <Section title="Your rights">
        <p>Under the Nigeria Data Protection Act 2023 you can ask to see, correct, export or delete your personal data, and object to how it is used. Smallholder members can ask their co-operative or us directly.</p>
      </Section>
      <Section title="Contact">
        <p>Write to us from the <a href="/contact" className="text-[var(--brand-primary)] underline">contact page</a> about anything on this page.</p>
      </Section>
    </PublicLayout>
  );
}
