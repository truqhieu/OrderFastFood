import Stars from '../Stars.jsx';
import { formatPrice } from '../../utils.js';

export default function ShipperProfile({ user, stats, onToggleOnline }) {
  return (
    <>
      <div className="card shipper-head">
        <div className="driver-avatar letter">{user.fullName.charAt(0)}</div>
        <div className="driver-info">
          <strong>{user.fullName}</strong>
          <span className="muted small">{user.vehicle} · <b className="plate">{user.plate}</b></span>
          <Stars value={user.rating || 5} count={user.ratingCount || 0} />
        </div>
        <button
          type="button"
          className={`online-toggle ${user.online ? 'on' : ''}`}
          onClick={onToggleOnline}
        >
          <span className="knob" />
          {user.online ? 'Đang trực tuyến' : 'Ngoại tuyến'}
        </button>
      </div>

      <div className="stats">
        <div className="card stat"><span>Thu nhập hôm nay</span><strong>{formatPrice(stats.today)}</strong></div>
        <div className="card stat"><span>Chuyến hôm nay</span><strong>{stats.todayCount}</strong></div>
        <div className="card stat"><span>Tổng thu nhập</span><strong>{formatPrice(stats.total)}</strong></div>
        <div className="card stat"><span>Tổng chuyến</span><strong>{stats.count}</strong></div>
      </div>
    </>
  );
}
