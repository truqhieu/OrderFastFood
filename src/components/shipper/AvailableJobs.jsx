import Icon from '../Icon.jsx';
import Pagination from '../Pagination.jsx';
import ShipperRoute from './ShipperRoute.jsx';
import { formatPrice } from '../../utils.js';

const JOB_PAGE_SIZE = 5;

export default function AvailableJobs({
  user,
  active,
  jobs,
  jobsLoading,
  page,
  totalPages,
  claimingId,
  onPageChange,
  onAccept,
  paymentNote,
}) {
  const readyCount = jobs.length;
  const pagedJobs = jobs.slice((page - 1) * JOB_PAGE_SIZE, page * JOB_PAGE_SIZE);

  return (
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
      {user.online && !active && pagedJobs.map((order) => (
        <article key={order.id} className="card job-card">
          <div className="card-head">
            <strong>{order.restaurantName}</strong>
            <span className="price">+{formatPrice(order.shippingFee)}</span>
          </div>
          <ShipperRoute order={order} />
          <div className="job-meta">
            <span><Icon name="pin" size={14} /> {order.distanceKm} km</span>
            <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} món</span>
            <span>{paymentNote(order)}</span>
          </div>
          <button
            className="btn btn-primary btn-lg job-cta"
            disabled={claimingId === order.id}
            onClick={() => onAccept(order)}
          >
            {claimingId === order.id ? 'Đang nhận...' : 'Nhận đơn'}
          </button>
        </article>
      ))}
      {user.online && !active && (
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} total={readyCount} />
      )}
    </>
  );
}
