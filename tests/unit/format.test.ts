import { describe, expect, it } from "vitest";
import { bookingNumber, formatDate, formatDateTime, formatSessionDate, formatTime, fromKstInput, kstDayKey, toKstInput, won } from "@/lib/format";

describe("한국 시간 표시 (이 시험은 미국 시간대에서 돈다)", () => {
  it("UTC 09:00은 한국 18:00", () => {
    expect(formatSessionDate("2027-02-21T09:00:00Z")).toBe("2027.02.21 (일) 18:00");
    expect(formatTime("2027-02-21T09:00:00Z")).toBe("18:00");
  });
  it("한국 자정은 24시가 아니라 00시", () => {
    expect(formatTime("2027-02-20T15:30:00Z")).toBe("00:30");
    expect(formatDateTime("2027-02-20T15:30:00Z")).toBe("2027.02.21 00:30");
  });
  it("UTC로는 전날이어도 한국 날짜로 묶는다", () => {
    expect(kstDayKey("2027-02-20T16:00:00Z")).toBe("2027-02-21");
    expect(formatDate("2027-02-20T16:00:00Z")).toBe("2027.02.21 (일)");
  });
  it("관리자 날짜 칸 ↔ 한국 시간: 컴퓨터 시간대와 상관없이 같은 시각", () => {
    expect(fromKstInput("2027-02-21T18:00").toISOString()).toBe("2027-02-21T09:00:00.000Z");
    expect(fromKstInput("2027-02-21T18:00:30").toISOString()).toBe("2027-02-21T09:00:30.000Z");
    expect(toKstInput("2027-02-21T09:00:00.000Z")).toBe("2027-02-21T18:00");
    expect(toKstInput(fromKstInput("2027-01-01T00:05"))).toBe("2027-01-01T00:05");
  });
});

describe("기타 표시", () => {
  it("원 단위 쉼표", () => {
    expect(won(7000)).toBe("7,000원");
    expect(won(0)).toBe("0원");
  });
  it("예매번호는 id 끝 8자리 대문자", () => {
    expect(bookingNumber("cmx1abcdefgh12345678")).toBe("12345678");
    expect(bookingNumber("ckabcdefxyz")).toBe("ABCDEFXYZ".slice(-8));
  });
});
