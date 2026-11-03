import { createHmac } from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createToken, verifyToken } from "@/lib/jwt";

const SECRET = "unit-test-secret-0123456789abcdefghij";
const b64u = (s: string) => Buffer.from(s).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const sign = (unsigned: string, secret = SECRET) =>
  createHmac("sha256", secret).update(unsigned).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const forge = (payload: object, secret = SECRET) => {
  const unsigned = `${b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64u(JSON.stringify(payload))}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
};

describe("로그인 토큰", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("만든 토큰은 통과하고 사용자 id가 나온다", () => {
    expect(verifyToken(createToken("user-1"))?.userId).toBe("user-1");
  });
  it("내용을 바꾸면(관리자 id로 바꿔치기) 서명이 안 맞아 거부", () => {
    const [h, , s] = createToken("user-1").split(".");
    const tampered = `${h}.${b64u(JSON.stringify({ userId: "admin", exp: 9999999999 }))}.${s}`;
    expect(verifyToken(tampered)).toBeNull();
  });
  it("다른 비밀값으로 서명한 토큰은 거부", () => {
    expect(verifyToken(forge({ userId: "admin", exp: 9999999999 }, "dev_next_jwt_secret_change_me_32bytes_min"))).toBeNull();
  });
  it("기한이 지나면 거부", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    const token = createToken("user-1", 60);
    vi.setSystemTime(new Date("2027-01-01T00:01:01Z"));
    expect(verifyToken(token)).toBeNull();
  });
  it("모양이 틀린 토큰은 거부(조각 수, 깨진 JSON, 빠진 값)", () => {
    expect(verifyToken("abc")).toBeNull();
    expect(verifyToken("a.b.c.d")).toBeNull();
    const unsigned = `${b64u("{}")}.${b64u("not json")}`;
    expect(verifyToken(`${unsigned}.${sign(unsigned)}`)).toBeNull();
    expect(verifyToken(forge({ exp: 9999999999 }))).toBeNull();
    expect(verifyToken(forge({ userId: "u", exp: "soon" }))).toBeNull();
  });
  it("비밀값이 없거나 32자보다 짧으면 토큰을 만들지 않는다(공개 레포의 기본값으로 서명하지 않게)", () => {
    delete process.env.JWT_SECRET;
    expect(() => createToken("u")).toThrow(/JWT_SECRET/);
    process.env.JWT_SECRET = "short";
    expect(() => createToken("u")).toThrow(/JWT_SECRET/);
  });
});

describe("발급 시각", () => {
  it("토큰에 발급 시각(iat, 초)을 담는다. 비밀번호를 바꾸기 전에 받은 토큰을 가려낼 때 쓴다", () => {
    process.env.JWT_SECRET = SECRET;
    const before = Math.floor(Date.now() / 1000);
    const payload = verifyToken(createToken("u1", 60))!;
    expect(payload.iat).toBeGreaterThanOrEqual(before);
    expect(payload.exp - payload.iat!).toBe(60);
  });
});
