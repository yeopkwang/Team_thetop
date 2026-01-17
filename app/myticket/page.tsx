import { redirect } from "next/navigation";

async function loadTicket() {
  const res = await fetch(`${process.env.NEXTAUTH_URL || ""}/api/me`, { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("failed to load");
  const data = await res.json();
  const ticket = data.tickets?.[0];
  return { user: data.user, ticket };
}

export default async function MyTicketPage() {
  const data = await loadTicket();
  if (!data) redirect("/login");
  if (!data.ticket) {
    return <main className="container-base">활성 티켓이 없습니다.</main>;
  }

  return (
    <main className="container-base space-y-6">
      <h1 className="text-2xl font-bold">MYTICKET</h1>
      <div className="rounded bg-white shadow p-4 space-y-4">
        <div className="text-sm text-slate-600">QR 토큰</div>
        <div className="text-lg font-mono break-all">{data.ticket.qrToken}</div>
        <div className="w-48 h-48 mx-auto bg-slate-100 flex items-center justify-center">
          <span className="text-xs text-slate-500">QR: {data.ticket.qrToken.slice(0, 8)}...</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm text-slate-500">오리지널 티켓 이미지</div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="relative w-full h-48 rounded overflow-hidden shadow bg-white flex items-center justify-center">
            <img src={data.ticket.templateImage || "/ticket-template.png"} alt="ticket" className="object-cover w-full h-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
