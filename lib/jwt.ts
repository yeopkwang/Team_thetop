import { createHmac, timingSafeEqual } from "crypto";

type TokenPayload = {
  userId: string;
  exp: number;
  // 발급 시각(초). 비밀번호를 바꾸기 전에 받은 토큰을 끊을 때 본다. 예전 토큰에는 없다.
  iat?: number;
};

// 기본값을 두지 않는다. 공개 레포에 적힌 값으로 서명하면 누구나 관리자 토큰을 만들 수 있다.
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET 환경변수를 32자 이상으로 설정해 주세요.");
  }
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(input: string) {
  return createHmac("sha256", getSecret())
    .update(input)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createToken(userId: string, expiresInSeconds = 60 * 60 * 24 * 7) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { userId, iat: now, exp: now + expiresInSeconds };
  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${header}.${payloadPart}`;
  const signature = sign(unsigned);
  return `${unsigned}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payloadPart, sig] = parts;
  const unsigned = `${header}.${payloadPart}`;
  const expected = sign(unsigned);

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart)) as TokenPayload;
    if (!payload?.userId || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
