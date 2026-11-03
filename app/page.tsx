export const dynamic = "force-dynamic";
import Link from "next/link";
import ShowInfo from "@/components/ShowInfo";
import ShowText from "@/components/ShowText";
import { getCurrentShow } from "@/lib/show";

export default async function HomePage() {
  const show = await getCurrentShow();
  if (!show) {
    return <main className="container-base">지금 예매 중인 공연이 없습니다.</main>;
  }

  return (
    <main className="container-base space-y-6">
      <ShowInfo show={show}>
        <div className="pt-2">
          <Link
            href="/book"
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            예매하기
          </Link>
        </div>
      </ShowInfo>

      {show.introText && (
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow md:p-8">
          <h2 className="text-xl font-bold">공연 소개</h2>
          <ShowText text={show.introText} />
        </section>
      )}

      {show.salesText && (
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow md:p-8">
          <h2 className="text-xl font-bold">판매 상세</h2>
          <ShowText text={show.salesText} />
        </section>
      )}
    </main>
  );
}
