import Pagination from '../Pagination.jsx';
import { formatDate, formatPrice } from '../../utils.js';

export default function DeliveryHistory({ history }) {
  return (
    <div className="card">
      {history.data.length === 0 && <p className="muted center">Chưa có chuyến nào.</p>}
      <table className="table">
        <thead>
          <tr><th>Mã đơn</th><th>Quán → Khách</th><th>Hoàn thành</th><th>Thu nhập</th></tr>
        </thead>
        <tbody>
          {history.data.map((order) => (
            <tr key={order.id}>
              <td>#{order.code}</td>
              <td>{order.restaurantName} → {order.customerName}</td>
              <td>{formatDate(order.history?.at?.(-1)?.at || order.createdAt)}</td>
              <td className="text-success">+{formatPrice(order.shippingFee)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        page={history.page}
        totalPages={history.totalPages}
        onChange={history.setPage}
        total={history.total}
      />
    </div>
  );
}
