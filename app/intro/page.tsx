export default function IntroPage() {
  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">INTRO</h1>
      <p className="text-slate-600">
        밴드/합주 공연을 위한 소개 페이지입니다. 팀 소개, 컨셉, 일정 안내 등을 자유롭게 적어
        꾸밀 수 있습니다.
      </p>
      <div className="rounded-xl bg-white shadow p-4 grid gap-2">
        <h2 className="font-semibold">우리의 목표</h2>
        <p className="text-sm text-slate-600">즐거운 공연과 안전한 운영을 위한 티켓 예약 시스템.</p>
      </div>
    </main>
  );
}
