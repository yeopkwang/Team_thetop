import Link from "next/link";
import EmptyState from "@/components/EmptyState";

export default function NotFound() {
  return (
    <main className="page">
      <EmptyState title="찾는 페이지가 없어요" description="주소가 바뀌었거나 지워진 페이지예요.">
        <Link href="/show" className="btn-primary">
          공연 안내로 가기
        </Link>
        <Link href="/past" className="btn-secondary">
          지난 공연 보기
        </Link>
      </EmptyState>
    </main>
  );
}
