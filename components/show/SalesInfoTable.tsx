import type { Show } from "@prisma/client";
import { won } from "@/lib/format";

type Fields = Pick<
  Show,
  | "venue"
  | "venueAddress"
  | "timeLabel"
  | "timeSubLabel"
  | "contactName"
  | "contactTag"
  | "refundContact"
  | "price"
  | "paymentBank"
  | "paymentAccount"
  | "paymentHolder"
>;

// 판매정보 탭 맨 위의 상품 정보 표. 비어 있는 항목은 줄째 뺀다.
export default function SalesInfoTable({ show, period }: { show: Fields; period: string }) {
  const rows: [string, React.ReactNode][] = [
    ["주최", "밴드 반송"],
    [
      "고객문의",
      [show.contactName, show.contactTag].filter(Boolean).join(" ") || "",
    ],
    ["공연기간", period],
    ["공연시간", [show.timeLabel, show.timeSubLabel && `(${show.timeSubLabel})`].filter(Boolean).join(" ")],
    ["공연장소", [show.venue, show.venueAddress].filter(Boolean).join(", ")],
    ["가격", show.price > 0 ? `전석 ${won(show.price)}` : ""],
    ["예매수수료", "없음"],
    [
      "입금 방법",
      show.paymentAccount ? `무통장 입금 ${show.paymentBank} ${show.paymentAccount} (${show.paymentHolder})` : "무통장 입금",
    ],
    ["유효기간", "예매한 공연 날짜, 해당 회차에만 입장할 수 있어요."],
    [
      "취소·환불",
      show.refundContact
        ? `마이 티켓에서 취소·환불을 요청한 뒤 ${show.refundContact}로 연락해 주세요. 환불 기준은 아래 안내를 따릅니다.`
        : "마이 티켓에서 취소·환불을 요청해 주세요. 환불 기준은 아래 안내를 따릅니다.",
    ],
  ];

  return (
    <table className="w-full border-t border-ink text-left text-ui">
      <tbody>
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <tr key={label} className="border-b border-line">
              <th scope="row" className="w-[92px] bg-surface px-3 py-3 align-top font-normal text-ink-2 sm:w-[140px] sm:px-4">
                {label}
              </th>
              <td className="px-3 py-3 text-ink sm:px-4">{value}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
