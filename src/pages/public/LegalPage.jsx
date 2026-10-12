import PublicLayout, { Section } from './PublicLayout';

const SOURCES = [
  ['Copernicus Sentinel-1 and Sentinel-2', 'European Union / European Space Agency, open data.'],
  ['Landsat 8 and 9', 'U.S. Geological Survey and NASA, open data.'],
  ['CHIRPS rainfall', 'Climate Hazards Center, UC Santa Barbara.'],
  ['ERA5-Land', 'European Centre for Medium-Range Weather Forecasts (ECMWF), Copernicus Climate Change Service.'],
  ['SoilGrids 250 m', 'ISRIC - World Soil Information.'],
  ['Copernicus DEM GLO-30', 'European Space Agency.'],
  ['Protected areas', 'World Database on Protected Areas (WDPA), UNEP-WCMC and IUCN.'],
];

/** Terms in brief and the credits the open data sources ask for. The full terms are in each organisation's agreement. */
export default function LegalPage() {
  return (
    <PublicLayout eyebrow="Legal" title="Terms and data credits"
      intro="The main points of using FarmIntelytics, and the open data it is built on. Your organisation's agreement with us sets out the full terms.">
      <Section title="Your data stays yours">
        <p>Organisations keep ownership of their boundaries, uploaded records, drone pictures and settings. The FarmIntelytics software and its analysis methods belong to FarmIntelytics / Earthintelytics.</p>
      </Section>
      <Section title="Results are decision support">
        <p>Satellite results, alerts, suitability classes and yield estimates help you decide where to look and what to plan. They depend on clear pictures (cloud can delay them for weeks in the rainy season) and are not a substitute for checking in the field before large decisions.</p>
        <p>Deforestation checks report what the data shows; they are not a legal certificate of compliance.</p>
      </Section>
      <Section title="Fair use">
        <p>Use the service for your organisation's own land and members. Do not try to reach other organisations' data, share your sign-in, or resell results without our agreement.</p>
      </Section>
      <Section title="Data credits">
        <ul className="list-disc pl-5 space-y-1.5">
          {SOURCES.map(([name, who]) => <li key={name}><strong>{name}:</strong> {who}</li>)}
        </ul>
        <p className="text-sm text-gray-500">Contains modified Copernicus Sentinel data processed by FarmIntelytics.</p>
      </Section>
    </PublicLayout>
  );
}
