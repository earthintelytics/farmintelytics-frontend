import PublicLayout, { Section, PageAside } from './PublicLayout';

const SECTIONS = ['Each organisation sees only its own data', 'People see what their role allows', 'The farm advisor only knows your farm', 'We do not sell your data', 'Where the numbers come from', 'Questions or a problem'];

/** What we actually do to keep each organisation's data safe. Only true statements belong here. */
export default function TrustCenterPage() {
  return (
    <PublicLayout eyebrow="Trust centre" title="How we look after your data" aside={<PageAside sections={SECTIONS} />}
      intro="FarmIntelytics holds farm boundaries, satellite results, field visits and member records for each organisation. This page says plainly how that data is kept apart and who can see it.">
      <Section title="Each organisation sees only its own data">
        <p>Every account belongs to one organisation, and every request is checked against it. Maps, results, alerts, reports, forms and member records are filtered to that organisation, and automated tests check that one organisation can never read another's.</p>
      </Section>
      <Section title="People see what their role allows">
        <p>An organisation's accounts are admins, analysts or viewers. Viewers can look but not change anything. Organisations only see the services they are licensed for.</p>
        <p>The FarmIntelytics team signs in separately, with owner, operations or support roles; support can look but not change.</p>
      </Section>
      <Section title="The farm advisor only knows your farm">
        <p>When you ask the farm advisor a question, it is given your organisation's own results, alerts and records, and nothing from any other organisation. It is instructed to say when something is not in your data rather than guess.</p>
      </Section>
      <Section title="We do not sell your data">
        <p>Your boundaries, results and member records are used to run the service for you. We do not sell them or share them with commodity traders or advertisers.</p>
      </Section>
      <Section title="Where the numbers come from">
        <p>Satellite results come from open public missions (Copernicus Sentinel and Landsat) processed by us. Every result says which images it came from and when, and reports list the data used and its limits.</p>
      </Section>
      <Section title="Questions or a problem">
        <p>Signed-in users can send a problem report from any page. You can also write to us from the <a href="/contact" className="text-[var(--brand-primary)] underline">contact page</a>.</p>
      </Section>
    </PublicLayout>
  );
}
