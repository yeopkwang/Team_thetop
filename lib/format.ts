// 서버(Vercel은 UTC)와 브라우저 어디서 불러도 한국 시간으로 보이게 한다.
const parts = (date: Date | string, options: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour12: false, ...options })
      .formatToParts(new Date(date))
      .map((p) => [p.type, p.value])
  );

// 2027.02.21 (일) 18:00
export function formatSessionDate(date: Date | string) {
  const p = parts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${p.year}.${p.month}.${p.day} (${p.weekday}) ${p.hour}:${p.minute}`;
}

// 2026.11.03 15:20
export function formatDateTime(date: Date | string) {
  const p = parts(date, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

export function won(amount: number) {
  return `${amount.toLocaleString("ko-KR")}원`;
}

// 사람이 읽고 불러 주기 쉬운 짧은 예매번호
export function bookingNumber(id: string) {
  return id.slice(-8).toUpperCase();
}
