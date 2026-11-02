import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import usePaged from '../../hooks/usePaged.js';
import Pagination from '../../components/Pagination.jsx';
import Stars from '../../components/Stars.jsx';
import { deleteReview } from '../../services.js';
import { formatDate } from '../../utils.js';

export default function AdminReviews() {
  const toast = useToast();
  const { confirm } = useDialog();
  const [restaurants, setRestaurants] = useState([]);
  const [shop, setShop] = useState(0);
  const [stars, setStars] = useState(0);
  const query = [shop && `restaurantId=${shop}`, stars && `rating=${stars}`, '_sort=createdAt&_order=desc']
    .filter(Boolean)
    .join('&');
  const paged = usePaged(`/reviews?${query}`, 8);

  useEffect(() => {
    api.get('/restaurants').then(setRestaurants);
  }, []);

  const remove = async (r) => {
    if (!(await confirm({ title: 'Xoá đánh giá?', message: 'Điểm đánh giá của quán sẽ được tính lại.', confirmText: 'Xoá', danger: true }))) return;
    await deleteReview(r);
    toast('Đã xóa đánh giá');
    paged.reload();
  };

  return (
    <div>
      <div className="card-head">
        <h2>Đánh giá</h2>
        <div className="actions">
          <select className="input input-sm" value={shop} onChange={(e) => setShop(Number(e.target.value))}>
            <option value={0}>Tất cả quán</option>
            {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select className="input input-sm" value={stars} onChange={(e) => setStars(Number(e.target.value))}>
            <option value={0}>Mọi số sao</option>
            {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} sao</option>)}
          </select>
        </div>
      </div>
      <div className="card">
        {paged.data.length === 0 && <p className="muted center">Không có đánh giá.</p>}
        {paged.data.map((r) => (
          <div key={r.id} className="review">
            <div className="review-head">
              <span>
                <strong>👤 {r.userName}</strong> → <b>{restaurants.find((s) => s.id === r.restaurantId)?.name}</b>
              </span>
              <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Xóa</button>
            </div>
            <Stars value={r.rating} />
            {r.comment && <p>{r.comment}</p>}
            <p className="muted small">
              {formatDate(r.createdAt)}
              {r.shipperRating > 0 && ` · Tài xế: ${r.shipperRating}⭐`}
            </p>
          </div>
        ))}
        <Pagination page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} total={paged.total} />
      </div>
    </div>
  );
}
