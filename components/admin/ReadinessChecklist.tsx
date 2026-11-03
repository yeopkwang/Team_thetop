import { showReadiness, type ReadinessInput } from "@/lib/readiness";

// 공연 수정 화면의 '판매 전 점검'. 꼭 채울 것이 비면 판매 중으로 저장되지 않는다(서버도 같은 규칙으로 막는다).
export default function ReadinessChecklist({ show, alreadyOnSale }: { show: ReadinessInput; alreadyOnSale: boolean }) {
  const items = showReadiness(show).filter((item) => !(alreadyOnSale && item.key === "date"));
  const missingRequired = items.filter((i) => i.required && !i.ok);
  const missingOptional = items.filter((i) => !i.required && !i.ok);

  return (
    <div className={`rounded-lg border p-4 ${missingRequired.length ? "border-brand-200 bg-brand-50" : "border-line bg-surface"}`}>
      <p className="text-ui font-semibold">
        {missingRequired.length
          ? `판매 중으로 바꾸려면 ${missingRequired.length}가지를 더 채워야 해요.`
          : missingOptional.length
            ? "판매를 열 수 있어요. 아래도 채우면 관객이 덜 헷갈려요."
            : "판매를 열 준비가 다 됐어요."}
      </p>
      {(missingRequired.length > 0 || missingOptional.length > 0) && (
        <ul className="mt-2 space-y-1 text-meta">
          {missingRequired.map((i) => (
            <li key={i.key} className="text-brand-800">
              <strong className="font-semibold">꼭: {i.label}</strong> {i.hint}
            </li>
          ))}
          {missingOptional.map((i) => (
            <li key={i.key} className="text-ink-2">
              <span className="font-semibold">권장: {i.label}</span> {i.hint}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
