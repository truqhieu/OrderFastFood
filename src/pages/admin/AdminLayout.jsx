import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="admin">
      <aside className="admin-side card">
        <h3>Quản trị</h3>
        <NavLink to="/admin" end>Tổng quan</NavLink>
        <NavLink to="/admin/orders">Đơn hàng</NavLink>
        <NavLink to="/admin/restaurants">Quán ăn</NavLink>
        <NavLink to="/admin/categories">Danh mục</NavLink>
        <NavLink to="/admin/foods">Món ăn</NavLink>
        <NavLink to="/admin/vouchers">Voucher</NavLink>
        <NavLink to="/admin/reviews">Đánh giá</NavLink>
        <NavLink to="/admin/users">Người dùng</NavLink>
      </aside>
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  );
}
