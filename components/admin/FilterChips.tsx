// 목록 위의 거르기 버튼 줄(예매자 목록의 상태, 작업 기록의 종류). 휴대폰에서는 가로로 밀어서 본다.
export default function FilterChips<Id extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: Id; label: string; count?: number }[];
  value: Id;
  onChange: (id: Id) => void;
  label: string;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label={label}>
      {items.map((item) => {
        const on = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(item.id)}
            className={`h-9 shrink-0 rounded-full border px-3.5 text-meta font-semibold ${
              on ? "border-ink bg-ink text-white" : "border-line-strong bg-white text-ink-2 hover:border-ink-3"
            }`}
          >
            {item.label}
            {item.count !== undefined && <span className={on ? "text-white/70" : "text-ink-3"}> {item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
