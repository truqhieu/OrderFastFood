import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import usePaged from '../hooks/usePaged.js';
import Pagination from '../components/Pagination.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ACTIVE_STATUSES, formatDate, formatPrice } from '../utils.js';

const TABS = {
  active: { label: 'Đang đến', query: ACTIVE_STATUSES.map((s) => `status=${s}`).join('&') },
  completed: { label: 'Lịch sử', query: 'status=completed' },
  cancelled: { label: 'Đã hủy', query: 'status=cancelled' },
  review: { label: 'Chờ đánh giá', query: 'status=completed&reviewed=false' },
};

export default function Orders() {
  const { user } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('active');
  const paged = usePaged(`/orders?userId=${user.id}&${TABS[tab].query}&_sort=createdAt&_order=desc`, 5, {
    pollMs: tab === 'active' ? 8000 : 0,
  });

  useEffect(() => {
    if (paged.error) toast(paged.error, 'error');
  }, [paged.error, toast]);

  return (
    <div>
      <h2>Đơn hàng của tôi</h2>
      <div className="tabs">
        {Object.entries(TABS).map(([key, t]) => (
          <button key={key} className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)}>{t.label}</button>
        ))}
      </div>

      {paged.loading && <p className="muted center">Đang tải...</p>}
      {!paged.loading && paged.data.length === 0 && (
        <div className="empty card">
          <p className="muted">Không có đơn hàng nào.</p>
          <Link to="/" className="btn btn-primary">Đặt món ngay</Link>
        </div>
      )}

      <div className="order-list">
        {paged.data.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="card order-card">
            <div className="card-head">
              <strong>{o.restaurantIcon} {o.restaurantName}</strong>
              <StatusBadge order={o} />
            </div>
            <p className="small">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
            <div className="card-head">
              <span className="muted small">#{o.code} · {formatDate(o.createdAt)}</span>
              <span>
                {tab === 'review' && <span className="tag">⭐ Đánh giá ngay</span>} <strong>{formatPrice(o.total)}</strong>
              </span>
            </div>
          </Link>
        ))}
      </div>
      <Pagination page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} total={paged.total} />
    </div>
  );
}
