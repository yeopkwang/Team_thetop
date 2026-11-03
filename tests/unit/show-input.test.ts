import { describe, expect, it } from "vitest";
import { showInput } from "@/lib/admin-shows";

const base = {
  title: "작전명문 5",
  price: 7000,
  status: "ON_SALE",
  session: { date: "2027-02-21T09:00:00.000Z", totalCapacity: 100 },
};
const firstError = (body: object) => {
  const r = showInput.safeParse(body);
  return r.success ? null : r.error.issues[0].message;
};

describe("공연 입력", () => {
  it("기본값: 입금 기한 24시간, 셋리스트 비공개, 빈 안내문, 회차 이름 1회차", () => {
    const v = showInput.parse(base);
    expect(v.paymentHours).toBe(24);
    expect(v.setlistPublic).toBe(false);
    expect(v.introText).toBe("");
    expect(v.session.title).toBe("1회차");
    expect(v.setlist).toEqual([]);
    expect(v.salesOpenAt).toBeNull();
  });
  it("관람료·정원 경계: 0원·1명·100만원·10만명은 통과", () => {
    expect(firstError({ ...base, price: 0, session: { ...base.session, totalCapacity: 1 } })).toBeNull();
    expect(firstError({ ...base, price: 1_000_000, session: { ...base.session, totalCapacity: 100_000 } })).toBeNull();
  });
  it.each([
    [{ ...base, price: -1 }, "관람료"],
    [{ ...base, price: 3_000_000_000 }, "관람료"],
    [{ ...base, price: "abc" }, "관람료"],
    [{ ...base, price: 7000.5 }, "관람료"],
    [{ ...base, session: { ...base.session, totalCapacity: 0 } }, "정원"],
    [{ ...base, session: { ...base.session, totalCapacity: 1e10 } }, "정원"],
    [{ ...base, paymentHours: -1 }, "입금 기한"],
    [{ ...base, paymentHours: 337 }, "입금 기한"],
    [{ ...base, title: "  " }, "공연명"],
    [{ ...base, status: "PUBLISHED" }, "공연 상태"],
    [{ ...base, session: { ...base.session, date: "내일" } }, "공연 일시"],
    [{ ...base, session: undefined }, "공연 일시와 정원"],
    [{ ...base, salesOpenAt: "2027-01-01" }, "티켓 오픈 일시"],
  ])("틀린 값은 어느 칸인지 알 수 있는 한국어 문구로 거부 %#", (body, field) => {
    expect(firstError(body)).toContain(field);
  });
  it("포스터 주소는 사이트 안 경로나 https만", () => {
    expect(firstError({ ...base, posterUrl: "/api/assets/abc" })).toBeNull();
    expect(firstError({ ...base, posterUrl: "https://example.com/p.jpg" })).toBeNull();
    expect(firstError({ ...base, posterUrl: "" })).toBeNull();
    expect(firstError({ ...base, posterUrl: "javascript:alert(1)" })).toContain("포스터 주소");
    expect(firstError({ ...base, posterUrl: "//evil.com/p.png" })).toContain("포스터 주소");
    expect(firstError({ ...base, posterUrl: "http://example.com/p.jpg" })).toContain("포스터 주소");
  });
  it("셋리스트는 저장 전에 정리된다", () => {
    const v = showInput.parse({ ...base, setlist: [{ name: "1부", songs: [{ title: "곡" }, { title: "" }] }, "쓰레기"] });
    expect(v.setlist).toEqual([{ name: "1부", songs: [{ title: "곡", artist: "", lineup: [] }] }]);
  });
});
