import PublicLayout from './PublicLayout';

/**
 * /credits: who took the photos on the public pages, and under which licence (the CC BY and CC BY-SA licences ask
 * for this). Linked quietly from the footer; the pages themselves carry no credit lines (owner, 24 Nov 2026).
 * Source of truth: public/crops/CREDITS.md.
 */
const PHOTOS = [
  ['field_logs', 'Women smallholder farmers in Kenya', 'McKay Savage', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Women_smallholder_farmers_in_Kenya.jpg'],
  ['restoration', 'Women with seedlings for reforestation in Tanzania', 'USAID Africa Bureau', 'Public domain', 'https://commons.wikimedia.org/wiki/File:Women_with_seedlings_for_reforestation_in_Tanzania_(5984894513).jpg'],
  ['advisor', 'Africa Food Security 20', 'Kate Holt / AusAID', 'CC BY 2.0', 'https://commons.wikimedia.org/wiki/File:Africa_Food_Security_20_(10665337483).jpg'],
  ['groundnut', 'Peanut field, Aduwan, Kafanchan (Kaduna State, Nigeria)', 'Kambai Akau', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Peanut_field,_Aduwan,_Kafanchan_1.jpg'],
  ['sorghum', 'Sorghum, Amhara, Ethiopia', 'Radosław Botev', 'CC BY 3.0 PL', 'https://commons.wikimedia.org/wiki/File:Sorghum_Ethiopia.jpg'],
  ['millet', 'Cultivating mahangu (pearl millet), Namibia', 'Krystal S. Wright', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Cultivating_mahangu.jpg'],
  ['eudr', 'DR Congo forest loss near Kisangani', 'NASA Earth Observatory', 'Public domain', 'https://commons.wikimedia.org/wiki/File:DR_Congo_forest_loss_near_Kisangani_zm_oli_2024_lrg.jpg'],
  ['finance', 'Mobile Money Kiosk', 'Bukulu Steven', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Mobile_Money_Kiosk.jpg'],
  ['sesame', 'Sesame crop, White Nile, Sudan, autumn 2024', 'RamboSD', 'CC BY 4.0', 'https://commons.wikimedia.org/wiki/File:%D8%A7%D9%84%D9%85%D9%88%D8%B3%D9%85_%D8%A7%D9%84%D8%B2%D8%B1%D8%A7%D8%B9%D9%8A_%D9%81%D9%8A_%D9%88%D9%84%D8%A7%D9%8A%D8%A9_%D8%A7%D9%84%D9%86%D9%8A%D9%84_%D8%A7%D9%84%D8%A7%D8%A8%D9%8A%D8%B6_%D8%AE%D8%B1%D9%8A%D9%81_2024_%D9%85%D8%AD%D8%B5%D9%88%D9%84_%D8%A7%D9%84%D8%B3%D9%85%D8%B3%D9%85_01.jpg'],
  ['cowpea', 'Field of Vigna unguiculata (cowpea), Tamil Nadu, India', 'Thamizhpparithi Maari', 'CC BY-SA 4.0', 'https://commons.wikimedia.org/wiki/File:Field_of_Vigna_unguiculata.jpg'],
];

export default function CreditsPage() {
  return (
    <PublicLayout eyebrow="Credits" title="Photo and data credits" wide
      intro="The photos on our pages come from Wikimedia Commons, used under the licences below. Thank you to the photographers.">
      <div className="grid gap-4 sm:grid-cols-2">
        {PHOTOS.map(([file, title, author, licence, url]) => (
          <a key={file} href={url} target="_blank" rel="noreferrer" className="flex gap-4 rounded-2xl border border-gray-200 p-3 hover:border-gray-400">
            <img src={`/crops/${file}.webp`} alt="" loading="lazy" className="w-24 h-20 rounded-xl object-cover shrink-0" />
            <span className="min-w-0">
              <span className="block font-semibold text-gray-900 leading-snug">{title}</span>
              <span className="block text-sm text-gray-600 mt-1">{author}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{licence} · Wikimedia Commons</span>
            </span>
          </a>
        ))}
      </div>
      <div className="mt-10 rounded-2xl border border-gray-200 p-6 text-sm text-gray-600 leading-relaxed space-y-2">
        <p className="font-semibold text-gray-900">Map and satellite data</p>
        <p>Imagery © Esri, Maxar, Earthstar Geographics. Contains modified Copernicus Sentinel data. Forest maps: JRC Global Forest Cover 2020 (European Commission) and Hansen/UMD/Google/USGS/NASA Global Forest Change. Protected areas: UNEP-WCMC and IUCN, World Database on Protected Areas.</p>
      </div>
    </PublicLayout>
  );
}
