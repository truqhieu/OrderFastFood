import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { HOME_BY_ROLE } from '../utils.js';

const PHONE_REGEX = /^0\d{9}$/;
const PLATE_REGEX = /^\d{2}[A-Z]{1,2}\d?-\d{3}\.?\d{2}$/i;

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: 'customer',
    fullName: '',
    email: '',
    phone: '',
    address: '',
    vehicle: '',
    plate: '',
    password: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const isShipper = form.role === 'shipper';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!PHONE_REGEX.test(form.phone)) return setError('Số điện thoại phải gồm 10 số, bắt đầu bằng 0');
    if (isShipper && !form.vehicle.trim()) return setError('Vui lòng nhập loại xe');
    if (isShipper && !PLATE_REGEX.test(form.plate.trim())) return setError('Biển số không hợp lệ (VD: 59X1-123.45)');
    if (form.password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự');
    if (form.password !== form.confirm) return setError('Mật khẩu xác nhận không khớp');

    setSubmitting(true);
    try {
      const user = await register(form);
      toast('Đăng ký thành công!');
      navigate(HOME_BY_ROLE[user.role]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-box card">
      <h2>Đăng ký tài khoản</h2>
      <div className="role-switch">
        <button type="button" className={!isShipper ? 'active' : ''} onClick={() => setForm({ ...form, role: 'customer' })}>
          🍔 Tôi muốn đặt món
        </button>
        <button type="button" className={isShipper ? 'active' : ''} onClick={() => setForm({ ...form, role: 'shipper' })}>
          🛵 Đăng ký làm tài xế
        </button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="form">
        <label>Họ và tên<input className="input" required value={form.fullName} onChange={set('fullName')} /></label>
        <label>Email<input className="input" type="email" required value={form.email} onChange={set('email')} /></label>
        <label>Số điện thoại<input className="input" required value={form.phone} onChange={set('phone')} /></label>
        <label>{isShipper ? 'Khu vực hoạt động' : 'Địa chỉ giao hàng'}<input className="input" required value={form.address} onChange={set('address')} /></label>
        {isShipper && (
          <div className="row">
            <label>Loại xe<input className="input" placeholder="Honda Wave" value={form.vehicle} onChange={set('vehicle')} /></label>
            <label>Biển số<input className="input" placeholder="59X1-123.45" value={form.plate} onChange={set('plate')} /></label>
          </div>
        )}
        <label>Mật khẩu<input className="input" type="password" required value={form.password} onChange={set('password')} /></label>
        <label>Xác nhận mật khẩu<input className="input" type="password" required value={form.confirm} onChange={set('confirm')} /></label>
        <button className="btn btn-primary btn-block" disabled={submitting}>{submitting ? 'Đang xử lý...' : 'Đăng ký'}</button>
      </form>
      <p className="muted small center">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </div>
  );
}
