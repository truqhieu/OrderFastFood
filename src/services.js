import { api } from './api.js';
import { averageRating, calcTotals, evaluateVoucher, formatPrice, generateOrderCode, isExpired } from './utils.js';
import { deliveryDistance, MAX_DELIVERY_KM, shopPosition } from './geo.js';

const now = () => new Date().toISOString();

/* ---------------- Vouchers ---------------- */

export async function claimVoucher(user, voucherId) {
  const voucher = await api.get(`/vouchers/${voucherId}`);
  if (!voucher.active || isExpired(voucher)) throw new Error('Voucher đã hết hạn');
  if (voucher.claimed >= voucher.quantity) throw new Error('Voucher đã hết lượt');
  const owned = await api.get(`/userVouchers?userId=${user.id}&voucherId=${voucherId}`);
  if (owned.length) throw new Error('Bạn đã lưu voucher này rồi');

  await api.patch(`/vouchers/${voucherId}`, { claimed: voucher.claimed + 1 });
  return api.post('/userVouchers', {
    userId: user.id,
    voucherId,
    used: false,
    orderId: 0,
    claimedAt: now(),
  });
}

/** User's saved vouchers joined with voucher details. */
export async function getMyVouchers(userId) {
  const [owned, vouchers] = await Promise.all([
    api.get(`/userVouchers?userId=${userId}&_sort=claimedAt&_order=desc`),
    api.get('/vouchers'),
  ]);
  const byId = new Map(vouchers.map((v) => [v.id, v]));
  return owned.filter((uv) => byId.has(uv.voucherId)).map((uv) => ({ ...uv, voucher: byId.get(uv.voucherId) }));
}

/* ---------------- Orders ---------------- */

export class CartChangedError extends Error {
  constructor(message, syncedItems) {
    super(message);
    this.syncedItems = syncedItems;
  }
}

export async function placeOrder({ user, restaurantId, items, form, userVoucherId }) {
  const [restaurant, foods] = await Promise.all([
    api.get(`/restaurants/${restaurantId}`),
    api.get(`/foods?restaurantId=${restaurantId}`),
  ]);
  if (!restaurant.isOpen) throw new Error(`${restaurant.name} hiện đã đóng cửa`);
  if (!form.lat || !form.lng) throw new Error('Vui lòng chọn vị trí giao hàng trên bản đồ');
  const distanceKm = deliveryDistance(restaurant, form);
  if (distanceKm > MAX_DELIVERY_KM) throw new Error(`Địa chỉ cách quán ${distanceKm} km, ngoài phạm vi giao hàng`);

  const byId = new Map(foods.map((f) => [f.id, f]));
  const problems = [];
  const synced = [];
  for (const item of items) {
    const food = byId.get(item.foodId);
    if (!food || !food.available) {
      problems.push(`"${item.name}" đã hết món`);
      continue;
    }
    if (food.price !== item.price)
      problems.push(`"${item.name}" đổi giá ${formatPrice(item.price)} → ${formatPrice(food.price)}`);
    synced.push({ ...item, name: food.name, price: food.price });
  }
  if (problems.length) throw new CartChangedError('Giỏ hàng đã được cập nhật: ' + problems.join('; '), synced);

  const subtotal = synced.reduce((s, i) => s + i.price * i.quantity, 0);
  let voucher = null;
  if (userVoucherId) {
    const uv = await api.get(`/userVouchers/${userVoucherId}`);
    if (uv.used || uv.userId !== user.id) throw new Error('Voucher đã được sử dụng');
    voucher = await api.get(`/vouchers/${uv.voucherId}`);
    const shippingFee = calcTotals({ subtotal, distanceKm }).shippingFee;
    evaluateVoucher(voucher, { subtotal, shippingFee, restaurantId });
  }

  const totals = calcTotals({ subtotal, distanceKm, voucher, restaurantId });
  const shop = shopPosition(restaurant);
  const createdAt = now();
  const order = await api.post('/orders', {
    code: generateOrderCode(),
    userId: user.id,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    restaurantIcon: restaurant.icon,
    restaurantLat: shop.lat,
    restaurantLng: shop.lng,
    distanceKm,
    prepTime: restaurant.prepTime,
    customerName: form.customerName.trim(),
    phone: form.phone.trim(),
    address: [form.addressDetail?.trim(), form.address.trim()].filter(Boolean).join(', '),
    deliveryLat: form.lat,
    deliveryLng: form.lng,
    note: form.note.trim(),
    paymentMethod: form.paymentMethod,
    items: synced,
    ...totals,
    voucherCode: voucher?.code || '',
    userVoucherId: userVoucherId || 0,
    status: 'pending',
    shipperId: 0,
    shipper: null,
    reviewed: false,
    createdAt,
    history: [{ status: 'pending', at: createdAt }],
  });

  if (userVoucherId) await api.patch(`/userVouchers/${userVoucherId}`, { used: true, orderId: order.id });
  return order;
}

