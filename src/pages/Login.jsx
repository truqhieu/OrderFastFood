import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { HOME_BY_ROLE } from '../utils.js';

const DEMO_ACCOUNTS = [
  ['Khách hàng', 'user@fastfood.vn'],
  ['Tài xế', 'shipper@fastfood.vn'],
  ['Chủ quán', 'merchant@fastfood.vn'],
  ['Admin', 'admin@fastfood.vn'],
];

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      toast(`Xin chào, ${user.fullName}!`);
      const from = user.role === 'customer' ? location.state?.from : null;
      navigate(from || HOME_BY_ROLE[user.role], { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-box card">
      <h2>Đăng nhập</h2>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="form">
        <label>Email
          <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>Mật khẩu
          <input className="input" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
      <p className="muted small center">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
      <div className="demo-accounts small">
        <strong>Tài khoản demo (mật khẩu 123456) — bấm để điền:</strong>
        {DEMO_ACCOUNTS.map(([label, email]) => (
          <button key={email} type="button" className="link-btn" onClick={() => setForm({ email, password: '123456' })}>
            {label}: {email}
          </button>
        ))}
      </div>
    </div>
  );
}
