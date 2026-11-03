// 질문을 누르면 답이 펼쳐지는 목록. 자주 묻는 질문과 관리자 도움말이 같이 쓴다.
export default function QuestionList({ items }: { items: { q: string; a: string[] }[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <span aria-hidden className="shrink-0 text-ink-4 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="space-y-2 pb-5 text-ui leading-[1.8] text-ink-2">
            {item.a.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
