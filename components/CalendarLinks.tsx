import { googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";

// 캘린더에 추가: 휴대폰 기본 캘린더(.ics 파일)와 구글 캘린더.
export default function CalendarLinks({ icsHref, event, label }: { icsHref: string; event: CalendarEvent; label: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a href={icsHref} className="btn-secondary btn-sm">
        {label}
      </a>
      <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm text-ink-2">
        구글 캘린더
      </a>
    </div>
  );
}
