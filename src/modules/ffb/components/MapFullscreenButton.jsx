import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * Full-screen button in the top-right corner of a map (every map in the portal uses this one).
 * The map's whole frame (map, legend, details panel / popup) fills the screen; the same button or Esc returns.
 */
export function MapFullscreenButton() {
  const map = useMap();
  const ref = useRef(null);
  const [full, setFull] = useState(false);
  // The map's frame, so the panels and popups next to the map come along; the map alone if it has none.
  const target = () => map.getContainer().closest('.map-canvas-envelope') || map.getContainer();

  useEffect(() => {
    if (ref.current) {
      // Clicking the button must not click or drag the map underneath.
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
    const onChange = () => {
      setFull(document.fullscreenElement === target());
      setTimeout(() => map.invalidateSize(), 200); // redraw the tiles at the new size
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [map]);

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else target().requestFullscreen?.();
  };

  const label = full ? 'Exit full screen' : 'Full screen';
  return (
    <div ref={ref} className="map-fullscreen">
      <button type="button" className="map-fullscreen__btn" onClick={toggle} title={label} aria-label={label}>
        {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>
    </div>
  );
}
