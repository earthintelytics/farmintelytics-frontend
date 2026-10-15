/** Plain meanings of the words clients meet on the platform, for the side panel of public pages. */
// [term, meaning, guide topic for "read more"]
export const GLOSSARY = [
  ['Organisation', 'Your company or co-operative. Everything you upload and every result belongs to it alone.', 'first-day'],
  ['Estate', 'One farm or site of the organisation, with its own boundary and blocks.', 'farm-data'],
  ['Block', 'A field or plot inside an estate, named the way your team names it on the ground.', 'read-map'],
  ['Service', 'What you use the platform for, for example rice monitoring or EUDR checks.', 'how-it-works'],
  ['Monitoring run', 'One round of reading the latest satellite images for your fields.', 'how-it-works'],
  ['Satellite image', 'A picture of your land from space; clear only when there is no cloud.', 'data'],
  ['Radar', 'Satellite readings that see through cloud, used in the rainy season.', 'cloudy-season'],
  ['Crop condition', 'One continuous crop reading: from images on clear days, from radar on cloudy ones.', 'crop-health'],
  ['Protected area', 'Land set aside by law for nature; new planting there is never suggested.', 'suitability'],
  ['EUDR', 'The EU rule that products must not come from land deforested after 2020.', 'eudr'],
];

export const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
