export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";
import ShowText from "@/components/ShowText";
import BookingCalendar from "@/components/show/BookingCalendar";
import CreditsTable from "@/components/show/CreditsTable";
import MobileBookingBar from "@/components/show/MobileBookingBar";
import { MobilePosterHero } from "@/components/show/Poster";
import SalesInfoTable from "@/components/show/SalesInfoTable";
import SetlistView from "@/components/show/SetlistView";
import ShowSummary from "@/components/show/ShowSummary";
import ShowTabs from "@/components/show/ShowTabs";
import VenueInfo from "@/components/show/VenueInfo";
import { formatDate, formatTime, kstDayKey } from "@/lib/format";
import { normalizeSetlist } from "@/lib/setlist";
import { getCurrentShow, getSessionAvailability } from "@/lib/show";

export const metadata: Metadata = { title: "공연 안내" };

export default async function ShowPage() {
  const show = await getCurrentShow();
  if (!show) {
    return (
      <main className="page">
        <EmptyState
          title="지금 예매 중인 공연이 없어요"
          description="다음 공연 예매가 열리면 이곳에서 바로 예매할 수 있어요."
        />
      </main>
    );
  }

  const sessions = await getSessionAvailability(show);
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const period = !first
    ? ""
    : kstDayKey(first.date) === kstDayKey(last.date)
      ? formatDate(first.date)
      : `${formatDate(first.date)} ~ ${formatDate(last.date)}`;
  // 판매 중인 공연의 셋리스트는 관리자가 공개로 둔 경우에만 보인다(스포일러를 막으려고).
  const setlist = show.setlistPublic ? normalizeSetlist(show.setlist) : [];

  const tabs = [
    {
      id: "info",
      label: "공연정보",
      content: (
        <div className="space-y-10">
          {show.notice && (
            <section>
              <h3 className="mb-2 text-[16px] font-bold">공지사항</h3>
              <p className="text-ui leading-[1.8] text-ink-2">{show.notice}</p>
            </section>
          )}
          {show.introText && <ShowText text={show.introText} />}
        </div>
      ),
    },
    ...(setlist.length ? [{ id: "setlist", label: "셋리스트", content: <SetlistView sections={setlist} /> }] : []),
    ...(show.credits.trim() ? [{ id: "credits", label: "크레딧", content: <CreditsTable credits={show.credits} /> }] : []),
    {
      id: "sales",
      label: "판매정보",
      content: (
        <div className="space-y-10">
          <SalesInfoTable show={show} period={period} />
          {show.salesText && <ShowText text={show.salesText} />}
        </div>
      ),
    },
    ...(show.venue
      ? [{ id: "venue", label: "장소정보", content: <VenueInfo venue={show.venue} address={show.venueAddress} /> }]
      : []),
  ];

  return (
    <main className="page-enter pb-16">
      <MobilePosterHero src={show.posterUrl} title={show.title} />

      <div className="page lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pt-10">
        <div className="min-w-0">
          <ShowSummary show={show} period={period} />
          <ShowTabs tabs={tabs} />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+24px)]">
            <BookingCalendar
              price={show.price}
              salesOpenAt={show.salesOpenAt?.toISOString() ?? null}
              sessions={sessions.map((s) => ({
                id: s.id,
                title: s.title,
                dayKey: kstDayKey(s.date),
                time: formatTime(s.date),
                startsAt: s.date.toISOString(),
                remaining: s.remaining,
                total: s.total,
              }))}
            />
          </div>
        </aside>
      </div>

      <MobileBookingBar
        salesOpenAt={show.salesOpenAt?.toISOString() ?? null}
        sessions={sessions.map((s) => ({ startsAt: s.date.toISOString(), remaining: s.remaining }))}
      />
    </main>
  );
}
