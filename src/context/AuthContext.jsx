import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

const stripPassword = ({ password, ...rest }) => rest;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  const saveUser = useCallback((u) => {
    setUser(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  }, []);

  const login = async (email, password) => {
    const users = await api.get(`/users?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    const found = users[0];
    if (!found || found.password !== password) throw new Error('Email hoặc mật khẩu không đúng');
    if (found.locked) throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    const safe = stripPassword(found);
    saveUser(safe);
    return safe;
  };

  const register = async ({ fullName, email, phone, password, address, role, vehicle, plate }) => {
    const normalized = email.trim().toLowerCase();
    const existed = await api.get(`/users?email=${encodeURIComponent(normalized)}`);
    if (existed.length) throw new Error('Email đã được sử dụng');
    const data = {
      fullName: fullName.trim(),
      email: normalized,
      phone: phone.trim(),
      address: address.trim(),
      password,
      role: role === 'shipper' ? 'shipper' : 'customer',
    };
    if (data.role === 'shipper') {
      Object.assign(data, { vehicle: vehicle.trim(), plate: plate.trim().toUpperCase(), online: false, rating: 5, ratingCount: 0 });
    }
    const safe = stripPassword(await api.post('/users', data));
    saveUser(safe);
    return safe;
  };

  const updateProfile = async (data) => {
    const updated = await api.patch(`/users/${user.id}`, data);
    saveUser(stripPassword(updated));
  };

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const fresh = await api.get(`/users/${user.id}`).catch((e) => (e.message.includes('Không tìm thấy') ? 'gone' : null));
    if (fresh === 'gone' || fresh?.locked) saveUser(null);
    else if (fresh) saveUser(stripPassword(fresh));
  }, [user?.id, saveUser]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = () => saveUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
