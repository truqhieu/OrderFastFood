import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import OrderManager from './components/OrderManager.jsx';
import FoodManager from './components/FoodManager.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import Restaurant from './pages/Restaurant.jsx';
import Vouchers from './pages/Vouchers.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Cart from './pages/Cart.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Profile from './pages/Profile.jsx';
import ShipperHome from './pages/shipper/ShipperHome.jsx';
import MerchantLayout from './pages/merchant/MerchantLayout.jsx';
import MerchantStore from './pages/merchant/MerchantStore.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminRestaurants from './pages/admin/AdminRestaurants.jsx';
import AdminFoods from './pages/admin/AdminFoods.jsx';
import AdminVouchers from './pages/admin/AdminVouchers.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminCategories from './pages/admin/AdminCategories.jsx';
import AdminReviews from './pages/admin/AdminReviews.jsx';

function MerchantOrders() {
  const { user } = useAuth();
  return <OrderManager role="merchant" restaurantId={user.restaurantId} />;
}

function MerchantMenu() {
  const { user } = useAuth();
  return <FoodManager restaurantId={user.restaurantId} />;
}

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/restaurants/:id" element={<Restaurant />} />
          <Route path="/vouchers" element={<Vouchers />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<RequireAuth roles={['customer', 'admin']}><Orders /></RequireAuth>} />
          <Route path="/orders/:id" element={<RequireAuth><OrderDetail /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

          <Route path="/shipper" element={<RequireAuth roles={['shipper']}><ShipperHome /></RequireAuth>} />

          <Route path="/merchant" element={<RequireAuth roles={['merchant']}><MerchantLayout /></RequireAuth>}>
            <Route index element={<MerchantOrders />} />
            <Route path="menu" element={<MerchantMenu />} />
            <Route path="store" element={<MerchantStore />} />
          </Route>

          <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="restaurants" element={<AdminRestaurants />} />
            <Route path="foods" element={<AdminFoods />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="reviews" element={<AdminReviews />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">© 2026 FastFood · Đặt đồ ăn giao tận nơi · Hotline 1900 9999</footer>
    </>
  );
}
