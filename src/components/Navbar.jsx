import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import Icon from './Icon.jsx';
import { ROLES } from '../utils.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const role = user?.role || 'customer';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="logo">
          Fast<span>Food</span>
        </Link>
        <nav className="nav-links">
          {(role === 'customer' || role === 'admin') && (
            <>
              <NavLink to="/" end>Trang chủ</NavLink>
              <NavLink to="/search"><Icon name="search" size={16} /> Tìm kiếm</NavLink>
              <NavLink to="/vouchers">Voucher</NavLink>
              {user && <NavLink to="/orders">Đơn hàng</NavLink>}
              <NavLink to="/cart" className="cart-link" aria-label="Giỏ hàng">
                <Icon name="cart" size={20} />
                {count > 0 && <span className="badge">{count}</span>}
              </NavLink>
            </>
          )}
          {role === 'shipper' && <NavLink to="/shipper">Nhận đơn</NavLink>}
          {role === 'merchant' && <NavLink to="/merchant">Quản lý quán</NavLink>}
          {role === 'admin' && <NavLink to="/admin">Quản trị</NavLink>}
          {user ? (
            <>
              <NavLink to="/profile" className="user-name" title={ROLES[user.role]}>
                <Icon name="user" size={16} /> {user.fullName}
              </NavLink>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Đăng nhập</NavLink>
              <Link to="/register" className="btn btn-light btn-sm">Đăng ký</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
