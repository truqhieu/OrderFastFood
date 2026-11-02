import { NavLink, Outlet } from 'react-router-dom';

export default function MerchantLayout() {
  return (
    <div className="admin">
      <aside className="admin-side card">
        <h3>🏪 Kênh chủ quán</h3>
        <NavLink to="/merchant" end>📦 Đơn hàng</NavLink>
        <NavLink to="/merchant/menu">🍔 Thực đơn</NavLink>
        <NavLink to="/merchant/store">⚙️ Cửa hàng</NavLink>
      </aside>
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  );
}
