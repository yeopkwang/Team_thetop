export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import BookingForm from "@/components/BookingForm";
import EmptyState from "@/components/EmptyState";
import { formatSessionDate } from "@/lib/format";
import { getCurrentShow, getSessionAvailability } from "@/lib/show";

export const metadata: Metadata = { title: "예매하기" };

export default async function BookPage({ searchParams }: { searchParams: { session?: string } }) {
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

  return (
    <BookingForm
      initialSessionId={searchParams.session}
      show={{
        title: show.title,
        posterUrl: show.posterUrl,
        dateLabel: show.dateLabel,
        timeLabel: show.timeLabel,
        venue: show.venue,
        price: show.price,
        paymentBank: show.paymentBank,
        paymentAccount: show.paymentAccount,
        paymentHolder: show.paymentHolder,
      }}
      sessions={sessions.map((s) => ({
        id: s.id,
        title: s.title,
        dateText: formatSessionDate(s.date),
        remaining: s.remaining,
        total: s.total,
      }))}
    />
  );
}
