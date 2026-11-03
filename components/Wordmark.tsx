// 공연 시리즈 이름. 세미콜론만 빨갛게 둔다.
export default function Wordmark({ className = "text-[19px]" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-[-0.04em] text-ink ${className}`}>
      작전명<span className="text-brand-600">;</span>문
    </span>
  );
}
