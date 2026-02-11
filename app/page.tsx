import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container-base space-y-6">
      <section className="rounded-2xl bg-white shadow p-5 md:p-8">
        <p className="text-sm font-semibold text-red-700">현재 예매 가능한 공연</p>
        <h1 className="mt-2 text-3xl font-bold">작전명;문 4</h1>
        <div className="mt-5 grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="rounded-xl border bg-slate-50 p-3">
            <img src="/uploads/sample-poster.png" alt="공연 포스터" className="w-full rounded-lg object-cover" />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">일시</div>
              <div>2026년 02월 22일 (일)</div>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">시간</div>
              <div>
                <div>18:00 ~ 21:00</div>
                <div className="text-sm text-slate-500">인터미션 포함 / 입장 가능 17:30</div>
              </div>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">장소</div>
              <div>
                <div>공덕 DGT 아트센터</div>
                <div className="text-sm text-slate-500">서울특별시 마포구 독막로 308</div>
              </div>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">문의</div>
              <div>
                <div>대표 이건형</div>
                <div className="text-sm text-slate-500">@band.bansong</div>
              </div>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2">
              <div className="text-slate-500">입장 관련</div>
              <div>관객 100명 · 전원 스탠딩</div>
            </div>
            <p className="pt-2 text-sm text-slate-600">
              본 공연은 온라인 예매로 진행되며, 예매하신 티켓의 취소/환불 관련 사항은 공연 안내 규정에 따라
              적용됩니다.
            </p>
            <div className="pt-2">
              <Link
                href="/book"
                className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                예매하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow p-5 md:p-8 space-y-3">
        <h2 className="text-xl font-bold">공연상세</h2>
        <p className="text-slate-700">
          작전명;문 4는 2023년을 시작으로 반송고등학교 재학생/졸업생이 함께 모여 만드는 밴드 공연입니다.
        </p>
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          예매 후 입금 확인이 완료되면 QR 티켓이 발급됩니다.
        </p>
      </section>
    </main>
  );
}
