// 공연 시리즈 이름. 첫 화면 제목과 같은 Black Han Sans로 쓴다(굵기는 한 가지뿐). 색은 부모가 정한다.
export default function Wordmark({ className = "text-[21px] text-ink" }: { className?: string }) {
  return <span className={`font-display font-normal tracking-[-0.02em] ${className}`}>작전명문</span>;
}
