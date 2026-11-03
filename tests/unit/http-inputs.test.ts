import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { BUSY_ERROR, HttpError, SERVER_ERROR, readBody, route } from "@/lib/http";
import {
  accountCreateInput,
  batchConfirmInput,
  bookingInput,
  checkInInput,
  depositorInput,
  loginInput,
  passwordChangeInput,
  passwordResetInput,
  refundInput,
  staffCancelInput,
} from "@/lib/inputs";

const req = (body: string) => new Request("http://x/api", { method: "POST", body, headers: { "Content-Type": "application/json" } });
const errorOf = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as HttpError;
  }
  throw new Error("오류가 나야 하는데 통과했다");
};

describe("readBody", () => {
  it("JSON이 아니면 400", async () => {
    const e = await errorOf(readBody(req("{"), bookingInput));
    expect(e).toBeInstanceOf(HttpError);
    expect(e.status).toBe(400);
  });
  it("빈 본문·null도 400(빈 객체로 보고 필수값 문구)", async () => {
    expect((await errorOf(readBody(req(""), checkInInput))).message).toBe("요청 내용을 읽지 못했어요.");
    expect((await errorOf(readBody(req("null"), checkInInput))).message).toBe("QR을 찍거나 관객을 골라 주세요.");
  });
});

describe("route", () => {
  it("HttpError는 그 상태 코드와 문구로 응답", async () => {
    const res = await route(async () => {
      throw new HttpError(409, "이미 처리됐어요.");
    })(new Request("http://x"), { params: {} });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "이미 처리됐어요." });
  });
  it("알 수 없는 오류는 내용을 감추고 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await route(async () => {
      throw new Error("DB 비밀번호가 틀림 postgres://...");
    })(new Request("http://x"), { params: {} });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: SERVER_ERROR });
  });
  it("트랜잭션·연결 대기 초과(티켓 오픈 쏠림)는 503 '요청이 몰려 있어요'", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const code of ["P2024", "P2028", "P2034"]) {
      const res = await route(async () => {
        throw new Prisma.PrismaClientKnownRequestError("timeout", { code, clientVersion: "5.22.0" });
      })(new Request("http://x"), { params: {} });
      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe(BUSY_ERROR);
    }
  });
});

describe("예매 입력", () => {
  const ok = { sessionId: "s1", preferredPerformerName: "  없음 ", depositorName: "  김   민지 " };
  it("공백을 정리하고 매수 기본값 1", () => {
    expect(bookingInput.parse(ok)).toEqual({ sessionId: "s1", quantity: 1, preferredPerformerName: "없음", depositorName: "김 민지" });
  });
  it.each([
    [{ ...ok, depositorName: "   " }, "입금자명을 적어 주세요"],
    [{ ...ok, depositorName: undefined }, "입금자명을 적어 주세요"],
    [{ ...ok, depositorName: 123 }, "입금자명을 적어 주세요"],
    [{ ...ok, depositorName: "가".repeat(21) }, "20자 안으로"],
    [{ ...ok, preferredPerformerName: "" }, "관심 있는 공연자"],
    [{ ...ok, preferredPerformerName: "가".repeat(51) }, "50자 안으로"],
    [{ ...ok, sessionId: "" }, "관람 회차"],
    [{ ...ok, quantity: 2 }, "1인 1매"],
    [{ ...ok, quantity: 0 }, "1인 1매"],
    [{ ...ok, quantity: "1" }, "1인 1매"],
  ])("틀린 값은 한국어 문구로 거부 %#", (body, message) => {
    const r = bookingInput.safeParse(body);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain(message);
  });
  it("경계값: 입금자명 20자, 공연자 50자는 통과", () => {
    expect(bookingInput.safeParse({ ...ok, depositorName: "가".repeat(20), preferredPerformerName: "나".repeat(50) }).success).toBe(true);
  });
});

describe("운영진 입력", () => {
  it("취소 사유: 공백만은 거부, 100자까지", () => {
    expect(staffCancelInput.safeParse({ reason: "  " }).success).toBe(false);
    expect(staffCancelInput.safeParse({ reason: "가".repeat(100) }).success).toBe(true);
    expect(staffCancelInput.safeParse({ reason: "가".repeat(101) }).success).toBe(false);
  });
  it("한 번에 입금 확인: 1~200건", () => {
    expect(batchConfirmInput.safeParse({ ids: [] }).success).toBe(false);
    expect(batchConfirmInput.safeParse({ ids: Array.from({ length: 200 }, (_, i) => `id${i}`) }).success).toBe(true);
    expect(batchConfirmInput.safeParse({ ids: Array.from({ length: 201 }, (_, i) => `id${i}`) }).success).toBe(false);
    expect(batchConfirmInput.safeParse({ ids: "abc" }).success).toBe(false);
  });
  it("로그인: 아이디 앞뒤 공백은 지우고, 빈 값은 거부", () => {
    expect(loginInput.parse({ id: " admin ", password: "pw" }).id).toBe("admin");
    expect(loginInput.safeParse({ id: "admin" }).success).toBe(false);
  });
});

