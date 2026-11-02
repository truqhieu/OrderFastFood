import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Stars from '../components/Stars.jsx';
import { ROLES } from '../utils.js';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const isShipper = user.role === 'shipper';
  const [form, setForm] = useState({
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    ...(isShipper && { vehicle: user.vehicle, plate: user.plate }),
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast('Đã cập nhật thông tin');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-box card">
      <h2>Thông tin cá nhân</h2>
      <p className="muted small">{user.email} · <span className="tag">{ROLES[user.role]}</span></p>
      {isShipper && <p><Stars value={user.rating} count={user.ratingCount} /></p>}
      <form className="form" onSubmit={handleSubmit}>
        <label>Họ và tên<input className="input" required value={form.fullName} onChange={set('fullName')} /></label>
        <label>Số điện thoại<input className="input" required value={form.phone} onChange={set('phone')} /></label>
        <label>Địa chỉ<input className="input" required value={form.address} onChange={set('address')} /></label>
        {isShipper && (
          <div className="row">
            <label>Loại xe<input className="input" value={form.vehicle} onChange={set('vehicle')} /></label>
            <label>Biển số<input className="input" value={form.plate} onChange={set('plate')} /></label>
          </div>
        )}
        <button className="btn btn-primary btn-block" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
      </form>
    </div>
  );
}
