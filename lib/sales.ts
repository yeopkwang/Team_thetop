// 지금 예매를 받을 수 있는지. 서버와 브라우저(오픈 시각 카운트다운) 양쪽에서 쓴다.
export type SalesState = "upcoming" | "open" | "soldout" | "closed";

export function salesState(
  { salesOpenAt, sessions }: { salesOpenAt: Date | string | null; sessions: { date: Date | string; remaining: number }[] },
  now = Date.now()
): SalesState {
  if (salesOpenAt && new Date(salesOpenAt).getTime() > now) return "upcoming";
  const bookable = sessions.filter((s) => new Date(s.date).getTime() > now);
  if (bookable.length === 0) return "closed";
  if (bookable.every((s) => s.remaining === 0)) return "soldout";
  return "open";
}

// "3일 4시간 남음", "12:03:09" 처럼 오픈까지 남은 시간을 짧게
export function untilText(target: Date | string, now = Date.now()) {
  const ms = Math.max(0, new Date(target).getTime() - now);
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}일 ${hours}시간 남음`;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
