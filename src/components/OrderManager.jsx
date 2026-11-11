import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useDialog } from '../context/DialogContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import usePaged from '../hooks/usePaged.js';
import Pagination from './Pagination.jsx';
import StatusBadge from './StatusBadge.jsx';
import { assignShipper, cancelOrder, confirmOrder, deleteOrder, forceStatus } from '../services.js';
import { formatDate, formatPrice, ORDER_STATUS, PAYMENT_METHODS } from '../utils.js';

const POLL_MS = 8000;

function OrderAdminTools({ order, shippers, onAssignShipper, onChangeStatus, onRemove }) {
  return (
    <div className="admin-tools small">
      <span>Admin:</span>
      {['preparing', 'picking', 'delivering'].includes(order.status) && (
        <select className="input input-sm" value={order.shipperId || ''}
          onChange={(e) => onAssignShipper(order, Number(e.target.value))}>
          <option value="" disabled>Gán tài xế...</option>
          {shippers.map((shipper) => (
            <option key={shipper.id} value={shipper.id}>
              {shipper.online ? 'Online' : 'Offline'} · {shipper.fullName} · {shipper.plate}
            </option>
          ))}
        </select>
      )}
      <select className="input input-sm" value="" onChange={(e) => onChangeStatus(order, e.target.value)}>
        <option value="">Đổi trạng thái...</option>
        {Object.entries(ORDER_STATUS)
          .filter(([key]) => key !== order.status)
          .map(([key, status]) => <option key={key} value={key}>{status.label}</option>)}
      </select>
      <button className="btn btn-danger btn-sm" onClick={() => onRemove(order)}>Xóa đơn</button>
    </div>
  );
}

