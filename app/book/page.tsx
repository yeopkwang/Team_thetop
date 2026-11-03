export const dynamic = "force-dynamic";
import BookingForm from "@/components/BookingForm";
import ShowInfo from "@/components/ShowInfo";
import { getCurrentShow } from "@/lib/show";

export default async function BookPage() {
  const show = await getCurrentShow();
  if (!show) {
    return <main className="container-base">지금 예매 중인 공연이 없습니다.</main>;
  }

  return (
    <main className="container-base space-y-6">
      <ShowInfo show={show} />
      <BookingForm />
    </main>
  );
}
