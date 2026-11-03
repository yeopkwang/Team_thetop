import { describe, expect, it } from "vitest";
import { faqItems } from "@/lib/faq";
import { saleBlockers, showReadiness, type ReadinessInput } from "@/lib/readiness";

const NOW = new Date("2026-11-05T00:00:00Z");
const ready: ReadinessInput = {
  title: "작전명문 5",
  sessionDate: "2027-02-21T09:00:00Z",
  totalCapacity: 100,
  price: 7000,
  paymentBank: "카카오뱅크",
  paymentAccount: "3333-01-234567",
  paymentHolder: "홍길동",
  dateLabel: "2027년 02월 21일 (일)",
  venue: "반송 아트홀",
  posterUrl: "/posters/p.png",
  contactName: "",
  contactTag: "@band.bansong",
  refundContact: "010-0000-0000",
  salesText: "# 환불 기준",
};
const keys = (items: { key: string }[]) => items.map((i) => i.key);

describe("판매 전 점검", () => {
  it("다 채우면 막는 것도 권장할 것도 없다", () => {
    expect(showReadiness(ready, NOW).every((i) => i.ok)).toBe(true);
    expect(saleBlockers(ready, { now: NOW })).toEqual([]);
  });
  it("관람료가 있는데 계좌 셋 중 하나라도 비면 막는다", () => {
    for (const field of ["paymentBank", "paymentAccount", "paymentHolder"] as const) {
      expect(keys(saleBlockers({ ...ready, [field]: "  " }, { now: NOW }))).toEqual(["account"]);
    }
  });
  it("무료 공연(0원)은 계좌가 없어도 된다", () => {
    expect(saleBlockers({ ...ready, price: 0, paymentBank: "", paymentAccount: "", paymentHolder: "" }, { now: NOW })).toEqual([]);
  });
  it("공연 일시가 지났거나 없거나 엉터리면 막는다", () => {
    for (const sessionDate of ["2026-11-04T23:59:59Z", null, "내일"]) {
      expect(keys(saleBlockers({ ...ready, sessionDate }, { now: NOW }))).toEqual(["date"]);
    }
  });
  it("이미 판매 중인 공연은 날짜가 지나도 저장할 수 있다(공연 당일 입장 확인)", () => {
    expect(saleBlockers({ ...ready, sessionDate: "2026-11-04T00:00:00Z" }, { alreadyOnSale: true, now: NOW })).toEqual([]);
  });
  it("공연명·정원도 꼭 필요하다", () => {
    expect(keys(saleBlockers({ ...ready, title: " ", totalCapacity: 0 }, { now: NOW }))).toEqual(["title", "capacity"]);
  });
  it("포스터·장소 등은 권장일 뿐 막지 않는다", () => {
    const sparse = { ...ready, venue: "", posterUrl: null, dateLabel: "", contactTag: "", refundContact: "", salesText: "" };
    expect(saleBlockers(sparse, { now: NOW })).toEqual([]);
    expect(keys(showReadiness(sparse, NOW).filter((i) => !i.ok))).toEqual(["dateLabel", "venue", "poster", "contact", "refundContact", "salesText"]);
  });
});

describe("자주 묻는 질문", () => {
  const show = { paymentHours: 24, salesOpenAt: new Date("2027-01-10T03:00:00Z"), contactName: "대표 홍길동", contactTag: "", refundContact: "010-1111-2222" };
  const answer = (items: ReturnType<typeof faqItems>, q: string) => items.find((i) => i.q.startsWith(q))!.a.join(" ");

  it("입금 기한과 문의처는 공연 설정을 따른다", () => {
    const items = faqItems(show, NOW);
    expect(answer(items, "언제까지")).toContain("24시간 안에");
    expect(answer(items, "입금자명을")).toContain("대표 홍길동");
    expect(answer(items, "환불은")).toContain("010-1111-2222");
  });
  it("입금 기한 0이면 '공연 시작 전까지'", () => {
    expect(answer(faqItems({ ...show, paymentHours: 0 }, NOW), "언제까지")).toContain("공연 시작 전까지");
  });
  it("오픈 전이면 오픈 일시(한국 시간), 지났으면 일반 안내", () => {
    expect(answer(faqItems(show, NOW), "티켓은")).toContain("2027.01.10 (일) 12:00");
    expect(answer(faqItems(show, new Date("2027-02-01T00:00:00Z")), "티켓은")).toContain("알려 드려요");
  });
  it("판매 중인 공연이 없어도 답이 비지 않고, 문의처는 인스타그램", () => {
    const items = faqItems(null, NOW);
    expect(items.every((i) => i.a.length > 0 && i.a.every(Boolean))).toBe(true);
    expect(answer(items, "그 밖에")).toContain("@band.bansong");
  });
});
