import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import usePaged from '../../hooks/usePaged.js';
import Icon from '../../components/Icon.jsx';
import Pagination from '../../components/Pagination.jsx';
import RouteMap from '../../components/RouteMap.jsx';
import Stars from '../../components/Stars.jsx';
import { acceptOrder, completeOrder, getActiveShipperOrder, getOpenDeliveryJobs, pickUpOrder } from '../../services.js';
import { formatDate, formatPrice, isToday } from '../../utils.js';

const POLL_MS = 5000;
const JOB_PAGE_SIZE = 5;

function Route({ order }) {
  return (
    <div className="route">
      <div className="route-stop">
        <span className="route-dot shop" />
        <div>
          <span className="muted small">Lấy tại quán</span>
          <b>{order.restaurantName}</b>
          <div className="muted small">{order.restaurantAddress}</div>
        </div>
      </div>
      <div className="route-stop">
        <span className="route-dot home" />
        <div>
          <span className="muted small">Giao đến khách</span>
          <b>{order.customerName}</b>
          <div className="muted small">{order.address}</div>
        </div>
      </div>
    </div>
  );
}

function payNote(order) {
  return order.paymentMethod === 'cod'
    ? `Thu hộ ${formatPrice(order.total)}`
    : 'Khách đã thanh toán';
}

function hasCoords(order) {
  return order.restaurantLat && order.deliveryLat;
}

