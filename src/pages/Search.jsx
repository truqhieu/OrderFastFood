import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import useSearchHistory from '../hooks/useSearchHistory.js';
import useDeliveryLocation from '../hooks/useDeliveryLocation.js';
import { deliveryDistance } from '../geo.js';
import FoodImage from '../components/FoodImage.jsx';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import Stars from '../components/Stars.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { discountPercent, estimateMinutes, formatPrice, isExpired, normalizeText, paginate, voucherLabel } from '../utils.js';

const PAGE_SIZE = 8;
const SORTS = { relevance: 'Liên quan', distance: 'Gần tôi', sold: 'Bán chạy', rating: 'Đánh giá' };

function Highlight({ text, keyword }) {
  if (!keyword) return text;
  const idx = normalizeText(text).indexOf(normalizeText(keyword));
  if (idx < 0) return text;
  const len = normalizeText(keyword).length;
  return (
    <>
      {text.slice(0, idx)}<mark>{text.slice(idx, idx + len)}</mark>{text.slice(idx + len)}
    </>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { history, add, remove, clear } = useSearchHistory();
  const [location] = useDeliveryLocation();
  const inputRef = useRef(null);

  const q = params.get('q') || '';
  const catId = Number(params.get('cat')) || 0;
  const saleOnly = params.get('sale') === '1';
  const near = params.get('near') === '1';
  const sort = params.get('sort') || (near ? 'distance' : 'relevance');
  const openOnly = params.get('open') === '1';
  const promoOnly = params.get('promo') === '1';
  const page = Number(params.get('page')) || 1;
  const hasQuery = !!(q || catId || saleOnly || near);

  const [text, setText] = useState(q);
  const [editing, setEditing] = useState(!hasQuery);
  const [data, setData] = useState({ restaurants: [], foods: [], categories: [], vouchers: [] });
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.get('/restaurants'), api.get('/foods'), api.get('/categories'), api.get('/vouchers?active=true')])
      .then(([restaurants, foods, categories, vouchers]) => setData({ restaurants, foods, categories, vouchers }))
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  useEffect(() => {
    setText(q);
    setEditing(!hasQuery);
  }, [q, hasQuery]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const submit = (term) => {
    const t = term.trim();
    if (!t) return;
    add(t);
    setEditing(false);
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...changes }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const popular = useMemo(() => {
    const names = [...data.foods].sort((a, b) => b.sold - a.sold).map((f) => f.name.replace(/\s*\(.*\)$/, ''));
    return [...new Set(names)].slice(0, 8);
  }, [data.foods]);

  const suggestions = useMemo(() => {
    const kw = normalizeText(text);
    if (!kw) return { foods: [], shops: [] };
    const foodNames = [...new Set(data.foods.filter((f) => normalizeText(f.name).includes(kw)).map((f) => f.name))];
    return {
      foods: foodNames.slice(0, 6),
      shops: data.restaurants.filter((r) => normalizeText(r.name).includes(kw)).slice(0, 3),
    };
  }, [text, data]);

  const results = useMemo(() => {
    const kw = normalizeText(q);
    const liveVouchers = data.vouchers.filter((v) => !isExpired(v) && v.claimed < v.quantity);

    const list = data.restaurants
      .map((r) => ({ ...r, distanceKm: deliveryDistance(r, location) }))
      .map((r) => {
        const menu = data.foods.filter((f) => f.restaurantId === r.id);
        const nameHit = !!kw && normalizeText(r.name).includes(kw);
        let dishes;
        if (kw) dishes = menu.filter((f) => normalizeText(f.name).includes(kw) || normalizeText(f.section).includes(kw));
        else if (saleOnly) dishes = menu.filter((f) => discountPercent(f) > 0);
        else dishes = menu;
        const matchedCount = dishes.length;
        if (!dishes.length && nameHit) dishes = menu;
        dishes = [...dishes].sort(
          (a, b) => Number(b.available) - Number(a.available) || discountPercent(b) - discountPercent(a) || b.sold - a.sold
        );
        return {
          ...r,
          dishes,
          score: matchedCount * 2 + (nameHit ? 5 : 0),
          soldTotal: dishes.reduce((s, f) => s + f.sold, 0),
          voucher: liveVouchers.find((v) => v.restaurantId === r.id),
        };
      })
      .filter((r) => {
        if (kw && r.score === 0) return false;
        if (catId && r.categoryId !== catId) return false;
        if (saleOnly && !r.dishes.some((f) => discountPercent(f) > 0)) return false;
        if (openOnly && !r.isOpen) return false;
        if (promoOnly && !r.voucher && !r.dishes.some((f) => discountPercent(f) > 0)) return false;
        return true;
      });

    const sorters = {
      relevance: (a, b) => b.score - a.score || b.rating - a.rating,
      distance: (a, b) => a.distanceKm - b.distanceKm,
      sold: (a, b) => b.soldTotal - a.soldTotal,
      rating: (a, b) => b.rating - a.rating,
    };
    return list.sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || sorters[sort](a, b));
  }, [data, q, catId, saleOnly, sort, openOnly, promoOnly, location]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const title = q
    ? `Kết quả cho "${q}"`
    : catId
      ? data.categories.find((c) => c.id === catId)?.name
      : saleOnly
        ? 'Món đang giảm giá'
        : 'Quán gần bạn';

  return (
    <div className="search-page">
      <form className="search-bar" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
        <button type="button" className="icon-btn back" onClick={() => (editing && hasQuery ? setEditing(false) : navigate(-1))}>←</button>
        <div className="search-input">
          <Icon name="search" size={18} className="muted" />
          <input ref={inputRef} value={text} placeholder="Tìm món ăn, quán ăn..." onFocus={() => setEditing(true)}
            onChange={(e) => setText(e.target.value)} />
          {text && <button type="button" className="icon-btn" onClick={() => { setText(''); inputRef.current?.focus(); }}>✕</button>}
        </div>
        <button className="btn btn-primary">Tìm</button>
      </form>

      {editing ? (
        <div className="card search-panel">
          {text.trim() ? (
            <>
              {suggestions.foods.map((name) => (
                <button key={name} className="suggest" onClick={() => submit(name)}>
                  <Icon name="search" size={16} className="muted" /> <span><Highlight text={name} keyword={text} /></span>
                </button>
              ))}
              {suggestions.shops.map((r) => (
                <Link key={r.id} className="suggest" to={`/restaurants/${r.id}`} onClick={() => add(r.name)}>
                  <span className="suggest-icon">{r.icon}</span>
                  <span><Highlight text={r.name} keyword={text} /><small className="muted"> · Quán ăn · {deliveryDistance(r, location)} km</small></span>
                </Link>
              ))}
              {!suggestions.foods.length && !suggestions.shops.length && (
                <button className="suggest" onClick={() => submit(text)}><Icon name="search" size={16} className="muted" /> Tìm "<b>{text}</b>"</button>
              )}
            </>
          ) : (
            <>
              {history.length > 0 && (
                <div className="search-block">
                  <div className="section-head">
                    <h3>Lịch sử tìm kiếm</h3>
                    <button className="link-btn small" onClick={clear}>Xóa tất cả</button>
                  </div>
                  {history.map((h) => (
                    <div key={h} className="history-row">
                      <button className="suggest" onClick={() => submit(h)}><Icon name="clock" size={16} className="muted" /> {h}</button>
                      <button className="icon-btn" title="Xóa" onClick={() => remove(h)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="search-block">
                <h3>Tìm kiếm phổ biến</h3>
                <div className="chips">
                  {popular.map((p) => <button key={p} className="chip" onClick={() => submit(p)}>{p}</button>)}
                </div>
              </div>
              <div className="search-block">
                <h3>Danh mục</h3>
                <div className="chips">
                  {data.categories.map((c) => (
                    <Link key={c.id} className="chip" to={`/search?cat=${c.id}`}>{c.icon} {c.name}</Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <h2 className="result-title">{title}</h2>
          <div className="sort-tabs">
            {Object.entries(SORTS).map(([k, label]) => (
              <button key={k} className={sort === k ? 'active' : ''} onClick={() => updateParams({ sort: k })}>{label}</button>
            ))}
          </div>
          <div className="chips filter-chips">
            <button className={openOnly ? 'chip active' : 'chip'} onClick={() => updateParams({ open: openOnly ? '' : '1' })}>Đang mở cửa</button>
            <button className={promoOnly ? 'chip active' : 'chip'} onClick={() => updateParams({ promo: promoOnly ? '' : '1' })}>Có khuyến mãi</button>
            {data.categories.map((c) => (
              <button key={c.id} className={catId === c.id ? 'chip active' : 'chip'}
                onClick={() => updateParams({ cat: catId === c.id ? '' : String(c.id) })}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          {results.length === 0 && (
            <div className="empty card">
              <Icon name="search" size={44} className="muted" />
              <p>Không tìm thấy quán nào phù hợp.</p>
              <p className="muted small">Thử từ khóa khác hoặc bỏ bớt bộ lọc nhé.</p>
            </div>
          )}

          {paginate(results, Math.min(page, totalPages), PAGE_SIZE).map((r) => (
            <div key={r.id} className={`card result-card ${r.isOpen ? '' : 'closed'}`}>
              <Link to={`/restaurants/${r.id}`} className="result-shop">
                <div className="result-avatar">
                  {r.image ? <img src={r.image} alt="" /> : r.icon}
                  {!r.isOpen && <span className="closed-tag">Đóng cửa</span>}
                </div>
                <div className="result-info">
                  <strong><Highlight text={r.name} keyword={q} /></strong>
                  <span className="muted small ellipsis">{r.address}</span>
                  <span className="result-meta">
                    <Stars value={r.rating} count={r.ratingCount} size={13} />
                    <span className="muted small">· {r.distanceKm} km · {estimateMinutes(r)} phút</span>
                  </span>
                  {r.voucher && <span className="tag">{voucherLabel(r.voucher)}</span>}
                </div>
                <span className="muted">›</span>
              </Link>

              <div className="h-scroll dish-row">
                {r.dishes.slice(0, 8).map((f) => {
                  const off = discountPercent(f);
                  return (
                    <Link key={f.id} to={`/restaurants/${r.id}?dish=${f.id}`} className={`dish ${f.available ? '' : 'disabled'}`}>
                      <div className="dish-img">
                        <FoodImage food={f} size="dish" />
                        {off > 0 && <span className="off-badge">-{off}%</span>}
                      </div>
                      <span className="dish-name clamp-2"><Highlight text={f.name} keyword={q} /></span>
                      <div className="dish-foot">
                        <span>
                          <b className="price">{formatPrice(f.price)}</b>
                          {off > 0 && <s className="muted small"> {formatPrice(f.originalPrice)}</s>}
                        </span>
                      </div>
                    </Link>
                  );
                })}
                {r.dishes.length > 8 && (
                  <Link to={`/restaurants/${r.id}`} className="dish more">Xem quán · {r.dishes.length - 8} món ›</Link>
                )}
              </div>
            </div>
          ))}

          <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} total={results.length}
            onChange={(p) => { updateParams({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </>
      )}
    </div>
  );
}
