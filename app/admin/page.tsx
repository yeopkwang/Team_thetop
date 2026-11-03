import CheckInPanel from "@/components/admin/CheckInPanel";
import PendingDeposits from "@/components/admin/PendingDeposits";
import SalesSummary from "@/components/admin/SalesSummary";

// 관리자 첫 화면: 맨 위 판매 현황, 그 아래 공연 당일엔 왼쪽 입장 확인, 판매 기간엔 오른쪽 입금 확인을 주로 쓴다.
export default function AdminPage() {
  return (
    <div className="space-y-10">
      <SalesSummary />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <CheckInPanel />
        <PendingDeposits />
      </div>
    </div>
  );
}
