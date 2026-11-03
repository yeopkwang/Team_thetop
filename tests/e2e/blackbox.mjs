// 블랙박스 시험: 실행 중인 앱에 HTTP 요청을 보내고 응답(상태 코드·문구·화면 HTML)만 보고 판정한다.
// 카카오 로그인은 자동화할 수 없어서, 관객 계정을 DB에 만들고 같은 비밀값으로 토큰을 서명해 쓴다.
// 기한이 지나는 상황도 DB에서 기한만 앞당겨 만든다. 판정은 늘 앱의 응답으로 한다.
// tests/e2e/run.mjs가 DB 준비·서버 실행을 맡는다. 직접 돌리려면 E2E_BASE, E2E_DB, JWT_SECRET, SEED_ADMIN_PASSWORD, CRON_SECRET이 필요하다.
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;
const BASE = process.env.E2E_BASE;
const SECRET = process.env.JWT_SECRET;
const prisma = new PrismaClient({ datasources: { db: { url: process.env.E2E_DB } } });

// ---------- 도우미 ----------
let failures = 0;
let passes = 0;
const errorMessages = [];
const section = (name) => console.log(`\n■ ${name}`);
const check = (name, ok, detail = "") => {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  — ${detail}` : ""}`);
};
const b64u = (s) => Buffer.from(s).toString("base64url");
function token(userId, { secret = SECRET, exp = Math.floor(Date.now() / 1000) + 3600 } = {}) {
  const unsigned = `${b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64u(JSON.stringify({ userId, exp }))}`;
  return `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
}
async function api(path, { token: t, method = "GET", body, raw } = {}) {
  const headers = {};
  if (t) headers.Authorization = `Bearer ${t}`;
  if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + "/api" + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (res.status >= 400 && data?.error) errorMessages.push(`${res.status} ${path}: ${data.error}`);
  return { status: res.status, data };
}
const page = async (path) => {
  const res = await fetch(BASE + path);
  return { status: res.status, html: await res.text() };
};
const statuses = (rs) => rs.map((r) => r.status).sort().join(",");
const userRole = await prisma.role.findUniqueOrThrow({ where: { type: "USER" } });
let userSeq = 0;
async function makeUsers(n, prefix) {
  const users = [];
  for (let i = 0; i < n; i++) {
    const u = await prisma.user.create({ data: { name: `${prefix}${i}`, kakaoId: `${prefix}-${++userSeq}-${Date.now()}` } });
    await prisma.userRole.create({ data: { userId: u.id, roleId: userRole.id } });
    users.push({ ...u, token: token(u.id) });
  }
  return users;
}
// 예매 화면의 'N석 남음'(또는 매진)을 읽는다.
async function seatsLeft() {
  const { html } = await page("/book");
  const m = html.match(/(\d+)석 남음/);
  return m ? Number(m[1]) : html.includes("매진") ? 0 : NaN;
}
const PAST = () => new Date(Date.now() - 1000);
let n = 0;
const book = (u, extra = {}) =>
  api("/bookings", {
    token: u.token,
    method: "POST",
    body: { sessionId, quantity: 1, preferredPerformerName: "없음", depositorName: `입금자${++n}`, ...extra },
  });
const dash = async (u) => (await api("/my/ticket-dashboard", { token: u.token })).data;
// 환불 요청 본문: 환불받을 계좌까지
const refundBody = (reservationId) => ({ reservationId, bank: "시험은행", account: "110-123-456789", holder: "홍길동" });

// ======================================================================
section("A. 인증·권한 (동등 분할: 토큰 없음 · 깨진 토큰 · 위조 · 만료 · 관객 · 운영진)");
const login = await api("/auth/login", { method: "POST", body: { id: "admin", password: process.env.SEED_ADMIN_PASSWORD } });
check("운영진 로그인", login.status === 200 && !!login.data?.token, `status ${login.status}`);
const admin = login.data.token;
const adminUserId = login.data.user.id;
const exp = JSON.parse(Buffer.from(admin.split(".")[1], "base64url").toString()).exp;
check("운영진 토큰은 12시간짜리(관객 7일보다 짧게)", Math.abs(exp - (Date.now() / 1000 + 12 * 3600)) < 300);
const wrongPw = await api("/auth/login", { method: "POST", body: { id: "admin", password: "wrong-password" } });
const noUser = await api("/auth/login", { method: "POST", body: { id: "nobody", password: "wrong-password" } });
check("틀린 비밀번호와 없는 아이디는 같은 401 문구(아이디가 있는지 알려 주지 않는다)", wrongPw.status === 401 && noUser.status === 401 && wrongPw.data.error === noUser.data.error);
check("아이디·비밀번호 빈칸은 400", (await api("/auth/login", { method: "POST", body: { id: " ", password: "" } })).status === 400);
check("로그인에 깨진 JSON은 400(500이 아니라)", (await api("/auth/login", { method: "POST", raw: "{" })).status === 400);

const [audience] = await makeUsers(1, "aud");
await prisma.credential.create({ data: { userId: audience.id, username: "audience-pw", passwordHash: await bcrypt.hash("audience-pass-1234", 10) } });
check("관객 계정은 비밀번호가 맞아도 운영진 로그인 불가(403)", (await api("/auth/login", { method: "POST", body: { id: "audience-pw", password: "audience-pass-1234" } })).status === 403);

check("내 정보: 토큰 없으면 401", (await api("/auth/me")).status === 401);
check("내 정보: 깨진 토큰 401", (await api("/auth/me", { token: "garbage" })).status === 401);
check("내 정보: 옛 기본 비밀값으로 위조한 운영진 토큰 401", (await api("/auth/me", { token: token(adminUserId, { secret: "dev_next_jwt_secret_change_me_32bytes_min" }) })).status === 401);
check("내 정보: 기한 지난 토큰 401", (await api("/auth/me", { token: token(audience.id, { exp: Math.floor(Date.now() / 1000) - 60 }) })).status === 401);
check("내 정보: 없는 사용자의 토큰 401", (await api("/auth/me", { token: token("no-such-user") })).status === 401);
const me = await api("/auth/me", { token: audience.token });
check("관객의 내 정보에는 USER 역할만", me.status === 200 && me.data.user.roles.join() === "USER");

for (const path of ["/admin/shows", "/admin/reservations", "/admin/refunds", "/admin/bookings/pending"]) {
  const [anon, aud, adm] = [await api(path), await api(path, { token: audience.token }), await api(path, { token: admin })];
  check(`관리자 목록 ${path}: 없음 401 · 관객 403 · 운영진 200`, anon.status === 401 && aud.status === 403 && adm.status === 200, `${anon.status}/${aud.status}/${adm.status}`);
}
for (const [path, body] of [
  ["/admin/checkin", { qrToken: "x" }],
  ["/admin/bookings/confirm", { ids: ["x"] }],
  ["/admin/bookings/x/confirm", {}],
  ["/admin/bookings/x/cancel", { reason: "r" }],
  ["/admin/refunds/x/refund", {}],
  ["/admin/refunds/x/revert", {}],
  ["/admin/shows", {}],
]) {
  check(`관리자 처리 ${path}: 관객은 403`, (await api(path, { token: audience.token, method: "POST", body })).status === 403);
}

section("A-2. 카카오 로그인 (로그인 바꿔치기 방지)");
const start = await fetch(BASE + "/api/auth/kakao/start", { redirect: "manual" });
const loc = new URL(start.headers.get("location") || "http://x");
const setCookie = start.headers.get("set-cookie") || "";
check(
  "카카오로 보낼 때 state를 붙이고 같은 값을 httpOnly 쿠키로 남긴다",
  start.status === 307 && loc.host === "kauth.kakao.com" && !!loc.searchParams.get("state") && setCookie.includes(`kakao_state=${loc.searchParams.get("state")}`) && /httponly/i.test(setCookie)
);
check("돌아올 주소는 APP_URL의 콜백", loc.searchParams.get("redirect_uri") === `${BASE}/api/auth/kakao/callback`);
const callback = async (qs, cookie) =>
  (await fetch(`${BASE}/api/auth/kakao/callback${qs}`, { redirect: "manual", headers: cookie ? { cookie } : {} })).headers.get("location") || "";
check("코드 없이 돌아오면 kakao_failed", (await callback("")).endsWith("/login?error=kakao_failed"));
check("카카오에서 취소하면 kakao_denied", (await callback("?error=access_denied")).endsWith("/login?error=kakao_denied"));
check("state 쿠키 없이 남이 만든 콜백 주소로 오면 거부", (await callback("?code=attacker&state=s1")).endsWith("/login?error=kakao_failed"));
check("state가 쿠키와 다르면 거부", (await callback("?code=attacker&state=s2", "kakao_state=s1")).endsWith("/login?error=kakao_failed"));
check("토큰 넘김 쿠키 없이 토큰을 달라고 하면 401", (await api("/auth/kakao/session", { method: "POST", body: {} })).status === 401);
const handoff = await fetch(BASE + "/api/auth/kakao/session", { method: "POST", headers: { cookie: `kakao_handoff=${audience.token}` } });
check(
  "넘김 쿠키가 있으면 토큰을 한 번 주고 쿠키를 지운다",
  handoff.status === 200 && (await handoff.json()).token === audience.token && /kakao_handoff=;/.test(handoff.headers.get("set-cookie") || "")
);

section("A-3. DB 깨우기 주소 (Vercel Cron만 부를 수 있다)");
const cron = process.env.CRON_SECRET;
check("비밀값 없이 부르면 401", (await api("/cron/keepalive")).status === 401);
check("다른 비밀값이면 401", (await api("/cron/keepalive", { token: cron.slice(0, -1) + "x" })).status === 401);
check("로그인 토큰(운영진)으로도 못 부른다", (await api("/cron/keepalive", { token: admin })).status === 401);
const woke = await api("/cron/keepalive", { token: cron });
check("Vercel이 보내는 'Bearer 비밀값'이면 DB를 읽고 200", woke.status === 200 && woke.data?.ok === true);

// ======================================================================
section("B. 공연 설정 (경계값 · 동등 분할 · 동시 저장)");
const shows0 = (await api("/admin/shows", { token: admin })).data.shows;
check("시드: 지난 공연 4개 + 준비 중 1개", shows0.length === 5 && shows0.filter((s) => s.status === "ENDED").length === 4);
const showId = shows0.find((s) => s.title === "작전명문 5").id;
const loaded = (await api(`/admin/shows/${showId}`, { token: admin })).data.show;
const showBody = {
  ...loaded,
  title: "시험 공연 5",
  venue: "시험 아트센터",
  dateLabel: "2027년 02월 21일 (일)",
  price: 7000,
  paymentBank: "시험은행",
  paymentAccount: "000-000",
  paymentHolder: "홍길동",
  refundContact: "010-0000-0000",
  credits: "보컬: 가나다, 라마바\n기타: 사아자",
  status: "ON_SALE",
  session: { title: "1회차", date: "2027-02-21T09:00:00.000Z", totalCapacity: 50 },
};
const putShow = (patch = {}) => api(`/admin/shows/${showId}`, { token: admin, method: "PUT", body: { ...showBody, ...patch } });
check("공연 저장(판매 중)", (await putShow()).status === 200);
for (const [label, patch, ok] of [
  ["관람료 -1원", { price: -1 }, false],
  ["관람료 0원", { price: 0 }, true],
  ["관람료 100만 원", { price: 1_000_000 }, true],
  ["관람료 100만 1원", { price: 1_000_001 }, false],
  ["관람료 30억 원(DB 범위 밖)", { price: 3_000_000_000 }, false],
  ["관람료 글자", { price: "칠천원" }, false],
  ["정원 0명", { session: { ...showBody.session, totalCapacity: 0 } }, false],
  ["정원 10만 명", { session: { ...showBody.session, totalCapacity: 100_000 } }, true],
  ["정원 10만 1명", { session: { ...showBody.session, totalCapacity: 100_001 } }, false],
  ["입금 기한 -1시간", { paymentHours: -1 }, false],
  ["입금 기한 0시간", { paymentHours: 0 }, true],
  ["입금 기한 336시간", { paymentHours: 336 }, true],
  ["입금 기한 337시간", { paymentHours: 337 }, false],
  ["공연명 빈칸", { title: "   " }, false],
  ["포스터 javascript: 주소", { posterUrl: "javascript:alert(1)" }, false],
  ["포스터 //다른사이트", { posterUrl: "//evil.example/p.png" }, false],
  ["포스터 https 주소", { posterUrl: "https://example.com/p.jpg" }, true],
  ["공연 상태 엉뚱한 값", { status: "PUBLISHED" }, false],
  ["공연 일시 엉뚱한 값", { session: { ...showBody.session, date: "내일 저녁" } }, false],
]) {
  const r = await putShow(patch);
  const korean = ok || /[가-힣]/.test(r.data?.error || "");
  check(`공연 입력 경계값: ${label} → ${ok ? "저장" : "400"}`, (ok ? r.status === 200 : r.status === 400) && korean, `${r.status} ${r.data?.error || ""}`);
}
check("공연 저장에 깨진 JSON은 400", (await api(`/admin/shows/${showId}`, { token: admin, method: "PUT", raw: "{" })).status === 400);
await putShow();

const mk = async (title) => (await api("/admin/shows", { token: admin, method: "POST", body: { ...showBody, title, status: "DRAFT" } })).data.id;
const [s6, s7] = [await mk("동시 저장 6"), await mk("동시 저장 7")];
const both = await Promise.all(
  [s6, s7].map((id) => api(`/admin/shows/${id}`, { token: admin, method: "PUT", body: { ...showBody, title: "동시 저장", status: "ON_SALE" } }))
);
const onSaleNow = (await api("/admin/shows", { token: admin })).data.shows.filter((s) => s.status === "ON_SALE");
check("두 관리자가 동시에 다른 공연을 판매 중으로 저장해도 판매 중은 하나", statuses(both) === "200,200" && onSaleNow.length === 1, `판매 중 ${onSaleNow.length}개`);
await putShow();
for (const id of [s6, s7]) await api(`/admin/shows/${id}`, { token: admin, method: "DELETE" });
check("정리: 판매 중은 시험 공연 5 하나", (await api("/admin/shows", { token: admin })).data.shows.filter((s) => s.status === "ON_SALE").map((s) => s.id).join() === showId);

const sessionId = (await api(`/admin/shows/${showId}`, { token: admin })).data.show.session.id;

// ======================================================================
section("C. 예매 가능 여부 결정표 (티켓 오픈 전·후 × 공연 시작 전·후 × 좌석)");
const [c1] = await makeUsers(1, "table");
await putShow({ salesOpenAt: new Date(Date.now() + 3600_000).toISOString() });
const r1 = await book(c1);
check("오픈 전 · 시작 전 · 좌석 있음 → 예매 거부, 안내는 '오픈 예정'", r1.status === 400 && r1.data.error.includes("티켓 오픈 전") && (await page("/show")).html.includes("오픈 예정"), r1.data?.error);
await putShow({ salesOpenAt: null, session: { ...showBody.session, date: new Date(Date.now() - 60_000).toISOString() } });
const r2 = await book(c1);
check("오픈 후 · 이미 시작 → 예매 거부, 안내는 '예매 종료'", r2.status === 400 && r2.data.error.includes("이미 시작한") && (await page("/show")).html.includes("예매 종료"), r2.data?.error);
await putShow({ salesOpenAt: new Date(Date.now() - 3600_000).toISOString() });
const r3 = await book(c1);
check("오픈 후 · 시작 전 · 좌석 있음 → 예매 됨", r3.status === 200, r3.data?.error);
const endedSession = await prisma.showSession.findFirstOrThrow({ where: { showId: "operation-moon-4" } });
const r4 = await api("/bookings", { token: c1.token, method: "POST", body: { sessionId: endedSession.id, preferredPerformerName: "없음", depositorName: "홍길동" } });
check("지난 공연의 회차 → 예매 거부", r4.status === 400 && r4.data.error.includes("예매 중인 공연이 아니에요"), r4.data?.error);
await api(`/bookings/${r3.data.booking.id}/cancel`, { token: c1.token, method: "POST" });

// ======================================================================
section("D. 예매 입력 (경계값 · 동등 분할 · 오류 추측)");
const inputUsers = await makeUsers(4, "input");
const [d0] = inputUsers;
for (const [label, body] of [
  ["입금자명 없음", { depositorName: undefined }],
  ["입금자명 공백만", { depositorName: "    " }],
  ["입금자명 21자", { depositorName: "가".repeat(21) }],
  ["입금자명 숫자", { depositorName: 1234 }],
  ["관심 공연자 빈칸", { preferredPerformerName: "" }],
  ["관심 공연자 51자", { preferredPerformerName: "가".repeat(51) }],
  ["2매", { quantity: 2 }],
  ["0매", { quantity: 0 }],
  ['매수 "1"(글자)', { quantity: "1" }],
  ["회차 없음", { sessionId: "" }],
]) {
  const r = await book(d0, body);
  check(`예매 입력 ${label} → 400 한국어 문구`, r.status === 400 && /[가-힣]/.test(r.data?.error || ""), `${r.status} ${r.data?.error}`);
}
check("없는 회차 → 404", (await book(d0, { sessionId: "no-such-session" })).status === 404);
check("예매에 깨진 JSON → 400", (await api("/bookings", { token: d0.token, method: "POST", raw: "{oops" })).status === 400);
check("로그인 없이 예매 → 401", (await api("/bookings", { method: "POST", body: { sessionId, depositorName: "가" } })).status === 401);
const okEdge = await book(inputUsers[1], { depositorName: "가".repeat(20), preferredPerformerName: "나".repeat(50) });
check("경계값: 입금자명 20자 · 공연자 50자 → 예매 됨", okEdge.status === 200, okEdge.data?.error);
const spaced = await book(inputUsers[2], { depositorName: "  김   민지  " });
check("입금자명 공백 정리('  김   민지  ' → '김 민지')", (await dash(inputUsers[2])).booking?.depositorName === "김 민지", spaced.data?.error);
const extra = await book(inputUsers[3], { isAdmin: true, status: "CONFIRMED" });
check("요청에 끼워 넣은 엉뚱한 칸(status 등)은 무시되고 입금 대기로 만들어진다", extra.status === 200 && extra.data.booking.status === "PAYMENT_PENDING");
const hours = (new Date(extra.data.booking.expiresAt).getTime() - Date.now()) / 3600_000;
check("입금 기한은 예매 후 24시간", hours > 23.9 && hours <= 24, String(hours));
for (const u of inputUsers.slice(1)) {
  const b = (await dash(u)).booking;
  await api(`/bookings/${b.id}/cancel`, { token: u.token, method: "POST" });
}

// ======================================================================
section("E. 동시성 (정원 · 중복 클릭 · 동시 승인)");
await putShow({ salesOpenAt: null, session: { ...showBody.session, totalCapacity: 5 } });
check("시작 전 잔여석 5", (await seatsLeft()) === 5, String(await seatsLeft()));
const crowd = await makeUsers(12, "crowd");
const rush = await Promise.all(crowd.map((u) => book(u)));
check("12명이 동시에 5석을 노리면 정확히 5명만 성공", rush.filter((r) => r.status === 200).length === 5, statuses(rush));
check("떨어진 7명은 '남은 좌석이 없어요'(500이 아니라 400)", rush.filter((r) => r.status === 400 && r.data.error.includes("남은 좌석이 없어요")).length === 7);
check("매진이면 예매 화면에 매진, 공연 안내에 매진", (await seatsLeft()) === 0 && (await page("/show")).html.includes("매진"));
const winners = crowd.filter((_, i) => rush[i].status === 200);
const bookingOf = (u) => rush[crowd.indexOf(u)].data.booking.id;
const shrink = await putShow({ session: { ...showBody.session, totalCapacity: 3 } });
check("예매 5건인데 정원을 3으로 줄이면 400", shrink.status === 400 && shrink.data.error.includes("5명"), shrink.data?.error);
await putShow({ session: { ...showBody.session, totalCapacity: 40 } });
const [clicker] = await makeUsers(1, "clicker");
const clicks = await Promise.all(Array.from({ length: 6 }, () => book(clicker)));
check("한 사람이 예매 버튼을 6번 동시에 눌러도 1건", clicks.filter((r) => r.status === 200).length === 1, statuses(clicks));
const twice = await Promise.all([1, 2].map(() => api(`/admin/bookings/${bookingOf(winners[0])}/confirm`, { token: admin, method: "POST" })));
check("두 운영진이 같은 예매를 동시에 입금 확인 → 하나만 성공", statuses(twice) === "200,400", statuses(twice));

// ======================================================================
section("F. 예매 상태 전이 (입금 대기 → 완료 → 환불 요청 → 되돌리기 / 환불 완료)");
const [fa, fb, fc, fd, fe] = winners;
// 입금 대기 → 관객 취소
check("남의 예매 취소 → 403", (await api(`/bookings/${bookingOf(fb)}/cancel`, { token: fc.token, method: "POST" })).status === 403);
check("입금 대기 → 관객 취소", (await api(`/bookings/${bookingOf(fb)}/cancel`, { token: fb.token, method: "POST" })).status === 200 && (await dash(fb)).booking.status === "CANCELLED");
check("취소한 예매 다시 취소 → 400", (await api(`/bookings/${bookingOf(fb)}/cancel`, { token: fb.token, method: "POST" })).status === 400);
check("취소한 예매는 입금 확인 불가 → 400", (await api(`/admin/bookings/${bookingOf(fb)}/confirm`, { token: admin, method: "POST" })).status === 400);
const rebook = await book(fb);
check("취소한 뒤 다시 예매 가능", rebook.status === 200, rebook.data?.error);
// 입금 대기 → 운영진 취소
check("운영진 취소: 사유 없으면 400", (await api(`/admin/bookings/${bookingOf(fc)}/cancel`, { token: admin, method: "POST", body: { reason: " " } })).status === 400);
const staffCancel = await api(`/admin/bookings/${bookingOf(fc)}/cancel`, { token: admin, method: "POST", body: { reason: "입금 기한 안에 입금이 확인되지 않았어요." } });
const fcDash = await dash(fc);
check("입금 대기 → 운영진 취소, 관객에게 사유가 보인다", staffCancel.status === 200 && fcDash.booking.status === "CANCELLED" && fcDash.booking.cancelReason.includes("입금 기한"));
// 완료 예매는 취소 불가
check("예매 완료 → 관객 취소 불가(400)", (await api(`/bookings/${bookingOf(fa)}/cancel`, { token: fa.token, method: "POST" })).status === 400);
check("예매 완료 → 운영진 취소 불가(400, 환불로 처리)", (await api(`/admin/bookings/${bookingOf(fa)}/cancel`, { token: admin, method: "POST", body: { reason: "x" } })).status === 400);
check("입금 대기 → 환불 요청 불가(400)", (await api("/refunds/request", { token: fd.token, method: "POST", body: refundBody(bookingOf(fd)) })).status === 400);
// 예매 완료 → 환불 요청 → 되돌리기 → 다시 요청 → 환불 완료
const faDash = await dash(fa);
check("예매 완료면 마이 티켓에 QR 코드", faDash.booking.status === "CONFIRMED" && !!faDash.ticket?.code);
check("남의 예매 환불 요청 → 403", (await api("/refunds/request", { token: fd.token, method: "POST", body: refundBody(bookingOf(fa)) })).status === 403);
const seatsBeforeRefund = await seatsLeft();
const reqRefund = await api("/refunds/request", { token: fa.token, method: "POST", body: refundBody(bookingOf(fa)) });
check("예매 완료 → 환불 요청, 좌석이 풀린다", reqRefund.status === 200 && (await seatsLeft()) === seatsBeforeRefund + 1, reqRefund.data?.error);
const refundScan = await api("/admin/checkin", { token: admin, method: "POST", body: { qrToken: faDash.ticket.code } });
check("환불 요청한 티켓으로 입장 → 거부", refundScan.status === 400 && refundScan.data.error.includes("환불을 요청한"), refundScan.data?.error);
const refundId = (await api("/admin/refunds", { token: admin })).data.refunds.find((r) => r.bookingId === bookingOf(fa)).id;
const revert = await api(`/admin/refunds/${refundId}/revert`, { token: admin, method: "POST" });
check("환불 요청 되돌리기 → 예매 완료, 좌석을 다시 잡는다", revert.status === 200 && (await dash(fa)).booking.status === "CONFIRMED" && (await seatsLeft()) === seatsBeforeRefund, revert.data?.error);
check("되돌린 요청을 또 되돌리기 → 404(요청이 없다)", (await api(`/admin/refunds/${refundId}/revert`, { token: admin, method: "POST" })).status === 404);
await api("/refunds/request", { token: fa.token, method: "POST", body: refundBody(bookingOf(fa)) });
const refundId2 = (await api("/admin/refunds", { token: admin })).data.refunds.find((r) => r.bookingId === bookingOf(fa)).id;
const done = await Promise.all([1, 2].map(() => api(`/admin/refunds/${refundId2}/refund`, { token: admin, method: "POST" })));
check("두 운영진이 동시에 환불 완료 → 하나만 처리(200, 409)", statuses(done) === "200,409", statuses(done));
check("환불 완료 → 마이 티켓 '환불 완료', QR 없음", (await dash(fa)).booking.status === "REFUNDED" && (await dash(fa)).ticket === null);
check("환불 완료된 티켓으로 입장 → 거부", (await api("/admin/checkin", { token: admin, method: "POST", body: { qrToken: faDash.ticket.code } })).status === 400);
check("환불 완료 건 되돌리기 → 409", (await api(`/admin/refunds/${refundId2}/revert`, { token: admin, method: "POST" })).status === 409);
const again = await book(fa);
check("환불받은 관객은 다시 예매할 수 있다", again.status === 200, again.data?.error);

// 입금 대기 → 기한 지남 → 만료 → 되살리기
const seatsBeforeExpire = await seatsLeft();
await prisma.reservation.update({ where: { id: bookingOf(fd) }, data: { expiresAt: PAST() } });
check("입금 기한이 지나면 만료되고 좌석이 풀린다", (await seatsLeft()) === seatsBeforeExpire + 1 && (await dash(fd)).booking.status === "EXPIRED");
const deposits = (await api("/admin/bookings/pending", { token: admin })).data.bookings;
check("만료된 예매는 입금 확인 목록 뒤쪽 '기한 지남'에", deposits.at(-1).status === "EXPIRED" && deposits.some((b) => b.id === bookingOf(fd)));
const revive = await api(`/admin/bookings/${bookingOf(fd)}/confirm`, { token: admin, method: "POST" });
check("만료 → 되살리기(좌석이 남아 있으면)", revive.status === 200 && (await dash(fd)).booking.status === "CONFIRMED", revive.data?.error);

// ======================================================================
section("G. 입장 확인");
const fbDash = await dash(fb); // 다시 예매한 입금 대기 건
await api(`/admin/bookings/${fbDash.booking.id}/confirm`, { token: admin, method: "POST" });
const qr = (await dash(fb)).ticket.code;
const refundRace = await Promise.all([
  api("/admin/checkin", { token: admin, method: "POST", body: { qrToken: qr } }),
  api("/refunds/request", { token: fb.token, method: "POST", body: refundBody(fbDash.booking.id) }),
]);
const fbAfter = (await dash(fb)).booking.status;
check(
  "입장 확인과 환불 요청이 동시에 와도 하나만 통과(입장했는데 환불 대기가 되는 일 없음)",
  refundRace.filter((r) => r.status === 200).length === 1 && (refundRace[0].status === 200 ? fbAfter === "CONFIRMED" : fbAfter === "REFUND_PENDING"),
  `${statuses(refundRace)} → ${fbAfter}`
);
const [g1] = await makeUsers(1, "gate");
await book(g1, { depositorName: "입장확인" });
await api(`/admin/bookings/${(await dash(g1)).booking.id}/confirm`, { token: admin, method: "POST" });
const gqr = (await dash(g1)).ticket.code;
const scans = await Promise.all([1, 2].map(() => api("/admin/checkin", { token: admin, method: "POST", body: { qrToken: gqr } })));
check("같은 QR을 두 기기에서 동시에 찍음 → 200 하나, 409 하나", statuses(scans) === "200,409", statuses(scans));
const scanned = scans.find((s) => s.status === 200).data;
check("입장 결과에 입금자명(실명)과 공연명", scanned.name === "입장확인" && scanned.showTitle === "시험 공연 5");
check("입장한 티켓은 환불 요청 불가", (await api("/refunds/request", { token: g1.token, method: "POST", body: refundBody((await dash(g1)).booking.id) })).status === 400);
check("없는 QR → 404 · 빈 QR → 400", (await api("/admin/checkin", { token: admin, method: "POST", body: { qrToken: "nope" } })).status === 404 && (await api("/admin/checkin", { token: admin, method: "POST", body: { qrToken: " " } })).status === 400);
// 지난 공연 티켓
const [old] = await makeUsers(1, "lastyear");
const oldRes = await prisma.reservation.create({ data: { userId: old.id, sessionId: endedSession.id, qty: 1, status: "CONFIRMED", expiresAt: new Date(), depositorName: "작년관객" } });
const oldTicket = await prisma.ticket.create({ data: { reservationId: oldRes.id, qrToken: `old-${Date.now()}` } });
const oldScan = await api("/admin/checkin", { token: admin, method: "POST", body: { qrToken: oldTicket.qrToken } });
check("작년 공연 티켓으로 올해 입장 → 거부(공연명 안내)", oldScan.status === 400 && oldScan.data.error.includes("작전명문 4"), oldScan.data?.error);

// ======================================================================
section("H. 마이 티켓 (되살린 예매가 나중에 끝난 예매에 가리지 않는다)");
const [h1] = await makeUsers(1, "hidden");
const hA = (await book(h1)).data.booking.id;
await prisma.reservation.update({ where: { id: hA }, data: { expiresAt: PAST() } });
await seatsLeft(); // 만료 처리
const hB = (await book(h1)).data.booking.id;
await api(`/bookings/${hB}/cancel`, { token: h1.token, method: "POST" });
check("다시 예매한 기록이 끝났으면 만료 예매를 되살릴 수 있다", (await api(`/admin/bookings/${hA}/confirm`, { token: admin, method: "POST" })).status === 200);
const hDash = await dash(h1);
check("마이 티켓은 나중에 취소한 예매가 아니라 되살린 예매(QR 포함)를 보여 준다", hDash.booking.id === hA && hDash.booking.status === "CONFIRMED" && !!hDash.ticket?.code);
const [h2] = await makeUsers(1, "rebooked");
const h2A = (await book(h2)).data.booking.id;
await prisma.reservation.update({ where: { id: h2A }, data: { expiresAt: PAST() } });
await seatsLeft();
await book(h2);
check("다시 예매해 둔 관객의 만료 예매는 되살리지 않는다", (await api(`/admin/bookings/${h2A}/confirm`, { token: admin, method: "POST" })).status === 400);

// ======================================================================
section("I. 공연 일시·입금 기한을 바꾸면 입금 대기 예매의 기한도 맞춘다");
const [i1] = await makeUsers(1, "deadline");
await putShow({ paymentHours: 0, session: { ...showBody.session, totalCapacity: 40 } });
const ib = (await book(i1)).data.booking;
check("입금 기한 0이면 공연 시작 시각까지", new Date(ib.expiresAt).toISOString() === "2027-02-21T09:00:00.000Z", ib.expiresAt);
await putShow({ paymentHours: 0, session: { ...showBody.session, totalCapacity: 40, date: "2027-02-28T09:00:00.000Z" } });
check("공연을 1주 미루면 기한도 1주 늦춰진다", (await dash(i1)).booking.expiresAt === "2027-02-28T09:00:00.000Z", (await dash(i1)).booking.expiresAt);
await putShow({ paymentHours: 1, session: { ...showBody.session, totalCapacity: 40, date: "2027-02-28T09:00:00.000Z" } });
check("입금 기한을 줄여도 이미 안내한 기한은 앞당기지 않는다", (await dash(i1)).booking.expiresAt === "2027-02-28T09:00:00.000Z");
await putShow({ paymentHours: 24, session: { ...showBody.session, totalCapacity: 40, date: "2027-02-21T09:00:00.000Z" } });
check("공연을 앞당기면 기한도 새 공연 시작을 넘지 않게", (await dash(i1)).booking.expiresAt === "2027-02-21T09:00:00.000Z");

// ======================================================================
section("J. 한 번에 입금 확인");
const batchUsers = await makeUsers(2, "batch");
const bIds = [];
for (const u of batchUsers) bIds.push((await book(u)).data.booking.id);
const batch = await api("/admin/bookings/confirm", { token: admin, method: "POST", body: { ids: [...bIds, "nope", hA] } });
const okIds = batch.data?.results?.filter((r) => r.ok).map((r) => r.id) || [];
check("섞인 목록: 대기 2건만 성공, 없는 예매·이미 완료는 건마다 실패 사유", batch.status === 200 && okIds.length === 2 && bIds.every((id) => okIds.includes(id)) && batch.data.results.filter((r) => !r.ok).every((r) => /[가-힣]/.test(r.error)));
check("빈 목록 → 400 · 201건 → 400", (await api("/admin/bookings/confirm", { token: admin, method: "POST", body: { ids: [] } })).status === 400 && (await api("/admin/bookings/confirm", { token: admin, method: "POST", body: { ids: Array.from({ length: 201 }, (_, i) => `x${i}`) } })).status === 400);

// ======================================================================
section("K. 포스터 올리기");
const png = readFileSync(new URL("../../public/posters/operation-moon-5.png", import.meta.url));
const upload = async (t, form) => {
  const res = await fetch(BASE + "/api/admin/assets", { method: "POST", headers: t ? { Authorization: `Bearer ${t}` } : {}, body: form });
  return { status: res.status, data: await res.json().catch(() => null) };
};
const fileForm = (blob, name) => {
  const fd = new FormData();
  fd.append("file", blob, name);
  return fd;
};
const up = await upload(admin, fileForm(new Blob([png], { type: "image/png" }), "p.png"));
check("PNG 올리기", up.status === 200 && up.data.url.startsWith("/api/assets/"));
const served = await fetch(BASE + up.data.url);
check("올린 그대로 내려주고, 형식 짐작 금지(nosniff)·오래 캐시", served.status === 200 && Buffer.from(await served.arrayBuffer()).equals(png) && served.headers.get("x-content-type-options") === "nosniff" && /immutable/.test(served.headers.get("cache-control") || ""));
check("이미지가 아닌 파일 → 400", (await upload(admin, fileForm(new Blob(["<script>"], { type: "text/html" }), "a.html"))).status === 400);
check("빈 파일 → 400", (await upload(admin, fileForm(new Blob([], { type: "image/png" }), "e.png"))).status === 400);
check("4MB 넘는 이미지 → 400", (await upload(admin, fileForm(new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "image/png" }), "big.png"))).status === 400);
check("파일 없이 JSON으로 보내면 400(500이 아니라)", (await api("/admin/assets", { token: admin, method: "POST", body: { file: "x" } })).status === 400);
check("관객은 올릴 수 없다(403)", (await upload(audience.token, fileForm(new Blob([png], { type: "image/png" }), "p.png"))).status === 403);
check("없는 이미지 → 404", (await fetch(BASE + "/api/assets/nope")).status === 404);

// ======================================================================
section("N. 관객 편의 (입금자명 고치기 · 환불 계좌 · 캘린더 · 자주 묻는 질문)");
const [n1, n2] = await makeUsers(2, "conv");
const nb = (await book(n1, { depositorName: "김민지" })).data.booking;
const rename = (u, id, depositorName) => api(`/bookings/${id}/depositor`, { token: u.token, method: "POST", body: { depositorName } });
const renamed = await rename(n1, nb.id, "  김   민 지 ");
check(
  "입금 대기 중 입금자명 고치기 → 마이 티켓과 입금 확인 목록에 같이 바뀐다",
  renamed.status === 200 &&
    (await dash(n1)).booking.depositorName === "김 민 지" &&
    (await api("/admin/bookings/pending", { token: admin })).data.bookings.some((b) => b.id === nb.id && b.depositorName === "김 민 지"),
  renamed.data?.error
);
check("남의 예매 입금자명 → 403", (await rename(n2, nb.id, "가로채기")).status === 403);
check("입금자명 빈칸·21자 → 400", (await rename(n1, nb.id, "  ")).status === 400 && (await rename(n1, nb.id, "가".repeat(21))).status === 400);
check("없는 예매 → 404", (await rename(n1, "no-such-booking", "김민지")).status === 404);
await api(`/admin/bookings/${nb.id}/confirm`, { token: admin, method: "POST" });
check("입금 확인된 뒤에는 입금자명을 고칠 수 없다(400)", (await rename(n1, nb.id, "다른이름")).status === 400);

const noAccount = await api("/refunds/request", { token: n1.token, method: "POST", body: { reservationId: nb.id } });
check("환불 계좌 없이 요청 → 400, 무엇이 빠졌는지 안내", noAccount.status === 400 && noAccount.data.error.includes("은행"), noAccount.data?.error);
check(
  "계좌번호에 글자가 섞이면 400, 실패한 요청은 좌석을 풀지 않는다",
  (await api("/refunds/request", { token: n1.token, method: "POST", body: { ...refundBody(nb.id), account: "110-abc-4567" } })).status === 400 &&
    (await dash(n1)).booking.status === "CONFIRMED"
);
const reqN = await api("/refunds/request", { token: n1.token, method: "POST", body: { ...refundBody(nb.id), account: "110 123 456789" } });
const nDash = await dash(n1);
check("환불 요청: 관객 화면에는 계좌 끝 네 자리만", reqN.status === 200 && nDash.refund?.account === "****6789" && nDash.refund?.bank === "시험은행", JSON.stringify(nDash.refund));
const nRefund = (await api("/admin/refunds", { token: admin })).data.refunds.find((r) => r.bookingId === nb.id);
check("관리자 환불 목록에는 송금할 계좌 전체", nRefund?.account === "110123456789" && nRefund?.holder === "홍길동" && nRefund?.bank === "시험은행");
await api(`/admin/refunds/${nRefund.id}/refund`, { token: admin, method: "POST" });
const nRefundDone = (await api("/admin/refunds", { token: admin })).data.refunds.find((r) => r.id === nRefund.id);
const dbAccount = (await prisma.refund.findUnique({ where: { id: nRefund.id } })).refundAccount;
check("환불 완료하면 계좌번호는 DB에서도 끝 네 자리만 남는다", nRefundDone.account === "****6789" && dbAccount === "****6789", dbAccount);

const icsRes = await fetch(BASE + "/api/calendar?type=show");
const icsText = await icsRes.text();
check(
  "캘린더 파일: 공연 일정(.ics, 한국 18시 = UTC 09시)",
  icsRes.status === 200 &&
    (icsRes.headers.get("content-type") || "").startsWith("text/calendar") &&
    icsText.includes("SUMMARY:시험 공연 5") &&
    icsText.includes("DTSTART:20270221T090000Z")
);
check("티켓 오픈 일시가 없으면 오픈 알림 파일은 404", (await fetch(BASE + "/api/calendar?type=open")).status === 404);
await putShow({ salesOpenAt: "2027-01-10T03:00:00.000Z" });
const openIcs = await (await fetch(BASE + "/api/calendar?type=open")).text();
const showHtml = (await page("/show")).html;
check("오픈 전이면 오픈 알림 파일(10분 전 알림)과 공연 안내의 '티켓 오픈 알림 받기'", openIcs.includes("SUMMARY:시험 공연 5 티켓 오픈") && openIcs.includes("TRIGGER:-PT10M") && showHtml.includes("티켓 오픈 알림 받기"));
await putShow({ salesOpenAt: null });
check("오픈 시각이 지나면 공연 안내에 오픈 알림 버튼이 없다", !(await page("/show")).html.includes("티켓 오픈 알림 받기"));

const help = await page("/help");
check("자주 묻는 질문: 공연 설정의 입금 기한·환불 문의처가 답에 들어간다", help.status === 200 && help.html.includes("24시간 안에") && help.html.includes("010-0000-0000"));

// ======================================================================
section("O. 관리자 현황 · 입장 명단 · 엑셀 명단 · 판매 전 점검 · 작업 기록");
const summary = (await api("/admin/summary", { token: admin })).data.summary;
const byStatus = await prisma.reservation.groupBy({ by: ["status"], where: { session: { showId } }, _count: true });
const cnt = (s) => byStatus.find((g) => g.status === s)?._count || 0;
const cap = (await prisma.showSession.findFirstOrThrow({ where: { showId } })).totalCapacity;
const entered = await prisma.checkIn.count({ where: { ticket: { reservation: { session: { showId } } } } });
check(
  "판매 현황 숫자가 DB와 맞다(완료·대기·환불 대기·입장·남은 좌석·받은 금액)",
  summary.show.title === "시험 공연 5" &&
    summary.confirmed === cnt("CONFIRMED") &&
    summary.pending === cnt("PAYMENT_PENDING") &&
    summary.refundPending === cnt("REFUND_PENDING") &&
    summary.checkedIn === entered &&
    summary.remaining === cap - cnt("CONFIRMED") - cnt("PAYMENT_PENDING") &&
    summary.received === 7000 * (cnt("CONFIRMED") + cnt("REFUND_PENDING")),
  JSON.stringify(summary)
);
check("관객은 판매 현황을 못 본다(403)", (await api("/admin/summary", { token: audience.token })).status === 403);

const [o1, o2] = await makeUsers(2, "door");
const ob = (await book(o1, { depositorName: "현장입장" })).data.booking;
const pendingOnly = (await book(o2, { depositorName: "아직입금전" })).data.booking;
const ticketsBefore = (await api("/admin/checkin", { token: admin })).data.tickets;
check("입장 명단에는 입금 확인된 관객만(입금 대기는 없다)", !ticketsBefore.some((t) => t.bookingId === ob.id || t.bookingId === pendingOnly.id));
await api(`/admin/bookings/${ob.id}/confirm`, { token: admin, method: "POST" });
const ticketsAfter = (await api("/admin/checkin", { token: admin })).data.tickets;
const names = ticketsAfter.map((t) => t.name);
check(
  "입금을 확인하면 명단에 들어오고, 명단은 이름 가나다순",
  ticketsAfter.some((t) => t.bookingId === ob.id && t.name === "현장입장" && !t.checkedInAt) && names.join() === [...names].sort((a, b) => a.localeCompare(b, "ko")).join()
);
const byName = await Promise.all([1, 2].map(() => api("/admin/checkin", { token: admin, method: "POST", body: { bookingId: ob.id } })));
check("이름으로 찾아 입장 처리: 두 기기에서 동시에 눌러도 한 번(200, 409)", statuses(byName) === "200,409", statuses(byName));
check("명단에 입장 시각이 찍힌다", !!(await api("/admin/checkin", { token: admin })).data.tickets.find((t) => t.bookingId === ob.id)?.checkedInAt);
const notPaid = await api("/admin/checkin", { token: admin, method: "POST", body: { bookingId: pendingOnly.id } });
check("입금 대기 예매를 이름으로 입장 → 404(티켓이 없다)", notPaid.status === 404 && notPaid.data.error.includes("입금"), notPaid.data?.error);
check("QR도 예매도 없이 → 400 · 없는 예매 → 404", (await api("/admin/checkin", { token: admin, method: "POST", body: {} })).status === 400 && (await api("/admin/checkin", { token: admin, method: "POST", body: { bookingId: "nope" } })).status === 404);

const [o3] = await makeUsers(1, "formula");
await book(o3, { depositorName: "=1+2" });
const csvRes = await fetch(BASE + "/api/admin/attendees?format=csv", { headers: { Authorization: `Bearer ${admin}` } });
const csvBytes = Buffer.from(await csvRes.arrayBuffer());
const csvText = csvBytes.toString("utf8");
const csvLines = csvText.split("\r\n").filter(Boolean);
const showBookings = await prisma.reservation.count({ where: { session: { showId } } });
check(
  "명단 엑셀: CSV, BOM(한글 안 깨짐), 한글 파일 이름",
  csvRes.status === 200 &&
    (csvRes.headers.get("content-type") || "").startsWith("text/csv") &&
    csvBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) &&
    /filename\*=UTF-8''/.test(csvRes.headers.get("content-disposition") || "")
);
check("명단 엑셀: 머리 줄 + 이 공연의 예매 수만큼", csvLines[0] === "﻿예매번호,상태,입금자명,카카오 이름,관심 공연자,예매 일시,입장 일시,취소 사유" && csvLines.length === showBookings + 1, `${csvLines.length} / ${showBookings + 1}`);
check("입금자명에 수식을 넣어도 엑셀에서 실행되지 않는다('=1+2)", csvText.includes(",'=1+2,") && !csvText.includes(",=1+2,"));
check(
  "명단: 로그인 없이 401 · 관객 403",
  (await fetch(BASE + "/api/admin/attendees?format=csv")).status === 401 && (await api("/admin/attendees", { token: audience.token })).status === 403
);
const lastYear = await api("/admin/attendees?show=operation-moon-4", { token: admin });
check("지난 공연을 골라 명단을 받을 수 있다", lastYear.status === 200 && lastYear.data.show.title === "작전명문 4" && lastYear.data.people.some((p) => p.name === "작년관객"));
check("없는 공연 명단 → 404", (await api("/admin/attendees?show=nope", { token: admin })).status === 404);

const noAcct = await putShow({ paymentAccount: " " });
check("관람료가 있는데 계좌가 비면 판매 중으로 저장할 수 없다(400, 이유 안내)", noAcct.status === 400 && noAcct.data.error.includes("입금 계좌"), noAcct.data?.error);
check("무료 공연(0원)은 계좌 없이 판매 중 저장 가능", (await putShow({ price: 0, paymentAccount: "" })).status === 200);
await putShow();
const draftId = (await api("/admin/shows", { token: admin, method: "POST", body: { ...showBody, title: "날짜 지난 공연", status: "DRAFT", session: { ...showBody.session, date: "2026-01-01T09:00:00.000Z" } } })).data.id;
const pastOnSale = await api(`/admin/shows/${draftId}`, { token: admin, method: "PUT", body: { ...showBody, title: "날짜 지난 공연", session: { ...showBody.session, date: "2026-01-01T09:00:00.000Z" } } });
check("공연 일시가 지난 공연은 판매 중으로 바꿀 수 없다(400)", pastOnSale.status === 400 && pastOnSale.data.error.includes("공연 일시"), pastOnSale.data?.error);
check("새 공연을 처음부터 판매 중으로 만들 때도 같은 검사", (await api("/admin/shows", { token: admin, method: "POST", body: { ...showBody, paymentHolder: "" } })).status === 400);
await api(`/admin/shows/${draftId}`, { token: admin, method: "DELETE" });
check("검사에 막혀도 원래 판매 중 공연은 그대로", (await api("/admin/shows", { token: admin })).data.shows.filter((s) => s.status === "ON_SALE").map((s) => s.id).join() === showId);

const bookingLogs = (await api("/admin/logs?kind=booking", { token: admin })).data;
check("작업 기록: 최근 것부터", bookingLogs.logs.every((l, i, all) => i === 0 || new Date(all[i - 1].at) >= new Date(l.at)));
check(
  "작업 기록: 입장 확인은 누가·누구를·어떤 방법으로",
  bookingLogs.logs.some((l) => l.action === "입장 확인" && l.target.includes("현장입장") && l.detail.includes("이름·예매번호") && l.actor.includes("(admin)"))
);
check("작업 기록: 입금자명 수정은 바뀌기 전과 뒤", bookingLogs.logs.some((l) => l.action === "관객이 입금자명 수정" && l.detail === "김민지 → 김 민 지" && l.actor === "conv0"));
check("작업 기록: 환불 완료에는 계좌 끝 네 자리만", bookingLogs.logs.some((l) => l.action === "환불 완료" && l.detail.includes("****6789")) && !JSON.stringify(bookingLogs).includes("110123456789"));
const allLogs = (await api("/admin/logs", { token: admin })).data;
const page2 = await api(`/admin/logs?cursor=${allLogs.nextCursor}`, { token: admin });
check(
  "작업 기록 50개씩: 다음 페이지는 겹치지 않고 이어진다",
  allLogs.logs.length === 50 && !!allLogs.nextCursor && page2.status === 200 && !page2.data.logs.some((l) => allLogs.logs.some((x) => x.id === l.id)) && new Date(page2.data.logs[0].at) <= new Date(allLogs.logs[49].at)
);

// ======================================================================
section("P. 운영진 계정 (만들기 · 스태프 권한 · 비밀번호 · 로그인 잠금 · 지우기)");
const makeAccount = (body, t = admin) => api("/admin/accounts", { token: t, method: "POST", body: { name: "입구 스태프", password: "staff-pass-1234", role: "STAFF", ...body } });
check("스태프 계정 만들기(아이디는 소문자로 저장)", (await makeAccount({ username: "Door.Staff" })).status === 200);
check("같은 아이디 → 409", (await makeAccount({ username: "door.staff" })).status === 409);
check("임시 비밀번호 9자 → 400 · 관리자 아닌 권한 → 400", (await makeAccount({ username: "short", password: "123456789" })).status === 400 && (await makeAccount({ username: "super", role: "SUPER_ADMIN" })).status === 400);
const staffLogin = await api("/auth/login", { method: "POST", body: { id: "door.staff", password: "staff-pass-1234" } });
check("스태프 로그인 → 토큰, 역할 STAFF", staffLogin.status === 200 && staffLogin.data.user.roles.join() === "STAFF", staffLogin.data?.error);
const staff = staffLogin.data.token;
for (const [label, path, expected] of [
  ["입금 확인 목록", "/admin/bookings/pending", 200],
  ["입장 명단", "/admin/checkin", 200],
  ["예매자 목록", "/admin/reservations", 200],
  ["판매 현황", "/admin/summary", 200],
  ["예매자 명단", "/admin/attendees", 200],
  ["공연 관리", "/admin/shows", 403],
  ["환불 관리", "/admin/refunds", 403],
  ["작업 기록", "/admin/logs", 403],
  ["계정 목록", "/admin/accounts", 403],
]) {
  check(`스태프 권한: ${label} → ${expected}`, (await api(path, { token: staff })).status === expected);
}
check("스태프는 계정을 만들 수 없다(403)", (await makeAccount({ username: "by-staff" }, staff)).status === 403);
check("스태프도 이름으로 입장 처리 API를 쓸 수 있다(이미 입장한 티켓이라 409, 권한 오류가 아니다)", (await api("/admin/checkin", { token: staff, method: "POST", body: { bookingId: ob.id } })).status === 409);

const changePw = (t, current, next) => api("/auth/password", { token: t, method: "POST", body: { current, next } });
check("내 비밀번호 바꾸기: 지금 비밀번호가 틀리면 400", (await changePw(staff, "wrong-password", "staff-new-pass-5678")).status === 400);
check("내 비밀번호 바꾸기: 같은 비밀번호로는 400", (await changePw(staff, "staff-pass-1234", "staff-pass-1234")).status === 400);
check("관객은 비밀번호를 바꿀 곳이 없다(403)", (await changePw(audience.token, "x", "0123456789")).status === 403);
const changed = await changePw(staff, "staff-pass-1234", "staff-new-pass-5678");
const loginAs = (id, password) => api("/auth/login", { method: "POST", body: { id, password } });
check(
  "비밀번호를 바꾸면 새 비밀번호로만 로그인",
  changed.status === 200 && (await loginAs("door.staff", "staff-pass-1234")).status === 401 && (await loginAs("door.staff", "staff-new-pass-5678")).status === 200
);

const accounts = (await api("/admin/accounts", { token: admin })).data.accounts;
const staffAccount = accounts.find((a) => a.username === "door.staff");
check(
  "계정 목록: 아이디·이름·권한, 내 계정 표시, 비밀번호는 내려주지 않는다",
  staffAccount?.role === "STAFF" && staffAccount?.name === "입구 스태프" && accounts.find((a) => a.isMe)?.username === "admin" && !JSON.stringify(accounts).includes("passwordHash") && !accounts.some((a) => a.username === "audience-pw" && a.role)
);
const reset = await api(`/admin/accounts/${staffAccount.id}/password`, { token: admin, method: "POST", body: { password: "reset-pass-0000" } });
check("관리자가 비밀번호를 새로 정해 주면 그걸로 로그인", reset.status === 200 && (await loginAs("door.staff", "reset-pass-0000")).status === 200);

// 앞에서 틀린 횟수(바꾸기 전 비밀번호로 시도한 1번)까지 합쳐 15분 안에 10번이면 막힌다.
const priorFails = await prisma.auditLog.count({ where: { action: "LOGIN_FAILED", entityId: "door.staff" } });
const fails = [];
for (let i = priorFails; i < 10; i++) fails.push((await loginAs("door.staff", `wrong-${i}`)).status);
const locked = await loginAs("door.staff", "reset-pass-0000");
check("같은 아이디로 10번 틀리면 맞는 비밀번호도 막힌다(429, 기다릴 시간 안내)", fails.every((s) => s === 401) && locked.status === 429 && locked.data.error.includes("15분"), `${fails.join()} → ${locked.status}`);
check("다른 아이디 로그인은 영향 없다", (await loginAs("admin", process.env.SEED_ADMIN_PASSWORD)).status === 200);

check("내 계정은 지울 수 없다(400)", (await api(`/admin/accounts/${adminUserId}`, { token: admin, method: "DELETE" })).status === 400);
check("없는 계정 → 404", (await api("/admin/accounts/nope", { token: admin, method: "DELETE" })).status === 404);
const deleted = await api(`/admin/accounts/${staffAccount.id}`, { token: admin, method: "DELETE" });
check(
  "지운 계정은 남은 토큰도 바로 막히고(403) 로그인도 안 된다",
  deleted.status === 200 && (await api("/admin/bookings/pending", { token: staff })).status === 403 && (await prisma.credential.count({ where: { username: "door.staff" } })) === 0
);
check("지운 아이디로 다시 만들 수 있다", (await makeAccount({ username: "door.staff", password: "again-pass-1234" })).status === 200);

// 마지막 관리자 지키기: 관리자 둘만 남은 상태에서 서로를 동시에 지워도 한 명은 남는다.
await makeAccount({ username: "admin-two", role: "ADMIN", password: "admin-two-pass" });
await makeAccount({ username: "admin-three", role: "ADMIN", password: "admin-three-pass" });
const [two, three] = [(await loginAs("admin-two", "admin-two-pass")).data, (await loginAs("admin-three", "admin-three-pass")).data];
const mainRole = await prisma.userRole.findFirstOrThrow({ where: { userId: adminUserId, role: { type: "ADMIN" } } });
await prisma.userRole.update({ where: { id: mainRole.id }, data: { expiresAt: PAST() } }); // 잠깐 원래 관리자를 빼 둔다
const mutual = await Promise.all([
  api(`/admin/accounts/${three.user.id}`, { token: two.token, method: "DELETE" }),
  api(`/admin/accounts/${two.user.id}`, { token: three.token, method: "DELETE" }),
]);
const adminsLeft = await prisma.credential.count({ where: { username: { in: ["admin-two", "admin-three"] } } });
await prisma.userRole.update({ where: { id: mainRole.id }, data: { expiresAt: null } });
// 늦게 온 쪽은 이미 지워져 권한 확인에서 403이 나거나, 잠금 뒤 '마지막 관리자'로 400이 난다. 어느 쪽이든 한 명은 남아야 한다.
check("관리자 둘이 서로를 동시에 지우면 하나만 성공, 마지막 관리자는 남는다", mutual.filter((r) => r.status === 200).length === 1 && ["400", "403"].includes(String(mutual.find((r) => r.status !== 200)?.status)) && adminsLeft === 1, statuses(mutual));
const survivor = (await api("/admin/accounts", { token: admin })).data.accounts.find((a) => ["admin-two", "admin-three"].includes(a.username));
await api(`/admin/accounts/${survivor.id}`, { token: admin, method: "DELETE" });

const accountLogs = (await api("/admin/logs?kind=account", { token: admin })).data.logs;
check(
  "작업 기록(계정): 만들기·비밀번호·지우기·로그인 실패가 남고, 다른 종류는 섞이지 않는다",
  ["운영진 계정 만듦", "비밀번호를 새로 정해 줌", "내 비밀번호 바꿈", "운영진 계정 지움", "로그인 실패"].every((a) => accountLogs.some((l) => l.action === a)) &&
    accountLogs.every((l) => !["입금 확인", "공연 수정"].includes(l.action))
);
check("로그인 실패 기록에는 적은 아이디가 남는다(비밀번호는 남지 않는다)", accountLogs.some((l) => l.action === "로그인 실패" && l.target === "door.staff") && !JSON.stringify(accountLogs).includes("wrong-3"));

// ======================================================================
section("L. 화면 (블랙박스: 사용자가 받는 HTML)");
const landing = await page("/");
check("첫 화면: 판매 중이면 '○ 번째 무대' + 버튼 두 개", landing.status === 200 && landing.html.includes("다섯 번째 무대") && landing.html.includes('href="/book"') && landing.html.includes('href="/show"'));
const past = await page("/past");
check("지난 공연 목록에 작전명문 1~4", ["작전명문 1", "작전명문 2", "작전명문 3", "작전명문 4"].every((t) => past.html.includes(t)));
const past4 = await page("/past/operation-moon-4");
check("작전명문 4: 셋리스트 탭, 줄인 포스터", past4.html.includes("셋리스트") && past4.html.includes("시간을 달리네") && past4.html.includes("/posters/operation-moon-4.jpg"));
const poster4 = await fetch(BASE + "/posters/operation-moon-4.jpg");
check("작전명문 4 포스터는 1MB 미만(예전 5MB)", poster4.status === 200 && Number(poster4.headers.get("content-length")) < 1024 * 1024);
check("판매 중인 공연은 지난 공연 주소로 열리지 않는다", (await page(`/past/${showId}`)).html.includes("찾는 페이지가 없어요"));
const nope = await page("/no-such-page");
check("없는 주소 → 404와 안내 화면", nope.status === 404 && nope.html.includes("찾는 페이지가 없어요"));
check("없앤 API(/api/events) → 404", (await fetch(BASE + "/api/events")).status === 404);
await putShow({ status: "ENDED" });
const landingNoShow = await page("/");
check(
  "판매 중인 공연이 없으면 첫 화면은 '○ 번의 무대를 올렸어요'(다음 공연이 몇 번째인지처럼 읽히지 않게)",
  landingNoShow.html.includes("다섯 번의 무대를 올렸어요") && !landingNoShow.html.includes("번째 무대") && landingNoShow.html.includes("다음 무대를 준비하고 있어요")
);
check("판매 중 공연이 없으면 공연 안내·예매는 빈 화면", (await page("/show")).html.includes("지금 예매 중인 공연이 없어요") && (await page("/book")).html.includes("지금 예매 중인 공연이 없어요"));
check("판매 중 공연이 없으면 마이 티켓은 show null", (await dash(g1)).show === null);
check("예매 기록이 있는 공연은 지울 수 없다", (await api(`/admin/shows/${showId}`, { token: admin, method: "DELETE" })).status === 400);

// ======================================================================
section("M. 오류 응답 형식");
const english = errorMessages.filter((m) => !/[가-힣]/.test(m.split(": ").slice(1).join(": ")));
check(`오류 응답 ${errorMessages.length}건이 모두 한국어 문구`, english.length === 0, english.slice(0, 5).join(" | "));
check("오류 응답에 서버 내부 정보(prisma·stack·postgres)가 없다", !errorMessages.some((m) => /prisma|stack|postgres|at \w+ \(/i.test(m)));

const audits = await prisma.auditLog.groupBy({ by: ["action"], _count: true });
console.log("\n감사 로그:", audits.map((a) => `${a.action}×${a._count}`).join(", "));
await prisma.$disconnect();
console.log(failures === 0 ? `\nALL PASS (${passes})` : `\n${failures} FAILED, ${passes} passed`);
process.exit(failures === 0 ? 0 : 1);
