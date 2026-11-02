import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { canOrder } from '../utils.js';

/** Resolves true when the cart is free for `restaurant`, asking before discarding another shop's items. */
export function useConfirmReplaceCart() {
  const cart = useCart();
  const { confirm } = useDialog();
  return (restaurant) =>
    !cart.isOtherRestaurant(restaurant.id) ||
    confirm({
      tone: 'warning',
      title: 'Đổi quán?',
      message: `Giỏ hàng đang có món của "${cart.restaurant.name}". Thêm món của "${restaurant.name}" sẽ xoá các món đó.`,
      confirmText: 'Xoá giỏ & thêm',
    });
}

/** Adds a dish to the cart from anywhere, enforcing the one-restaurant-per-cart rule. */
export default function useAddToCart() {
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const confirmReplace = useConfirmReplaceCart();

  return async (food, restaurant) => {
    if (!canOrder(user)) return toast('Tài khoản này không thể đặt món', 'error');
    if (!restaurant?.isOpen) return toast(`${restaurant?.name || 'Quán'} đang đóng cửa`, 'error');
    if (!food.available) return toast('Món này đã hết', 'error');
    if (!(await confirmReplace(restaurant))) return;
    cart.addItem(food, restaurant);
    toast(`Đã thêm "${food.name}" vào giỏ`);
  };
}
