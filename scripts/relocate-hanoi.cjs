// Moves every restaurant (and seed users/orders) to real Hanoi streets.
// Coordinates come from Nominatim; run with json-server stopped, then restart it.
const fs = require('fs');
const path = require('path');

const DB = path.join(__dirname, '..', 'database.json');
const UA = { 'User-Agent': 'OrderBooking-demo/1.0 (seed script)', 'Accept-Language': 'vi' };
const CENTER = { lat: 21.0287, lng: 105.8524 };

const STREETS = [
  ['Hàng Bông', 58], ['Hàng Bài', 21], ['Tràng Tiền', 12], ['Hàng Buồm', 34], ['Đinh Tiên Hoàng', 7],
  ['Hàng Gai', 45], ['Lý Thường Kiệt', 96], ['Phùng Hưng', 112], ['Kim Mã', 210], ['Đội Cấn', 155],
  ['Liễu Giai', 29], ['Nguyễn Thái Học', 68], ['Phan Đình Phùng', 15], ['Xã Đàn', 88], ['Thái Hà', 132],
  ['Chùa Bộc', 74], ['Tôn Đức Thắng', 201], ['Nguyễn Lương Bằng', 47], ['Khâm Thiên', 166], ['Bà Triệu', 99],
  ['Phố Huế', 140], ['Lò Đúc', 63], ['Bạch Mai', 254], ['Minh Khai', 318], ['Trần Đại Nghĩa', 22],
  ['Xuân Thủy', 136], ['Trần Thái Tông', 41], ['Duy Tân', 17], ['Hoàng Quốc Việt', 245], ['Nguyễn Khánh Toàn', 53],
  ['Trần Duy Hưng', 120], ['Xuân Diệu', 38], ['Tô Ngọc Vân', 11], ['Lạc Long Quân', 302], ['Âu Cơ', 187],
  ['Nguyễn Trãi', 275], ['Khuất Duy Tiến', 92], ['Lê Văn Lương', 66], ['Nguyễn Tuân', 30], ['Giải Phóng', 410],
  ['Tam Trinh', 129], ['Nguyễn Văn Cừ', 211], ['Hoàng Hoa Thám', 178], ['Láng Hạ', 81],
];

const RENAME = {
  'Mr. Burger Thảo Điền': 'Mr. Burger Tây Hồ',
  'Bánh Mì Heo Quay Tân Định': 'Bánh Mì Heo Quay Hàng Bông',
  'Hủ Tiếu Nam Vang Thanh Xuân': 'Hủ Tiếu Nam Vang Cô Ba',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return res.json();
    await sleep(3000);
  }
  throw new Error(`Failed: ${url}`);
}

function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

async function place(street, number) {
  const q = encodeURIComponent(`${street}, Hà Nội`);
  const data = await get(`https://photon.komoot.io/api/?q=${q}&limit=5&osm_tag=highway&lat=${CENTER.lat}&lon=${CENTER.lng}&bbox=105.6,20.85,106.05,21.2`);
  await sleep(700);
  const hit = data.features.find((f) => f.properties.city === 'Hà Nội') || data.features[0];
  if (!hit) throw new Error(`No result for ${street}`);
  const [lng, lat] = hit.geometry.coordinates.map((n) => +n.toFixed(6));
  const name = /^(Phố|Đường)/.test(hit.properties.name) ? hit.properties.name : `${street.startsWith('Phố') ? '' : 'Phố '}${street}`;
  const district = hit.properties.district || hit.properties.locality || '';
  return { lat, lng, address: `${number} ${name}, ${district ? `${district}, ` : ''}Hà Nội` };
}

(async () => {
  const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
  const byId = {};
  for (const [i, r] of db.restaurants.entries()) {
    const [street, number] = STREETS[i % STREETS.length];
    const p = await place(street, number);
    r.name = RENAME[r.name] || r.name;
    Object.assign(r, p, { distanceKm: distanceKm(CENTER, p) });
    byId[r.id] = r;
    console.log(`${r.id}. ${r.name} -> ${r.address} (${r.lat}, ${r.lng})`);
  }

  const userAddresses = {
    admin: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội',
    customer: ['25 Hàng Bạc, Hoàn Kiếm, Hà Nội', '100 Bà Triệu, Hai Bà Trưng, Hà Nội'],
    shipper: ['Cầu Giấy, Hà Nội', 'Đống Đa, Hà Nội'],
  };
  const counters = {};
  for (const u of db.users) {
    if (u.role === 'merchant') {
      const shop = db.restaurants.find((r) => r.id === u.restaurantId);
      if (shop) u.address = shop.address;
      continue;
    }
    const v = userAddresses[u.role];
    if (!v) continue;
    counters[u.role] = (counters[u.role] || 0) + 1;
    u.address = Array.isArray(v) ? v[(counters[u.role] - 1) % v.length] : v;
    if (u.plate) u.plate = u.plate.replace(/^\d{2}/, '29');
  }

  const customerAddress = Object.fromEntries(db.users.map((u) => [u.id, u.address]));
  for (const o of db.orders) {
    const shop = byId[o.restaurantId];
    if (shop) {
      o.restaurantName = shop.name;
      o.restaurantAddress = shop.address;
      if (o.restaurantLat !== undefined) Object.assign(o, { restaurantLat: shop.lat, restaurantLng: shop.lng });
    }
    if (/TP\.HCM|Hồ Chí Minh|Quận \d/.test(o.address || '')) o.address = customerAddress[o.userId] || o.address;
    if (o.shipper?.plate) o.shipper.plate = o.shipper.plate.replace(/^\d{2}/, '29');
  }

  fs.writeFileSync(DB, JSON.stringify(db, null, 2));
  console.log('Done.');
})();
