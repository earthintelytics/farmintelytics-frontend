import approvedIcon from '../assets/images/approved_icon.png';
import durationIcon from '../assets/images/duration_icon.png';
import ffbIcon from '../assets/images/ffb_icon.png';
import looseFruitIcon from '../assets/images/loose_fruit_weight.png';
import plotIcon from '../assets/images/plot_icon.png';
import rottenIcon from '../assets/images/rotten_icon.png';
import unripeIcon from '../assets/images/unripe_icon.png';
import workerIcon from '../assets/images/worker_icon.png';

// Earthintelytics inline vector emblem (no hardcoded third-party logo)
const logoIcon =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
      '<rect width="64" height="64" rx="14" fill="#034321"/>' +
      '<path d="M18 42C18 27 29 17 45 17c0 16-10 27-27 25z" fill="#5AA041"/>' +
      '<path d="M19 42L43 19" stroke="#E8F2E5" stroke-width="3" stroke-linecap="round"/>' +
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
