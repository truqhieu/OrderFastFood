import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import Icon from './Icon.jsx';
import { deliveryDistance, getCurrentPosition, MAX_DELIVERY_KM, reverseGeocode, searchPlaces } from '../geo.js';

function MapEvents({ onMoveStart, onMoveEnd }) {
  const map = useMapEvents({
    movestart: onMoveStart,
    moveend: () => onMoveEnd(map.getCenter()),
  });
  return null;
}

/** Full-screen picker: drag the map under a fixed pin, search an address, or use the device location. */
export default function LocationPicker({ initial, restaurant, onClose, onConfirm }) {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState({ lat: initial.lat, lng: initial.lng });
  const [address, setAddress] = useState(initial.address);
  const [detail, setDetail] = useState(initial.detail || '');
  const [moving, setMoving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const skipReverse = useRef(true);

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

  const flyTo = (lat, lng) => map?.flyTo([lat, lng], 17, { duration: 0.8 });

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
          {query && <button type="button" className="icon-btn" onClick={() => setQuery('')}><Icon name="close" size={16} /></button>}
          {(results.length > 0 || (searching && query.trim().length >= 3)) && (
            <div className="picker-results">
              {searching && results.length === 0 && <div className="muted small picker-result">Đang tìm...</div>}
              {results.map((p, i) => (
                <button type="button" key={i} className="picker-result" onClick={() => choose(p)}>
                  <Icon name="pin" size={16} className="muted" />
                  <span><b>{p.name}</b><small className="muted">{p.address}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="picker-map">
          <MapContainer ref={setMap} center={[center.lat, center.lng]} zoom={17} zoomControl={false} style={{ height: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            <MapEvents onMoveStart={() => setMoving(true)} onMoveEnd={(c) => { setMoving(false); setCenter({ lat: c.lat, lng: c.lng }); }} />
          </MapContainer>
          <div className={`center-pin ${moving ? 'lifted' : ''}`}><span /></div>
          <button type="button" className="locate-btn" onClick={useMyLocation} title="Vị trí hiện tại">
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
