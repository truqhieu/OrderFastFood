import { useState } from 'react';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Icon from '../Icon.jsx';
import RouteMap from '../RouteMap.jsx';
import ShipperRoute from './ShipperRoute.jsx';
import { completeOrder, pickUpOrder } from '../../services.js';
import { formatPrice } from '../../utils.js';

function hasCoords(order) {
  return order.restaurantLat && order.deliveryLat;
}

export default function ActiveOrder({ order, onChanged }) {
  const toast = useToast();
  const { confirm } = useDialog();
  const [busy, setBusy] = useState(false);
  const picking = order.status === 'picking';
  const isCod = order.paymentMethod === 'cod';

  const run = async (action, message) => {
    setBusy(true);
    try {
      await action(order);
      toast(message);
      await onChanged();
    } catch (error) {
      toast(error.message, 'error');
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const confirmPickup = async () => {
    const ok = await confirm({
      title: 'Xác nhận đã lấy hàng?',
      message: `Bạn đang cầm món tại "${order.restaurantName}" và bắt đầu giao đến ${order.customerName}.`,
      confirmText: 'Đã lấy hàng',
    });
    if (ok) run(pickUpOrder, 'Đã lấy hàng. Hãy giao đến khách.');
  };

  const confirmDelivered = async () => {
    const ok = await confirm({
      title: 'Xác nhận đã giao hàng?',
      message: isCod ? `Nhớ thu đủ ${formatPrice(order.total)} tiền mặt từ khách.` : 'Đơn đã được khách thanh toán.',
      confirmText: 'Đã giao',
    });
    if (ok) run(completeOrder, 'Giao hàng thành công.');
  };

  return (
    <section className="card trip-card">
      <div className="trip-kicker">
        <span className="tag">{picking ? 'Đã nhận đơn' : 'Đang giao hàng'}</span>
        <span className="muted small">#{order.code}</span>
        <span className="price trip-fee">+{formatPrice(order.shippingFee)}</span>
      </div>
      <h3 className="trip-title">{picking ? 'Hãy đến quán lấy món' : 'Hãy giao đến khách'}</h3>
      <div className="trip-progress">
        <span className={picking ? 'on' : 'done'}>Lấy hàng</span>
        <span className="line" />
        <span className={picking ? '' : 'on'}>Giao hàng</span>
      </div>

      {hasCoords(order) && (
        <div className="trip-map">
          <RouteMap
            from={{ lat: order.restaurantLat, lng: order.restaurantLng }}
            to={{ lat: order.deliveryLat, lng: order.deliveryLng }}
            height={200}
            interactive
          />
        </div>
      )}

      <ShipperRoute order={order} />

      <div className="items-box small">
        {order.items.map((item) => <div key={item.foodId}>{item.quantity}× {item.name}</div>)}
        {order.note && <div className="text-error">{order.note}</div>}
      </div>

      <div className={`cod-box ${isCod ? '' : 'paid'}`}>
        {isCod
          ? <>Thu hộ khách: <b>{formatPrice(order.total)}</b></>
          : <>Khách đã thanh toán · không thu thêm</>}
      </div>

      <div className="trip-actions">
        <a className="btn btn-ghost" href={`tel:${order.phone}`}>
          <Icon name="phone" size={16} /> Gọi khách
        </a>
        {picking ? (
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={confirmPickup}>
            Xác nhận đã lấy hàng
          </button>
        ) : (
          <button className="btn btn-success btn-lg" disabled={busy} onClick={confirmDelivered}>
            Xác nhận đã giao
          </button>
        )}
      </div>
    </section>
  );
}