/** Order queue for a merchant (fixed restaurantId) or admin (all restaurants, filterable). */
export default function OrderManager({ restaurantId, role }) {
  const toast = useToast();
  const { confirm, prompt } = useDialog();
  const [status, setStatus] = useState('pending');
  const [shopFilter, setShopFilter] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [counts, setCounts] = useState({});
  const isAdmin = role === 'admin';

  const shopId = restaurantId || shopFilter;
  const query = [
    shopId && `restaurantId=${shopId}`,
    status !== 'all' && `status=${status}`,
    search && `q=${encodeURIComponent(search)}`,
    '_sort=createdAt&_order=desc',
  ]
    .filter(Boolean)
    .join('&');
  const paged = usePaged(`/orders?${query}`, 6, { pollMs: POLL_MS });

  useEffect(() => {
    if (!restaurantId) api.get('/restaurants').then(setRestaurants);
  }, [restaurantId]);

  useEffect(() => {
    if (isAdmin) api.get('/users?role=shipper').then(setShippers);
  }, [isAdmin, paged.data]);

  const changeStatus = async (order, next) => {
    if (!next) return;
    let reason = '';
    if (next === 'cancelled') {
      reason = await prompt({
        title: `Huỷ đơn #${order.code}`,
        message: 'Lý do sẽ được gửi tới khách hàng.',
        defaultValue: 'Quản trị viên hủy đơn',
        multiline: true,
        confirmText: 'Huỷ đơn',
        danger: true,
      });
      if (reason === null) return;
    } else if (!(await confirm({
      title: 'Đổi trạng thái đơn',
      message: `Chuyển đơn #${order.code} sang "${ORDER_STATUS[next].label}"?`,
      confirmText: 'Chuyển',
    }))) return;
    run(() => forceStatus(order, next, reason), `Đơn #${order.code}: ${ORDER_STATUS[next].label}`);
  };

  const remove = async (order) => {
    if (!(await confirm({
      title: 'Xoá đơn hàng',
      message: `Đơn #${order.code} sẽ bị xoá vĩnh viễn và không thể khôi phục.`,
      confirmText: 'Xoá',
      danger: true,
    }))) return;
    run(() => deleteOrder(order), `Đã xóa đơn #${order.code}`);
  };

  useEffect(() => {
    api.get(`/orders${shopId ? `?restaurantId=${shopId}` : ''}`).then((list) => {
      const c = { all: list.length };
      list.forEach((o) => (c[o.status] = (c[o.status] || 0) + 1));
      setCounts(c);
    });
  }, [shopId, paged.data]);

  const run = async (action, message) => {
    try {
      await action();
      toast(message);
    } catch (e) {
      toast(e.message, 'error');
    }
    paged.reload();
  };

  const reject = async (order) => {
    const reason = await prompt({
      title: `Từ chối đơn #${order.code}`,
      message: 'Lý do sẽ được gửi tới khách hàng.',
      defaultValue: 'Quán hết món',
      multiline: true,
      confirmText: 'Từ chối đơn',
      danger: true,
    });
    if (reason === null) return;
    run(() => cancelOrder(order, role, reason || 'Quán hủy đơn'), `Đã hủy đơn #${order.code}`);
  };

  const canCancel = (o) =>
    isAdmin ? !['completed', 'cancelled'].includes(o.status) : o.status === 'preparing' && !o.shipperId;

  return (
    <div>
      <div className="card-head">
        <h2>Quản lý đơn hàng</h2>
        <form className="actions" onSubmit={(e) => { e.preventDefault(); setSearch(keyword.trim()); }}>
          {!restaurantId && (
            <select className="input input-sm" value={shopFilter} onChange={(e) => setShopFilter(Number(e.target.value))}>
              <option value={0}>Tất cả quán</option>
              {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <input className="input input-sm" placeholder="Tìm mã đơn, tên, SĐT..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <button className="btn btn-ghost btn-sm">Tìm</button>
        </form>
      </div>

      <div className="tabs">
        <button className={status === 'all' ? 'tab active' : 'tab'} onClick={() => setStatus('all')}>Tất cả ({counts.all || 0})</button>
        {Object.entries(ORDER_STATUS).map(([key, s]) => (
          <button key={key} className={status === key ? 'tab active' : 'tab'} onClick={() => setStatus(key)}>
            {s.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {paged.data.length === 0 && !paged.loading && <p className="muted center">Không có đơn hàng.</p>}

      {paged.data.map((o) => (
        <div key={o.id} className={`card order-card ${o.status === 'pending' ? 'highlight' : ''}`}>
          <div className="card-head">
            <div>
              <strong>#{o.code}</strong> · {o.customerName} · {o.phone}
              {!restaurantId && <> · <b>{o.restaurantName}</b></>}
              <div className="muted small">{formatDate(o.createdAt)} · {PAYMENT_METHODS[o.paymentMethod]}</div>
            </div>
            <StatusBadge order={o} />
          </div>
          <div className="items-box small">
            {o.items.map((i) => <div key={i.foodId}>{i.quantity}× {i.name}</div>)}
            {o.note && <div className="text-error">{o.note}</div>}
          </div>
          {o.shipper && <p className="small">Tài xế: {o.shipper.fullName} · {o.shipper.phone} · {o.shipper.plate}</p>}
          {o.cancelReason && <p className="small text-error">Lý do hủy: {o.cancelReason}</p>}
          {isAdmin && (
            <OrderAdminTools
              order={o}
              shippers={shippers}
              onAssignShipper={(order, shipperId) => run(() => assignShipper(order, shipperId), 'Đã gán tài xế')}
              onChangeStatus={changeStatus}
              onRemove={remove}
            />
          )}
          <div className="card-head">
            <span>
              Tổng <strong className="price">{formatPrice(o.total)}</strong>
              <span className="muted small"> (món {formatPrice(o.subtotal)}{o.voucherCode && ` · voucher ${o.voucherCode}`})</span>
            </span>
            <div className="actions">
              <Link to={`/orders/${o.id}`} className="btn btn-ghost btn-sm">Chi tiết</Link>
              {o.status === 'pending' && (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => reject(o)}>Từ chối</button>
                  <button className="btn btn-primary btn-sm" onClick={() => run(() => confirmOrder(o), `Đã nhận đơn #${o.code}. Đang tìm tài xế.`)}>
                    Nhận đơn
                  </button>
                </>
              )}
              {o.status !== 'pending' && canCancel(o) && (
                <button className="btn btn-danger btn-sm" onClick={() => reject(o)}>Hủy đơn</button>
              )}
            </div>
          </div>
        </div>
      ))}
      <Pagination page={paged.page} totalPages={paged.totalPages} onChange={paged.setPage} total={paged.total} />
    </div>
  );
}
