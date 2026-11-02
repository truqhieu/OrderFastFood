import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const MAX_QTY = 20;
const EMPTY_CART = { restaurant: null, items: [] };

const pickRestaurant = (r) => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  address: r.address,
  distanceKm: r.distanceKm,
  lat: r.lat,
  lng: r.lng,
  prepTime: r.prepTime,
});

/** A cart belongs to exactly one restaurant, like ShopeeFood. */
export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart2') || 'null') || EMPTY_CART);

  useEffect(() => localStorage.setItem('cart2', JSON.stringify(cart)), [cart]);

  const isOtherRestaurant = (restaurantId) =>
    !!cart.restaurant && cart.items.length > 0 && cart.restaurant.id !== restaurantId;

  /** Caller must confirm with the user first when `isOtherRestaurant` is true; this replaces the cart. */
  const addItem = (food, restaurant, quantity = 1) => {
    setCart((prev) => {
      const sameShop = prev.restaurant?.id === restaurant.id;
      const items = sameShop ? prev.items : [];
      const existing = items.find((i) => i.foodId === food.id);
      const nextItems = existing
        ? items.map((i) => (i.foodId === food.id ? { ...i, quantity: Math.min(i.quantity + quantity, MAX_QTY) } : i))
        : [...items, { foodId: food.id, name: food.name, price: food.price, icon: food.icon, image: food.image, quantity }];
      return { restaurant: pickRestaurant(restaurant), items: nextItems };
    });
  };

  const updateQuantity = (foodId, quantity) => {
    setCart((prev) => {
      const items =
        quantity <= 0
          ? prev.items.filter((i) => i.foodId !== foodId)
          : prev.items.map((i) => (i.foodId === foodId ? { ...i, quantity: Math.min(quantity, MAX_QTY) } : i));
      return items.length ? { ...prev, items } : EMPTY_CART;
    });
  };

  const replaceItems = (items) => setCart((prev) => (items.length ? { ...prev, items } : EMPTY_CART));
  const clearCart = () => setCart(EMPTY_CART);
  const quantityOf = (foodId) => cart.items.find((i) => i.foodId === foodId)?.quantity || 0;

  const { count, subtotal } = useMemo(
    () => ({
      count: cart.items.reduce((s, i) => s + i.quantity, 0),
      subtotal: cart.items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    [cart.items]
  );

  return (
    <CartContext.Provider
      value={{
        restaurant: cart.restaurant,
        items: cart.items,
        count,
        subtotal,
        isOtherRestaurant,
        addItem,
        updateQuantity,
        replaceItems,
        clearCart,
        quantityOf,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
