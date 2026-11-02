import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import usePaged from '../../hooks/usePaged.js';
import Pagination from '../../components/Pagination.jsx';
import { deleteVoucher, grantVoucher } from '../../services.js';
import { formatPrice, isExpired, voucherLabel } from '../../utils.js';

const EMPTY = {
  code: '', title: '', type: 'percent', value: '', maxDiscount: '', minOrder: '', restaurantId: 0, quantity: 100, expiresAt: '',
};
const TYPE_LABEL = { percent: 'Giảm %', fixed: 'Giảm tiền', freeship: 'Freeship' };

export default function AdminVouchers() {
  const toast = useToast();
  const { confirm, prompt } = useDialog();
  const [form, setForm] = useState(EMPTY);
  const [restaurants, setRestaurants] = useState([]);
  const paged = usePaged('/vouchers?_sort=id&_order=desc', 6);

  useEffect(() => {
    api.get('/restaurants').then(setRestaurants);
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const shopName = (id) => (id ? restaurants.find((r) => r.id === id)?.name : 'Toàn sàn');

  const create = async (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const value = Number(form.value) || 0;
    const quantity = Number(form.quantity) || 0;
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return toast('Mã gồm 3-20 ký tự chữ/số, không dấu', 'error');
    const dup = await api.get(`/vouchers?code=${code}`);
    if (dup.some((v) => v.id !== form.id)) return toast('Mã đã tồn tại', 'error');
    if (form.type === 'percent' && (value <= 0 || value > 100)) return toast('Phần trăm phải từ 1-100', 'error');
    if (form.type !== 'percent' && value <= 0) return toast('Giá trị phải > 0', 'error');
    if (quantity <= 0) return toast('Số lượng phải > 0', 'error');
    if (!form.expiresAt) return toast('Chọn ngày hết hạn', 'error');

    const data = {
      code,
      title: form.title.trim() || code,
      type: form.type,
      value,
      maxDiscount: form.type === 'percent' ? Number(form.maxDiscount) || 0 : 0,
      minOrder: Number(form.minOrder) || 0,
      restaurantId: Number(form.restaurantId) || 0,
      quantity,
      expiresAt: new Date(form.expiresAt + 'T23:59:59').toISOString(),
    };
    if (form.id) await api.patch(`/vouchers/${form.id}`, data);
    else await api.post('/vouchers', { ...data, claimed: 0, active: true });
    toast(form.id ? 'Đã cập nhật voucher' : 'Đã tạo voucher');
    setForm(EMPTY);
    paged.reload();
  };

  const toggle = async (v) => {
    await api.patch(`/vouchers/${v.id}`, { active: !v.active });
    paged.reload();
  };

  const edit = (v) => {
    const d = new Date(v.expiresAt);
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setForm({ ...EMPTY, ...v, expiresAt: local });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (v) => {
    if (!(await confirm({
      title: `Xoá voucher ${v.code}?`,
      message: 'Voucher chưa dùng trong ví người dùng cũng sẽ bị thu hồi.',
      confirmText: 'Xoá',
      danger: true,
    }))) return;
    await deleteVoucher(v.id);
    toast('Đã xóa voucher');
    paged.reload();
  };

  const grant = async (v) => {
    const email = await prompt({
      tone: 'gift',
      title: `Tặng voucher ${v.code}`,
      message: 'Nhập email tài khoản khách hàng nhận voucher.',
      placeholder: 'khachhang@email.com',
      inputType: 'email',
      required: true,
      confirmText: 'Tặng',
    });
    if (!email) return;
    try {
      const user = await grantVoucher(v.id, email);
      toast(`Đã tặng ${v.code} cho ${user.fullName}`);
      paged.reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div>
      <h2>Voucher</h2>
      <form className="card form" onSubmit={create}>
        <div className="card-head">
          <h3>{form.id ? `Sửa voucher ${form.code}` : 'Phát hành voucher mới'}</h3>
          {form.id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(EMPTY)}>Hủy sửa</button>}
        </div>
        <div className="row">
          <label>Mã<input className="input" value={form.code} onChange={set('code')} placeholder="SALE50" /></label>
          <label>Tiêu đề<input className="input" value={form.title} onChange={set('title')} placeholder="Siêu sale cuối tuần" /></label>
          <label>Phạm vi
            <select className="input" value={form.restaurantId} onChange={set('restaurantId')}>
              <option value={0}>Toàn sàn</option>
              {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
        </div>
        <div className="row">
          <label>Loại
            <select className="input" value={form.type} onChange={set('type')}>
              {Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label>{form.type === 'percent' ? 'Phần trăm (%)' : 'Số tiền (đ)'}
            <input className="input" type="number" value={form.value} onChange={set('value')} />
          </label>
          {form.type === 'percent' && (
            <label>Giảm tối đa (đ)<input className="input" type="number" value={form.maxDiscount} onChange={set('maxDiscount')} /></label>
          )}
          <label>Đơn tối thiểu (đ)<input className="input" type="number" value={form.minOrder} onChange={set('minOrder')} /></label>
        </div>
        <div className="row">
          <label>Số lượt phát hành<input className="input" type="number" value={form.quantity} onChange={set('quantity')} /></label>
          <label>Hết hạn<input className="input" type="date" value={form.expiresAt} onChange={set('expiresAt')} /></label>
          <div><button className="btn btn-primary">{form.id ? 'Lưu thay đổi' : 'Phát hành'}</button></div>
        </div>
      </form>

      <div className="card">
        <table className="table">
          <thead><tr><th>Mã</th><th>Ưu đãi</th><th>Phạm vi</th><th>Đơn tối thiểu</th><th>Đã lưu</th><th>HSD</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {paged.data.map((v) => (
              <tr key={v.id}>
                <td><strong>{v.code}</strong><div className="muted small">{v.title}</div></td>
                <td>{voucherLabel(v)}</td>
                <td>{shopName(v.restaurantId)}</td>
                <td>{formatPrice(v.minOrder)}</td>
                <td>{v.claimed}/{v.quantity}</td>
                <td className={isExpired(v) ? 'text-error' : ''}>{new Date(v.expiresAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button className={`pill ${v.active ? 'pill-on' : 'pill-off'}`} onClick={() => toggle(v)}>
                    {v.active ? 'Đang chạy' : 'Tạm dừng'}
                  </button>
                </td>
                <td className="actions">
                  <button className="btn btn-outline btn-sm" onClick={() => grant(v)}>🎁 Tặng</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => edit(v)}>Sửa</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(v)}>Xóa</button>
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
