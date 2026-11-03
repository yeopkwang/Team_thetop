const API_BASE = 'http://localhost:8080/api';
const token = () => localStorage.getItem('token');
const authHeaders = () => token() ? { 'Authorization': Bearer  } : {};

// 간단 목 데이터 (백엔드 없이도 렌더링)
const MOCK = {
  '/shows': [
    {id:1,title:'봄맞이 공연',content:'밴드의 봄맞이 공연 안내',posterUrl:'/uploads/sample-poster.png'},
    {id:2,title:'여름 페스티벌',content:'야외 무대 페스티벌',posterUrl:'/uploads/sample-poster.png'},
    {id:3,title:'가을 소극장',content:'감성 공연',posterUrl:'/uploads/sample-poster.png'}
  ],
  '/videos': [
    {id:1,title:'라이브 1',youtubeId:'dQw4w9WgXcQ',description:'첫 라이브'},
    {id:2,title:'라이브 2',youtubeId:'LXb3EKWsInQ',description:'두번째'},
    {id:3,title:'라이브 3',youtubeId:'3JZ_D3ELwOQ',description:'세번째'}
  ],
  '/events': [
    {id:1,title:'봄맞이 1회차',venue:'홍대 클럽',price:30000,totalStock:50,remainingStock:50,startAt:new Date(Date.now()+7*86400000).toISOString(),showPost:{id:1}}
  ],
  '/auth/me': { user: { email:'guest@example.com', name:'게스트', role:'GUEST' } }
};
function mockGet(path){
  if(path.startsWith('/shows/')){
    const id=Number(path.split('/').pop());
    return MOCK['/shows'].find(s=>s.id===id) || MOCK['/shows'][0];
  }
  if(path.startsWith('/events/')){
    const id=Number(path.split('/').pop());
    return MOCK['/events'].find(e=>e.id===id) || MOCK['/events'][0];
  }
  return MOCK[path];
}
async function apiGet(path) {
  try {
    const res = await fetch(API_BASE + path, { headers: authHeaders() });
    if (!res.ok) throw new Error('api error');
    return res.json();
  } catch (e) {
    const fallback = mockGet(path);
    if (fallback) return JSON.parse(JSON.stringify(fallback));
    throw e;
  }
}
async function apiPost(path, body) {
  try {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  } catch (e) {
    throw { error: '백엔드가 준비되지 않아 동작하지 않습니다.' };
  }
}
async function apiPut(path, body) {
  try {
    const res = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await res.json();
    return res.json();
  } catch (e) {
    throw { error: '백엔드가 준비되지 않아 동작하지 않습니다.' };
  }
}
