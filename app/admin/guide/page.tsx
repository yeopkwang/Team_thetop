import Link from "next/link";

// 관리자 도움말: 처음 관리를 맡은 사람이 이 화면만 보고 한 해 공연을 운영할 수 있게 쓴다.
// 화면 이름이나 버튼 문구를 바꾸면 여기 설명도 같이 고친다.

const YEAR = [
  {
    title: "내 계정 정리",
    body: "받은 임시 비밀번호를 '계정' 메뉴에서 바로 바꿔요. 같이 운영할 사람이 있으면 한 사람에 한 계정씩 만들어 주세요. 입구만 맡을 사람은 '스태프'로 만들면 돈과 공연 설정은 못 건드려요.",
    href: "/admin/accounts",
    link: "계정",
  },
  {
    title: "새 공연 등록",
    body: "공연 관리 > 새 공연 등록. 지난 공연의 장소·계좌·판매 안내가 미리 채워져 있으니 바뀐 것만 고쳐요. 다 채울 때까지 상태는 '준비 중'으로 두면 관객에게 보이지 않아요.",
    href: "/admin/shows/new",
    link: "새 공연 등록",
  },
  {
    title: "판매 열기",
    body: "공연 수정 화면의 '판매 전 점검'이 다 채워지면, 티켓 오픈 일시를 정하고 상태를 '판매 중'으로 저장해요. 오픈 시각이 되면 예매 버튼이 저절로 열려요. 원래 판매 중이던 공연은 지난 공연으로 옮겨져요.",
    href: "/admin/shows",
    link: "공연 관리",
  },
  {
    title: "판매 기간: 입금 확인",
    body: "하루에 한두 번 은행 앱의 입금 내역을 복사해 '입금 내역 붙여넣기'에 넣으면, 이름과 금액이 맞는 예매가 골라져요. 확인을 누르면 관객에게 QR 티켓이 열려요. 입금하지 않은 예매는 기한이 지나면 저절로 만료돼요.",
    href: "/admin",
    link: "입금·입장 확인",
  },
  {
    title: "공연 전날",
    body: "현장용 명단을 인쇄해 두고(인터넷이 끊길 때를 대비), 입구 스태프에게 계정을 전해 줘요. 입구에서 쓸 휴대폰으로 관리자 화면에 들어가 '카메라 켜기'가 되는지 미리 확인해요.",
    href: "/admin/reservations/print",
    link: "현장용 명단",
  },
  {
    title: "공연 당일: 입장 확인",
    body: "입금·입장 확인 화면에서 카메라를 켜고 관객의 QR을 찍어요. 휴대폰이 꺼졌거나 QR이 안 찍히면 아래 칸에 이름이나 예매번호를 적어 찾은 뒤 '입장 처리'를 눌러요. 같은 티켓은 두 번 들어올 수 없어요.",
    href: "/admin",
    link: "입금·입장 확인",
  },
  {
    title: "공연이 끝나면",
    body: "환불 요청이 남아 있으면 처리하고, 공연 상태를 '지난 공연'으로 바꿔요. 셋리스트를 채워 두면 지난 공연 화면에 남아요. 필요하면 예매자 명단을 엑셀로 받아 정산해요.",
    href: "/admin/shows",
    link: "공연 관리",
  },
];

const CASES = [
  {
    q: "통장에 찍힌 이름이 입금자명과 달라요.",
    a: "예매자 목록에서 카카오 이름이나 예매번호로 찾아 직접 '입금 확인'을 눌러요. 누구인지 모르겠으면 입금한 시각과 금액을 들고 공연 문의 채널에 공지해 주세요.",
  },
  {
    q: "기한 안에 입금했는데 '기간 만료'가 됐어요.",
    a: "입금·입장 확인 화면 아래 '기한이 지나 만료된 예매'에서 '입금 확인 (되살리기)'를 눌러요. 그사이 좌석이 다 찼거나 같은 관객이 다시 예매했으면 되살릴 수 없어요. 그때는 입금액을 돌려드려요.",
  },
  {
    q: "관객이 환불을 요청했어요.",
    a: "환불 관리에서 관객이 적은 계좌를 복사해 관람료를 송금하고 '환불 완료'를 눌러요. 관객이 실수로 눌렀다면 '요청 되돌리기'로 원래 티켓을 살려요.",
  },
  {
    q: "입금하지 않은 예매를 정리하고 싶어요.",
    a: "기다리면 입금 기한이 지나 저절로 만료돼요. 먼저 정리해야 하면 입금 확인 목록에서 '예매 취소'를 누르고 사유를 적어요. 사유는 관객의 마이 티켓에 보여요.",
  },
  {
    q: "입금 확인이나 입장 확인을 잘못 눌렀어요.",
    a: "이 둘은 되돌리는 버튼이 없어요. 작업 기록에서 언제 누가 눌렀는지 확인하고, 개발을 맡은 사람에게 예매번호와 함께 알려 주세요.",
  },
  {
    q: "스태프가 비밀번호를 잊었어요.",
    a: "관리자가 계정 메뉴에서 '비밀번호 새로 정하기'를 눌러 새 비밀번호를 정해 주고 직접 전해요. 비밀번호를 10번 틀리면 15분 동안 로그인이 막혀요.",
  },
  {
    q: "관리를 다른 사람에게 넘겨요.",
    a: "새 담당자에게 '관리자' 계정을 만들어 주고, 새 담당자가 로그인해 비밀번호를 바꾼 뒤 내 계정을 지워 달라고 해요. 관리자 계정은 마지막 하나는 지울 수 없어요.",
  },
  {
    q: "사이트가 안 열리거나 계속 오류가 나요.",
    a: "개발을 맡은 사람에게 알려 주세요. 서버·데이터베이스·도메인을 어디서 관리하는지는 GitHub 저장소의 docs/handover.md에 정리돼 있어요.",
  },
];

export default function AdminGuidePage() {
  return (
    <div className="max-w-[760px] space-y-12">
      <section>
        <h2 className="text-lead font-bold">한 해 공연 순서</h2>
        <p className="mt-1 text-meta text-ink-3">처음 맡았다면 위에서부터 차례로 하면 돼요.</p>
        <ol className="mt-5 space-y-6">
          {YEAR.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[28px_1fr] gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-cap font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="text-[15px] font-bold leading-7">{step.title}</h3>
                <p className="mt-1 text-ui leading-[1.75] text-ink-2">{step.body}</p>
                <Link href={step.href} className="mt-1.5 inline-block text-meta font-semibold text-brand-600 underline underline-offset-2">
                  {step.link} 열기
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lead font-bold">이럴 땐 이렇게</h2>
        <div className="mt-4 divide-y divide-line border-y border-line">
          {CASES.map((c) => (
            <details key={c.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-ui font-semibold [&::-webkit-details-marker]:hidden">
                {c.q}
                <span aria-hidden className="shrink-0 text-ink-4 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 text-ui leading-[1.75] text-ink-2">{c.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lead font-bold">권한</h2>
        <dl className="mt-3 space-y-2 text-ui">
          <div className="flex gap-4">
            <dt className="w-16 shrink-0 font-semibold">관리자</dt>
            <dd className="text-ink-2">모든 메뉴. 공연 설정, 환불, 작업 기록, 계정 만들기·지우기.</dd>
          </div>
          <div className="flex gap-4">
            <dt className="w-16 shrink-0 font-semibold">스태프</dt>
            <dd className="text-ink-2">입금·입장 확인과 예매자 목록, 내 비밀번호 바꾸기만.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
