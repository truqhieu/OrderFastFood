export default function ShipperRoute({ order }) {
  return (
    <div className="route">
      <div className="route-stop">
        <span className="route-dot shop" />
        <div>
          <span className="muted small">Lấy tại quán</span>
          <b>{order.restaurantName}</b>
          <div className="muted small">{order.restaurantAddress}</div>
        </div>
      </div>
      <div className="route-stop">
        <span className="route-dot home" />
        <div>
          <span className="muted small">Giao đến khách</span>
          <b>{order.customerName}</b>
          <div className="muted small">{order.address}</div>
        </div>
      </div>
    </div>
  );
}
