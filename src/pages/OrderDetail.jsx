import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useConfirmReplaceCart } from '../hooks/useAddToCart.js';
import FoodImage from '../components/FoodImage.jsx';
import OrderSummary from '../components/OrderSummary.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Stars, { StarInput } from '../components/Stars.jsx';
import TrackingMap from '../components/TrackingMap.jsx';
import { cancelOrder, submitReview } from '../services.js';
import { ACTIVE_STATUSES, formatDate, formatPrice, formatTime, ORDER_STATUS, PAYMENT_METHODS, STATUS_FLOW, STATUS_TOAST } from '../utils.js';

const POLL_MS = 2000;

function ReviewForm({ order, onDone }) {
  const { user } = useAuth();
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [shipperRating, setShipperRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await submitReview(order, user, { rating, comment, shipperRating: order.shipperId ? shipperRating : 0 });
      toast('Cảm ơn bạn đã đánh giá');
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card review-form" onSubmit={submit}>
      <h3>Đánh giá đơn hàng</h3>
      <div className="review-line"><span>Món ăn & quán {order.restaurantName}</span><StarInput value={rating} onChange={setRating} /></div>
      {order.shipperId > 0 && (
        <div className="review-line"><span>Tài xế {order.shipper?.fullName}</span><StarInput value={shipperRating} onChange={setShipperRating} /></div>
      )}
      <textarea className="input" rows={3} placeholder="Chia sẻ cảm nhận của bạn về món ăn..." value={comment}
        onChange={(e) => setComment(e.target.value)} />
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi đánh giá'}</button>
    </form>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const { confirm } = useDialog();
  const confirmReplace = useConfirmReplaceCart();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const prevStatus = useRef('');

  const load = useCallback(() => {
    api
      .get(`/orders/${id}`)
      .then((o) => {
        const allowed =
          o.userId === user.id ||
          user.role === 'admin' ||
          (user.role === 'merchant' && user.restaurantId === o.restaurantId) ||
          (user.role === 'shipper' && (o.shipperId === user.id || !o.shipperId));
        if (!allowed) throw new Error('Bạn không có quyền xem đơn này');
        setOrder(o);
      })
      .catch((e) => {
        setError(e.message);
        toast(e.message, 'error');
      });
  }, [id, user, toast]);

  const isActive = order && ACTIVE_STATUSES.includes(order.status);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', load);
    };
  }, [isActive, load]);

  useEffect(() => {
    if (!order || order.userId !== user.id) return;
    if (prevStatus.current && prevStatus.current !== order.status && STATUS_TOAST[order.status]) {
      toast(STATUS_TOAST[order.status]);
    }
    prevStatus.current = order.status;
  }, [order, user.id, toast]);

  const cancel = async () => {
    if (!(await confirm({
      title: 'Huỷ đơn hàng?',
      message: 'Voucher đã dùng (nếu có) sẽ được hoàn lại vào ví.',
      confirmText: 'Huỷ đơn',
      cancelText: 'Không',
      danger: true,
    }))) return;
    try {
      setOrder(await cancelOrder(order, 'customer', 'Khách hàng hủy đơn'));
      toast('Đã hủy đơn hàng. Voucher (nếu có) đã được hoàn lại ví.');
    } catch (e) {
      toast('Quán đã xác nhận đơn, không thể hủy nữa', 'error');
      load();
    }
  };

  const reorder = async () => {
    const [restaurant, foods] = await Promise.all([
      api.get(`/restaurants/${order.restaurantId}`),
      api.get(`/foods?restaurantId=${order.restaurantId}`),
    ]);
    if (!restaurant.isOpen) return toast('Quán hiện đang đóng cửa', 'error');
    if (!(await confirmReplace(restaurant))) return;
    if (cart.isOtherRestaurant(restaurant.id)) cart.clearCart();
    let added = 0;
    for (const item of order.items) {
      const food = foods.find((f) => f.id === item.foodId && f.available);
      if (food) {
        cart.addItem(food, restaurant, item.quantity);
        added++;
      }
    }
    if (!added) return toast('Các món trong đơn hiện đã hết', 'error');
    navigate('/cart');
  };

  if (error && !order) return <p className="muted center">{error}</p>;
  if (!order) return <p className="muted center">Đang tải...</p>;

  const reachedAt = Object.fromEntries(order.history.map((h) => [h.status, h.at]));
  const isOwner = order.userId === user.id;

  return (
    <div>
      <button className="link-btn muted small" onClick={() => navigate(user.role === 'customer' ? '/orders' : -1)}>
        ← Quay lại
      </button>
      <div className="card-head">
        <h2>Đơn #{order.code}</h2>
        <StatusBadge order={order} />
      </div>

      <div className="card">
        <TrackingMap order={order} />
        {order.status === 'cancelled' ? (
          <p className="notice notice-error">
            Đơn đã bị hủy lúc {formatDate(reachedAt.cancelled)}{order.cancelReason && <> — {order.cancelReason}</>}
          </p>
        ) : (
          <div className="timeline">
            {STATUS_FLOW.map((s) => (
              <div key={s} className={`step ${reachedAt[s] ? 'done' : ''}`}>
                <div className="dot" />
                <div className="step-label">{ORDER_STATUS[s].label}</div>
                <div className="muted small">{reachedAt[s] ? formatTime(reachedAt[s]) : ''}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {order.shipper && (
        <div className="card driver-card">
          <div className="driver-avatar letter">{order.shipper.fullName.charAt(0)}</div>
          <div className="driver-info">
            <strong>{order.shipper.fullName}</strong>
            <span className="muted small">{order.shipper.vehicle} · <b className="plate">{order.shipper.plate}</b></span>
            <Stars value={order.shipper.rating} />
          </div>
          {isActive && <a href={`tel:${order.shipper.phone}`} className="btn btn-outline">Gọi tài xế</a>}
        </div>
      )}

      {order.status === 'completed' && isOwner && !order.reviewed && <ReviewForm order={order} onDone={load} />}
      {order.reviewed && <p className="notice notice-muted">Bạn đã đánh giá đơn hàng này.</p>}

      <div className="two-col">
        <div className="card">
          <Link to={`/restaurants/${order.restaurantId}`}><h3>{order.restaurantIcon} {order.restaurantName}</h3></Link>
          <p className="muted small">{order.restaurantAddress}</p>
          {order.items.map((i) => (
            <div key={i.foodId} className="cart-row">
              <FoodImage food={i} size="sm" />
              <div className="cart-info">
                <strong>{i.name}</strong>
                <span className="muted small">{formatPrice(i.price)} × {i.quantity}</span>
              </div>
              <strong>{formatPrice(i.price * i.quantity)}</strong>
            </div>
          ))}
          <OrderSummary totals={order} distanceKm={order.distanceKm} />
          {order.voucherCode && <p className="small text-success">Đã dùng voucher {order.voucherCode}</p>}
        </div>

        <div className="card">
          <h3>Thông tin giao hàng</h3>
          <p><b>Người nhận:</b> {order.customerName} · {order.phone}</p>
          <p><b>Địa chỉ:</b> {order.address}</p>
          {order.note && <p><b>Ghi chú:</b> {order.note}</p>}
          <p><b>Thanh toán:</b> {PAYMENT_METHODS[order.paymentMethod]}</p>
          <p className="muted small">Đặt lúc {formatDate(order.createdAt)}</p>
          <div className="actions">
            {order.status === 'pending' && isOwner && <button className="btn btn-danger" onClick={cancel}>Hủy đơn</button>}
            {['completed', 'cancelled'].includes(order.status) && isOwner && (
              <button className="btn btn-primary" onClick={reorder}>Đặt lại</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
