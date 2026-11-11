import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Leaflet measures the container on create. In a flex/modal parent the size is often
 * still 0, so tiles scatter. Recalculate after layout (and on resize).
 */
function watchMapSize(map) {
  let alive = true;
  const fix = () => {
    if (!alive) return;
    try {
      if (map.getContainer()) map.invalidateSize({ animate: false });
    } catch {
      /* map already removed */
    }
  };
  fix();
  const timers = [50, 200, 500].map((ms) => setTimeout(fix, ms));
  window.addEventListener('resize', fix);
  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    window.removeEventListener('resize', fix);
  };
}

export default function LeafletFix() {
  const map = useMap();
  useEffect(() => watchMapSize(map), [map]);
  return null;
}
