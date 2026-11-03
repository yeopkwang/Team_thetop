// 관리자 페이지에서 쓴 긴 안내문을 보여준다.
// 빈 줄로 묶음을 나누고, 묶음의 첫 줄이 "# "로 시작하면 소제목이 붙는다.
export default function ShowText({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-8 text-ui leading-[1.8] text-ink-2">
      {blocks.map((block, i) => {
        const [first, ...rest] = block.split("\n");
        if (!first.startsWith("# ")) {
          return (
            <p key={i} className="whitespace-pre-line">
              {block}
            </p>
          );
        }
        return (
          <section key={i}>
            <h3 className="mb-2 text-[16px] font-bold leading-6 text-ink">{first.slice(2)}</h3>
            {rest.map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </section>
        );
      })}
    </div>
  );
}
