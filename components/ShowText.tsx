// 관리자 페이지에서 쓴 긴 안내문을 보여준다.
// 빈 줄로 칸을 나누고, 칸의 첫 줄이 "# "로 시작하면 그 칸은 소제목이 붙은 묶음이 된다.
export default function ShowText({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="max-w-[680px] space-y-7">
      {blocks.map((block, i) => {
        const [first, ...rest] = block.split("\n");
        if (!first.startsWith("# ")) {
          return (
            <p
              key={i}
              className={`whitespace-pre-line ${i === 0 ? "text-lead font-semibold text-ink" : "text-body text-ink-2"}`}
            >
              {block}
            </p>
          );
        }
        return (
          <section key={i} className="border-t border-line pt-6">
            <h3 className="text-lead font-bold text-ink">{first.slice(2)}</h3>
            <div className="mt-3 space-y-1 text-ui leading-[1.75] text-ink-2">
              {rest.map((line, j) => (
                <p key={j}>{line}</p>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
