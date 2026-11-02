const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const PHOTON = 'https://photon.komoot.io';
const VIETNAM_BBOX = '102.1,8.4,109.6,23.4';

export const DEFAULT_LOCATION = { lat: 21.0287, lng: 105.8524, address: 'Hồ Hoàn Kiếm, Phường Hoàn Kiếm, Hà Nội' };
export const MAX_DELIVERY_KM = 20;

/** Straight-line distance in km, rounded to 0.1. */
export function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}

/** Restaurants created before coordinates existed fall back to a point `distanceKm` north of the default location. */
export const shopPosition = (r) =>
  r.lat && r.lng ? { lat: r.lat, lng: r.lng } : { lat: DEFAULT_LOCATION.lat + (r.distanceKm || 1) / 110.574, lng: DEFAULT_LOCATION.lng };

export const deliveryDistance = (restaurant, location) =>
  location?.lat ? Math.max(0.3, distanceKm(shopPosition(restaurant), location)) : restaurant.distanceKm;

function shortAddress(place) {
  const a = place.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ');
  const parts = [street || place.name, a.quarter || a.suburb, a.city_district || a.district || a.county, a.city || a.state];
  const unique = [...new Set(parts.filter(Boolean))];
  return unique.length ? unique.join(', ') : place.display_name;
}

function photonPlace(feature) {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const area = [p.district || p.locality, p.city || p.county, p.state].filter(Boolean);
  const name = p.name || street || area[0] || '';
  return { lat, lng, name, address: [...new Set([p.name, street, ...area].filter(Boolean))].join(', ') };
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Searches all of Vietnam, ranking results near `near` first.
 * Photon is the primary geocoder (CORS-friendly, built for autocomplete); Nominatim is the fallback.
 */
export async function searchPlaces(query, signal, near = DEFAULT_LOCATION) {
  const q = encodeURIComponent(query);
  try {
    const data = await getJson(`${PHOTON}/api/?q=${q}&limit=6&lat=${near.lat}&lon=${near.lng}&location_bias_scale=0.3&bbox=${VIETNAM_BBOX}&lang=default`, signal);
    return data.features.map(photonPlace);
  } catch (e) {
    if (signal?.aborted) throw e;
    const data = await getJson(`${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=vn&accept-language=vi&q=${q}`, signal);
    return data.map((p) => ({ lat: Number(p.lat), lng: Number(p.lon), name: p.name || p.display_name.split(',')[0], address: shortAddress(p) }));
  }
}

export async function reverseGeocode({ lat, lng }, signal) {
  try {
    const data = await getJson(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&limit=1&lang=default`, signal);
    if (data.features.length) return photonPlace(data.features[0]).address;
  } catch (e) {
    if (signal?.aborted) throw e;
  }
  return shortAddress(await getJson(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=vi&lat=${lat}&lon=${lng}`, signal));
}

/** Device GPS position; rejects with a user-facing message. */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Trình duyệt không hỗ trợ định vị.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(new Error(err.code === 1
          ? 'Bạn đã chặn quyền vị trí. Hãy bật lại trong cài đặt trình duyệt (biểu tượng ổ khoá trên thanh địa chỉ).'
          : 'Không lấy được vị trí hiện tại, hãy thử lại.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

const routeCache = new Map();

/** Road route between two points as [lat, lng][]; falls back to a straight line when the routing service is unavailable. */
export async function fetchRoute(from, to) {
  const key = [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(5)).join(',');
  if (routeCache.has(key)) return routeCache.get(key);
  const straight = [[from.lat, from.lng], [to.lat, to.lng]];
  try {
    const res = await fetch(`${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`);
    const data = await res.json();
    const coords = data.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => [lat, lng]) || straight;
    routeCache.set(key, coords);
    return coords;
  } catch {
    return straight;
  }
}

/** Point at `ratio` (0..1) of the way along a polyline. */
export function pointAlong(coords, ratio) {
  if (coords.length < 2) return coords[0];
  const segs = coords.slice(1).map((p, i) => Math.hypot(p[0] - coords[i][0], p[1] - coords[i][1]));
  let remaining = segs.reduce((s, x) => s + x, 0) * Math.min(Math.max(ratio, 0), 1);
  for (let i = 0; i < segs.length; i++) {
    if (remaining <= segs[i]) {
      const t = segs[i] ? remaining / segs[i] : 0;
      return [coords[i][0] + (coords[i + 1][0] - coords[i][0]) * t, coords[i][1] + (coords[i + 1][1] - coords[i][1]) * t];
    }
    remaining -= segs[i];
  }
  return coords[coords.length - 1];
}
