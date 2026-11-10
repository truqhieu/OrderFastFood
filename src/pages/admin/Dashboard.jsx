import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useToast } from '../../context/ToastContext.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatPrice, isToday, ORDER_STATUS } from '../../utils.js';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.get('/orders'), api.get('/users')])
      .then(([o, u]) => {
        setOrders(o);
        setUsers(u);
      })
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === 'completed');
    const byStatus = Object.fromEntries(Object.keys(ORDER_STATUS).map((s) => [s, 0]));
    orders.forEach((o) => (byStatus[o.status] += 1));

    const shops = {};
    completed.forEach((o) => {
      shops[o.restaurantName] ??= { name: o.restaurantName, count: 0, revenue: 0 };
      shops[o.restaurantName].count += 1;
      shops[o.restaurantName].revenue += o.subtotal;
    });

    return {
      gmv: completed.reduce((s, o) => s + o.total, 0),
      todayGmv: completed.filter((o) => isToday(o.createdAt)).reduce((s, o) => s + o.total, 0),
      todayOrders: orders.filter((o) => isToday(o.createdAt)).length,
      byStatus,
      topShops: Object.values(shops).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      shippers: users.filter((u) => u.role === 'shipper'),
      customers: users.filter((u) => u.role === 'customer').length,
    };
  }, [orders, users]);

  return (
    <div>
      <h2>Tổng quan hệ thống</h2>
      <div className="stats">
        <div className="card stat"><span>Đơn hôm nay</span><strong>{stats.todayOrders}</strong></div>
        <div className="card stat"><span>GMV hôm nay</span><strong>{formatPrice(stats.todayGmv)}</strong></div>
        <div className="card stat"><span>Tổng GMV</span><strong>{formatPrice(stats.gmv)}</strong></div>
        <div className="card stat">
          <span>Tài xế online / tổng</span>
          <strong>{stats.shippers.filter((s) => s.online).length} / {stats.shippers.length}</strong>
        </div>
      </div>

      <div className="two-col even">
        <div className="card">
          <h3>Đơn theo trạng thái</h3>
          {Object.entries(stats.byStatus).map(([s, n]) => (
            <div key={s} className="summary-item"><StatusBadge status={s} /><strong>{n}</strong></div>
          ))}
        </div>
        <div className="card">
          <h3>Top quán doanh thu</h3>
          {stats.topShops.length === 0 && <p className="muted small">Chưa có dữ liệu</p>}
          {stats.topShops.map((s, i) => (
            <div key={s.name} className="summary-item">
              <span>{i + 1}. {s.name}</span>
              <span>{s.count} đơn · {formatPrice(s.revenue)}</span>
            </div>
          ))}
          <p className="muted small">Khách hàng đã đăng ký: {stats.customers}</p>
        </div>
      </div>
    </div>
  );
}
