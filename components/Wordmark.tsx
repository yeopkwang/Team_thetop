// 공연 시리즈 이름. 첫 화면 제목과 같은 명조체로 쓴다. 색은 부모가 정한다.
export default function Wordmark({ className = "text-[20px] text-ink" }: { className?: string }) {
  return <span className={`font-display font-black tracking-[-0.05em] ${className}`}>작전명문</span>;
}
