const API_BASE = 'http://localhost:8080/api';
const EVENT_CAPACITY = 100;
const SOLD_KEY = 'demo_sold_qty';

const token = () => localStorage.getItem('token');
const authHeaders = () => (token() ? { Authorization: `Bearer ${token()}` } : {});
const sold = () => Number(localStorage.getItem(SOLD_KEY) || 0);
const getRemaining = () => Math.max(0, EVENT_CAPACITY - sold());

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_) {}

    if (!res.ok) {
      const msg = json?.error || json?.message || text || res.statusText || `HTTP ${res.status}`;
      throw { error: msg, status: res.status };
    }
    return json;
  } catch (e) {
    throw { error: e.error || e.message || '요청을 처리하지 못했습니다.' };
  }
}

const apiGet = (p) => apiFetch(p, { method: 'GET' });
const apiPost = (p, body = {}) => apiFetch(p, { method: 'POST', body: JSON.stringify(body) });
const apiPut = (p, body = {}) => apiFetch(p, { method: 'PUT', body: JSON.stringify(body) });

// 예매
async function bookTickets(qty) {
  if (!token()) throw { error: '로그인 후 예매 가능합니다.' };
  if (qty < 1) throw { error: '최소 1장 이상 선택해주세요.' };
  if (qty > 2) throw { error: '최대 2장까지 예매 가능합니다.' };
  const remain = getRemaining();
  if (qty > remain) throw { error: `잔여 ${remain}장까지만 예매할 수 있습니다.` };

  const r = await apiPost('/bookings', { eventId: 1, quantity: qty });
  if (r?.remainingStock !== undefined) {
    const soldQty = EVENT_CAPACITY - Number(r.remainingStock);
    localStorage.setItem(SOLD_KEY, Math.max(0, soldQty));
  } else {
    localStorage.setItem(SOLD_KEY, sold() + qty);
  }
  return r;
}
