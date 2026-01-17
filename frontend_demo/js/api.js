const USE_MOCK = true;
const MOCK = {
  shows: [
    {id:1,title:'봄맞이 공연',content:'밴드의 봄맞이 공연 안내',posterUrl:'/uploads/sample-poster.png'},
    {id:2,title:'여름 페스티벌',content:'야외 무대 페스티벌',posterUrl:'/uploads/sample-poster.png'},
    {id:3,title:'가을 소극장',content:'감성 공연',posterUrl:'/uploads/sample-poster.png'}
  ],
  videos: [
    {id:1,title:'라이브 1',youtubeId:'dQw4w9WgXcQ',description:'첫 라이브'},
    {id:2,title:'라이브 2',youtubeId:'LXb3EKWsInQ',description:'두번째'},
    {id:3,title:'라이브 3',youtubeId:'3JZ_D3ELwOQ',description:'세번째'}
  ],
  events: [
    {id:1,title:'봄맞이 1회차',venue:'홍대 클럽',price:30000,totalStock:50,remainingStock:50,startAt:new Date(Date.now()+7*86400000).toISOString(),showPost:{id:1}}
  ],
  tickets: [
    {id:101, ticketCode:'MOCK-TICKET-101', booking:{ event:{ title:'봄맞이 1회차', startAt:new Date(Date.now()+7*86400000).toISOString(), venue:'홍대 클럽' } } }
  ],
  bookings: [
    {id:201, status:'CONFIRMED', quantity:2, event:{ title:'봄맞이 1회차', startAt:new Date(Date.now()+7*86400000).toISOString(), venue:'홍대 클럽' } }
  ]
};
