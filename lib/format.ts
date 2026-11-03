// 서버(Vercel은 UTC)와 브라우저 어디서 불러도 한국 시간으로 보이게 한다.
// hour12: false는 브라우저에 따라 자정을 "24시"로 적어서, 0~23시로 고정하는 hourCycle을 쓴다.
const parts = (date: Date | string, options: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hourCycle: "h23", ...options })
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

// 계좌번호를 끝 네 자리만 남기고 가린다. 123-456-7890 → ****7890
export function maskAccount(account: string) {
  const digits = account.replace(/[^0-9]/g, "");
  return digits ? `****${digits.slice(-4)}` : "";
}

// 2027.02.21 (일)
export function formatDate(date: Date | string) {
  const p = parts(date, { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" });
  return `${p.year}.${p.month}.${p.day} (${p.weekday})`;
}

// 18:00
export function formatTime(date: Date | string) {
  const p = parts(date, { hour: "2-digit", minute: "2-digit" });
  return `${p.hour}:${p.minute}`;
}

// <input type="datetime-local">은 시간대 없는 값("2027-02-21T18:00")을 쓴다. 관리자 컴퓨터의 시간대와 상관없이
// 한국 시간으로 읽고 쓴다(해외 시간대로 맞춘 노트북에서 저장해도 공연 시각이 밀리지 않게).
export function toKstInput(date: Date | string) {
  const p = parts(date, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function fromKstInput(value: string) {
  const withSeconds = /T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  return new Date(`${withSeconds}+09:00`);
}

// 달력에서 날짜를 비교할 때 쓰는 한국 시간 기준 날짜 키: 2027-02-21
export function kstDayKey(date: Date | string) {
  const p = parts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}
