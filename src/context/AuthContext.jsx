import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

const stripPassword = ({ password, ...rest }) => rest;
const USERNAME_RE = /^[a-z0-9._]{3,20}$/;

const normalizeUsername = (value) => (value || '').trim().toLowerCase();

async function uniqueUsername(base) {
  const root = normalizeUsername(base).replace(/[^a-z0-9._]/g, '').slice(0, 16) || 'user';
  let candidate = root.padEnd(3, '1');
  for (let i = 0; i < 30; i++) {
    const taken = await api.get(`/users?username=${encodeURIComponent(candidate)}`);
    if (!taken.length) return candidate;
    candidate = `${root}${i + 2}`.slice(0, 20);
  }
  return `${root}${Date.now().toString().slice(-4)}`.slice(0, 20);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));

  const saveUser = useCallback((u) => {
    setUser(u);
    if (u) localStorage.setItem('user', JSON.stringify(u));
    else localStorage.removeItem('user');
  }, []);

  const login = async (account, password) => {
    const username = normalizeUsername(account);
    if (!username) throw new Error('Tài khoản hoặc mật khẩu không đúng');
    const found = (await api.get(`/users?username=${encodeURIComponent(username)}`))[0];
    if (!found) throw new Error('Tài khoản hoặc mật khẩu không đúng');
    if (!found.password) throw new Error('Tài khoản này đăng nhập bằng Google. Hãy chọn Đăng nhập với Google.');
    if (found.password !== password) throw new Error('Tài khoản hoặc mật khẩu không đúng');
    if (found.locked) throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
    const safe = stripPassword(found);
    saveUser(safe);
    return safe;
  };

  const loginWithGoogle = async (profile) => {
    const email = (profile.email || '').trim().toLowerCase();
    if (!email) throw new Error('Tài khoản Google không có email');
    const users = await api.get(`/users?email=${encodeURIComponent(email)}`);
    let found = users[0];
    if (found) {
      if (found.locked) throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.');
      if (!found.googleId) {
        found = await api.patch(`/users/${found.id}`, {
          googleId: profile.sub,
          avatar: profile.picture || found.avatar || '',
        });
      }
    } else {
      found = await api.post('/users', {
        fullName: (profile.name || email.split('@')[0]).trim(),
        username: await uniqueUsername(email.split('@')[0]),
        email,
        phone: '',
        address: '',
        password: '',
        role: 'customer',
        googleId: profile.sub,
        avatar: profile.picture || '',
        authProvider: 'google',
      });
    }
    const safe = stripPassword(found);
    saveUser(safe);
    return safe;
  };

  const register = async ({ fullName, username, email, phone, password, address, role, vehicle, plate }) => {
    const account = normalizeUsername(username);
    if (!USERNAME_RE.test(account)) throw new Error('Tài khoản gồm 3–20 ký tự: chữ thường, số, dấu chấm hoặc gạch dưới');
    const normalized = email.trim().toLowerCase();
    const [byUser, byEmail] = await Promise.all([
      api.get(`/users?username=${encodeURIComponent(account)}`),
      api.get(`/users?email=${encodeURIComponent(normalized)}`),
    ]);
    if (byUser.length) throw new Error('Tên tài khoản đã được sử dụng');
    if (byEmail.length) throw new Error('Email đã được sử dụng');
    const data = {
      fullName: fullName.trim(),
      username: account,
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
    <AuthContext.Provider value={{ user, login, loginWithGoogle, register, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
