import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { deliveryDistance } from '../geo.js';
import { useToast } from '../context/ToastContext.jsx';
import { discountPercent, isExpired } from '../utils.js';

const EMPTY_HOME_DATA = { categories: [], foods: [], restaurants: [], vouchers: [] };
const SIDE_SECTIONS = ['Đồ uống', 'Topping'];

export function useHomeData(location) {
  const [data, setData] = useState(EMPTY_HOME_DATA);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.get('/categories'),
      api.get('/foods'),
      api.get('/restaurants'),
      api.get('/vouchers?active=true'),
    ])
      .then(([categories, foods, restaurants, vouchers]) => setData({ categories, foods, restaurants, vouchers }))
      .catch((error) => toast(error.message, 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const homeData = useMemo(() => {
    const restaurants = data.restaurants.map((restaurant) => ({
      ...restaurant,
      distanceKm: deliveryDistance(restaurant, location),
    }));
    const shopById = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant]));
    const orderable = data.foods.filter((food) => food.available && shopById.get(food.restaurantId)?.isOpen);
    const liveVouchers = data.vouchers.filter((voucher) => !isExpired(voucher) && voucher.claimed < voucher.quantity);
    const saleFoods = orderable
      .filter((food) => discountPercent(food) > 0)
      .sort((a, b) => discountPercent(b) - discountPercent(a));
    const dealShops = restaurants
      .filter((restaurant) => restaurant.isOpen)
      .map((restaurant) => ({
        ...restaurant,
        voucher: liveVouchers.find((voucher) => voucher.restaurantId === restaurant.id),
        maxOff: Math.max(0, ...saleFoods
          .filter((food) => food.restaurantId === restaurant.id)
          .map(discountPercent)),
      }))
      .filter((restaurant) => restaurant.voucher || restaurant.maxOff)
      .sort((a, b) => b.rating - a.rating);

    return {
      shopById,
      saleFoods,
      dealShops,
      suggested: orderable
        .filter((food) => !SIDE_SECTIONS.includes(food.section))
        .sort((a, b) => b.sold - a.sold),
      banners: liveVouchers.filter((voucher) => !voucher.restaurantId),
    };
  }, [data, location]);

  return { data, loading, ...homeData };
}
