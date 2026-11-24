// FFB icons: small colour illustrations in the FarmIntelytics palette (greens, the emblem's navy, palm-fruit
// orange and red), on soft cream or green tints. Flat colour, no glows or shadows (owner's UI rules).
// The logo is the FarmIntelytics emblem itself, the same picture as the favicon and the app icons.

const toUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const wrap = (bg, body) => toUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><rect x="1" y="1" width="46" height="46" rx="12" fill="${bg}"/>${body}</svg>`,
);

const C = {
  green: '#3F8432', deep: '#2D6A2C', leaf: '#5AA041', mint: '#CFE8C3',
  navy: '#12305A', cream: '#FBF6EA', tint: '#EEF6EA',
  orange: '#E8732C', red: '#C2410C', amber: '#F2A93B', plum: '#4A2A4F', brown: '#8A5A2B',
};

// A palm fruitlet: an oval with a lighter tip.
const fruit = (x, y, r, body, tip) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.15}" fill="${body}"/>`
  + `<ellipse cx="${x - r * 0.3}" cy="${y - r * 0.4}" rx="${r * 0.35}" ry="${r * 0.3}" fill="${tip}" opacity="0.85"/>`;

// The emblem (same file as the favicon).
const logoIcon = '/favicon-192.png';

// A harvested bunch: orange-red fruitlets on a stalk, with two fronds.
const ffbIcon = wrap(C.cream,
  `<path d="M24 9v7" stroke="${C.deep}" stroke-width="2" stroke-linecap="round"/>`
  + `<path d="M24 13c-5-4-10-3-13 0 4 0 8 1 13 3z" fill="${C.leaf}"/><path d="M24 13c5-4 10-3 13 0-4 0-8 1-13 3z" fill="${C.green}"/>`
  + `<ellipse cx="24" cy="28" rx="10" ry="11" fill="${C.red}"/>`
  + fruit(19.5, 23.5, 3, C.orange, C.amber) + fruit(26, 22.5, 3, C.orange, C.amber) + fruit(29.5, 28.5, 3, C.orange, C.amber)
  + fruit(22.5, 29.5, 3, C.orange, C.amber) + fruit(18.5, 32, 2.6, C.red, C.orange) + fruit(25.5, 35, 2.6, C.red, C.orange),
);

// Loose fruit weighed: a scale pan holding fruitlets.
const looseFruitIcon = wrap(C.tint,
  `<path d="M24 11v6M14 17h20" stroke="${C.navy}" stroke-width="2" stroke-linecap="round"/>`
  + `<path d="M11 27h26l-3 8a3 3 0 0 1-3 2H17a3 3 0 0 1-3-2z" fill="${C.green}"/>`
  + `<path d="M14 17l-3 10M34 17l3 10" stroke="${C.navy}" stroke-width="1.6" stroke-linecap="round"/>`
  + fruit(19, 24, 2.6, C.orange, C.amber) + fruit(24.5, 23, 2.8, C.red, C.orange) + fruit(29.5, 24.5, 2.6, C.orange, C.amber)
  + `<text x="24" y="34.5" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="6.5" font-weight="700" fill="#FFFFFF">kg</text>`,
);

// A mapped block: a green parcel with palm crowns in rows.
// A palm seen from above: five leafy fronds round a dark centre.
const palm = (x, y) => [0, 72, 144, 216, 288].map((a) => `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${y}c1.2-1.6 1.4-3.4 0-5-1.4 1.6-1.2 3.4 0 5z" fill="${a % 144 ? C.leaf : C.green}"/>`).join('')
  + `<circle cx="${x}" cy="${y}" r="1" fill="${C.deep}"/>`;
const plotIcon = wrap(C.tint,
  `<path d="M10 14l26-3 3 24-27 3z" fill="${C.mint}" stroke="${C.green}" stroke-width="1.6" stroke-linejoin="round"/>`
  + palm(18, 20) + palm(28, 19) + palm(19, 30) + palm(29, 29),
);

// A field worker: helmet, face, green vest.
const workerIcon = wrap(C.cream,
  `<path d="M14 38c0-6 4.5-10 10-10s10 4 10 10z" fill="${C.green}"/><path d="M21 28.5l3 6 3-6" fill="${C.amber}"/>`
  + `<circle cx="24" cy="22" r="5" fill="#C98B5E"/>`
  + `<path d="M18 17.5a6 6 0 0 1 12 0z" fill="${C.amber}"/><path d="M16.5 17.5h15" stroke="${C.navy}" stroke-width="1.6" stroke-linecap="round"/>`,
);

// Approved: a green seal with a tick.
const approvedIcon = wrap(C.tint,
  `<path d="M24 9l3.5 2.6 4.3-.4 1.3 4.1 3.6 2.4-1.2 4.2 1.2 4.2-3.6 2.4-1.3 4.1-4.3-.4L24 39l-3.5-2.6-4.3.4-1.3-4.1-3.6-2.4 1.2-4.2-1.2-4.2 3.6-2.4 1.3-4.1 4.3.4z" fill="${C.green}"/>`
  + `<path d="M18.5 24.5l4 4 7.5-8" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
);

// Time on the job: a clock with a green sweep.
const durationIcon = wrap(C.cream,
  `<circle cx="24" cy="25" r="12" fill="#FFFFFF" stroke="${C.navy}" stroke-width="2"/>`
  + `<path d="M24 25V16a9 9 0 0 1 8.3 5.5z" fill="${C.mint}"/>`
  + `<path d="M24 18v7l5 3" stroke="${C.green}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="M21 10h6" stroke="${C.navy}" stroke-width="2" stroke-linecap="round"/>`,
);

// Unripe bunch: the dark purple fruit of an unripe bunch, with an amber caution mark.
const unripeIcon = wrap('#FFF7E6',
  `<ellipse cx="22" cy="27" rx="9.5" ry="10.5" fill="${C.plum}"/>`
  + fruit(18, 23, 2.6, '#6B3F6F', '#8E5C91') + fruit(24.5, 22, 2.6, '#6B3F6F', '#8E5C91') + fruit(21, 30, 2.6, '#6B3F6F', '#8E5C91')
  + `<circle cx="34" cy="15" r="6" fill="${C.amber}"/><path d="M34 12v3.6" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><circle cx="34" cy="18.3" r="1.1" fill="#FFFFFF"/>`,
);

// Rotten bunch: brown fruit with a red cross.
const rottenIcon = wrap('#FDEEEA',
  `<ellipse cx="22" cy="27" rx="9.5" ry="10.5" fill="${C.brown}"/>`
  + fruit(18, 23, 2.6, '#A0703F', '#B98855') + fruit(24.5, 22, 2.6, '#A0703F', '#B98855') + fruit(21, 30, 2.6, '#6E4520', '#8A5A2B')
  + `<circle cx="34" cy="15" r="6" fill="${C.red}"/><path d="M31.8 12.8l4.4 4.4M36.2 12.8l-4.4 4.4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>`,
);

export {
  approvedIcon,
  durationIcon,
  ffbIcon,
  logoIcon,
  looseFruitIcon,
  plotIcon,
  rottenIcon,
  unripeIcon,
  workerIcon,
  approvedIcon as APPROVED_ICON,
  durationIcon as DURATION_ICON,
  ffbIcon as FFB_ICON,
  logoIcon as LOGO_ICON,
  looseFruitIcon as WEIGHT_ICON,
  looseFruitIcon as LOOSE_FRUIT_ICON,
  plotIcon as PLOT_ICON,
  rottenIcon as ROTTEN_ICON,
  unripeIcon as UNRIPE_ICON,
  workerIcon as WORKER_ICON,
};
