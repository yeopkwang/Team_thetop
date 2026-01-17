const API_BASE = 'http://localhost:8080/api';
const token = () => localStorage.getItem('token');
const authHeaders = () => token() ? { 'Authorization': `Bearer ${token()}` } : {};

const MOCK = {
  '/shows': [
    {id:1,title:'������ ����',content:'����� ������ ���� �ȳ�',posterUrl:'/uploads/sample-poster.png'},
    {id:2,title:'���� �佺Ƽ��',content:'�߿� ���� �佺Ƽ��',posterUrl:'/uploads/sample-poster.png'},
    {id:3,title:'���� �ұ���',content:'���� ����',posterUrl:'/uploads/sample-poster.png'}
  ],
  '/videos': [
    {id:1,title:'���̺� 1',youtubeId:'dQw4w9WgXcQ',description:'ù ���̺�'},
    {id:2,title:'���̺� 2',youtubeId:'LXb3EKWsInQ',description:'�ι�°'},
    {id:3,title:'���̺� 3',youtubeId:'3JZ_D3ELwOQ',description:'����°'}
  ],
  '/events': [
    {id:1,title:'������ 1ȸ��',venue:'ȫ�� Ŭ��',price:30000,totalStock:50,remainingStock:50,startAt:new Date(Date.now()+7*86400000).toISOString(),showPost:{id:1}}
  ],
  '/auth/me': { user: { email:'guest@example.com', name:'�Խ�Ʈ', role:'GUEST' } }
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
    throw { error: '�鿣�尡 �غ���� �ʾ� �������� �ʽ��ϴ�.' };
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
    throw { error: '�鿣�尡 �غ���� �ʾ� �������� �ʽ��ϴ�.' };
  }
}
