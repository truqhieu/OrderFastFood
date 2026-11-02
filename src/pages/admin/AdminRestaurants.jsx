import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import usePaged from '../../hooks/usePaged.js';
import Pagination from '../../components/Pagination.jsx';
import Stars from '../../components/Stars.jsx';
import Icon from '../../components/Icon.jsx';
import LocationPicker from '../../components/LocationPicker.jsx';
import { DEFAULT_LOCATION, distanceKm } from '../../geo.js';

const EMPTY = {
  name: '', categoryId: '', icon: '🍽️', image: '', address: '', distanceKm: '', prepTime: 10,
  openHours: '08:00 - 22:00', description: '', isOpen: true,
};

export default function AdminRestaurants() {
  const toast = useToast();
  const { confirm } = useDialog();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null);
  const [pickingMap, setPickingMap] = useState(false);
  const [keyword, setKeyword] = useState('');
  const paged = usePaged(`/restaurants?${keyword ? `q=${encodeURIComponent(keyword)}&` : ''}_sort=id`, 6);

  useEffect(() => {
    api.get('/categories').then(setCategories);
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const distanceKm = Number(form.distanceKm);
    if (!form.name.trim() || !form.address.trim()) return toast('Nhập đủ tên và địa chỉ quán', 'error');
    if (!form.categoryId) return toast('Chọn danh mục', 'error');
    if (!(distanceKm > 0)) return toast('Khoảng cách phải > 0', 'error');
    const data = {
      ...form,
      name: form.name.trim(),
      address: form.address.trim(),
      categoryId: Number(form.categoryId),
      distanceKm,
      prepTime: Number(form.prepTime) || 10,
    };
    if (form.id) await api.patch(`/restaurants/${form.id}`, data);
    else await api.post('/restaurants', { ...data, rating: 5, ratingCount: 0 });
    toast('Đã lưu quán');
    setForm(null);
    paged.reload();
  };

  const remove = async (r) => {
    const foods = await api.get(`/foods?restaurantId=${r.id}`);
    if (!(await confirm({
      title: `Xoá quán "${r.name}"?`,
      message: `${foods.length} món ăn của quán cũng sẽ bị xoá.`,
      confirmText: 'Xoá quán',
      danger: true,
    }))) return;
    await Promise.all(foods.map((f) => api.delete(`/foods/${f.id}`)));
    await api.delete(`/restaurants/${r.id}`);
    toast('Đã xóa quán');
    paged.reload();
  };

  const toggle = async (r) => {
    await api.patch(`/restaurants/${r.id}`, { isOpen: !r.isOpen });
    paged.reload();
  };

  return (
    <div>
      <div className="card-head">
        <h2>Quán ăn</h2>
        <div className="actions">
          <input className="input input-sm" placeholder="Tìm quán..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setForm(EMPTY)}>+ Thêm quán</button>
        </div>
      </div>

      {form && pickingMap && (
        <LocationPicker
          initial={form.lat ? { lat: form.lat, lng: form.lng, address: form.address } : DEFAULT_LOCATION}
          onClose={() => setPickingMap(false)}
          onConfirm={(loc) => {
            setForm({ ...form, lat: loc.lat, lng: loc.lng, address: loc.address, distanceKm: distanceKm(DEFAULT_LOCATION, loc) || 0.3 });
            setPickingMap(false);
          }}
        />
      )}

      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <form className="card modal form" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{form.id ? 'Sửa quán' : 'Thêm quán mới'}</h3>
            <div className="row">
              <label>Tên quán<input className="input" value={form.name} onChange={set('name')} /></label>
              <label>Icon<input className="input" value={form.icon} onChange={set('icon')} /></label>
            </div>
            <div className="row">
              <label>Danh mục
                <select className="input" value={form.categoryId} onChange={set('categoryId')}>
                  <option value="">-- Chọn --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </label>
              <label>Khoảng cách (km)<input className="input" type="number" step="0.1" value={form.distanceKm} onChange={set('distanceKm')} /></label>
              <label>Chuẩn bị (phút)<input className="input" type="number" value={form.prepTime} onChange={set('prepTime')} /></label>
            </div>
            <div className="row">
              <label>Địa chỉ<input className="input" value={form.address} onChange={set('address')} /></label>
              <button type="button" className="btn btn-outline" onClick={() => setPickingMap(true)}>
                <Icon name="pin" size={16} /> {form.lat ? 'Đổi vị trí' : 'Chọn trên bản đồ'}
              </button>
            </div>
            {form.lat && <span className="muted small">Toạ độ: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span>}
            <div className="row">
              <label>Giờ mở cửa<input className="input" value={form.openHours} onChange={set('openHours')} /></label>
              <label>Ảnh (link)<input className="input" value={form.image} onChange={set('image')} /></label>
            </div>
            <label>Mô tả<textarea className="input" rows={2} value={form.description} onChange={set('description')} /></label>
            <label className="radio"><input type="checkbox" checked={form.isOpen} onChange={set('isOpen')} /> Đang mở cửa</label>
            <div className="actions">
              <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Hủy</button>
              <button className="btn btn-primary">Lưu</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead><tr><th>Quán</th><th>Danh mục</th><th>Đánh giá</th><th>Khoảng cách</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {paged.data.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/restaurants/${r.id}`}>{r.icon} {r.name}</Link><div className="muted small">{r.address}</div></td>
                <td>{categories.find((c) => c.id === r.categoryId)?.name}</td>
                <td><Stars value={r.rating} count={r.ratingCount} size={12} /></td>
                <td>{r.distanceKm} km</td>
                <td>
                  <button className={`pill ${r.isOpen ? 'pill-on' : 'pill-off'}`} onClick={() => toggle(r)}>
                    {r.isOpen ? 'Mở cửa' : 'Đóng cửa'}
                  </button>
                </td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...EMPTY, ...r })}>Sửa</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Xóa</button>
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
