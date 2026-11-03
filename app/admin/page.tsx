import CheckInPanel from "@/components/admin/CheckInPanel";
import PendingDeposits from "@/components/admin/PendingDeposits";

// 관리자 첫 화면: 공연 당일엔 왼쪽 입장 확인, 판매 기간엔 오른쪽 입금 확인을 주로 쓴다.
export default function AdminPage() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <CheckInPanel />
      <PendingDeposits />
    </div>
  );
}
