import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function MerchantLayout() {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!user.restaurantId) return;
    const load = () =>
      api.get(`/orders?restaurantId=${user.restaurantId}&status=pending`).then((list) => setPending(list.length)).catch(() => {});
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [user.restaurantId]);

  return (
    <div className="admin">
      <aside className="admin-side card">
        <h3>Kênh chủ quán</h3>
        <NavLink to="/merchant" end>
          Đơn hàng {pending > 0 && <span className="badge side-badge">{pending}</span>}
        </NavLink>
        <NavLink to="/merchant/menu">Thực đơn</NavLink>
        <NavLink to="/merchant/store">Cửa hàng</NavLink>
      </aside>
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  );
}
