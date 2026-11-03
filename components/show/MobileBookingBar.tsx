import Link from "next/link";

// 모바일 하단 고정 예매 버튼. 회차는 예매 화면에서 고른다.
export default function MobileBookingBar({ soldOut }: { soldOut: boolean }) {
  return (
    <div className="bottom-bar lg:hidden">
      <div className="page py-2.5">
        {soldOut ? (
          <span className="btn btn-lg w-full cursor-not-allowed bg-ink-4 text-white">매진</span>
        ) : (
          <Link href="/book" className="btn-primary btn-lg w-full">
            예매하기
          </Link>
        )}
      </div>
    </div>
  );
}
