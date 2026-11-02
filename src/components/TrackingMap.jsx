import { useEffect, useState } from 'react';
import RouteMap from './RouteMap.jsx';
import { deliveryMinutes, formatTime } from '../utils.js';

const SHOP_POS = 30;
const PICKUP_MINUTES = 5;

const reachedAt = (order, status) => {
  const h = order.history.find((x) => x.status === status);
  return h ? new Date(h.at).getTime() : null;
};

/** Simulated live map: shipper moves to the shop, then from the shop to the customer. */
export default function TrackingMap({ order }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!['picking', 'delivering'].includes(order.status)) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [order.status]);

  const travel = deliveryMinutes(order.distanceKm || 1);
  let bikePos = null;
  let shipper = null;
  let message = '';
  let eta = null;

  switch (order.status) {
    case 'pending':
      message = 'Đang chờ quán xác nhận đơn...';
      eta = new Date(new Date(order.createdAt).getTime() + (order.prepTime + travel + 2) * 60000);
      break;
    case 'preparing':
      message = 'Quán đang chuẩn bị món · Đang tìm tài xế gần bạn...';
      eta = new Date(reachedAt(order, 'preparing') + (order.prepTime + travel) * 60000);
      break;
    case 'picking': {
      const start = reachedAt(order, 'picking');
      const ratio = Math.min((now - start) / (PICKUP_MINUTES * 60000), 0.95);
      bikePos = ratio * SHOP_POS;
      shipper = { leg: 'pickup', ratio };
      message = `Tài xế ${order.shipper?.fullName} đang đến quán lấy món`;
      eta = new Date(start + (PICKUP_MINUTES + travel) * 60000);
      break;
    }
    case 'delivering': {
      const start = reachedAt(order, 'delivering');
      const ratio = Math.min((now - start) / (travel * 60000), 0.95);
      bikePos = SHOP_POS + ratio * (100 - SHOP_POS);
      shipper = { leg: 'deliver', ratio };
      message = `Tài xế đang trên đường giao đến bạn`;
      eta = new Date(start + travel * 60000);
      break;
    }
    case 'completed':
      bikePos = 100;
      message = 'Đơn hàng đã được giao thành công. Chúc bạn ngon miệng!';
      break;
    default:
      message = 'Đơn hàng đã bị hủy';
  }

  const head = (
    <div className="map-head">
      <strong>{message}</strong>
      {eta && order.status !== 'completed' && (
        <span className="eta">Dự kiến giao lúc <b>{formatTime(eta)}</b></span>
      )}
    </div>
  );

  if (order.deliveryLat && order.restaurantLat) {
    return (
      <div className="map map-real">
        {head}
        <RouteMap
          from={{ lat: order.restaurantLat, lng: order.restaurantLng }}
          to={{ lat: order.deliveryLat, lng: order.deliveryLng }}
          shipper={order.status === 'completed' ? { leg: 'deliver', ratio: 1 } : shipper}
          height={300}
          interactive
        />
      </div>
    );
  }

  return (
    <div className="map">
      {head}
      <div className="road">
        <div className="road-line" />
        <div className="road-progress" style={{ width: (bikePos ?? 0) + '%' }} />
        <div className="pin" style={{ left: SHOP_POS + '%' }} title={order.restaurantName}>
          🏪<span>{order.restaurantName}</span>
        </div>
        <div className="pin" style={{ left: '100%' }} title={order.address}>
          🏠<span>Bạn</span>
        </div>
        {bikePos !== null && (
          <div className="bike" style={{ left: bikePos + '%' }}>🛵</div>
        )}
        {order.status === 'preparing' && !order.shipperId && <div className="radar" style={{ left: SHOP_POS + '%' }} />}
      </div>
    </div>
  );
}
