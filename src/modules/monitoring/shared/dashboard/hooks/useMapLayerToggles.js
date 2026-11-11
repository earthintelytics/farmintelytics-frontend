// Each map page's own layer switches: show the index layer, show block outlines, outline opacity.
// Returned under the names the pages read (healthShowLayers, setHealthShowBoundaries, ...), with each
// page's outline style. Blocks are outlines only: results show in charts and block details.
import { useMemo, useState } from 'react';
import { isPhoneNow } from '../../../../../hooks/useIsPhone';

const PAGES = ['intel', 'health', 'moisture', 'yield', 'climate', 'restore'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function useMapLayerToggles() {
  const [state, setState] = useState(() => Object.fromEntries(PAGES.map(p => [p, { layers: !isPhoneNow(), boundaries: true, opacity: 100 }])));
  // Setters are made once, so like useState's own they never change between renders.
  const setters = useMemo(() => {
    const out = {};
    PAGES.forEach((p) => {
      const set = (field) => (v) => setState(prev => ({ ...prev, [p]: { ...prev[p], [field]: typeof v === 'function' ? v(prev[p][field]) : v } }));
      out[`set${cap(p)}ShowLayers`] = set('layers');
      out[`set${cap(p)}ShowBoundaries`] = set('boundaries');
      out[`set${cap(p)}BoundariesOpacity`] = set('opacity');
    });
    return out;
  }, []);
  const out = { ...setters };
  PAGES.forEach((p) => {
    const s = state[p];
    out[`${p}ShowLayers`] = s.layers;
    out[`${p}ShowBoundaries`] = s.boundaries;
    out[`${p}BoundariesOpacity`] = s.opacity;
    out[`get${cap(p)}PlotStyleOutline`] = () => ({
      color: s.boundaries ? '#000000' : 'transparent', // block outlines are always black
      weight: s.boundaries ? 2.5 : 0,
      opacity: s.opacity / 100,
      fillColor: 'transparent',
      fillOpacity: 0,
    });
  });
  return out;
}
