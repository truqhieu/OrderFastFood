export const formatPrice = (n) => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';

export const formatDate = (iso) =>
  new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const isToday = (iso) => new Date(iso).toDateString() === new Date().toDateString();

export const ROLES = {
  customer: 'Khách hàng',
  shipper: 'Tài xế',
  merchant: 'Chủ quán',
  admin: 'Quản trị viên',
};

/** Roles allowed to order food and own vouchers; admin can do everything a customer can. */
export const CAN_ORDER_ROLES = ['customer', 'admin'];
export const canOrder = (user) => !user || CAN_ORDER_ROLES.includes(user.role);

export const HOME_BY_ROLE = { admin: '/admin', shipper: '/shipper', merchant: '/merchant', customer: '/' };

export const ORDER_STATUS = {
  pending: { label: 'Chờ quán xác nhận', color: '#f59e0b' },
  preparing: { label: 'Đang chuẩn bị · tìm tài xế', color: '#8b5cf6' },
  picking: { label: 'Tài xế đang đến quán', color: '#3b82f6' },
  delivering: { label: 'Đang giao hàng', color: '#0891b2' },
  completed: { label: 'Đã giao', color: '#16a34a' },
  cancelled: { label: 'Đã hủy', color: '#dc2626' },
};

export const STATUS_TOAST = {
  preparing: 'Quán đã nhận đơn, đang tìm tài xế',
  picking: 'Tài xế đang đến quán lấy món',
  delivering: 'Tài xế đang giao đến bạn',
  completed: 'Giao hàng thành công',
  cancelled: 'Đơn hàng đã bị hủy',
};

export const STATUS_FLOW = ['pending', 'preparing', 'picking', 'delivering', 'completed'];
export const ACTIVE_STATUSES = ['pending', 'preparing', 'picking', 'delivering'];

export const PAYMENT_METHODS = {
  cod: 'Tiền mặt khi nhận hàng',
  ewallet: 'Ví điện tử',
  banking: 'Chuyển khoản ngân hàng',
};

/** 15k for the first 3km, then 5k per extra km (rounded up). */
export const calcShippingFee = (distanceKm) =>
  distanceKm <= 3 ? 15000 : 15000 + Math.ceil(distanceKm - 3) * 5000;

export const deliveryMinutes = (distanceKm) => Math.max(5, Math.round(distanceKm * 4));

export const estimateMinutes = (restaurant) =>
  (restaurant.prepTime || 10) + deliveryMinutes(restaurant.distanceKm || 1);

export const isExpired = (v) => !!v.expiresAt && new Date(v.expiresAt) < new Date();

export const voucherLabel = (v) => {
  if (v.type === 'percent')
    return `Giảm ${v.value}%${v.maxDiscount ? ` tối đa ${v.maxDiscount / 1000}k` : ''}`;
  if (v.type === 'fixed') return `Giảm ${v.value / 1000}k`;
  return `Miễn phí ship tối đa ${v.value / 1000}k`;
};

/**
 * Returns the discount amount, or throws with a user-facing reason why the voucher can't be used.
 */
export function evaluateVoucher(voucher, { subtotal, shippingFee, restaurantId }) {
  if (!voucher || !voucher.active) throw new Error('Voucher không còn hiệu lực');
  if (isExpired(voucher)) throw new Error('Voucher đã hết hạn');
  if (voucher.restaurantId && voucher.restaurantId !== restaurantId)
    throw new Error('Chỉ áp dụng cho quán khác');
  if (subtotal < voucher.minOrder) throw new Error(`Đơn tối thiểu ${formatPrice(voucher.minOrder)}`);

  if (voucher.type === 'freeship') return Math.min(shippingFee, voucher.value);
  let discount = voucher.type === 'percent' ? Math.round((subtotal * voucher.value) / 100) : voucher.value;
  if (voucher.maxDiscount > 0) discount = Math.min(discount, voucher.maxDiscount);
  return Math.min(discount, subtotal);
}

export function calcTotals({ subtotal, distanceKm, voucher, restaurantId }) {
  const shippingFee = subtotal > 0 ? calcShippingFee(distanceKm) : 0;
  let discount = 0;
  if (voucher) {
    try {
      discount = evaluateVoucher(voucher, { subtotal, shippingFee, restaurantId });
    } catch {
      discount = 0;
    }
  }
  return { subtotal, shippingFee, discount, total: Math.max(subtotal + shippingFee - discount, 0) };
}

export const averageRating = (current, count, added) =>
  Math.round(((current * count + added) / (count + 1)) * 10) / 10;

export const generateOrderCode = () => 'SF' + Date.now().toString().slice(-8);

export const discountPercent = (food) =>
  food.originalPrice > food.price ? Math.round((1 - food.price / food.originalPrice) * 100) : 0;

/** Lowercase and strip Vietnamese diacritics so "ga ran" matches "Gà rán". */
export const normalizeText = (s = '') =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

export const paginate = (list, page, limit) => list.slice((page - 1) * limit, page * limit);
