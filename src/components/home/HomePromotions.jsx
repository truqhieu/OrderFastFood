import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FoodTile from '../FoodTile.jsx';
import { estimateMinutes, voucherLabel } from '../../utils.js';

const FLASH_SALE_LIMIT = 16;
const EXTRA_OPTIONS = [
  { icon: '🏷️', name: 'Deal hời', to: '/search?sale=1' },
  { icon: '🛵', name: 'Gần tôi', to: '/search?near=1' },
  { icon: '🎫', name: 'Săn voucher', to: '/vouchers' },
];
const BANNER_COLORS = ['#ee4d2d', '#f2672e', '#d0391b'];

function useCountdownToMidnight() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const end = new Date();
  end.setHours(24, 0, 0, 0);
  const seconds = Math.max(0, Math.floor((end - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0'));
}

function VoucherBanner({ banners }) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const currentBanner = banners[bannerIndex % (banners.length || 1)];

  useEffect(() => {
    if (banners.length < 2) return undefined;
    const timer = setInterval(() => setBannerIndex((index) => (index + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!currentBanner) return null;

  return (
    <Link
      to="/vouchers"
      className="banner"
      style={{ background: BANNER_COLORS[bannerIndex % BANNER_COLORS.length] }}
    >
      <div>
        <small>ƯU ĐÃI HÔM NAY</small>
        <h2>{currentBanner.title}</h2>
        <p>{voucherLabel(currentBanner)} · Nhập mã <b>{currentBanner.code}</b></p>
        <span className="banner-cta">Lưu ngay →</span>
      </div>
      <div className="banner-value">
        {currentBanner.type === 'freeship'
          ? 'FREESHIP'
          : currentBanner.type === 'percent'
            ? `-${currentBanner.value}%`
            : `-${currentBanner.value / 1000}K`}
      </div>
      <div className="banner-dots">
        {banners.map((banner, index) => (
          <span
            key={banner.id}
            className={index === bannerIndex % banners.length ? 'on' : ''}
            onClick={(event) => {
              event.preventDefault();
              setBannerIndex(index);
            }}
          />
        ))}
      </div>
    </Link>
  );
}

function HomeCategories({ categories }) {
  return (
    <section className="card option-grid">
      {categories.map((category) => (
        <Link key={category.id} to={`/search?cat=${category.id}`} className="option">
          <span className="option-icon">{category.icon}</span>
          {category.name}
        </Link>
      ))}
      {EXTRA_OPTIONS.map((option) => (
        <Link key={option.name} to={option.to} className="option">
          <span className="option-icon">{option.icon}</span>
          {option.name}
        </Link>
      ))}
    </section>
  );
}

function FlashSaleSection({ saleFoods, shopById, countdown }) {
  if (saleFoods.length === 0) return null;

  return (
    <section className="card flash">
      <div className="section-head">
        <h2>
          <span className="flash-title">FLASH SALE</span>
          <span className="countdown">{countdown.map((value, index) => <b key={index}>{value}</b>)}</span>
        </h2>
        <Link to="/search?sale=1" className="small">Xem tất cả ›</Link>
      </div>
      <div className="h-scroll">
        {saleFoods.slice(0, FLASH_SALE_LIMIT).map((food) => (
          <FoodTile key={food.id} food={food} restaurant={shopById.get(food.restaurantId)} showSoldBar />
        ))}
        {saleFoods.length > FLASH_SALE_LIMIT && (
          <Link to="/search?sale=1" className="see-more-tile">
            <span>+{saleFoods.length - FLASH_SALE_LIMIT}</span>
            Xem tất cả món sale ›
          </Link>
        )}
      </div>
    </section>
  );
}

function DealRestaurantsSection({ dealShops }) {
  if (dealShops.length === 0) return null;

  return (
    <section className="card">
      <div className="section-head">
        <h2>Quán đang ưu đãi</h2>
        <Link to="/search?near=1&promo=1" className="small">Xem tất cả ›</Link>
      </div>
      <div className="h-scroll">
        {dealShops.slice(0, 12).map((restaurant) => (
          <Link key={restaurant.id} to={`/restaurants/${restaurant.id}`} className="deal-shop">
            <div className="deal-shop-cover">
              {restaurant.image ? <img src={restaurant.image} alt="" /> : restaurant.icon}
              {restaurant.maxOff > 0 && <span className="off-badge">-{restaurant.maxOff}%</span>}
            </div>
            <strong className="ellipsis">{restaurant.name}</strong>
            <span className="muted small">
              <span className="star on">★</span> {restaurant.rating} · {restaurant.distanceKm} km · {estimateMinutes(restaurant)} phút
            </span>
            {restaurant.voucher
              ? <span className="tag ellipsis">{voucherLabel(restaurant.voucher)}</span>
              : <span className="tag">Món giảm giá</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePromotions({ categories, banners, saleFoods, dealShops, shopById, loading }) {
  const countdown = useCountdownToMidnight();

  return (
    <>
      <VoucherBanner banners={banners} />
      <HomeCategories categories={categories} />
      {loading && <p className="muted center">Đang tải...</p>}
      <FlashSaleSection saleFoods={saleFoods} shopById={shopById} countdown={countdown} />
      <DealRestaurantsSection dealShops={dealShops} />
    </>
  );
}
