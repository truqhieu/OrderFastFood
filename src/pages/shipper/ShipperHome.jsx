import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import usePaged from '../../hooks/usePaged.js';
import Pagination from '../../components/Pagination.jsx';
import Stars from '../../components/Stars.jsx';
import TrackingMap from '../../components/TrackingMap.jsx';
import { acceptOrder, completeOrder, getActiveShipperOrder, pickUpOrder } from '../../services.js';
import { formatDate, formatPrice, isToday, PAYMENT_METHODS } from '../../utils.js';

const POLL_MS = 5000;

function Route({ order }) {
  return (
    <div className="route">
      <div><span className="route-dot shop" /> <b>{order.restaurantName}</b><div className="muted small">{order.restaurantAddress}</div></div>
      <div><span className="route-dot home" /> <b>{order.customerName}</b><div className="muted small">{order.address}</div></div>
    </div>
  );
}

function ActiveOrder({ order, onChanged }) {
  const toast = useToast();
  const { confirm } = useDialog();
  const [busy, setBusy] = useState(false);

  const run = async (action, message) => {
    setBusy(true);
    try {
      await action(order);
      toast(message);
      onChanged();
    } catch (e) {
      toast(e.message, 'error');
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const isCod = order.paymentMethod === 'cod';

  return (
    <div className="card active-order">
      <div className="card-head">
        <h3>🚀 Đơn đang thực hiện · #{order.code}</h3>
        <span className="price">+{formatPrice(order.shippingFee)}</span>
      </div>
      <TrackingMap order={order} />
      <Route order={order} />
      <div className="items-box small">
        {order.items.map((i) => <div key={i.foodId}>{i.quantity}× {i.name}</div>)}
        {order.note && <div className="text-error">📝 {order.note}</div>}
      </div>
      <div className={`cod-box ${isCod ? '' : 'paid'}`}>
        {isCod ? <>💵 Thu hộ khách: <b>{formatPrice(order.total)}</b></> : <>✅ Khách đã thanh toán online ({PAYMENT_METHODS[order.paymentMethod]})</>}
      </div>
      <div className="actions">
        <a className="btn btn-ghost" href={`tel:${order.phone}`}>📞 Gọi khách</a>
        {order.status === 'picking' && (
          <button className="btn btn-primary" disabled={busy} onClick={() => run(pickUpOrder, 'Đã lấy hàng, bắt đầu giao!')}>
            ✅ Đã lấy hàng tại quán
          </button>
        )}
        {order.status === 'delivering' && (
          <button className="btn btn-success" disabled={busy}
            onClick={async () => {
              const ok = await confirm({
                title: 'Xác nhận đã giao hàng?',
                message: isCod ? `Nhớ thu đủ ${formatPrice(order.total)} tiền mặt từ khách.` : 'Đơn đã được khách thanh toán online.',
                confirmText: 'Đã giao',
              });
              if (ok) run(completeOrder, 'Giao hàng thành công! 🎉');
            }}>
            🏁 Đã giao thành công
          </button>
        )}
      </div>
    </div>
  );
}

export default function ShipperHome() {
  const { user, updateProfile, refreshUser } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('new');
  const [active, setActive] = useState(null);
  const [stats, setStats] = useState({ today: 0, todayCount: 0, total: 0, count: 0 });

  const available = usePaged(
    tab === 'new' && user.online && !active ? '/orders?status=preparing&shipperId=0&_sort=createdAt&_order=asc' : null,
    5,
    { pollMs: POLL_MS }
  );
  const history = usePaged(
    tab === 'history' ? `/orders?shipperId=${user.id}&status=completed&_sort=createdAt&_order=desc` : null,
    5
  );

  const loadActive = useCallback(async () => {
    setActive(await getActiveShipperOrder(user.id));
    const done = await api.get(`/orders?shipperId=${user.id}&status=completed`);
    const todays = done.filter((o) => isToday(o.history.at(-1).at));
    setStats({
      today: todays.reduce((s, o) => s + o.shippingFee, 0),
      todayCount: todays.length,
      total: done.reduce((s, o) => s + o.shippingFee, 0),
      count: done.length,
    });
  }, [user.id]);

  useEffect(() => {
    loadActive().catch((e) => toast(e.message, 'error'));
    refreshUser();
    const timer = setInterval(() => loadActive().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [loadActive]);

  const toggleOnline = async () => {
    if (user.online && active) return toast('Hãy hoàn thành đơn hiện tại trước khi tắt nhận đơn', 'error');
    await updateProfile({ online: !user.online });
    toast(user.online ? 'Đã tắt nhận đơn' : 'Bạn đang trực tuyến, sẵn sàng nhận đơn!');
  };

  const accept = async (order) => {
    try {
      await acceptOrder(order, user);
      toast('Nhận đơn thành công! Hãy đến quán lấy món.');
      await loadActive();
    } catch (e) {
      toast(e.message, 'error');
      available.reload();
    }
  };

  const onActiveChanged = async () => {
    await loadActive();
    history.reload();
  };

  return (
    <div className="shipper">
      <div className="card shipper-head">
        <div className="driver-avatar">🧑‍✈️</div>
        <div className="driver-info">
          <strong>{user.fullName}</strong>
          <span className="muted small">{user.vehicle} · <b className="plate">{user.plate}</b></span>
          <Stars value={user.rating || 5} count={user.ratingCount || 0} />
        </div>
        <button className={`online-toggle ${user.online ? 'on' : ''}`} onClick={toggleOnline}>
          <span className="knob" />
          {user.online ? 'Đang trực tuyến' : 'Ngoại tuyến'}
        </button>
      </div>

      <div className="stats">
        <div className="card stat"><span>Thu nhập hôm nay</span><strong>{formatPrice(stats.today)}</strong></div>
        <div className="card stat"><span>Chuyến hôm nay</span><strong>{stats.todayCount}</strong></div>
        <div className="card stat"><span>Tổng thu nhập</span><strong>{formatPrice(stats.total)}</strong></div>
        <div className="card stat"><span>Tổng chuyến</span><strong>{stats.count}</strong></div>
      </div>

      {active && <ActiveOrder order={active} onChanged={onActiveChanged} />}

      <div className="tabs">
        <button className={tab === 'new' ? 'tab active' : 'tab'} onClick={() => setTab('new')}>📡 Đơn mới</button>
        <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}>📜 Lịch sử chuyến</button>
      </div>

      {tab === 'new' && (
        <>
          {!user.online && (
            <div className="empty card"><div className="empty-icon">😴</div><p>Bạn đang ngoại tuyến. Bật trực tuyến để nhận đơn.</p></div>
          )}
          {user.online && active && <p className="muted center">Hoàn thành đơn hiện tại để nhận đơn mới.</p>}
          {user.online && !active && available.data.length === 0 && !available.loading && (
            <div className="empty card"><div className="empty-icon radar-icon">📡</div><p className="muted">Đang tìm đơn gần bạn...</p></div>
          )}
          {available.data.map((o) => (
            <div key={o.id} className="card job-card">
              <div className="card-head">
                <strong>{o.restaurantIcon} {o.restaurantName}</strong>
                <span className="price">+{formatPrice(o.shippingFee)}</span>
              </div>
              <Route order={o} />
              <div className="card-head">
                <span className="muted small">
                  📍 {o.distanceKm} km · {o.items.reduce((s, i) => s + i.quantity, 0)} món ·{' '}
                  {o.paymentMethod === 'cod' ? `Thu hộ ${formatPrice(o.total)}` : 'Đã thanh toán'}
                </span>
                <button className="btn btn-primary" onClick={() => accept(o)}>Nhận đơn</button>
              </div>
            </div>
          ))}
          <Pagination page={available.page} totalPages={available.totalPages} onChange={available.setPage} total={available.total} />
        </>
      )}

      {tab === 'history' && (
        <div className="card">
          {history.data.length === 0 && <p className="muted center">Chưa có chuyến nào.</p>}
          <table className="table">
            <thead><tr><th>Mã đơn</th><th>Quán → Khách</th><th>Hoàn thành</th><th>Thu nhập</th></tr></thead>
            <tbody>
              {history.data.map((o) => (
                <tr key={o.id}>
                  <td>#{o.code}</td>
                  <td>{o.restaurantName} → {o.customerName}</td>
                  <td>{formatDate(o.history.at(-1).at)}</td>
                  <td className="text-success">+{formatPrice(o.shippingFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={history.page} totalPages={history.totalPages} onChange={history.setPage} total={history.total} />
        </div>
      )}
    </div>
  );
}
