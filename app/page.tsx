import Link from "next/link";
import { CURRENT_SHOW_INFO } from "@/lib/show-info";

const setlistPart1 = [
  "시간을 달리네 - 한로로",
  "여우야 - 더클래식",
  "못난이 - 루시",
  "물가의 라이온 - 쏜애플",
  "계속 웃을 순 없어 - 유다빈밴드",
  "Likes & Hearts - Sonakonadore",
  "사랑이 잘 - 아이유, 혁오 (With. Sunset Rollercoaster)",
  "홍련화 - L!SA",
  "빨간 피터 - 쏜애플",
];

const setlistPart2 = [
  "사랑하게 될거야 - 한로로",
  "Popo (How Deep Is Our Love?) - 백예린",
  "Make Up (최예근 Ver.) - 샘김",
  "She Used To Be Mine - Waitress",
  "Toxic (Couch Ver.) - Britney Spears",
  "SOME LIKE IT HOT!! - SPYAIR",
  "나는 최강 - Mrs. Green Apple",
  "T + Tik Tak Tok - 실리카겔",
  "오늘이야 - 유다빈밴드",
];

export default function HomePage() {
  return (
    <main className="container-base space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow md:p-8">
        <p className="text-sm font-semibold text-red-700">현재 예매 가능한 공연</p>
        <h1 className="mt-2 text-3xl font-bold">{CURRENT_SHOW_INFO.title}</h1>

        <div className="mt-5 grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="rounded-xl border bg-slate-50 p-3">
            <img src={CURRENT_SHOW_INFO.posterUrl} alt="공연 포스터" className="w-full rounded-lg object-cover" />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">일시</div>
              <div>{CURRENT_SHOW_INFO.dateLabel}</div>
            </div>

            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">시간</div>
              <div>
                <div>{CURRENT_SHOW_INFO.timeLabel}</div>
                <div className="text-sm text-slate-500">{CURRENT_SHOW_INFO.timeSubLabel}</div>
              </div>
            </div>

            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">장소</div>
              <div>
                <div>{CURRENT_SHOW_INFO.venue}</div>
                <div className="text-sm text-slate-500">{CURRENT_SHOW_INFO.venueAddress}</div>
              </div>
            </div>

            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">문의</div>
              <div>
                <div>{CURRENT_SHOW_INFO.contactName}</div>
                <div className="text-sm text-slate-500">{CURRENT_SHOW_INFO.contactTag}</div>
              </div>
            </div>

            <div className="grid grid-cols-[88px_1fr] gap-2 border-b pb-2">
              <div className="text-slate-500">입금 계좌</div>
              <div>
                <span className="font-semibold">
                  {CURRENT_SHOW_INFO.payment.bank} {CURRENT_SHOW_INFO.payment.account} ({CURRENT_SHOW_INFO.payment.holder})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-[88px_1fr] gap-2">
              <div className="text-slate-500">입장 관련</div>
              <div>{CURRENT_SHOW_INFO.audienceInfo}</div>
            </div>

            <p className="pt-2 text-sm text-slate-600">{CURRENT_SHOW_INFO.notice}</p>

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

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow md:p-8">
        <h2 className="text-xl font-bold">공연 소개</h2>
        <p className="text-lg font-bold text-[#7b1e2b]">반송고등학교 연합 밴드 '작전명문' 4번째 공연, 작전명;문 4</p>
        <p className="text-slate-700">[작전명;문 4]는 동탄 반송고등학교 재학생과 졸업생이 함께 만드는 밴드 공연입니다.</p>
        <p className="text-slate-700">
          2023년 첫 공연을 시작으로 4년째 이어져 선후배가 음악으로 교류하는 연례 무대를 만들어 나가고 있습니다.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold">SETLIST 1부</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {setlistPart1.map((song) => (
                <li key={song}>{song}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-semibold">SETLIST 2부</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              {setlistPart2.map((song) => (
                <li key={song}>{song}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow md:p-8">
        <h2 className="text-xl font-bold">판매 상세</h2>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
          <p className="font-semibold">1. 공연 개요</p>
          <p>- 공연 일시: 2026년 2월 22일 일요일 18시</p>
          <p>- 공연 장소: DGT 아트센터 (서울 마포구 독막로 308 지하 1층)</p>
          <p>- 공연 구성</p>
          <p>(1) 18시 ~ 19시 : 1부 공연</p>
          <p>(2) 19시 ~ 19시 10분 : 인터미션</p>
          <p>(3) 19시 10분 ~ 20시 20분 : 2부 공연</p>
          <p>(4) 20시 20분 ~ 20시 40분 : 무대 인사 및 사진 촬영</p>
          <p>(5) 20시 40분 ~ 21시 : 퇴장</p>
          <p>※ 공연장 현장의 원활한 정리 작업을 위해 관객 여러분께서는 20시 40분까지 퇴장을 완료해주시기 바랍니다.</p>
          <p>- 오시는 길</p>
          <p>공덕역 1번 출구에서 도보 약 5분 거리에 위치해 있습니다. 위즈덤 하우스 학원 건물 지하 1층에 위치해 있습니다.</p>
          <p>* 자차로 오실 경우 주차가 매우 어렵습니다. 가급적 대중교통 이용 바랍니다.</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
          <p className="font-semibold">2. 관람료</p>
          <p>
            저희 공연은 유료 공연으로 진행됩니다. 다음의 최소 관람료를 참고하시어 금월 20일까지 관람료 납입 부탁드립니다.
            현장에서의 원활한 관객 본인 확인을 위해 입금자명은 반드시 관람객 본인의 실명(성 포함)으로 진행해주시기 바랍니다.
          </p>
          <p>
            여러 명의 관람료를 납부할 경우 아래의 대표번호 또는 초대받은 공연자에게 미리 알려주시기 바랍니다.
          </p>
          <p>
            &lt;입금 계좌: <span className="font-semibold">토스뱅크 1002-1212-1618 (정시윤)</span>&gt;
          </p>
          <p>- 스탠딩석 : 7,000원</p>
          <p>- 예매 후 입금 확인이 완료되면 QR 티켓이 발급됩니다.</p>
          <p>- 전석 스탠딩으로 진행되며, 17시 30분부터 선착순으로 입장 시작할 예정입니다. 공연 시작 후에는 입장이 불가합니다.</p>
          <p>- 예매 후 24시간 이내 미입금 시 자동 취소됩니다.</p>
          <p className="font-semibold">※ 환불 기준 안내 ※</p>
          <p>(1) ~ 2.17 (화) 23:59 -&gt; 납입금 전액 환불</p>
          <p>(2) 2.18 (수) 0:00 ~ 2.19 (목) 23:59 -&gt; 납입금 반액 환불</p>
          <p>(3) 2.20 (금) 이후 -&gt; 환불 불가</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
          <p className="font-semibold">3. 입장 안내</p>
          <p>- 17시 30분 입장 시작, 18시 입장 마감</p>
          <p>- 입장 시 상주하는 공연자에게 예매 확인 QR 티켓를 보여주신 후 지류 티켓을 받고 입장해주세요.</p>
          <p>- 굿즈 판매는 입장 시간, 인터미션, 공연 종료 후 10분 간 진행될 예정입니다.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
          <p className="font-semibold">4. 공연 진행 중 유의 사항</p>
          <p>(1) 공연 특성상 광과민성 증후군을 가진 예민한 관람객들에게 영향을 줄 수 있는 조명 효과가 포함되어 있습니다.</p>
          <p>(2) 일부 곡은 관객들의 적극적인 호응을 유도할 수도 있습니다. 신나게 참여해주시면 공연자도 더 힘이 납니다.</p>
          <p>(3) 원활한 공연 진행을 위해 공연장 내에서는 페트병에 담긴 생수를 제외한 음료 및 음식물 반입은 제한됩니다.</p>
          <p>(4) 공연장 내부가 협소하여 별도의 물품 보관이 어렵습니다. 몸과 마음을 가볍게 하고 즐겨주세요.</p>
          <p>(5) 전문 촬영 작가가 동반된 공연입니다. 작전명문의 순간을 눈에 담으시는 것을 권장드립니다.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
          <p className="font-semibold">5. 공연 관련 문의</p>
          <p>
            운영위원 이건형 ☏ <span className="font-semibold">010-2185-7438</span>
          </p>
          <p>공식 인스타그램 @band.bansong</p>
          <p>문의를 남겨 주시면 확인 후 답장 드리겠습니다.</p>
          <p className="pt-1 text-xs text-slate-500">@ 2026, Operation;Prestige, BSHS</p>
        </div>
      </section>
    </main>
  );
}
