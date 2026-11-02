import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Stars from '../../components/Stars.jsx';
import { formatPrice, isToday } from '../../utils.js';

export default function MerchantStore() {
  const { user } = useAuth();
  const toast = useToast();
  const [shop, setShop] = useState(null);
  const [form, setForm] = useState(null);
  const [stats, setStats] = useState({ today: 0, total: 0, count: 0 });

  useEffect(() => {
    api.get(`/restaurants/${user.restaurantId}`).then((r) => {
      setShop(r);
      setForm({ name: r.name, address: r.address, openHours: r.openHours, prepTime: r.prepTime, description: r.description, icon: r.icon, image: r.image });
    });
    api.get(`/orders?restaurantId=${user.restaurantId}&status=completed`).then((list) =>
      setStats({
        today: list.filter((o) => isToday(o.createdAt)).reduce((s, o) => s + o.subtotal, 0),
        total: list.reduce((s, o) => s + o.subtotal, 0),
        count: list.length,
      })
    );
  }, [user.restaurantId]);

  if (!shop) return <p className="muted center">Đang tải...</p>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const toggleOpen = async () => {
    setShop(await api.patch(`/restaurants/${shop.id}`, { isOpen: !shop.isOpen }));
    toast(shop.isOpen ? 'Quán đã tạm đóng' : 'Quán đã mở cửa nhận đơn');
  };

  const save = async (e) => {
    e.preventDefault();
    setShop(await api.patch(`/restaurants/${shop.id}`, { ...form, prepTime: Number(form.prepTime) || 10 }));
    toast('Đã lưu thông tin quán');
  };

  return (
    <div>
      <div className="card shipper-head">
        <div className="driver-avatar">{shop.icon}</div>
        <div className="driver-info">
          <strong>{shop.name}</strong>
          <Stars value={shop.rating} count={shop.ratingCount} />
        </div>
        <button className={`online-toggle ${shop.isOpen ? 'on' : ''}`} onClick={toggleOpen}>
          <span className="knob" /> {shop.isOpen ? 'Đang mở cửa' : 'Đang đóng cửa'}
        </button>
      </div>
      <div className="stats">
        <div className="card stat"><span>Doanh thu hôm nay</span><strong>{formatPrice(stats.today)}</strong></div>
        <div className="card stat"><span>Tổng doanh thu</span><strong>{formatPrice(stats.total)}</strong></div>
        <div className="card stat"><span>Đơn hoàn thành</span><strong>{stats.count}</strong></div>
        <div className="card stat"><span>Đánh giá</span><strong>{shop.rating} ⭐</strong></div>
      </div>
      <form className="card form" onSubmit={save}>
        <h3>Thông tin quán</h3>
        <div className="row">
          <label>Tên quán<input className="input" required value={form.name} onChange={set('name')} /></label>
          <label>Icon<input className="input" value={form.icon} onChange={set('icon')} /></label>
        </div>
        <label>Địa chỉ<input className="input" required value={form.address} onChange={set('address')} /></label>
        <div className="row">
          <label>Giờ mở cửa<input className="input" value={form.openHours} onChange={set('openHours')} /></label>
          <label>Thời gian chuẩn bị (phút)<input className="input" type="number" value={form.prepTime} onChange={set('prepTime')} /></label>
        </div>
        <label>Ảnh bìa (link)<input className="input" value={form.image} onChange={set('image')} /></label>
        <label>Mô tả<textarea className="input" rows={2} value={form.description} onChange={set('description')} /></label>
        <div><button className="btn btn-primary">Lưu thay đổi</button></div>
      </form>
    </div>
  );
}
