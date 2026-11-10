import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import usePaged from '../../hooks/usePaged.js';
import Pagination from '../../components/Pagination.jsx';
import Stars from '../../components/Stars.jsx';
import { ACTIVE_STATUSES, ROLES } from '../../utils.js';

const EMPTY = {
  fullName: '', username: '', email: '', phone: '', address: '', password: '123456', role: 'customer',
  restaurantId: '', vehicle: '', plate: '',
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const { confirm } = useDialog();
  const [role, setRole] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [form, setForm] = useState(null);
  const query = [role !== 'all' && `role=${role}`, keyword.trim() && `q=${encodeURIComponent(keyword.trim())}`, '_sort=id']
    .filter(Boolean)
    .join('&');
  const paged = usePaged(`/users?${query}`, 8);

  useEffect(() => {
    api.get('/restaurants').then(setRestaurants);
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const shopName = (id) => restaurants.find((r) => r.id === id)?.name;

  const save = async (e) => {
    e.preventDefault();
    const username = (form.username || '').trim().toLowerCase();
    if (!/^[a-z0-9._]{3,20}$/.test(username)) return toast('Tài khoản gồm 3–20 ký tự: chữ thường, số, dấu chấm hoặc gạch dưới', 'error');
    const email = form.email.trim().toLowerCase();
    const [dupUser, dupEmail] = await Promise.all([
      api.get(`/users?username=${encodeURIComponent(username)}`),
      api.get(`/users?email=${encodeURIComponent(email)}`),
    ]);
    if (dupUser.some((u) => u.id !== form.id)) return toast('Tên tài khoản đã tồn tại', 'error');
    if (dupEmail.some((u) => u.id !== form.id)) return toast('Email đã tồn tại', 'error');
    if (form.role === 'merchant' && !form.restaurantId) return toast('Chọn quán cho chủ quán', 'error');
    if (form.password.length < 6) return toast('Mật khẩu tối thiểu 6 ký tự', 'error');
    if (form.id === me.id && form.role !== 'admin') return toast('Không thể tự hạ quyền admin của chính mình', 'error');

    const data = {
      fullName: form.fullName.trim(),
      username,
      email,
      phone: form.phone.trim(),
      address: form.address.trim(),
      password: form.password,
      role: form.role,
      restaurantId: form.role === 'merchant' ? Number(form.restaurantId) : 0,
    };
    if (form.role === 'shipper') {
      Object.assign(data, {
        vehicle: form.vehicle.trim(),
        plate: form.plate.trim().toUpperCase(),
        online: form.online ?? false,
        rating: form.rating ?? 5,
        ratingCount: form.ratingCount ?? 0,
      });
    }
    if (form.id) await api.patch(`/users/${form.id}`, data);
    else await api.post('/users', { ...data, locked: false });
    toast(form.id ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản');
    setForm(null);
    paged.reload();
  };

  const toggleLock = async (u) => {
    if (u.id === me.id) return toast('Không thể khóa chính mình', 'error');
    await api.patch(`/users/${u.id}`, { locked: !u.locked, ...(u.role === 'shipper' && { online: false }) });
    toast(u.locked ? `Đã mở khóa ${u.fullName}` : `Đã khóa ${u.fullName}`);
    paged.reload();
  };

  const toggleOnline = async (u) => {
    await api.patch(`/users/${u.id}`, { online: !u.online });
    paged.reload();
  };

  const remove = async (u) => {
    if (u.id === me.id) return toast('Không thể xóa chính mình', 'error');
    const activeQuery = ACTIVE_STATUSES.map((s) => `status=${s}`).join('&');
    const field = u.role === 'shipper' ? 'shipperId' : 'userId';
    const active = await api.get(`/orders?${field}=${u.id}&${activeQuery}`);
    if (active.length) return toast(`${u.fullName} đang có ${active.length} đơn chưa hoàn thành`, 'error');
    if (!(await confirm({
      title: 'Xoá tài khoản?',
      message: `Tài khoản ${u.email} sẽ bị xoá vĩnh viễn và không thể khôi phục.`,
      confirmText: 'Xoá vĩnh viễn',
      danger: true,
    }))) return;
    const vouchers = await api.get(`/userVouchers?userId=${u.id}`);
    await Promise.all(vouchers.map((v) => api.delete(`/userVouchers/${v.id}`)));
    await api.delete(`/users/${u.id}`);
    toast('Đã xóa tài khoản');
    paged.reload();
  };

  return (
    <div>
      <div className="card-head">
        <h2>Người dùng</h2>
        <div className="actions">
          <input className="input input-sm" placeholder="Tìm tên, email, SĐT..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setForm(EMPTY)}>+ Tạo tài khoản</button>
        </div>
      </div>
      <div className="tabs">
        {['all', ...Object.keys(ROLES)].map((r) => (
          <button key={r} className={role === r ? 'tab active' : 'tab'} onClick={() => setRole(r)}>
            {r === 'all' ? 'Tất cả' : ROLES[r]}
          </button>
        ))}
      </div>

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="card modal form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{form.id ? `Sửa tài khoản #${form.id}` : 'Tạo tài khoản'}</h3>
            <div className="row">
              <label>Họ tên<input className="input" required value={form.fullName} onChange={set('fullName')} /></label>
              <label>Vai trò
                <select className="input" value={form.role} onChange={set('role')}>
                  {Object.entries(ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
            </div>
            {form.role === 'merchant' && (
              <label>Quán quản lý
                <select className="input" value={form.restaurantId} onChange={set('restaurantId')}>
                  <option value="">-- Chọn quán --</option>
                  {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </label>
            )}
            {form.role === 'shipper' && (
              <div className="row">
                <label>Loại xe<input className="input" value={form.vehicle || ''} onChange={set('vehicle')} /></label>
                <label>Biển số<input className="input" value={form.plate || ''} onChange={set('plate')} /></label>
              </div>
            )}
            <div className="row">
              <label>Tài khoản<input className="input" required value={form.username || ''} onChange={set('username')} /></label>
              <label>Email<input className="input" type="email" required value={form.email} onChange={set('email')} /></label>
            </div>
            <div className="row">
              <label>SĐT<input className="input" required value={form.phone} onChange={set('phone')} /></label>
              <label>Địa chỉ<input className="input" value={form.address || ''} onChange={set('address')} /></label>
            </div>
            <label>Mật khẩu {form.id && <span className="muted small">(sửa để đặt lại mật khẩu)</span>}
              <input className="input" required value={form.password} onChange={set('password')} />
            </label>
            <div className="actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Hủy</button>
              <button className="btn btn-primary">Lưu</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead><tr><th>#</th><th>Họ tên</th><th>Tài khoản</th><th>Vai trò</th><th>Thông tin thêm</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {paged.data.map((u) => (
              <tr key={u.id} className={u.locked ? 'row-locked' : ''}>
                <td>{u.id}</td>
                <td>{u.fullName}{u.id === me.id && <span className="tag"> Bạn</span>}</td>
                <td>{u.username || '—'}<div className="muted small">{u.email}</div></td>
                <td><span className="tag">{ROLES[u.role]}</span></td>
                <td className="small">
                  {u.role === 'shipper' && (
                    <>
                      {u.plate} · <Stars value={u.rating || 5} size={12} />{' '}
                      <button className={`pill ${u.online ? 'pill-on' : 'pill-off'}`} onClick={() => toggleOnline(u)}>
                        {u.online ? 'Online' : 'Offline'}
                      </button>
                    </>
                  )}
                  {u.role === 'merchant' && shopName(u.restaurantId)}
                </td>
                <td>
                  <button className={`pill ${u.locked ? 'pill-off' : 'pill-on'}`} onClick={() => toggleLock(u)}>
                    {u.locked ? '🔒 Đã khóa' : 'Hoạt động'}
                  </button>
                </td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...EMPTY, ...u, restaurantId: u.restaurantId || '' })}>Sửa</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(u)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} total={paged.total} />
      </div>
    </div>
  );
}
