import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';
import { GOOGLE_CLIENT_ID } from '../auth/google.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { HOME_BY_ROLE } from '../utils.js';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const goHome = (user) => {
    toast(`Xin chào, ${user.fullName}`);
    const from = user.role === 'customer' ? location.state?.from : null;
    navigate(from || HOME_BY_ROLE[user.role], { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      goHome(await login(form.username, form.password));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (profile) => {
    try {
      goHome(await loginWithGoogle(profile));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="auth-box card">
      <h2>Đăng nhập</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>Tài khoản
          <input className="input" name="username" autoComplete="username" required
            value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </label>
        <label>Mật khẩu
          <input className="input" type="password" name="password" autoComplete="current-password" required
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="auth-divider" role="separator"><span>hoặc</span></div>
      <GoogleSignInButton onSuccess={handleGoogle} onError={(e) => toast(e.message, 'error')} />
      {!GOOGLE_CLIENT_ID && (
        <p className="muted small google-hint">
          Nút Google sẽ hoạt động sau khi bạn dán Client ID vào file <code>.env</code> (biến <code>VITE_GOOGLE_CLIENT_ID</code>) rồi chạy lại <code>npm run dev</code>.
        </p>
      )}

      <p className="muted small center">Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link></p>
    </div>
  );
}
