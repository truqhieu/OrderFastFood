import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { DEFAULT_LOCATION, getCurrentPosition, reverseGeocode } from '../geo.js';

const LocationContext = createContext(null);

/**
 * Delivery point shared by every page. Uses the device's GPS by default (like ShopeeFood);
 * an address picked by hand on the map is remembered and not overwritten by GPS.
 */
export function LocationProvider({ children }) {
  const { user } = useAuth();
  const key = `deliveryLocation_${user?.id || 'guest'}`;
  const read = () => JSON.parse(localStorage.getItem(key) || 'null');
  const [location, setLocationState] = useState(() => read() || DEFAULT_LOCATION);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const save = (loc) => {
    setLocationState(loc);
    localStorage.setItem(key, JSON.stringify(loc));
  };

  const locate = useCallback(async () => {
    setStatus('locating');
    setError('');
    try {
      const pos = await getCurrentPosition();
      const address = await reverseGeocode(pos).catch(() => `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      save({ ...pos, address, detail: '', source: 'gps' });
      setStatus('done');
      return pos;
    } catch (e) {
      setError(e.message);
      setStatus('failed');
      throw e;
    }
  }, [key]);

  useEffect(() => {
    const saved = read();
    setLocationState(saved || DEFAULT_LOCATION);
    if (saved?.source !== 'manual') locate().catch(() => {});
  }, [key]);

  const setLocation = (loc) => save({ ...loc, source: 'manual' });

  return (
    <LocationContext.Provider value={{ location, setLocation, locate, status, error }}>
      {children}
    </LocationContext.Provider>
  );
}

export const useLocationContext = () => useContext(LocationContext);
