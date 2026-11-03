// 판매 전 점검: '판매 중'으로 바꾸기 전에 꼭 채울 것(required)과 채우면 좋은 것.
// 관리자 화면의 점검표와 서버의 저장 검사가 같은 규칙을 쓴다. 브라우저에서도 쓰므로 Prisma를 가져오지 않는다.
export type ReadinessInput = {
  title: string;
  sessionDate: string | Date | null;
  totalCapacity: number;
  price: number;
  paymentBank: string;
  paymentAccount: string;
  paymentHolder: string;
  dateLabel: string;
  venue: string;
  posterUrl: string | null;
  contactName: string;
  contactTag: string;
  refundContact: string;
  salesText: string;
};

export type ReadinessItem = { key: string; label: string; ok: boolean; required: boolean; hint: string };

const filled = (v: string | null | undefined) => Boolean(v && v.trim());

export function showReadiness(show: ReadinessInput, now = new Date()): ReadinessItem[] {
  const date = show.sessionDate ? new Date(show.sessionDate) : null;
  const paid = show.price > 0;
  return [
    { key: "title", label: "공연명", ok: filled(show.title), required: true, hint: "공연 정보 칸에 적어 주세요." },
    {
      key: "date",
      label: "공연 일시",
      ok: Boolean(date && !Number.isNaN(date.getTime()) && date > now),
      required: true,
      hint: "판매 칸의 공연 일시가 지금보다 뒤여야 해요.",
    },
    { key: "capacity", label: "정원", ok: show.totalCapacity >= 1, required: true, hint: "1명 이상이어야 해요." },
    {
      key: "account",
      label: "입금 계좌",
      ok: !paid || (filled(show.paymentBank) && filled(show.paymentAccount) && filled(show.paymentHolder)),
      required: true,
      hint: "관람료가 있으면 은행·계좌번호·예금주를 모두 적어야 관객이 입금할 수 있어요.",
    },
    { key: "dateLabel", label: "공연일 문구", ok: filled(show.dateLabel), required: false, hint: "첫 화면과 티켓에 나오는 날짜 문구예요." },
    { key: "venue", label: "장소", ok: filled(show.venue), required: false, hint: "장소정보 탭과 티켓에 나와요." },
    { key: "poster", label: "포스터", ok: filled(show.posterUrl), required: false, hint: "첫 화면에 크게 나와요." },
    { key: "contact", label: "문의처", ok: filled(show.contactName) || filled(show.contactTag), required: false, hint: "관객이 연락할 곳이에요." },
    { key: "refundContact", label: "환불 문의 연락처", ok: filled(show.refundContact), required: false, hint: "환불 안내에 나와요." },
    { key: "salesText", label: "판매정보 안내문", ok: filled(show.salesText), required: false, hint: "환불 기준을 여기에 적어요. 관객이 예매할 때 동의해요." },
  ];
}

// 판매 중으로 저장할 수 없게 막는 항목. 이미 판매 중인 공연은 날짜가 지나도 저장할 수 있어야 한다(공연 당일 입장 확인).
export function saleBlockers(show: ReadinessInput, { alreadyOnSale = false, now = new Date() } = {}) {
  return showReadiness(show, now).filter((item) => item.required && !item.ok && !(alreadyOnSale && item.key === "date"));
}
