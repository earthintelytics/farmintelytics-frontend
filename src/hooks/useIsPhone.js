import { useEffect, useState } from 'react';

/**
 * True on a phone-width screen (below Tailwind's `md`, 768 px), and it follows the screen as it turns or
 * resizes. Used by the portal shells to turn their sidebars into a slide-in menu on a phone.
 */
export const PHONE_QUERY = '(max-width: 767px)';

export const isPhoneNow = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(PHONE_QUERY).matches;

export default function useIsPhone() {
  const [phone, setPhone] = useState(isPhoneNow);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(PHONE_QUERY);
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

/**
 * How a side panel next to a map (map layers, block summary, suitability legend) shows on a phone: a sheet
 * over the lower 70% of the screen, so the top of the map stays in view. On wider screens the panel's own
 * classes apply unchanged.
 */
export const PHONE_SHEET = 'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:z-[1200] max-md:h-[70vh] '
  + 'max-md:w-full max-md:rounded-t-2xl max-md:border-l-0 max-md:border-t';
