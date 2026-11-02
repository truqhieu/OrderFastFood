export const API_URL = 'http://localhost:9999';

async function send(path, options = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Không kết nối được server (port 9999). Hãy chạy "npm run server".');
  }
  if (!res.ok) throw new Error(res.status === 404 ? 'Không tìm thấy dữ liệu' : `Lỗi server (${res.status})`);
  return res;
}

async function request(path, options) {
  const res = await send(path, options);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),

  /** Server-side pagination via json-server `_page`/`_limit`; total comes from X-Total-Count. */
  getPaged: async (path, page, limit) => {
    const sep = path.includes('?') ? '&' : '?';
    const res = await send(`${path}${sep}_page=${page}&_limit=${limit}`);
    const data = await res.json();
    const total = Number(res.headers.get('X-Total-Count') ?? data.length);
    return { data, total };
  },
};
