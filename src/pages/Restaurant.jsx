import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import usePaged from '../hooks/usePaged.js';
import useDeliveryLocation from '../hooks/useDeliveryLocation.js';
import { useConfirmReplaceCart } from '../hooks/useAddToCart.js';
import { deliveryDistance } from '../geo.js';
import FoodImage from '../components/FoodImage.jsx';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import Stars from '../components/Stars.jsx';
import VoucherTicket from '../components/VoucherTicket.jsx';
import { claimVoucher } from '../services.js';
import { canOrder, discountPercent, estimateMinutes, formatDate, formatPrice, isExpired, normalizeText } from '../utils.js';

export default function Restaurant() {
  const { id } = useParams();
  const restaurantId = Number(id);
  const [params] = useSearchParams();
  const focusDishId = Number(params.get('dish')) || 0;
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const confirmReplace = useConfirmReplaceCart();
  const navigate = useNavigate();
  const [location] = useDeliveryLocation();

  const [restaurant, setRestaurant] = useState(null);
  const [foods, setFoods] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [claimedIds, setClaimedIds] = useState(new Set());
  const [tab, setTab] = useState('menu');
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');

  const reviews = usePaged(`/reviews?restaurantId=${restaurantId}&_sort=createdAt&_order=desc`, 5);

  useEffect(() => {
    Promise.all([
      api.get(`/restaurants/${restaurantId}`),
      api.get(`/foods?restaurantId=${restaurantId}`),
      api.get(`/vouchers?restaurantId=${restaurantId}&active=true`),
    ])
      .then(([r, f, v]) => {
        setRestaurant(r);
        setFoods(f);
        setVouchers(v.filter((x) => !isExpired(x)));
      })
      .catch((e) => {
        toast(e.message, 'error');
        setError(e.message);
      });
  }, [restaurantId]);

  useEffect(() => {
    if (!user) return;
    api.get(`/userVouchers?userId=${user.id}`).then((list) => setClaimedIds(new Set(list.map((x) => x.voucherId))));
  }, [user]);

  useEffect(() => {
    if (!focusDishId || !foods.length) return;
    const el = document.getElementById(`dish-${focusDishId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusDishId, foods]);

  const sections = useMemo(() => {
    const kw = normalizeText(keyword);
    const map = new Map();
    foods
      .filter((f) => !kw || normalizeText(f.name).includes(kw))
      .forEach((f) => {
        if (!map.has(f.section)) map.set(f.section, []);
        map.get(f.section).push(f);
      });
    return [...map.entries()];
  }, [foods, keyword]);

  if (error && !restaurant) return <p className="muted center">{error}</p>;
  if (!restaurant) return <p className="muted center">Đang tải...</p>;

  const orderable = restaurant.isOpen && canOrder(user);
  const distanceKm = deliveryDistance(restaurant, location);
  const cartHere = cart.restaurant?.id === restaurantId && cart.items.length > 0;

  const add = async (food) => {
    if (!(await confirmReplace(restaurant))) return;
    cart.addItem(food, restaurant);
  };

  const claim = async (voucher) => {
    if (!user) return navigate('/login', { state: { from: `/restaurants/${restaurantId}` } });
    try {
      await claimVoucher(user, voucher.id);
      setClaimedIds(new Set([...claimedIds, voucher.id]));
      setVouchers(vouchers.map((v) => (v.id === voucher.id ? { ...v, claimed: v.claimed + 1 } : v)));
      toast('Đã lưu voucher vào ví');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className={cartHere ? 'with-cart-bar' : ''}>
      <button className="link-btn muted small" onClick={() => navigate(-1)}>← Quay lại</button>
      <section className="shop-header card">
        <div className="shop-avatar">{restaurant.image ? <img src={restaurant.image} alt="" /> : restaurant.icon}</div>
        <div className="shop-info">
          <span className="tag">Yêu thích</span>
          <h1>{restaurant.name}</h1>
          <p className="muted">{restaurant.address}</p>
          <div className="shop-stats">
            <Stars value={restaurant.rating} count={restaurant.ratingCount} size={16} />
            <span><Icon name="pin" size={14} /> {distanceKm} km</span>
            <span><Icon name="clock" size={14} /> {estimateMinutes({ ...restaurant, distanceKm })} phút</span>
            <span>Mở cửa {restaurant.openHours}</span>
            <span className={restaurant.isOpen ? 'text-success' : 'text-error'}>
              ● {restaurant.isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'}
            </span>
          </div>
          <p className="small">{restaurant.description}</p>
        </div>
      </section>

      {!restaurant.isOpen && <p className="notice notice-error">Quán đang đóng cửa. Bạn có thể xem thực đơn và quay lại sau.</p>}

      {vouchers.length > 0 && (
        <div className="ticket-row">
          {vouchers.map((v) => {
            const claimed = claimedIds.has(v.id);
            const soldOut = v.claimed >= v.quantity;
            return (
              <VoucherTicket key={v.id} voucher={v}>
                <button className="btn btn-primary btn-sm" disabled={claimed || soldOut} onClick={() => claim(v)}>
                  {claimed ? 'Đã lưu' : soldOut ? 'Hết lượt' : 'Lưu'}
                </button>
              </VoucherTicket>
            );
          })}
        </div>
      )}

      <div className="tabs">
        <button className={tab === 'menu' ? 'tab active' : 'tab'} onClick={() => setTab('menu')}>Thực đơn ({foods.length})</button>
        <button className={tab === 'reviews' ? 'tab active' : 'tab'} onClick={() => setTab('reviews')}>
          Đánh giá ({reviews.total})
        </button>
      </div>

      {tab === 'menu' ? (
        <div className="menu-layout">
          <aside className="menu-nav card">
            {sections.map(([name]) => (
              <a key={name} href={`#sec-${name}`}>{name}</a>
            ))}
          </aside>
          <div>
            <input className="input" placeholder="Tìm món trong quán..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            {sections.length === 0 && <p className="muted center">Không có món phù hợp.</p>}
            {sections.map(([name, list]) => (
              <section key={name} id={`sec-${name}`} className="menu-section">
                <h3>{name}</h3>
                {list.map((f) => {
                  const qty = cart.restaurant?.id === restaurantId ? cart.quantityOf(f.id) : 0;
                  return (
                    <div id={`dish-${f.id}`} className={`menu-item ${f.available ? '' : 'disabled'} ${focusDishId === f.id ? 'focus-dish' : ''}`}>
                      <FoodImage food={f} size="lg" />
                      <div className="menu-info">
                        <strong>{f.name}</strong>
                        <span className="muted small">{f.description}</span>
                        <span className="muted small">Đã bán {f.sold}+</span>
                        <span>
                          <span className="price">{formatPrice(f.price)}</span>
                          {discountPercent(f) > 0 && (
                            <>
                              <s className="muted small"> {formatPrice(f.originalPrice)}</s>
                              <span className="off-inline">-{discountPercent(f)}%</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="menu-action">
                        {!f.available ? (
                          <span className="muted small">Hết món</span>
                        ) : !orderable ? null : qty > 0 ? (
                          <div className="qty">
                            <button onClick={() => cart.updateQuantity(f.id, qty - 1)}>−</button>
                            <span>{qty}</span>
                            <button onClick={() => cart.updateQuantity(f.id, qty + 1)}>+</button>
                          </div>
                        ) : (
                          <button className="add-btn" onClick={() => add(f)}>+</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          {reviews.data.length === 0 && <p className="muted center">Chưa có đánh giá nào.</p>}
          {reviews.data.map((r) => (
            <div key={r.id} className="review">
              <div className="review-head">
                <strong>👤 {r.userName}</strong>
                <span className="muted small">{formatDate(r.createdAt)}</span>
              </div>
              <Stars value={r.rating} />
              {r.comment && <p>{r.comment}</p>}
              {r.items?.length > 0 && <p className="muted small">Đã đặt: {r.items.join(', ')}</p>}
            </div>
          ))}
          <Pagination page={reviews.page} totalPages={reviews.totalPages} onChange={reviews.setPage} />
        </div>
      )}

      {cartHere && (
        <div className="cart-bar">
          <div className="container cart-bar-inner">
            <span>🛒 <b>{cart.count}</b> món · {cart.restaurant.name}</span>
            <Link to="/cart" className="btn btn-primary">
              Giao hàng · {formatPrice(cart.subtotal)} →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
