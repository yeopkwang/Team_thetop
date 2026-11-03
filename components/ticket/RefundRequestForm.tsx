"use client";

import { FormEvent, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";

const BANKS = ["카카오뱅크", "토스뱅크", "국민", "신한", "우리", "하나", "농협", "기업", "새마을금고", "우체국", "케이뱅크", "SC제일", "부산", "대구"];

// 마이 티켓의 환불 요청: 환불받을 계좌를 받아 요청한다. 운영진은 이 계좌로 송금하고 '환불 완료'를 누른다.
export default function RefundRequestForm({
  bookingId,
  defaultHolder,
  onDone,
  onCancel,
}: {
  bookingId: string;
  defaultHolder: string;
  onDone: (message: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [holder, setHolder] = useState(defaultHolder);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!window.confirm("환불을 요청할까요? 요청하면 이 티켓으로 입장할 수 없고, 좌석이 다른 관객에게 돌아가요.")) return;
    setBusy(true);
    setMessage("");
    try {
      await apiFetch("/refunds/request", { method: "POST", bodyJson: { reservationId: bookingId, bank, account, holder } });
      await onDone("환불을 요청했어요. 운영진이 적어 주신 계좌로 송금하면 환불 완료로 바뀌어요.");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "환불을 요청하지 못했어요."));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-bold">환불받을 계좌</h2>
      <p className="mt-1 text-meta text-ink-3">운영진이 이 계좌로 관람료를 돌려드려요. 송금이 끝나면 계좌번호는 끝 네 자리만 남기고 지워요.</p>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="label">은행</span>
          <input
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            list="refund-banks"
            maxLength={20}
            placeholder="예: 카카오뱅크"
            className="field mt-1.5"
            required
          />
          <datalist id="refund-banks">
            {BANKS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="label">계좌번호</span>
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            inputMode="numeric"
            maxLength={30}
            placeholder="숫자만 적어도 돼요"
            className="field mt-1.5"
            required
          />
        </label>
        <label className="block">
          <span className="label">예금주</span>
          <input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={20} className="field mt-1.5" required />
        </label>
      </div>
      {message && (
        <p role="status" className="mt-3 text-meta text-brand-600">
          {message}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary flex-1">
          {busy ? "요청하는 중" : "환불 요청"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          닫기
        </button>
      </div>
    </form>
  );
}