/** Moves an order to a new status only if it is still in one of the expected statuses. */
async function transition(orderId, expected, status, extra = {}) {
  const fresh = await api.get(`/orders/${orderId}`);
  if (!expected.includes(fresh.status)) throw new Error('Đơn hàng đã thay đổi trạng thái, vui lòng tải lại');
  return api.patch(`/orders/${orderId}`, {
    status,
    ...extra,
    history: [...fresh.history, { status, at: now() }],
  });
}

export const confirmOrder = (order) => transition(order.id, ['pending'], 'preparing');

const CANCELLABLE_BY = {
  customer: ['pending'],
  merchant: ['pending', 'preparing'],
  admin: ['pending', 'preparing', 'picking', 'delivering'],
};

export async function cancelOrder(order, role, reason) {
  const updated = await transition(order.id, CANCELLABLE_BY[role] || [], 'cancelled', { cancelReason: reason });
  if (updated.userVoucherId) {
    await api.patch(`/userVouchers/${updated.userVoucherId}`, { used: false, orderId: 0 });
  }
  return updated;
}

export async function getActiveShipperOrder(shipperId) {
  const list = await api.get(`/orders?shipperId=${shipperId}&status=picking&status=delivering`);
  return list[0] || null;
}

export async function acceptOrder(order, shipper) {
  if (!shipper.online) throw new Error('Bạn cần bật trạng thái trực tuyến để nhận đơn');
  if (await getActiveShipperOrder(shipper.id)) throw new Error('Bạn đang có đơn chưa hoàn thành');
  const fresh = await api.get(`/orders/${order.id}`);
  if (fresh.shipperId) throw new Error('Đơn đã có tài xế khác nhận');
  return transition(order.id, ['preparing'], 'picking', { shipperId: shipper.id, shipper: shipperSnapshot(shipper) });
}

const shipperSnapshot = (s) => ({
  id: s.id,
  fullName: s.fullName,
  phone: s.phone,
  vehicle: s.vehicle,
  plate: s.plate,
  rating: s.rating,
});

export const pickUpOrder = (order) => transition(order.id, ['picking'], 'delivering');

async function adjustSold(items, sign) {
  await Promise.all(
    items.map(async (i) => {
      const food = await api.get(`/foods/${i.foodId}`).catch(() => null);
      if (food) await api.patch(`/foods/${i.foodId}`, { sold: Math.max((food.sold || 0) + sign * i.quantity, 0) });
    })
  );
}

export async function completeOrder(order) {
  const updated = await transition(order.id, ['delivering'], 'completed');
  await adjustSold(updated.items, 1);
  return updated;
}

/* ---------------- Admin overrides ---------------- */

/** Admin assigns (or reassigns) a shipper; a preparing order moves to "picking". */
export async function assignShipper(order, shipperId) {
  const [fresh, shipper] = await Promise.all([api.get(`/orders/${order.id}`), api.get(`/users/${shipperId}`)]);
  if (shipper.role !== 'shipper') throw new Error('Người được chọn không phải tài xế');
  if (!['preparing', 'picking', 'delivering'].includes(fresh.status))
    throw new Error('Chỉ gán tài xế cho đơn đang chuẩn bị hoặc đang giao');
  const busy = await getActiveShipperOrder(shipperId);
  if (busy && busy.id !== order.id) throw new Error(`${shipper.fullName} đang chạy đơn #${busy.code}`);

  const patch = { shipperId, shipper: shipperSnapshot(shipper) };
  if (fresh.status === 'preparing') {
    patch.status = 'picking';
    patch.history = [...fresh.history, { status: 'picking', at: now() }];
  }
  return api.patch(`/orders/${order.id}`, patch);
}