function ActiveOrder({ order, onChanged }) {
  const toast = useToast();
  const { confirm } = useDialog();
  const [busy, setBusy] = useState(false);
  const picking = order.status === 'picking';
  const isCod = order.paymentMethod === 'cod';

  const run = async (action, message) => {
    setBusy(true);
    try {
      await action(order);
      toast(message);
      await onChanged();
    } catch (e) {
      toast(e.message, 'error');
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  const confirmPickup = async () => {
    const ok = await confirm({
      title: 'Xác nhận đã lấy hàng?',
      message: `Bạn đang cầm món tại "${order.restaurantName}" và bắt đầu giao đến ${order.customerName}.`,
      confirmText: 'Đã lấy hàng',
    });
    if (ok) run(pickUpOrder, 'Đã lấy hàng. Hãy giao đến khách.');
  };

  const confirmDelivered = async () => {
    const ok = await confirm({
      title: 'Xác nhận đã giao hàng?',
      message: isCod ? `Nhớ thu đủ ${formatPrice(order.total)} tiền mặt từ khách.` : 'Đơn đã được khách thanh toán.',
      confirmText: 'Đã giao',
    });
    if (ok) run(completeOrder, 'Giao hàng thành công.');
  };

  return (
    <section className="card trip-card">
      <div className="trip-kicker">
        <span className="tag">{picking ? 'Đã nhận đơn' : 'Đang giao hàng'}</span>
        <span className="muted small">#{order.code}</span>
        <span className="price trip-fee">+{formatPrice(order.shippingFee)}</span>
      </div>
      <h3 className="trip-title">{picking ? 'Hãy đến quán lấy món' : 'Hãy giao đến khách'}</h3>
      <div className="trip-progress">
        <span className={picking ? 'on' : 'done'}>Lấy hàng</span>
        <span className="line" />
        <span className={picking ? '' : 'on'}>Giao hàng</span>
      </div>

      {hasCoords(order) && (
        <div className="trip-map">
          <RouteMap
            from={{ lat: order.restaurantLat, lng: order.restaurantLng }}
            to={{ lat: order.deliveryLat, lng: order.deliveryLng }}
            height={200}
            interactive
          />
        </div>
      )}

      <Route order={order} />

      <div className="items-box small">
        {order.items.map((i) => <div key={i.foodId}>{i.quantity}× {i.name}</div>)}
        {order.note && <div className="text-error">{order.note}</div>}
      </div>

      <div className={`cod-box ${isCod ? '' : 'paid'}`}>
        {isCod
          ? <>Thu hộ khách: <b>{formatPrice(order.total)}</b></>
          : <>Khách đã thanh toán · không thu thêm</>}
      </div>

      <div className="trip-actions">
        <a className="btn btn-ghost" href={`tel:${order.phone}`}>
          <Icon name="phone" size={16} /> Gọi khách
        </a>
        {picking ? (
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={confirmPickup}>
            Xác nhận đã lấy hàng
          </button>
        ) : (
          <button className="btn btn-success btn-lg" disabled={busy} onClick={confirmDelivered}>
            Xác nhận đã giao
          </button>
        )}
      </div>
    </section>
  );
}

export default function ShipperHome() {
  const { user, updateProfile, refreshUser } = useAuth();
  const toast = useToast();
  const { confirm } = useDialog();
  const [tab, setTab] = useState('new');
  const [active, setActive] = useState(null);
  const [stats, setStats] = useState({ today: 0, todayCount: 0, total: 0, count: 0 });
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobPage, setJobPage] = useState(1);
  const [claimingId, setClaimingId] = useState(0);

  const history = usePaged(
    tab === 'history' ? `/orders?shipperId=${user.id}&status=completed&_sort=createdAt&_order=desc` : null,
    5
  );

  const loadActive = useCallback(async () => {
    setActive(await getActiveShipperOrder(user.id));
    const done = await api.get(`/orders?shipperId=${user.id}&status=completed`);
    const list = Array.isArray(done) ? done : [];
    const lastAt = (o) => o.history?.at?.(-1)?.at || o.createdAt;
    const todays = list.filter((o) => isToday(lastAt(o)));
    setStats({
      today: todays.reduce((s, o) => s + (o.shippingFee || 0), 0),
      todayCount: todays.length,
      total: list.reduce((s, o) => s + (o.shippingFee || 0), 0),
      count: list.length,
    });
  }, [user.id]);

  const loadJobs = useCallback(async () => {
    if (!(tab === 'new' && user.online && !active)) {
      setJobs([]);
      setJobsLoading(false);
      return;
    }
    try {
      setJobs(await getOpenDeliveryJobs());
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setJobsLoading(false);
    }
  }, [tab, user.online, active, toast]);

  useEffect(() => {
    loadActive().catch((e) => toast(e.message, 'error'));
    refreshUser();
    const timer = setInterval(() => loadActive().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [loadActive]);

  useEffect(() => {
    loadJobs();
    if (!(tab === 'new' && user.online && !active)) return;
    const timer = setInterval(loadJobs, POLL_MS);
    return () => clearInterval(timer);
  }, [loadJobs, tab, user.online, active]);

  useEffect(() => {
    setJobPage(1);
  }, [jobs.length]);

  const toggleOnline = async () => {
    if (user.online && active) return toast('Hãy hoàn thành đơn hiện tại trước khi tắt nhận đơn', 'error');
    await updateProfile({ online: !user.online });
    toast(user.online ? 'Đã tắt nhận đơn' : 'Bạn đang trực tuyến, sẵn sàng nhận đơn!');
  };

  const accept = async (order) => {
    const ok = await confirm({
      title: 'Nhận đơn giao này?',
      message: [
        `${order.restaurantName} → ${order.customerName}`,
        `${order.distanceKm} km · ${payNote(order)}`,
        `Phí giao của bạn: +${formatPrice(order.shippingFee)}`,
        'Sau khi nhận, hãy đến quán lấy món rồi mới giao cho khách.',
      ].join('\n'),
      confirmText: 'Nhận đơn',
    });
    if (!ok) return;
    setClaimingId(order.id);
    try {
      await acceptOrder(order, user);
      toast('Đã nhận đơn. Hãy đến quán lấy món.');
      await loadActive();
      await loadJobs();
    } catch (e) {
      toast(e.message, 'error');
      loadJobs();
    } finally {
      setClaimingId(0);
    }
  };

  const onActiveChanged = async () => {
    await loadActive();
    history.reload();
  };

  const jobPages = Math.max(1, Math.ceil(jobs.length / JOB_PAGE_SIZE));
  const pagedJobs = jobs.slice((jobPage - 1) * JOB_PAGE_SIZE, jobPage * JOB_PAGE_SIZE);
  const readyCount = jobs.length;

  return (
    <div className="shipper">
      <div className="card shipper-head">
        <div className="driver-avatar letter">{user.fullName.charAt(0)}</div>
        <div className="driver-info">
          <strong>{user.fullName}</strong>
          <span className="muted small">{user.vehicle} · <b className="plate">{user.plate}</b></span>
          <Stars value={user.rating || 5} count={user.ratingCount || 0} />
        </div>
        <button type="button" className={`online-toggle ${user.online ? 'on' : ''}`} onClick={toggleOnline}>
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
        <button type="button" className={tab === 'new' ? 'tab active' : 'tab'} onClick={() => setTab('new')}>
          Đơn mới{user.online && !active && readyCount > 0 ? ` (${readyCount})` : ''}
        </button>
        <button type="button" className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}>
          Lịch sử chuyến
        </button>
      </div>

      {tab === 'new' && (
        <>
          {!user.online && (
            <div className="empty card">
              <p className="muted">Bạn đang ngoại tuyến. Bật trực tuyến để nhận đơn.</p>
            </div>
          )}
          {user.online && active && (
            <p className="muted center">Hoàn thành đơn đang làm rồi mới nhận đơn mới.</p>
          )}
          {user.online && !active && jobs.length === 0 && !jobsLoading && (
            <div className="empty card">
              <p className="muted">Chưa có đơn sẵn sàng. Đơn hiện sau khi quán xác nhận.</p>
            </div>
          )}
          {user.online && !active && pagedJobs.map((o) => (
            <article key={o.id} className="card job-card">
              <div className="card-head">
                <strong>{o.restaurantName}</strong>
                <span className="price">+{formatPrice(o.shippingFee)}</span>
              </div>
              <Route order={o} />
              <div className="job-meta">
                <span><Icon name="pin" size={14} /> {o.distanceKm} km</span>
                <span>{o.items.reduce((s, i) => s + i.quantity, 0)} món</span>
                <span>{payNote(o)}</span>
              </div>
              <button
                className="btn btn-primary btn-lg job-cta"
                disabled={claimingId === o.id}
                onClick={() => accept(o)}>
                {claimingId === o.id ? 'Đang nhận...' : 'Nhận đơn'}
              </button>
            </article>
          ))}
          {user.online && !active && (
            <Pagination page={jobPage} totalPages={jobPages} onChange={setJobPage} total={jobs.length} />
          )}
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
                  <td>{formatDate(o.history?.at?.(-1)?.at || o.createdAt)}</td>
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
