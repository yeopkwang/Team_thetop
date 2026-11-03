import { timingSafeEqual } from "crypto";

// Vercel Cron은 프로젝트 환경변수 CRON_SECRET을 "Authorization: Bearer <값>"으로 실어 보낸다. 그 값을 아는 요청만 통과시킨다.
// 값이 없으면 막는 쪽으로 실패한다(누구나 부를 수 있게 열리지 않도록).
export function isCronRequest(authorization: string | null, secret = process.env.CRON_SECRET) {
  if (!secret || secret.length < 32) throw new Error("CRON_SECRET 환경변수를 32자 이상으로 설정해 주세요.");
  const a = Buffer.from(authorization || "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
