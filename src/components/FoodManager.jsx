import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useDialog } from '../context/DialogContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import usePaged from '../hooks/usePaged.js';
import FoodImage from './FoodImage.jsx';
import Pagination from './Pagination.jsx';
import { formatPrice } from '../utils.js';

const EMPTY = { name: '', section: '', price: '', originalPrice: '', icon: '🍔', image: '', description: '', available: true, restaurantId: '' };

function FoodFormModal({ form, restaurantId, restaurants, onClose, onChange, onSubmit }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="card modal form" onClick={(e) => e.stopPropagation()} onSubmit={onSubmit}>
        <h3>{form.id ? 'Sửa món' : 'Thêm món mới'}</h3>
        {!restaurantId && (
          <label>Quán
            <select className="input" value={form.restaurantId} onChange={onChange('restaurantId')}>
              <option value="">-- Chọn quán --</option>
              {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
            </select>
          </label>
        )}
        <label>Tên món<input className="input" value={form.name} onChange={onChange('name')} /></label>
        <div className="row">
          <label>Nhóm món<input className="input" placeholder="Món chính, Đồ uống..." value={form.section} onChange={onChange('section')} /></label>
          <label>Giá bán (đ)<input className="input" type="number" min="1000" step="1000" value={form.price} onChange={onChange('price')} /></label>
          <label>Giá gốc (nếu sale)<input className="input" type="number" min="0" step="1000" value={form.originalPrice || ''} onChange={onChange('originalPrice')} /></label>
          <label>Icon<input className="input" value={form.icon} onChange={onChange('icon')} /></label>
        </div>
        <label>Link ảnh (không bắt buộc)<input className="input" value={form.image} onChange={onChange('image')} placeholder="https://..." /></label>
        <label>Mô tả<textarea className="input" rows={2} value={form.description} onChange={onChange('description')} /></label>
        <label className="radio"><input type="checkbox" checked={form.available} onChange={onChange('available')} /> Đang bán</label>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary">Lưu</button>
        </div>
      </form>
    </div>
  );
}

/** Menu CRUD for a merchant (fixed restaurantId) or admin (pick restaurant). */
export default function FoodManager({ restaurantId }) {
  const toast = useToast();
  const { confirm } = useDialog();
  const [restaurants, setRestaurants] = useState([]);
  const [shopFilter, setShopFilter] = useState(0);
  const [form, setForm] = useState(null);

  const shopId = restaurantId || shopFilter;
  const paged = usePaged(`/foods?${shopId ? `restaurantId=${shopId}&` : ''}_sort=restaurantId,section`, 8);

  useEffect(() => {
    api.get('/restaurants').then(setRestaurants);
  }, []);

  const shopName = (id) => restaurants.find((r) => r.id === id)?.name || '—';
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    const price = Number(form.price);
    const ownerId = restaurantId || Number(form.restaurantId);
    if (!form.name.trim()) return toast('Tên món không được trống', 'error');
    if (!ownerId) return toast('Vui lòng chọn quán', 'error');
    if (!Number.isInteger(price) || price <= 0) return toast('Giá phải là số nguyên dương', 'error');
    const originalPrice = Number(form.originalPrice) || 0;
    if (originalPrice && originalPrice <= price) return toast('Giá gốc phải lớn hơn giá bán (để trống nếu không giảm giá)', 'error');

    const data = {
      restaurantId: ownerId,
      section: form.section.trim() || 'Món chính',
      name: form.name.trim(),
      price,
      originalPrice,
      icon: form.icon || '🍽️',
      image: form.image.trim(),
      description: form.description.trim(),
      available: form.available,
    };
    if (form.id) await api.patch(`/foods/${form.id}`, data);
    else await api.post('/foods', { ...data, sold: 0 });
    toast(form.id ? 'Đã cập nhật món' : 'Đã thêm món mới');
    setForm(null);
    paged.reload();
  };

  const toggle = async (f) => {
    await api.patch(`/foods/${f.id}`, { available: !f.available });
    paged.reload();
  };

  const remove = async (f) => {
    if (!(await confirm({ title: 'Xoá món ăn?', message: `"${f.name}" sẽ bị xoá khỏi thực đơn.`, confirmText: 'Xoá', danger: true }))) return;
    await api.delete(`/foods/${f.id}`);
    toast('Đã xóa món');
    paged.reload();
  };

  return (
    <div>
      <div className="card-head">
        <h2>Thực đơn</h2>
        <div className="actions">
          {!restaurantId && (
            <select className="input input-sm" value={shopFilter} onChange={(e) => setShopFilter(Number(e.target.value))}>
              <option value={0}>Tất cả quán</option>
              {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY, restaurantId: shopId || '' })}>+ Thêm món</button>
        </div>
      </div>

      {form && (
        <FoodFormModal
          form={form}
          restaurantId={restaurantId}
          restaurants={restaurants}
          onClose={() => setForm(null)}
          onChange={set}
          onSubmit={save}
        />
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr><th></th><th>Tên món</th>{!restaurantId && <th>Quán</th>}<th>Nhóm</th><th>Giá</th><th>Đã bán</th><th>Trạng thái</th><th></th></tr>
          </thead>
          <tbody>
            {paged.data.map((f) => (
              <tr key={f.id}>
                <td><FoodImage food={f} size="xs" /></td>
                <td>{f.name}</td>
                {!restaurantId && <td>{shopName(f.restaurantId)}</td>}
                <td>{f.section}</td>
                <td>
                  {formatPrice(f.price)}
                  {f.originalPrice > f.price && <s className="muted small"> {formatPrice(f.originalPrice)}</s>}
                </td>
                <td>{f.sold}</td>
                <td>
                  <button className={`pill ${f.available ? 'pill-on' : 'pill-off'}`} onClick={() => toggle(f)}>
                    {f.available ? 'Đang bán' : 'Hết món'}
                  </button>
                </td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...EMPTY, ...f })}>Sửa</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(f)}>Xóa</button>
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
