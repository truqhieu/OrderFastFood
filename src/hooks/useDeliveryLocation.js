import { useLocationContext } from '../context/LocationContext.jsx';

/** [location, setLocation] for the current delivery point. */
export default function useDeliveryLocation() {
  const { location, setLocation } = useLocationContext();
  return [location, setLocation];
}
