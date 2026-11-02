import { formatPrice } from '../utils.js';

export default function OrderSummary({ totals, distanceKm }) {
  return (
    <div className="summary">
      <div><span>Tạm tính</span><span>{formatPrice(totals.subtotal)}</span></div>
      <div>
        <span>Phí giao hàng{distanceKm ? ` (${distanceKm} km)` : ''}</span>
        <span>{formatPrice(totals.shippingFee)}</span>
      </div>
      {totals.discount > 0 && (
        <div className="text-success"><span>Voucher giảm</span><span>−{formatPrice(totals.discount)}</span></div>
      )}
      <div className="summary-total"><span>Tổng cộng</span><span>{formatPrice(totals.total)}</span></div>
    </div>
  );
}
