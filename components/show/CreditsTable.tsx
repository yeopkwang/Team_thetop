import { parseCredits } from "@/lib/credits";

// 크레딧 탭: 파트별 공연자 명단
export default function CreditsTable({ credits }: { credits: string }) {
  const rows = parseCredits(credits);
  if (rows.length === 0) return <p className="text-ui text-ink-3">공연자 명단을 정리하고 있어요.</p>;

  return (
    <table className="w-full border-t border-ink text-left text-ui">
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.role}-${i}`} className="border-b border-line">
            <th scope="row" className="w-[92px] bg-surface px-3 py-3 align-top font-normal text-ink-2 sm:w-[140px] sm:px-4">
              {row.role || "출연"}
            </th>
            <td className="px-3 py-3 text-ink sm:px-4">{row.names.join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
