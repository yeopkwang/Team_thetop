export const dynamic = "force-dynamic";
import EmptyState from "@/components/EmptyState";
import ShowText from "@/components/ShowText";
import BookingPanel, { MobileBookingBar } from "@/components/show/BookingPanel";
import { MobilePosterHero } from "@/components/show/Poster";
import ShowSummary from "@/components/show/ShowSummary";
import ShowTabs from "@/components/show/ShowTabs";
import { getCurrentShow, getSessionAvailability } from "@/lib/show";

export default async function HomePage() {
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
  const tabs = [
    show.introText && { id: "intro", label: "공연 소개", content: <ShowText text={show.introText} /> },
    show.salesText && { id: "sales", label: "판매 정보", content: <ShowText text={show.salesText} /> },
  ].filter(Boolean) as { id: string; label: string; content: React.ReactNode }[];

  return (
    <main className="pb-16">
      <MobilePosterHero src={show.posterUrl} title={show.title} />

      <div className="page lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12 lg:pt-10">
        <div className="min-w-0">
          <ShowSummary show={show} />
          <ShowTabs tabs={tabs} />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-[calc(var(--header-h)+24px)]">
            <BookingPanel sessions={sessions} price={show.price} />
          </div>
        </aside>
      </div>

      <MobileBookingBar sessions={sessions} price={show.price} />
    </main>
  );
}