describe("새 입력: 환불 계좌 · 입금자명 · 입장 · 계정", () => {
  const ok = { reservationId: "r1", bank: " 카카오뱅크 ", account: "3333 01-234567", holder: "홍길동" };
  it("환불 계좌: 공백을 지우고 숫자와 -만 받는다", () => {
    expect(refundInput.parse(ok)).toEqual({ reservationId: "r1", bank: "카카오뱅크", account: "333301-234567", holder: "홍길동" });
    expect(refundInput.safeParse({ ...ok, account: "3333-01-23456a" }).error?.issues[0].message).toBe("계좌번호는 숫자와 -만 적어 주세요.");
  });
  it("환불 계좌: 숫자 6~20자리(경계값)", () => {
    expect(refundInput.safeParse({ ...ok, account: "12345" }).success).toBe(false);
    expect(refundInput.safeParse({ ...ok, account: "123-456" }).success).toBe(true);
    expect(refundInput.safeParse({ ...ok, account: "1".repeat(20) }).success).toBe(true);
    expect(refundInput.safeParse({ ...ok, account: "1".repeat(21) }).success).toBe(false);
    expect(refundInput.safeParse({ ...ok, account: "------" }).success).toBe(false);
  });
  it("환불 계좌: 은행·예금주가 비면 그 칸을 알려 준다", () => {
    expect(refundInput.safeParse({ ...ok, bank: " " }).error?.issues[0].message).toBe("환불받을 은행을 적어 주세요.");
    expect(refundInput.safeParse({ reservationId: "r1" }).success).toBe(false);
  });
  it("입금자명 고치기: 예매 때와 같은 규칙(공백 정리, 20자)", () => {
    expect(depositorInput.parse({ depositorName: "  김   민지 " })).toEqual({ depositorName: "김 민지" });
    expect(depositorInput.safeParse({ depositorName: "가".repeat(21) }).success).toBe(false);
  });
  it("입장: QR 토큰이나 예매 id 둘 중 하나는 있어야 한다", () => {
    expect(checkInInput.safeParse({ qrToken: "abc" }).success).toBe(true);
    expect(checkInInput.safeParse({ bookingId: "r1" }).success).toBe(true);
    expect(checkInInput.safeParse({ qrToken: " ", bookingId: "" }).success).toBe(false);
  });
  it("계정 만들기: 아이디는 소문자로 바꾸고 3~30자 영문·숫자·._-", () => {
    const base = { username: "Door.Staff", name: "입구 스태프", password: "0123456789", role: "STAFF" };
    expect(accountCreateInput.parse(base).username).toBe("door.staff");
    expect(accountCreateInput.safeParse({ ...base, username: "ab" }).success).toBe(false);
    expect(accountCreateInput.safeParse({ ...base, username: "a".repeat(31) }).success).toBe(false);
    expect(accountCreateInput.safeParse({ ...base, username: "김스태프" }).error?.issues[0].message).toContain("영문 소문자");
  });
  it("계정 만들기: 비밀번호 10자(경계값), 권한은 관리자·스태프만", () => {
    const base = { username: "door", name: "입구", password: "0123456789", role: "STAFF" };
    expect(accountCreateInput.safeParse({ ...base, password: "012345678" }).error?.issues[0].message).toBe("임시 비밀번호는 10자 이상이어야 해요.");
    expect(accountCreateInput.safeParse({ ...base, role: "SUPER_ADMIN" }).success).toBe(false);
    expect(accountCreateInput.safeParse({ ...base, role: "USER" }).success).toBe(false);
    expect(accountCreateInput.safeParse({ ...base, role: "ADMIN" }).success).toBe(true);
  });
  it("비밀번호 바꾸기: 새 비밀번호 10자 이상", () => {
    expect(passwordChangeInput.safeParse({ current: "x", next: "short" }).error?.issues[0].message).toBe("새 비밀번호는 10자 이상이어야 해요.");
    expect(passwordResetInput.safeParse({ password: "0123456789" }).success).toBe(true);
  });
});
