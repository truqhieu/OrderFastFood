import { formatPrice, voucherLabel } from '../utils.js';

export default function VoucherTicket({ voucher, restaurantName, children, dimmed, note }) {
  const remaining = Math.max(voucher.quantity - voucher.claimed, 0);
  const percentUsed = Math.min(100, Math.round((voucher.claimed / voucher.quantity) * 100));
  return (
    <div className={`ticket ${dimmed ? 'dimmed' : ''}`}>
      <div className={`ticket-left ${voucher.type}`}>
        <span className="ticket-icon">{voucher.type === 'freeship' ? '🛵' : '🎟️'}</span>
        <span className="ticket-scope">{voucher.restaurantId ? 'Của quán' : 'Toàn sàn'}</span>
      </div>
      <div className="ticket-body">
        <strong>{voucherLabel(voucher)}</strong>
        <span className="small">Đơn tối thiểu {formatPrice(voucher.minOrder)}</span>
        {restaurantName && <span className="small muted">Áp dụng: {restaurantName}</span>}
        <div className="ticket-progress" title={`Đã dùng ${percentUsed}%`}>
          <div style={{ width: percentUsed + '%' }} />
        </div>
        <span className="small muted">
          Mã {voucher.code} · Còn {remaining} lượt · HSD {new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}
        </span>
        {note && <span className="small text-error">{note}</span>}
      </div>
      {children && <div className="ticket-action">{children}</div>}
    </div>
  );
}
