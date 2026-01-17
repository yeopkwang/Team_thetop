import { redirect } from "next/navigation";

async function loadMe() {
  const res = await fetch(`${process.env.NEXTAUTH_URL || ""}/api/me`, { cache: "no-store" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("failed to load me");
  return res.json();
}

export default async function MyPage() {
  const me = await loadMe();
  if (!me) redirect("/login");

  return (
    <main className="container-base space-y-6">
      <h1 className="text-2xl font-bold">MYPAGE</h1>
      <div className="rounded bg-white shadow p-4 space-y-2">
        <div className="font-semibold">{me.user.name || me.user.nickname || "사용자"}</div>
        <div className="text-sm text-slate-600">Roles: {me.roles.join(", ")}</div>
        <a href="/api/auth/signout" className="text-sm text-blue-600">
          로그아웃
        </a>
      </div>
      <div className="space-y-2">
        <h2 className="font-semibold">내 예약</h2>
        <div className="grid gap-2">
          {me.reservations.length === 0 && <div className="text-sm text-slate-500">예약 없음</div>}
          {me.reservations.map((r: any) => (
            <div key={r.id} className="rounded border border-slate-200 p-3">
              <div className="font-semibold">{r.sessionTitle}</div>
              <div className="text-xs text-slate-500">상태: {r.status}</div>
              <div className="text-xs text-slate-500">수량: {r.qty}</div>
            </div>
          ))}
        </div>
      </div>
      <a
        href="/myticket"
        className="inline-flex px-4 py-2 bg-primary text-white rounded hover:bg-slate-800"
      >
        MYTICKET 보기
      </a>
    </main>
  );
}
