import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { fetchRoute, pointAlong } from '../geo.js';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; OpenStreetMap';
const PICKUP_OFFSET = { lat: 0.006, lng: -0.007 };

const markerIcon = (type, label) =>
  L.divIcon({
    className: '',
    html: `<div class="map-marker map-marker-${type}"><span>${label}</span></div>`,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
  });
const shipperIcon = L.divIcon({ className: '', html: '<div class="map-shipper"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
const ICONS = { shop: markerIcon('shop', 'Q'), home: markerIcon('home', 'B') };

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [30, 30] });
  }, [map, bounds]);
  return null;
}

/**
 * Restaurant → customer route on a real map.
 * `shipper` = { leg: 'pickup' | 'deliver', ratio: 0..1 } places the driver on the way to the shop or along the route.
 */
export default function RouteMap({ from, to, shipper, height = 220, interactive = false }) {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchRoute(from, to).then((coords) => alive && setRoute(coords));
    return () => {
      alive = false;
    };
  }, [from.lat, from.lng, to.lat, to.lng]);

  const bounds = useMemo(() => L.latLngBounds([[from.lat, from.lng], [to.lat, to.lng]]), [from.lat, from.lng, to.lat, to.lng]);
  const path = route || [[from.lat, from.lng], [to.lat, to.lng]];

  let shipperPos = null;
  if (shipper?.leg === 'pickup') {
    const start = [from.lat + PICKUP_OFFSET.lat, from.lng + PICKUP_OFFSET.lng];
    shipperPos = pointAlong([start, [from.lat, from.lng]], shipper.ratio);
  } else if (shipper?.leg === 'deliver') {
    shipperPos = pointAlong(path, shipper.ratio);
  }

  return (
    <MapContainer className="route-map" style={{ height }} bounds={bounds} boundsOptions={{ padding: [30, 30] }}
      dragging={interactive} scrollWheelZoom={interactive} doubleClickZoom={interactive} zoomControl={interactive} touchZoom={interactive}>
      <FitBounds bounds={bounds} />
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
      <Polyline positions={path} pathOptions={{ color: '#ee4d2d', weight: 4, opacity: 0.85 }} />
      <Marker position={[from.lat, from.lng]} icon={ICONS.shop} />
      <Marker position={[to.lat, to.lng]} icon={ICONS.home} />
      {shipperPos && <Marker position={shipperPos} icon={shipperIcon} zIndexOffset={1000} />}
    </MapContainer>
  );
}
