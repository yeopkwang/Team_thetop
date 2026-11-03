import { describe, expect, it } from "vitest";
import { salesState, untilText } from "@/lib/sales";

const NOW = Date.parse("2027-02-01T00:00:00Z");
const later = (ms: number) => new Date(NOW + ms).toISOString();

describe("salesState", () => {
  const open = [{ startsAt: later(86_400_000), remaining: 3 }];

  it("오픈 시각 전이면 upcoming(좌석이 있어도)", () => {
    expect(salesState(later(1000), open, NOW)).toBe("upcoming");
  });
  it("오픈 시각이 지났거나 없으면 open", () => {
    expect(salesState(later(-1000), open, NOW)).toBe("open");
    expect(salesState(null, open, NOW)).toBe("open");
  });
  it("오픈 시각과 지금이 같으면 열린 것으로 본다(경계)", () => {
    expect(salesState(later(0), open, NOW)).toBe("open");
  });
  it("남은 회차가 모두 0석이면 soldout", () => {
    expect(salesState(null, [{ startsAt: later(1000), remaining: 0 }], NOW)).toBe("soldout");
  });
  it("시작한 회차는 빼고 본다: 남은 회차가 없으면 closed", () => {
    expect(salesState(null, [{ startsAt: later(-1), remaining: 50 }], NOW)).toBe("closed");
    expect(salesState(null, [{ startsAt: later(0), remaining: 50 }], NOW)).toBe("closed");
    expect(salesState(null, [], NOW)).toBe("closed");
  });
  it("시작한 회차가 매진이 아니어도, 남은 회차가 매진이면 soldout", () => {
    expect(
      salesState(null, [{ startsAt: later(-1000), remaining: 9 }, { startsAt: later(1000), remaining: 0 }], NOW)
    ).toBe("soldout");
  });
});

describe("untilText", () => {
  it("하루 이상이면 '○일 ○시간 남음'", () => {
    expect(untilText(later((2 * 24 + 3) * 3600_000 + 59_000), NOW)).toBe("2일 3시간 남음");
  });
  it("하루 안이면 시:분:초", () => {
    expect(untilText(later(3600_000 + 2 * 60_000 + 5_000), NOW)).toBe("01:02:05");
  });
  it("지났으면 00:00:00(음수로 보이지 않게)", () => {
    expect(untilText(later(-5000), NOW)).toBe("00:00:00");
  });
});