/** Admin sets any status, keeping voucher usage and sold counters consistent. */
export async function forceStatus(order, status, reason = '') {
  const fresh = await api.get(`/orders/${order.id}`);
  if (fresh.status === status) return fresh;
  if (['picking', 'delivering', 'completed'].includes(status) && !fresh.shipperId)
    throw new Error('Hãy gán tài xế trước khi chuyển sang trạng thái này');

  const patch = { status, history: [...fresh.history, { status, at: now() }] };
  if (status === 'cancelled') patch.cancelReason = reason || 'Quản trị viên hủy đơn';
  if (['pending', 'preparing'].includes(status)) Object.assign(patch, { shipperId: 0, shipper: null });
  const updated = await api.patch(`/orders/${order.id}`, patch);

  if (fresh.userVoucherId) {
    if (status === 'cancelled')
      await api.patch(`/userVouchers/${fresh.userVoucherId}`, { used: false, orderId: 0 });
    else if (fresh.status === 'cancelled')
      await api.patch(`/userVouchers/${fresh.userVoucherId}`, { used: true, orderId: fresh.id }).catch(() => {});
  }
  if (status === 'completed') await adjustSold(fresh.items, 1);
  if (fresh.status === 'completed') await adjustSold(fresh.items, -1);
  return updated;
}

export async function deleteOrder(order) {
  if (order.userVoucherId && order.status !== 'completed') {
    await api.patch(`/userVouchers/${order.userVoucherId}`, { used: false, orderId: 0 }).catch(() => {});
  }
  await api.delete(`/orders/${order.id}`);
}

/** Admin gives a voucher directly to a user, bypassing the quantity limit. */
export async function grantVoucher(voucherId, email) {
  const [user] = await api.get(`/users?email=${encodeURIComponent(email.trim().toLowerCase())}`);
  if (!user) throw new Error('Không tìm thấy người dùng với email này');
  const owned = await api.get(`/userVouchers?userId=${user.id}&voucherId=${voucherId}`);
  if (owned.some((o) => !o.used)) throw new Error(`${user.fullName} đã có voucher này trong ví`);
  const voucher = await api.get(`/vouchers/${voucherId}`);
  await api.patch(`/vouchers/${voucherId}`, { claimed: voucher.claimed + 1 });
  await api.post('/userVouchers', { userId: user.id, voucherId, used: false, orderId: 0, claimedAt: now() });
  return user;
}

export async function deleteVoucher(voucherId) {
  const owned = await api.get(`/userVouchers?voucherId=${voucherId}&used=false`);
  await Promise.all(owned.map((o) => api.delete(`/userVouchers/${o.id}`)));
  await api.delete(`/vouchers/${voucherId}`);
}

export async function deleteReview(review) {
  const restaurant = await api.get(`/restaurants/${review.restaurantId}`).catch(() => null);
  if (restaurant && restaurant.ratingCount > 0) {
    const count = restaurant.ratingCount - 1;
    const rating = count === 0 ? 5 : Math.round(((restaurant.rating * restaurant.ratingCount - review.rating) / count) * 10) / 10;
    await api.patch(`/restaurants/${restaurant.id}`, { rating: Math.min(Math.max(rating, 1), 5), ratingCount: count });
  }
  if (review.orderId) await api.patch(`/orders/${review.orderId}`, { reviewed: false }).catch(() => {});
  await api.delete(`/reviews/${review.id}`);
}

/* ---------------- Reviews ---------------- */

export async function submitReview(order, user, { rating, comment, shipperRating }) {
  const fresh = await api.get(`/orders/${order.id}`);
  if (fresh.reviewed) throw new Error('Đơn này đã được đánh giá');

  await api.post('/reviews', {
    orderId: order.id,
    restaurantId: order.restaurantId,
    userId: user.id,
    userName: user.fullName,
    rating,
    comment: comment.trim(),
    items: order.items.map((i) => i.name),
    shipperId: order.shipperId,
    shipperRating,
    createdAt: now(),
  });

  const restaurant = await api.get(`/restaurants/${order.restaurantId}`).catch(() => null);
  if (restaurant) {
    await api.patch(`/restaurants/${restaurant.id}`, {
      rating: averageRating(restaurant.rating, restaurant.ratingCount, rating),
      ratingCount: restaurant.ratingCount + 1,
    });
  }
  if (order.shipperId && shipperRating) {
    const shipper = await api.get(`/users/${order.shipperId}`).catch(() => null);
    if (shipper) {
      await api.patch(`/users/${shipper.id}`, {
        rating: averageRating(shipper.rating || 5, shipper.ratingCount || 0, shipperRating),
        ratingCount: (shipper.ratingCount || 0) + 1,
      });
    }
  }
  return api.patch(`/orders/${order.id}`, { reviewed: true });
}
