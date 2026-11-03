import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { BUSY_ERROR, HttpError, SERVER_ERROR, readBody, route } from "@/lib/http";
import { batchConfirmInput, bookingInput, checkInInput, loginInput, staffCancelInput } from "@/lib/inputs";

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
    expect((await errorOf(readBody(req("null"), checkInInput))).message).toBe("QR을 찍거나 토큰을 적어 주세요.");
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
