import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import useDeliveryLocation from '../hooks/useDeliveryLocation.js';
import { useLocationContext } from '../context/LocationContext.jsx';
import FoodTile from '../components/FoodTile.jsx';
import Icon from '../components/Icon.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import { deliveryDistance } from '../geo.js';
import Pagination from '../components/Pagination.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { discountPercent, estimateMinutes, isExpired, paginate, voucherLabel } from '../utils.js';

const SUGGEST_PAGE_SIZE = 12;
const FLASH_SALE_LIMIT = 16;
const SIDE_SECTIONS = ['Đồ uống', 'Topping'];
const EXTRA_OPTIONS = [
  { icon: '🏷️', name: 'Deal hời', to: '/search?sale=1' },
  { icon: '🛵', name: 'Gần tôi', to: '/search?near=1' },
  { icon: '🎫', name: 'Săn voucher', to: '/vouchers' },
];
const BANNER_COLORS = ['#ee4d2d', '#f2672e', '#d0391b'];

function useCountdownToMidnight() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date();
  end.setHours(24, 0, 0, 0);
  const s = Math.max(0, Math.floor((end - now) / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0'));
}

export default function Home() {
  const navigate = useNavigate();
  const countdown = useCountdownToMidnight();
  const [data, setData] = useState({ categories: [], foods: [], restaurants: [], vouchers: [] });
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [banner, setBanner] = useState(0);
  const [page, setPage] = useState(1);
  const [suggestTab, setSuggestTab] = useState(0);
  const suggestRef = useRef(null);
  const [location, setLocation] = useDeliveryLocation();
  const { locate, status: locStatus, error: locError } = useLocationContext();
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/foods'), api.get('/restaurants'), api.get('/vouchers?active=true')])
      .then(([categories, foods, restaurants, vouchers]) => setData({ categories, foods, restaurants, vouchers }))
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  const { shopById, saleFoods, suggested, banners, dealShops } = useMemo(() => {
    const restaurants = data.restaurants.map((r) => ({ ...r, distanceKm: deliveryDistance(r, location) }));
    const shopById = new Map(restaurants.map((r) => [r.id, r]));
    const orderable = data.foods.filter((f) => f.available && shopById.get(f.restaurantId)?.isOpen);
    const liveVouchers = data.vouchers.filter((v) => !isExpired(v) && v.claimed < v.quantity);
    const saleFoods = orderable.filter((f) => discountPercent(f) > 0).sort((a, b) => discountPercent(b) - discountPercent(a));
    const dealShops = restaurants
      .filter((r) => r.isOpen)
      .map((r) => ({
        ...r,
        voucher: liveVouchers.find((v) => v.restaurantId === r.id),
        maxOff: Math.max(0, ...saleFoods.filter((f) => f.restaurantId === r.id).map(discountPercent)),
      }))
      .filter((r) => r.voucher || r.maxOff)
      .sort((a, b) => b.rating - a.rating);
    return {
      shopById,
      saleFoods,
      dealShops,
      suggested: orderable.filter((f) => !SIDE_SECTIONS.includes(f.section)).sort((a, b) => b.sold - a.sold),
      banners: liveVouchers.filter((v) => !v.restaurantId),
    };
  }, [data, location]);

  const suggestedInTab = suggestTab
    ? suggested.filter((f) => shopById.get(f.restaurantId)?.categoryId === suggestTab)
    : suggested;

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setBanner((b) => (b + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  const totalPages = Math.max(1, Math.ceil(suggestedInTab.length / SUGGEST_PAGE_SIZE));
  const currentBanner = banners[banner % (banners.length || 1)];

  return (
    <div className="home">
      <section className="home-top">
        <button className="deliver-to" onClick={() => setPicking(true)}>
          <Icon name="pin" size={16} />
          <span>Giao đến</span>
          <b className="ellipsis">
            {locStatus === 'locating' ? 'Đang lấy vị trí hiện tại...' : `${location.detail ? `${location.detail}, ` : ''}${location.address}`}
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
        <LocationPicker initial={location} onClose={() => setPicking(false)}
          onConfirm={(loc) => { setLocation(loc); setPicking(false); }} />
      )}

      {currentBanner && (
        <Link to="/vouchers" className="banner" style={{ background: BANNER_COLORS[banner % BANNER_COLORS.length] }}>
          <div>
            <small>ƯU ĐÃI HÔM NAY</small>
            <h2>{currentBanner.title}</h2>
            <p>{voucherLabel(currentBanner)} · Nhập mã <b>{currentBanner.code}</b></p>
            <span className="banner-cta">Lưu ngay →</span>
          </div>
          <div className="banner-value">
            {currentBanner.type === 'freeship' ? 'FREESHIP' : currentBanner.type === 'percent' ? `-${currentBanner.value}%` : `-${currentBanner.value / 1000}K`}
          </div>
          <div className="banner-dots">
            {banners.map((b, i) => (
              <span key={b.id} className={i === banner % banners.length ? 'on' : ''}
                onClick={(e) => { e.preventDefault(); setBanner(i); }} />
            ))}
          </div>
        </Link>
      )}

      <section className="card option-grid">
        {data.categories.map((c) => (
          <Link key={c.id} to={`/search?cat=${c.id}`} className="option">
            <span className="option-icon">{c.icon}</span>
            {c.name}
          </Link>
        ))}
        {EXTRA_OPTIONS.map((o) => (
          <Link key={o.name} to={o.to} className="option">
            <span className="option-icon">{o.icon}</span>
            {o.name}
          </Link>
        ))}
      </section>

      {loading && <p className="muted center">Đang tải...</p>}

      {saleFoods.length > 0 && (
        <section className="card flash">
          <div className="section-head">
            <h2>
              <span className="flash-title">FLASH SALE</span>
              <span className="countdown">{countdown.map((n, i) => <b key={i}>{n}</b>)}</span>
            </h2>
            <Link to="/search?sale=1" className="small">Xem tất cả ›</Link>
          </div>
          <div className="h-scroll">
            {saleFoods.slice(0, FLASH_SALE_LIMIT).map((f) => (
              <FoodTile key={f.id} food={f} restaurant={shopById.get(f.restaurantId)} showSoldBar />
            ))}
            {saleFoods.length > FLASH_SALE_LIMIT && (
              <Link to="/search?sale=1" className="see-more-tile">
                <span>+{saleFoods.length - FLASH_SALE_LIMIT}</span>
                Xem tất cả món sale ›
              </Link>
            )}
          </div>
        </section>
      )}

      {dealShops.length > 0 && (
        <section className="card">
          <div className="section-head">
            <h2>Quán đang ưu đãi</h2>
            <Link to="/search?near=1&promo=1" className="small">Xem tất cả ›</Link>
          </div>
          <div className="h-scroll">
            {dealShops.slice(0, 12).map((r) => (
              <Link key={r.id} to={`/restaurants/${r.id}`} className="deal-shop">
                <div className="deal-shop-cover">
                  {r.image ? <img src={r.image} alt="" /> : r.icon}
                  {r.maxOff > 0 && <span className="off-badge">-{r.maxOff}%</span>}
                </div>
                <strong className="ellipsis">{r.name}</strong>
                <span className="muted small"><span className="star on">★</span> {r.rating} · {r.distanceKm} km · {estimateMinutes(r)} phút</span>
                {r.voucher ? <span className="tag ellipsis">{voucherLabel(r.voucher)}</span> : <span className="tag">Món giảm giá</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {suggested.length > 0 && (
        <section ref={suggestRef}>
          <div className="section-head">
            <h2>Gợi ý cho bạn</h2>
          </div>
          <div className="chips filter-chips">
            {[{ id: 0, name: 'Tất cả' }, ...data.categories].map((c) => (
              <button key={c.id} className={suggestTab === c.id ? 'chip active' : 'chip'}
                onClick={() => { setSuggestTab(c.id); setPage(1); }}>
                {c.name}
              </button>
            ))}
          </div>
          {suggestedInTab.length === 0 && <p className="muted center">Danh mục này hiện chưa có món đang bán.</p>}
          <div className="tile-grid">
            {paginate(suggestedInTab, Math.min(page, totalPages), SUGGEST_PAGE_SIZE).map((f) => (
              <FoodTile key={f.id} food={f} restaurant={shopById.get(f.restaurantId)} />
            ))}
          </div>
          <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} total={suggestedInTab.length}
            onChange={(p) => { setPage(p); suggestRef.current?.scrollIntoView({ behavior: 'smooth' }); }} />
        </section>
      )}
    </div>
  );
}
