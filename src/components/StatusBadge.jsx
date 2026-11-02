import { ORDER_STATUS } from '../utils.js';

export default function StatusBadge({ order, status }) {
  const key = status || order.status;
  const s = ORDER_STATUS[key] || { label: key, color: '#6b7280' };
  const label = order && key === 'preparing' && !order.shipperId ? 'Đang chuẩn bị · tìm tài xế' : s.label;
  return (
    <span className="status" style={{ background: s.color + '1a', color: s.color }}>
      {label}
    </span>
  );
}
