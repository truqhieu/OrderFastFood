import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { GOOGLE_CLIENT_ID } from '../auth/google.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { HOME_BY_ROLE } from '../utils.js';

const PHONE_REGEX = /^0\d{9}$/;
const PLATE_REGEX = /^\d{2}[A-Z]{1,2}\d?-\d{3}\.?\d{2}$/i;

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: 'customer',
    fullName: '',
    username: '',
    email: '',
    phone: '',
    address: '',
    vehicle: '',
    plate: '',
    password: '',
    confirm: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const isShipper = form.role === 'shipper';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!PHONE_REGEX.test(form.phone)) return toast('Số điện thoại phải gồm 10 số, bắt đầu bằng 0', 'error');
    if (isShipper && !form.vehicle.trim()) return toast('Vui lòng nhập loại xe', 'error');
    if (isShipper && !PLATE_REGEX.test(form.plate.trim())) return toast('Biển số không hợp lệ (VD: 59X1-123.45)', 'error');
    if (form.password.length < 6) return toast('Mật khẩu tối thiểu 6 ký tự', 'error');
    if (form.password !== form.confirm) return toast('Mật khẩu xác nhận không khớp', 'error');

    setSubmitting(true);
    try {
      const user = await register(form);
      toast('Đăng ký thành công!');
      navigate(HOME_BY_ROLE[user.role]);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-box card">
      <h2>Đăng ký tài khoản</h2>
      <div className="role-switch">
        <button type="button" className={!isShipper ? 'active' : ''} onClick={() => setForm({ ...form, role: 'customer' })}>
          Đặt món
        </button>
        <button type="button" className={isShipper ? 'active' : ''} onClick={() => setForm({ ...form, role: 'shipper' })}>
          Tài xế
        </button>
      </div>
      <form onSubmit={handleSubmit} className="form">
        <label>Họ và tên<input className="input" name="name" autoComplete="name" required value={form.fullName} onChange={set('fullName')} /></label>
        <label>Tài khoản<input className="input" name="username" autoComplete="username" required value={form.username} onChange={set('username')} placeholder="vd: nguyenvana" /></label>
        <label>Email<input className="input" type="email" name="email" autoComplete="email" required value={form.email} onChange={set('email')} /></label>
        <label>Số điện thoại<input className="input" name="tel" autoComplete="tel" required value={form.phone} onChange={set('phone')} /></label>
        <label>{isShipper ? 'Khu vực hoạt động' : 'Địa chỉ giao hàng'}<input className="input" required value={form.address} onChange={set('address')} /></label>
        {isShipper && (
          <div className="row">
            <label>Loại xe<input className="input" placeholder="Honda Wave" value={form.vehicle} onChange={set('vehicle')} /></label>
            <label>Biển số<input className="input" placeholder="59X1-123.45" value={form.plate} onChange={set('plate')} /></label>
          </div>
        )}
        <label>Mật khẩu<input className="input" type="password" name="new-password" autoComplete="new-password" required value={form.password} onChange={set('password')} /></label>
        <label>Xác nhận mật khẩu<input className="input" type="password" name="confirm-password" autoComplete="new-password" required value={form.confirm} onChange={set('confirm')} /></label>
        <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Đang xử lý...' : 'Đăng ký'}</button>
      </form>
      {!isShipper && (
        <>
          <div className="auth-divider" role="separator"><span>hoặc</span></div>
          <GoogleSignInButton label="Đăng ký với Google" onSuccess={async (profile) => {
            try {
              const user = await loginWithGoogle(profile);
              toast('Đăng nhập Google thành công');
              navigate(HOME_BY_ROLE[user.role]);
            } catch (err) {
              toast(err.message, 'error');
            }
          }} onError={(e) => toast(e.message, 'error')} />
          {!GOOGLE_CLIENT_ID && (
            <p className="muted small google-hint">
              Nút Google sẽ hoạt động sau khi bạn dán Client ID vào file <code>.env</code> rồi chạy lại <code>npm run dev</code>.
            </p>
          )}
        </>
      )}
      <p className="muted small center">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </div>
  );
}
