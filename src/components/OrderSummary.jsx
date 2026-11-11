import { formatPrice } from '../utils.js';

function SummaryRow({ label, value, className }) {
  return (
    <div className={className}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function OrderSummary({ totals, distanceKm }) {
  return (
    <div className="summary">
      <SummaryRow label="Tạm tính" value={formatPrice(totals.subtotal)} />
      <SummaryRow
        label={`Phí giao hàng${distanceKm ? ` (${distanceKm} km)` : ''}`}
        value={formatPrice(totals.shippingFee)}
      />
      {totals.discount > 0 && (
        <SummaryRow className="text-success" label="Voucher giảm" value={`−${formatPrice(totals.discount)}`} />
      )}
      <SummaryRow className="summary-total" label="Tổng cộng" value={formatPrice(totals.total)} />
    </div>
  );
}
