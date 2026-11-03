// 관리자 페이지에서 쓴 긴 안내문을 보여준다.
// 빈 줄로 칸을 나누고, 칸의 첫 줄이 "# "로 시작하면 그 칸은 제목 붙은 상자로 보인다.
export default function ShowText({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const [first, ...rest] = block.split("\n");
        if (!first.startsWith("# ")) {
          return (
            <p key={i} className="whitespace-pre-line text-slate-700">
              {block}
            </p>
          );
        }
        return (
          <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold">{first.slice(2)}</p>
            {rest.map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
