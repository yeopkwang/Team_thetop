import { mapLinks } from "@/lib/maps";

// 장소정보 탭: 공연장 이름과 주소, 지도 앱 바로가기.
export default function VenueInfo({ venue, address }: { venue: string; address: string }) {
  return (
    <div>
      <table className="w-full border-t border-ink text-left text-ui">
        <tbody>
          <tr className="border-b border-line">
            <th scope="row" className="w-[92px] bg-surface px-3 py-3 font-normal text-ink-2 sm:w-[140px] sm:px-4">
              장소
            </th>
            <td className="px-3 py-3 font-semibold sm:px-4">{venue}</td>
          </tr>
          {address && (
            <tr className="border-b border-line">
              <th scope="row" className="bg-surface px-3 py-3 font-normal text-ink-2 sm:px-4">
                주소
              </th>
              <td className="px-3 py-3 sm:px-4">{address}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap gap-2">
        {mapLinks(address || venue).map((m) => (
          <a key={m.name} href={m.href} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
            {m.name}에서 보기
          </a>
        ))}
      </div>
    </div>
  );
}
