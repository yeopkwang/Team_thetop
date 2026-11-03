export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import QuestionList from "@/components/QuestionList";
import { faqItems } from "@/lib/faq";
import { getCurrentShow } from "@/lib/show";

export const metadata: Metadata = { title: "자주 묻는 질문" };

// 자주 묻는 질문. 답에 들어가는 입금 기한·문의처는 판매 중인 공연 설정을 따른다.
export default async function HelpPage() {
  const items = faqItems(await getCurrentShow());

  return (
    <main className="pb-16">
      <div className="page max-w-[720px] pt-6 lg:pt-10">
        <h1 className="text-h1 font-bold">자주 묻는 질문</h1>
        <p className="mt-2 text-ui text-ink-3">예매, 입금, 환불, 입장에 대해 많이 묻는 것을 모았어요.</p>

        <div className="mt-8">
          <QuestionList items={items} />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/myticket" className="btn-primary">
            마이 티켓
          </Link>
          <Link href="/show" className="btn-secondary">
            공연 안내
          </Link>
        </div>
      </div>
    </main>
  );
}
