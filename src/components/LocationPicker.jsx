import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import Icon from './Icon.jsx';
import LeafletFix from './LeafletFix.jsx';
import { deliveryDistance, getCurrentPosition, MAP_TILE, MAX_DELIVERY_KM, reverseGeocode, searchPlaces } from '../geo.js';

function MapBinder({ mapRef, onMoveStart, onMoveEnd }) {
  const map = useMapEvents({
    movestart: onMoveStart,
    moveend: () => onMoveEnd(map.getCenter()),
  });
  useEffect(() => {
    mapRef.current = map;
    return () => {
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [map, mapRef]);
  return <LeafletFix />;
}

function PlaceSearchResults({ results, searching, query, onSelect }) {
  if (!(results.length > 0 || (searching && query.trim().length >= 3))) return null;

  return (
    <div className="picker-results">
      {searching && results.length === 0 && <div className="muted small picker-result">Đang tìm...</div>}
      {results.map((place, index) => (
        <button type="button" key={index} className="picker-result" onClick={() => onSelect(place)}>
          <Icon name="pin" size={16} className="muted" />
          <span><b>{place.name}</b><small className="muted">{place.address}</small></span>
        </button>
      ))}
    </div>
  );
}

/** Full-screen picker: drag the map under a fixed pin, search an address, or use the device location. */
export default function LocationPicker({ initial, restaurant, onClose, onConfirm }) {
  const mapRef = useRef(null);
  const [center, setCenter] = useState({ lat: initial.lat, lng: initial.lng });
  const [address, setAddress] = useState(initial.address);
  const [detail, setDetail] = useState(initial.detail || '');
  const [moving, setMoving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const skipReverse = useRef(true);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMapReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (skipReverse.current) {
      skipReverse.current = false;
      return;
    }
    const ctrl = new AbortController();
    setResolving(true);
    const t = setTimeout(() => {
      reverseGeocode(center, ctrl.signal)
        .then(setAddress)
        .catch(() => {})
        .finally(() => !ctrl.signal.aborted && setResolving(false));
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [center]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const t = setTimeout(() => {
      searchPlaces(q, ctrl.signal, center)
        .then(setResults)
        .catch(() => {})
        .finally(() => !ctrl.signal.aborted && setSearching(false));
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const flyTo = (lat, lng) => mapRef.current?.flyTo([lat, lng], 17, { duration: 0.8 });

  const choose = (place) => {
    skipReverse.current = true;
    setAddress(place.address);
    setQuery('');
    setResults([]);
    flyTo(place.lat, place.lng);
  };

  const useMyLocation = () => {
    setMessage('Đang lấy vị trí của bạn...');
    getCurrentPosition()
      .then((pos) => {
        setMessage('');
        flyTo(pos.lat, pos.lng);
      })
      .catch((e) => setMessage(e.message));
  };

  const distance = restaurant ? deliveryDistance(restaurant, center) : null;
  const tooFar = distance !== null && distance > MAX_DELIVERY_KM;
  const busy = moving || resolving;
  const [mainLine, ...restLines] = address.split(', ');

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="picker" onClick={(e) => e.stopPropagation()}>
        <div className="picker-head">
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng"><Icon name="back" size={20} /></button>
          <strong>Chọn địa chỉ giao hàng</strong>
        </div>

        <div className="picker-search">
          <Icon name="search" size={16} className="muted" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm đường, toà nhà, địa điểm..." />
          {query && <button type="button" className="icon-btn" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm"><Icon name="close" size={16} /></button>}
          <PlaceSearchResults results={results} searching={searching} query={query} onSelect={choose} />
        </div>

        <div className="picker-map">
          {mapReady && (
            <MapContainer center={[initial.lat, initial.lng]} zoom={17} zoomControl={false}
              style={{ height: '100%', width: '100%' }}>
              <TileLayer url={MAP_TILE.url} attribution={MAP_TILE.attribution} />
              <MapBinder mapRef={mapRef} onMoveStart={() => setMoving(true)}
                onMoveEnd={(c) => { setMoving(false); setCenter({ lat: c.lat, lng: c.lng }); }} />
            </MapContainer>
          )}
          <div className={`center-pin ${moving ? 'lifted' : ''}`}><span /></div>
          <button type="button" className="locate-btn" onClick={useMyLocation} title="Vị trí hiện tại" aria-label="Vị trí hiện tại">
            <Icon name="locate" size={20} />
          </button>
        </div>

        <div className="picker-foot">
          {message && <p className="small muted">{message}</p>}
          <div className="picker-address">
            <Icon name="pin" size={20} className="text-primary" />
            <div>
              <b>{busy ? 'Đang xác định vị trí...' : mainLine}</b>
              {!busy && <small className="muted">{restLines.join(', ')}</small>}
            </div>
          </div>
          {distance !== null && (
            <p className={`small ${tooFar ? 'text-error' : 'muted'}`}>
              Cách {restaurant.name} {distance} km{tooFar ? ` · Ngoài phạm vi giao hàng (tối đa ${MAX_DELIVERY_KM} km)` : ''}
            </p>
          )}
          <input className="input" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Số tầng, số phòng, hẻm... (không bắt buộc)" />
          <button type="button" className="btn btn-primary btn-block" disabled={busy || tooFar}
            onClick={() => onConfirm({ lat: center.lat, lng: center.lng, address, detail: detail.trim() })}>
            Xác nhận địa chỉ này
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
