import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Pagination from '../components/Pagination.jsx';
import VoucherTicket from '../components/VoucherTicket.jsx';
import { claimVoucher, getMyVouchers } from '../services.js';
import { canOrder, isExpired, paginate } from '../utils.js';

const PAGE_SIZE = 6;

export default function Vouchers() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('hunt');
  const [vouchers, setVouchers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [mine, setMine] = useState([]);
  const [page, setPage] = useState(1);

  const load = async () => {
    const [v, r] = await Promise.all([api.get('/vouchers?active=true'), api.get('/restaurants')]);
    setVouchers(v);
    setRestaurants(r);
    if (user) setMine(await getMyVouchers(user.id));
  };

  useEffect(() => {
    load().catch((e) => toast(e.message, 'error'));
  }, [user?.id]);

  const shopName = (id) => restaurants.find((r) => r.id === id)?.name;
  const claimedIds = new Set(mine.map((m) => m.voucherId));

  const list = useMemo(() => {
    if (tab === 'hunt') return vouchers.filter((v) => !isExpired(v)).map((v) => ({ key: v.id, voucher: v }));
    return mine
      .filter((m) => (tab === 'mine' ? !m.used && !isExpired(m.voucher) : m.used || isExpired(m.voucher)))
      .map((m) => ({ key: 'u' + m.id, voucher: m.voucher, owned: m }));
  }, [tab, vouchers, mine]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

  const claim = async (voucher) => {
    if (!user) return navigate('/login', { state: { from: '/vouchers' } });
    if (!canOrder(user)) return toast('Tài khoản này không lưu được voucher', 'error');
    try {
      await claimVoucher(user, voucher.id);
      toast(`Đã lưu ${voucher.code} vào ví voucher`);
      await load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setPage(1);
  };

  return (
    <div>
      <h2>🎟️ Kho voucher</h2>
      <div className="tabs">
        <button className={tab === 'hunt' ? 'tab active' : 'tab'} onClick={() => switchTab('hunt')}>Săn voucher</button>
        <button className={tab === 'mine' ? 'tab active' : 'tab'} onClick={() => switchTab('mine')}>
          Ví của tôi ({mine.filter((m) => !m.used && !isExpired(m.voucher)).length})
        </button>
        <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => switchTab('history')}>Đã dùng / hết hạn</button>
      </div>

      {!user && tab !== 'hunt' && (
        <div className="empty card"><p>Vui lòng <Link to="/login">đăng nhập</Link> để xem ví voucher.</p></div>
      )}
      {list.length === 0 && (user || tab === 'hunt') && <p className="muted center">Không có voucher nào.</p>}

      <div className="ticket-grid">
        {paginate(list, Math.min(page, totalPages), PAGE_SIZE).map(({ key, voucher, owned }) => {
          const soldOut = voucher.claimed >= voucher.quantity;
          const claimed = claimedIds.has(voucher.id);
          return (
            <VoucherTicket key={key} voucher={voucher} restaurantName={shopName(voucher.restaurantId)} dimmed={tab === 'history'}
              note={owned && isExpired(voucher) ? 'Đã hết hạn' : owned?.used ? 'Đã sử dụng' : ''}>
              {tab === 'hunt' && (
                <button className="btn btn-primary btn-sm" disabled={claimed || soldOut} onClick={() => claim(voucher)}>
                  {claimed ? 'Đã lưu' : soldOut ? 'Hết lượt' : 'Lưu'}
                </button>
              )}
              {tab === 'mine' && (
                <Link className="btn btn-outline btn-sm" to={voucher.restaurantId ? `/restaurants/${voucher.restaurantId}` : '/'}>
                  Dùng ngay
                </Link>
              )}
            </VoucherTicket>
          );
        })}
      </div>
      <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onChange={setPage} total={list.length} />
    </div>
  );
}
