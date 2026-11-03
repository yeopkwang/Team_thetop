import { describe, expect, it } from "vitest";
import { menuItemFor } from "@/components/admin/StaffLevel";
import { parseCredits, performerNames } from "@/lib/credits";
import { maskAccount } from "@/lib/format";
import { LOGIN_ERRORS, loginErrorMessage } from "@/lib/login-errors";
import { paymentDeadline } from "@/lib/reservations";
import { staffLevel } from "@/lib/roles";
import { sameOriginPath } from "@/lib/safe-next";
import { isClosedStatus, refundStatus, reservationStatus } from "@/lib/status";

describe("크레딧", () => {
  it("'파트: 이름, 이름' 줄을 읽는다(전각 콜론·여러 구분자, 콜론 없는 줄은 파트 없음)", () => {
    expect(parseCredits("보컬: 가, 나\n기타：다·라\n\n마/바\n빈파트:  ")).toEqual([
      { role: "보컬", names: ["가", "나"] },
      { role: "기타", names: ["다", "라"] },
      { role: "", names: ["마", "바"] },
    ]);
  });
  it("예매 화면 공연자 목록은 처음 나온 순서대로 한 번씩", () => {
    expect(performerNames("보컬: 가, 나\n기타: 나, 다")).toEqual(["가", "나", "다"]);
  });
});

describe("입금 기한", () => {
  const start = new Date("2027-02-21T09:00:00Z");
  it("예매 후 N시간", () => {
    expect(paymentDeadline(24, start, new Date("2027-02-01T00:00:00Z")).toISOString()).toBe("2027-02-02T00:00:00.000Z");
  });
  it("공연 시작을 넘기지 않는다", () => {
    expect(paymentDeadline(24, start, new Date("2027-02-21T00:00:00Z"))).toEqual(start);
  });
  it("0이면 공연 시작 때까지", () => {
    expect(paymentDeadline(0, start, new Date("2027-01-01T00:00:00Z"))).toEqual(start);
  });
});

describe("로그인 뒤 돌아갈 주소", () => {
  const origin = "https://www.band-bansong.life";
  it.each([
    ["/book?session=1", "/book?session=1"],
    ["/myticket#x", "/myticket#x"],
  ])("이 사이트 경로는 받는다: %s", (raw, expected) => {
    expect(sameOriginPath(raw, origin)).toBe(expected);
  });
  it.each(["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "javascript:alert(1)", "", "book"])(
    "다른 사이트로 가는 주소는 막는다: %j",
    (raw) => {
      expect(sameOriginPath(raw, origin)).toBeNull();
    }
  );
  it("null·undefined도 null", () => {
    expect(sameOriginPath(null, origin)).toBeNull();
    expect(sameOriginPath(undefined, origin)).toBeNull();
  });
});

describe("로그인 오류 문구", () => {
  it("정해진 코드만 그 문구로, 모르는 값은 일반 실패 문구로(주소의 문장을 그대로 보여 주지 않는다)", () => {
    expect(loginErrorMessage("kakao_denied")).toBe(LOGIN_ERRORS.kakao_denied);
    expect(loginErrorMessage("운영진에게 비밀번호를 보내세요")).toBe(LOGIN_ERRORS.kakao_failed);
    expect(loginErrorMessage(null)).toBe("");
  });
});

describe("상태 문구", () => {
  it("끝난 예매만 다시 예매할 수 있다", () => {
    expect(["CANCELLED", "EXPIRED", "REFUNDED"].every(isClosedStatus)).toBe(true);
    expect(["PAYMENT_PENDING", "CONFIRMED", "REFUND_PENDING"].some(isClosedStatus)).toBe(false);
  });
  it("모르는 상태는 그대로 보여 준다", () => {
    expect(reservationStatus("CONFIRMED").label).toBe("예매 완료");
    expect(reservationStatus("WHAT")).toEqual({ label: "WHAT", tone: "muted" });
    expect(refundStatus("PENDING").label).toBe("환불 대기");
    expect(refundStatus("X").label).toBe("X");
  });
});

describe("운영진 권한", () => {
  it("관리자 > 스태프 > 아님", () => {
    expect(staffLevel(["USER", "ADMIN"])).toBe("admin");
    expect(staffLevel(["SUPER_ADMIN"])).toBe("admin");
    expect(staffLevel(["STAFF"])).toBe("staff");
    expect(staffLevel(["USER"])).toBeNull();
    expect(staffLevel([])).toBeNull();
  });
  it("관리자 메뉴: 가장 길게 맞는 메뉴를 고른다", () => {
    expect(menuItemFor("/admin")?.href).toBe("/admin");
    expect(menuItemFor("/admin/reservations/print")?.href).toBe("/admin/reservations");
    expect(menuItemFor("/admin/shows/new")?.staff).toBe(false);
    expect(menuItemFor("/admin/accounts")?.staff).toBe(true);
    expect(menuItemFor("/admin/nope")).toBeUndefined();
  });
});

describe("계좌번호 가리기", () => {
  it("끝 네 자리만 남긴다", () => {
    expect(maskAccount("3333-01-234567")).toBe("****4567");
    expect(maskAccount("123")).toBe("****123");
    expect(maskAccount("")).toBe("");
    expect(maskAccount("****4567")).toBe("****4567");
  });
});
