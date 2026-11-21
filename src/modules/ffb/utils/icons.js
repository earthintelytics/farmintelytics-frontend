// Custom thin-stroke SVG icons in FarmIntelytics greens (#3F8432, #2D6A2C, #5AA041)

const toUri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const logoIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
    '<rect width="64" height="64" rx="14" fill="#F3F8EF"/>' +
    '<path d="M18 43C18 28 29 18 46 18c0 16-10 27-28 25z" stroke="#3F8432" stroke-width="2" fill="#5AA041" fill-opacity="0.22" stroke-linejoin="round"/>' +
    '<path d="M19 43L43 20" stroke="#2D6A2C" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>',
);

// Harvested FFB Bunch (thin vector palm fruit cluster)
const ffbIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">' +
    '<rect x="2" y="2" width="44" height="44" rx="12" fill="#F3F8EF"/>' +
    '<path d="M24 11v6M24 17c-5 0-9 4-9 10s4 10 9 10 9-4 9-10-4-10-9-10z" stroke="#3F8432" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="21" cy="23" r="1.5" stroke="#2D6A2C" stroke-width="1.3"/>' +
    '<circle cx="27" cy="23" r="1.5" stroke="#2D6A2C" stroke-width="1.3"/>' +
    '<circle cx="24" cy="28" r="1.5" stroke="#5AA041" stroke-width="1.3"/>' +
    '<circle cx="20" cy="31" r="1.5" stroke="#5AA041" stroke-width="1.3"/>' +
    '<circle cx="28" cy="31" r="1.5" stroke="#5AA041" stroke-width="1.3"/>' +
    '</svg>',
);

// Loose Fruit Weight (scale + kg fruit balance)
const looseFruitIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">' +
    '<rect x="2" y="2" width="44" height="44" rx="12" fill="#F3F8EF"/>' +
    '<path d="M16 19h16l3 16H13l3-16z" stroke="#3F8432" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M20 19v-2a4 4 0 0 1 8 0v2" stroke="#2D6A2C" stroke-width="1.5" stroke-linecap="round"/>' +
    '<path d="M21 27h6M24 24v6" stroke="#5AA041" stroke-width="1.5" stroke-linecap="round"/>' +
    '</svg>',
);

// Operational Estate Plots (grid/parcel boundary)
const plotIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">' +
    '<rect x="2" y="2" width="44" height="44" rx="12" fill="#F3F8EF"/>' +
    '<polygon points="15,15 33,13 35,33 13,35" stroke="#3F8432" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M24 14v20M14 24h20" stroke="#5AA041" stroke-width="1.3" stroke-dasharray="2 2"/>' +
    '</svg>',
);

// Field Workers
const workerIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">' +
    '<rect x="2" y="2" width="44" height="44" rx="12" fill="#F3F8EF"/>' +
    '<circle cx="24" cy="18" r="5" stroke="#3F8432" stroke-width="1.5"/>' +
    '<path d="M14 35c0-5.2 4.5-8.5 10-8.5s10 3.3 10 8.5" stroke="#2D6A2C" stroke-width="1.5" stroke-linecap="round"/>' +
    '</svg>',
);

// Approved / Verified Check
const approvedIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">' +
    '<rect x="2" y="2" width="44" height="44" rx="12" fill="#F3F8EF"/>' +
    '<circle cx="24" cy="24" r="10" stroke="#3F8432" stroke-width="1.5"/>' +
    '<path d="M19.5 24.5l3 3 6-6" stroke="#2D6A2C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>',
);

// Duration / Clock
const durationIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">' +
    '<rect x="2" y="2" width="44" height="44" rx="12" fill="#F3F8EF"/>' +
    '<circle cx="24" cy="24" r="10" stroke="#3F8432" stroke-width="1.5"/>' +
    '<path d="M24 18v6l4 2" stroke="#2D6A2C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>',
);

// Unripe FFB Caution
const unripeIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">' +
    '<rect x="2" y="2" width="44" height="44" rx="12" fill="#FFFBEB"/>' +
    '<circle cx="24" cy="24" r="10" stroke="#D97706" stroke-width="1.5"/>' +
    '<path d="M24 19v6M24 28.5h.01" stroke="#D97706" stroke-width="1.6" stroke-linecap="round"/>' +
    '</svg>',
);

// Rotten / Spoiled FFB Flag
const rottenIcon = toUri(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">' +
    '<rect x="2" y="2" width="44" height="44" rx="12" fill="#FEF2F2"/>' +
    '<circle cx="24" cy="24" r="10" stroke="#DC2626" stroke-width="1.5"/>' +
    '<path d="M20 20l8 8M28 20l-8 8" stroke="#DC2626" stroke-width="1.5" stroke-linecap="round"/>' +
    '</svg>',
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
