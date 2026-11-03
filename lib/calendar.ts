// '캘린더에 추가': 공연 일정과 티켓 오픈 알림을 휴대폰 캘린더에 넣는다.
// .ics 파일(아이폰·안드로이드 기본 캘린더)과 구글 캘린더 링크 두 가지를 만든다. 브라우저에서도 쓴다.
export type CalendarEvent = {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  url?: string;
  // 시작 몇 분 전에 알릴지
  alarmMinutes?: number;
};

// 20270221T090000Z
const utc = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// .ics 글자 규칙: \ ; , 와 줄바꿈은 앞에 \를 붙인다.
const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// 한 줄은 75바이트를 넘지 않게 접는다(이어지는 줄은 공백으로 시작). 한글은 한 글자가 3바이트라 글자 단위로 센다.
function fold(line: string) {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // 이어지는 줄은 맨 앞 공백 1바이트
    if (bytes + size > limit) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function toIcs(event: CalendarEvent, now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//band-bansong//ticket//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(event.end)}`,
    `SUMMARY:${escape(event.title)}`,
    ...(event.location ? [`LOCATION:${escape(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${escape(event.description)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    ...(event.alarmMinutes
      ? ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escape(event.title)}`, `TRIGGER:-PT${event.alarmMinutes}M`, "END:VALARM"]
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${utc(event.start)}/${utc(event.end)}`,
    ...(event.location ? { location: event.location } : {}),
    details: [event.description, event.url].filter(Boolean).join("\n"),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// 공연이 끝나는 시각: 공연시간 문구("18:00 ~ 21:00")의 끝 시각을 쓰고, 읽을 수 없으면 시작 뒤 2시간으로 둔다.
// 문구는 한국 시간이고, 끝 시각이 시작보다 이르면 다음 날로 넘긴다.
export function showEndsAt(start: Date, timeLabel: string) {
  const match = timeLabel.match(/[~\-–]\s*(\d{1,2}):(\d{2})/);
  const fallback = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return fallback;

  const kstStart = new Date(start.getTime() + 9 * 60 * 60 * 1000);
  const kstEnd = Date.UTC(kstStart.getUTCFullYear(), kstStart.getUTCMonth(), kstStart.getUTCDate(), hour, minute) - 9 * 60 * 60 * 1000;
  const end = new Date(kstEnd <= start.getTime() ? kstEnd + 24 * 60 * 60 * 1000 : kstEnd);
  return end;
}

type ShowForCalendar = {
  id: string;
  title: string;
  venue: string;
  venueAddress: string;
  timeLabel: string;
  startsAt: Date;
  salesOpenAt: Date | null;
};

// 공연 일정: 2시간 전에 알림.
export function showEvent(show: Omit<ShowForCalendar, "salesOpenAt">, appUrl: string): CalendarEvent {
  return {
    uid: `${show.id}-show@band-bansong`,
    title: show.title,
    start: show.startsAt,
    end: showEndsAt(show.startsAt, show.timeLabel),
    location: [show.venue, show.venueAddress].filter(Boolean).join(", "),
    description: "입장할 때 마이 티켓의 QR을 보여 주세요.",
    url: `${appUrl}/myticket`,
    alarmMinutes: 120,
  };
}

// 티켓 오픈 알림: 10분 전에 알림. 오픈 일시가 없으면 null.
export function salesOpenEvent(show: Pick<ShowForCalendar, "id" | "title" | "salesOpenAt">, appUrl: string): CalendarEvent | null {
  if (!show.salesOpenAt) return null;
  return {
    uid: `${show.id}-open@band-bansong`,
    title: `${show.title} 티켓 오픈`,
    start: show.salesOpenAt,
    end: new Date(show.salesOpenAt.getTime() + 30 * 60 * 1000),
    description: "1인 1매, 선착순이에요. 카카오 로그인을 미리 해 두면 빨라요.",
    url: `${appUrl}/book`,
    alarmMinutes: 10,
  };
}
