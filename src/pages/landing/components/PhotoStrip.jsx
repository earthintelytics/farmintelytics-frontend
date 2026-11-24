import { creditFor } from './photoCredits';

/**
 * A slow, endless strip of real farm photos under the hero (credits as metadata: photoCredits.js, public/crops/CREDITS.md).
 * It pauses on hover and stands still for visitors who ask for reduced motion (index.css, .fi-strip).
 */
const PHOTOS = [
  ['/crops/field_logs.webp', 'Women farmers tending maize in Kenya'],
  ['/crops/groundnut.webp', 'A groundnut field in Kaduna State, Nigeria'],
  ['/crops/restoration.webp', 'Women with seedlings in a tree nursery in Tanzania'],
  ['/crops/sorghum.webp', 'Sorghum ripening in Ethiopia'],
  ['/crops/advisor.webp', 'A farmer among young plants in a nursery'],
  ['/crops/millet.webp', 'Cultivating pearl millet in Namibia'],
  ['/crops/sesame.webp', 'A sesame crop by the White Nile'],
  ['/crops/cowpea.webp', 'A field of cowpea'],
];

export default function PhotoStrip() {
  return (
    <section aria-label="Farms and farmers" className="bg-white border-t border-gray-100 py-6 overflow-hidden">
      <div className="fi-strip flex w-max gap-4">
        {[...PHOTOS, ...PHOTOS].map(([src, alt], i) => (
          <img key={`${src}-${i}`} src={src} alt={i < PHOTOS.length ? alt : ''} data-credit={creditFor(src)} aria-hidden={i >= PHOTOS.length || undefined}
            loading="lazy" draggable="false" className="h-36 sm:h-44 w-56 sm:w-72 rounded-2xl object-cover select-none" />
        ))}
      </div>
    </section>
  );
}
