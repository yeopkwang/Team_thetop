export const dynamic = "force-dynamic";
import { getBaseUrl } from "@/lib/app-url";
import { salesOpenEvent, showEvent, toIcs } from "@/lib/calendar";
import { HttpError, route } from "@/lib/http";
import { getCurrentShow } from "@/lib/show";

// 판매 중인 공연을 캘린더 파일(.ics)로 내려준다. ?type=show(공연 일정, 기본) | open(티켓 오픈 알림)
export const GET = route(async (req) => {
  const show = await getCurrentShow();
  const startsAt = show?.sessions[0]?.date;
  if (!show || !startsAt) throw new HttpError(404, "지금 예매 중인 공연이 없어요.");

  const type = new URL(req.url).searchParams.get("type") === "open" ? "open" : "show";
  const data = { ...show, startsAt };
  const event = type === "open" ? salesOpenEvent(data, getBaseUrl(req)) : showEvent(data, getBaseUrl(req));
  if (!event) throw new HttpError(404, "티켓 오픈 일시가 정해지지 않았어요.");

  return new Response(toIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type === "open" ? "ticket-open" : "show"}.ics"`,
      "Cache-Control": "no-store",
    },
  });
});
