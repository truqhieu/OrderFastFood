import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useDeliveryLocation from '../hooks/useDeliveryLocation.js';
import FoodImage from '../components/FoodImage.jsx';
import Icon from '../components/Icon.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import OrderSummary from '../components/OrderSummary.jsx';
import RouteMap from '../components/RouteMap.jsx';
import VoucherTicket from '../components/VoucherTicket.jsx';
import { CartChangedError, getMyVouchers, placeOrder } from '../services.js';
import { deliveryDistance, MAX_DELIVERY_KM, shopPosition } from '../geo.js';
import { calcShippingFee, calcTotals, canOrder, deliveryMinutes, evaluateVoucher, formatPrice, PAYMENT_METHODS } from '../utils.js';

const PHONE_REGEX = /^0\d{9}$/;
const PAYMENT_ICONS = { cod: 'cash', ewallet: 'phone', banking: 'bank' };

export default function Cart() {
  const { user } = useAuth();
  const { restaurant, items, subtotal, updateQuantity, replaceItems, clearCart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [location, setLocation] = useDeliveryLocation();
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState({
    customerName: user?.fullName || '',
    phone: user?.phone || '',
    note: '',
    paymentMethod: 'cod',
  });
  const [myVouchers, setMyVouchers] = useState([]);
  const [selectedId, setSelectedId] = useState(0);
  const [showVouchers, setShowVouchers] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && canOrder(user)) getMyVouchers(user.id).then((list) => setMyVouchers(list.filter((m) => !m.used)));
  }, [user]);

  useEffect(() => {
    if (restaurant) api.get(`/restaurants/${restaurant.id}`).then(setShop).catch(() => {});
  }, [restaurant?.id]);

  const store = shop || restaurant;
  const distanceKm = store ? deliveryDistance(store, location) : 0;
  const tooFar = distanceKm > MAX_DELIVERY_KM;
  const shippingFee = calcShippingFee(distanceKm);

  const voucherOptions = useMemo(
    () =>
      myVouchers
        .map((m) => {
          try {
            const discount = evaluateVoucher(m.voucher, { subtotal, shippingFee, restaurantId: restaurant?.id });
            return { ...m, discount, reason: '' };
          } catch (e) {
            return { ...m, discount: 0, reason: e.message };
          }
        })
        .sort((a, b) => b.discount - a.discount),
    [myVouchers, subtotal, shippingFee, restaurant]
  );

  const selected = voucherOptions.find((m) => m.id === selectedId && !m.reason);
  const usableCount = voucherOptions.filter((v) => !v.reason).length;

  useEffect(() => {
    if (selectedId && !selected) setSelectedId(0);
  }, [selectedId, selected]);

  if (!restaurant || items.length === 0) {
    return (
      <div className="empty card">
        <Icon name="cart" size={48} className="muted" />
        <h2>Giỏ hàng trống</h2>
        <p className="muted">Chọn một quán và thêm món bạn thích nhé.</p>
        <Link to="/" className="btn btn-primary">Khám phá quán ngon</Link>
      </div>
    );
  }

  const totals = calcTotals({ subtotal, distanceKm, voucher: selected?.voucher, restaurantId: restaurant.id });
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const eta = (store.prepTime || 10) + deliveryMinutes(distanceKm);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!user) return navigate('/login', { state: { from: '/cart' } });
    if (!canOrder(user)) return setError('Tài khoản này không thể đặt hàng. Hãy dùng tài khoản khách hàng.');
    if (!form.customerName.trim()) return setError('Vui lòng nhập tên người nhận');
    if (!PHONE_REGEX.test(form.phone.trim())) return setError('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)');
    if (tooFar) return setError(`Địa chỉ ngoài phạm vi giao hàng (tối đa ${MAX_DELIVERY_KM} km)`);

    setSubmitting(true);
    try {
      const order = await placeOrder({
        user,
        restaurantId: restaurant.id,
        items,
        form: { ...form, address: location.address, addressDetail: location.detail, lat: location.lat, lng: location.lng },
        userVoucherId: selected?.id || 0,
      });
      clearCart();
      toast('Đặt hàng thành công, đang chờ quán xác nhận');
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      if (err instanceof CartChangedError) replaceItems(err.syncedItems);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="checkout" onSubmit={submit}>
      <div className="checkout-title">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)} aria-label="Quay lại"><Icon name="back" size={20} /></button>
        <h1>Thanh toán</h1>
      </div>

      <div className="checkout-grid">
        <div>
          <section className="panel">
            <RouteMap from={shopPosition(store)} to={location} height={180} />
            <button type="button" className="address-row" onClick={() => setPicking(true)}>
              <Icon name="pin" size={20} className="text-primary" />
              <div className="address-text">
                <span className="label">Giao đến</span>
                <b>{location.address}</b>
                {location.detail && <small className="muted">{location.detail}</small>}
              </div>
              <span className="change">Thay đổi <Icon name="chevron" size={16} /></span>
            </button>
            {tooFar && <p className="field-error">Địa chỉ cách quán {distanceKm} km, vượt phạm vi giao hàng {MAX_DELIVERY_KM} km.</p>}
            <div className="contact-row">
              <label>
                <span>Người nhận</span>
                <input className="input" value={form.customerName} onChange={set('customerName')} placeholder="Họ tên" />
              </label>
              <label>
                <span>Số điện thoại</span>
                <input className="input" value={form.phone} onChange={set('phone')} placeholder="09xx xxx xxx" inputMode="tel" />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <Link to={`/restaurants/${restaurant.id}`} className="shop-link">
                <Icon name="store" size={18} />
                <b>{restaurant.name}</b>
              </Link>
              <Link to={`/restaurants/${restaurant.id}`} className="small">Thêm món</Link>
            </div>
            {items.map((i) => (
              <div key={i.foodId} className="line-item">
                <FoodImage food={i} size="sm" />
                <div className="line-info">
                  <span>{i.name}</span>
                  <small className="muted">{formatPrice(i.price)}</small>
                </div>
                <div className="stepper">
                  <button type="button" onClick={() => updateQuantity(i.foodId, i.quantity - 1)} aria-label="Bớt">−</button>
                  <span>{i.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(i.foodId, i.quantity + 1)} aria-label="Thêm">+</button>
                </div>
                <span className="line-total">{formatPrice(i.price * i.quantity)}</span>
              </div>
            ))}
            <label className="note-field">
              <Icon name="note" size={16} className="muted" />
              <input value={form.note} onChange={set('note')} placeholder="Ghi chú cho quán: ít cay, không hành..." />
            </label>
          </section>
        </div>

        <aside className="sticky">
          <section className="panel">
            <div className="eta-row">
              <Icon name="clock" size={18} className="muted" />
              <span>Giao trong khoảng <b>{eta} phút</b> · {distanceKm} km</span>
            </div>
          </section>

          <section className="panel">
            <h3 className="panel-title">Phương thức thanh toán</h3>
            <div className="pay-options">
              {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                <label key={key} className={`pay-option ${form.paymentMethod === key ? 'checked' : ''}`}>
                  <input type="radio" name="payment" value={key} checked={form.paymentMethod === key} onChange={set('paymentMethod')} />
                  <Icon name={PAYMENT_ICONS[key]} size={18} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            {!user ? (
              <div className="voucher-row muted"><Icon name="ticket" size={18} /> Đăng nhập để dùng voucher</div>
            ) : canOrder(user) && (
              <>
                <button type="button" className="voucher-row" onClick={() => setShowVouchers(!showVouchers)}>
                  <Icon name="ticket" size={18} className="text-primary" />
                  <span className="grow">
                    {selected ? <>Đã áp dụng <b>{selected.voucher.code}</b></> : 'Chọn voucher'}
                  </span>
                  <span className="muted small">
                    {selected ? `−${formatPrice(selected.discount)}` : `${usableCount} mã dùng được`}
                  </span>
                  <Icon name="chevron" size={16} className={`muted ${showVouchers ? 'rot-90' : ''}`} />
                </button>
                {showVouchers && (
                  <div className="voucher-picker">
                    {voucherOptions.length === 0 && (
                      <p className="muted small">Ví voucher trống. <Link to="/vouchers">Săn voucher</Link></p>
                    )}
                    {selected && (
                      <button type="button" className="link-btn small" onClick={() => setSelectedId(0)}>Bỏ chọn voucher</button>
                    )}
                    {voucherOptions.map((m) => (
                      <VoucherTicket key={m.id} voucher={m.voucher} dimmed={!!m.reason} note={m.reason}>
                        <input type="radio" name="voucher" disabled={!!m.reason} checked={selectedId === m.id}
                          onChange={() => { setSelectedId(m.id); setShowVouchers(false); }} />
                      </VoucherTicket>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          <section className="panel">
            <OrderSummary totals={totals} distanceKm={distanceKm} />
            {error && <div className="alert alert-error small">{error}</div>}
            <button className="btn btn-primary btn-block btn-lg" disabled={submitting || tooFar}>
              {!user ? 'Đăng nhập để đặt hàng' : submitting ? 'Đang đặt hàng...' : `Đặt đơn · ${formatPrice(totals.total)}`}
            </button>
          </section>
        </aside>
      </div>

      {picking && (
        <LocationPicker initial={location} restaurant={store} onClose={() => setPicking(false)}
          onConfirm={(loc) => { setLocation(loc); setPicking(false); }} />
      )}
    </form>
  );
}
