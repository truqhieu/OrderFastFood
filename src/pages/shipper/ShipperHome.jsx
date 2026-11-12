import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useDialog } from '../../context/DialogContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import usePaged from '../../hooks/usePaged.js';
import ActiveOrder from '../../components/shipper/ActiveOrder.jsx';
import AvailableJobs from '../../components/shipper/AvailableJobs.jsx';
import DeliveryHistory from '../../components/shipper/DeliveryHistory.jsx';
import ShipperProfile from '../../components/shipper/ShipperProfile.jsx';
import { acceptOrder, getActiveShipperOrder, getOpenDeliveryJobs } from '../../services.js';
import { formatPrice, isToday } from '../../utils.js';

const POLL_MS = 5000;
const JOB_PAGE_SIZE = 5;

function payNote(order) {
  return order.paymentMethod === 'cod'
    ? `Thu hộ ${formatPrice(order.total)}`
    : 'Khách đã thanh toán';
}

export default function ShipperHome() {
  const { user, updateProfile, refreshUser } = useAuth();
  const toast = useToast();
  const { confirm } = useDialog();
  const [tab, setTab] = useState('new');
  const [active, setActive] = useState(null);
  const [stats, setStats] = useState({ today: 0, todayCount: 0, total: 0, count: 0 });
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobPage, setJobPage] = useState(1);
  const [claimingId, setClaimingId] = useState(0);

  const history = usePaged(
    tab === 'history' ? `/orders?shipperId=${user.id}&status=completed&_sort=createdAt&_order=desc` : null,
    5
  );

  const loadActive = useCallback(async () => {
    setActive(await getActiveShipperOrder(user.id));
    const done = await api.get(`/orders?shipperId=${user.id}&status=completed`);
    const list = Array.isArray(done) ? done : [];
    const lastAt = (o) => o.history?.at?.(-1)?.at || o.createdAt;
    const todays = list.filter((o) => isToday(lastAt(o)));
    setStats({
      today: todays.reduce((s, o) => s + (o.shippingFee || 0), 0),
      todayCount: todays.length,
      total: list.reduce((s, o) => s + (o.shippingFee || 0), 0),
      count: list.length,
    });
  }, [user.id]);

  const loadJobs = useCallback(async () => {
    if (!(tab === 'new' && user.online && !active)) {
      setJobs([]);
      setJobsLoading(false);
      return;
    }
    try {
      setJobs(await getOpenDeliveryJobs());
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setJobsLoading(false);
    }
  }, [tab, user.online, active, toast]);

  useEffect(() => {
    loadActive().catch((e) => toast(e.message, 'error'));
    refreshUser();
    const timer = setInterval(() => loadActive().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [loadActive]);

  useEffect(() => {
    loadJobs();
    if (!(tab === 'new' && user.online && !active)) return;
    const timer = setInterval(loadJobs, POLL_MS);
    return () => clearInterval(timer);
  }, [loadJobs, tab, user.online, active]);

  useEffect(() => {
    setJobPage(1);
  }, [jobs.length]);

  const toggleOnline = async () => {
    if (user.online && active) return toast('Hãy hoàn thành đơn hiện tại trước khi tắt nhận đơn', 'error');
    await updateProfile({ online: !user.online });
    toast(user.online ? 'Đã tắt nhận đơn' : 'Bạn đang trực tuyến, sẵn sàng nhận đơn!');
  };

  const accept = async (order) => {
    const ok = await confirm({
      title: 'Nhận đơn giao này?',
      message: [
        `${order.restaurantName} → ${order.customerName}`,
        `${order.distanceKm} km · ${payNote(order)}`,
        `Phí giao của bạn: +${formatPrice(order.shippingFee)}`,
        'Sau khi nhận, hãy đến quán lấy món rồi mới giao cho khách.',
      ].join('\n'),
      confirmText: 'Nhận đơn',
    });
    if (!ok) return;
    setClaimingId(order.id);
    try {
      await acceptOrder(order, user);
      toast('Đã nhận đơn. Hãy đến quán lấy món.');
      await loadActive();
      await loadJobs();
    } catch (e) {
      toast(e.message, 'error');
      loadJobs();
    } finally {
      setClaimingId(0);
    }
  };

  const onActiveChanged = async () => {
    await loadActive();
    history.reload();
  };

  const jobPages = Math.max(1, Math.ceil(jobs.length / JOB_PAGE_SIZE));
  const readyCount = jobs.length;

  return (
    <div className="shipper">
      <ShipperProfile user={user} stats={stats} onToggleOnline={toggleOnline} />

      {active && <ActiveOrder order={active} onChanged={onActiveChanged} />}

      <div className="tabs">
        <button type="button" className={tab === 'new' ? 'tab active' : 'tab'} onClick={() => setTab('new')}>
          Đơn mới{user.online && !active && readyCount > 0 ? ` (${readyCount})` : ''}
        </button>
        <button type="button" className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}>
          Lịch sử chuyến
        </button>
      </div>

      {tab === 'new' && (
        <AvailableJobs
          user={user}
          active={active}
          jobs={jobs}
          jobsLoading={jobsLoading}
          page={jobPage}
          totalPages={jobPages}
          claimingId={claimingId}
          onPageChange={setJobPage}
          onAccept={accept}
          paymentNote={payNote}
        />
      )}

      {tab === 'history' && (
        <DeliveryHistory history={history} />
      )}
    </div>
  );
}
