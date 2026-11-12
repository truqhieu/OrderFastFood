import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../Icon.jsx';
import LocationPicker from '../LocationPicker.jsx';
import { useLocationContext } from '../../context/LocationContext.jsx';

export default function HomeHeader({ location, setLocation }) {
  const navigate = useNavigate();
  const { locate, status: locStatus, error: locError } = useLocationContext();
  const [picking, setPicking] = useState(false);

  return (
    <>
      <section className="home-top">
        <button className="deliver-to" onClick={() => setPicking(true)}>
          <Icon name="pin" size={16} />
          <span>Giao đến</span>
          <b className="ellipsis">
            {locStatus === 'locating'
              ? 'Đang lấy vị trí hiện tại...'
              : `${location.detail ? `${location.detail}, ` : ''}${location.address}`}
          </b>
          <Icon name="chevron" size={14} />
        </button>
        {locStatus === 'failed' && (
          <p className="locate-hint">
            {locError} <button type="button" onClick={() => locate().catch(() => {})}>Thử lại</button>
          </p>
        )}
        <button className="fake-search" onClick={() => navigate('/search')}>
          <Icon name="search" size={18} />
          <span>Bạn đang thèm gì? Gà rán, trà sữa, phở...</span>
        </button>
      </section>
      {picking && (
        <LocationPicker
          initial={location}
          onClose={() => setPicking(false)}
          onConfirm={(nextLocation) => {
            setLocation(nextLocation);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
