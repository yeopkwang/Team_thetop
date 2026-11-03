"use client";

import { useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatSessionDate, won } from "@/lib/format";
import { CheckIcon, CopyIcon } from "../icons";

type Props = {
  show: { price: number; paymentBank: string; paymentAccount: string; paymentHolder: string };
  booking: { id: string; expiresAt: string; depositorName: string };
  // 입금자명을 고친 뒤 마이 티켓을 새로 받는다.
  onChanged: () => Promise<void>;
};

// 마이 티켓의 입금 안내: 계좌(복사 버튼), 예금주, 입금자명(고치기), 금액, 입금 기한.
export default function PaymentGuide({ show, booking, onChanged }: Props) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(booking.depositorName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(show.paymentAccount.replace(/[^0-9]/g, "") || show.paymentAccount);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const saveName = async () => {
    setSaving(true);
    setMessage("");
    try {
      await apiFetch(`/bookings/${booking.id}/depositor`, { method: "POST", bodyJson: { depositorName: name.trim() } });
      setEditing(false);
      setMessage("입금자명을 고쳤어요. 이 이름으로 입금해 주세요.");
      await onChanged();
    } catch (error: unknown) {
      setMessage(errorMessage(error, "입금자명을 고치지 못했어요."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-wait-700/20 bg-wait-50 p-5">
      <h2 className="text-[15px] font-bold text-wait-700">입금하면 예매가 완료돼요</h2>
      <dl className="mt-3 space-y-2 text-ui">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-2">입금 계좌</dt>
          <dd className="flex items-center gap-2 text-right font-semibold">
            <span>
              {show.paymentBank} {show.paymentAccount}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-8 items-center gap-1 rounded border border-line-strong bg-white px-2 text-cap font-semibold text-ink-2 hover:text-ink"
            >
              {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
              {copied ? "복사됨" : "복사"}
            </button>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">예금주</dt>
          <dd>{show.paymentHolder}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="shrink-0 text-ink-2">입금자명</dt>
          {editing ? (
            <dd className="flex min-w-0 items-center gap-1.5">
              <label htmlFor="depositor-edit" className="sr-only">
                새 입금자명
              </label>
              <input
                id="depositor-edit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoComplete="name"
                className="field h-8 w-28 px-2 text-ui"
                autoFocus
              />
              <button type="button" disabled={saving || !name.trim()} onClick={() => void saveName()} className="btn-primary btn-sm h-8">
                {saving ? "저장 중" : "저장"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(booking.depositorName);
                }}
                className="btn-ghost h-8 px-1.5 text-cap"
              >
                취소
              </button>
            </dd>
          ) : (
            <dd className="flex items-center gap-2">
              <span className="font-semibold">{booking.depositorName || "관람객 본인 실명"}</span>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setMessage("");
                }}
                className="h-8 rounded border border-line-strong bg-white px-2 text-cap font-semibold text-ink-2 hover:text-ink"
              >
                고치기
              </button>
            </dd>
          )}
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">입금 금액</dt>
          <dd className="text-lead font-bold text-ink">{won(show.price)}</dd>
        </div>
      </dl>
      {message && (
        <p role="status" className="mt-2 text-meta font-semibold text-wait-700">
          {message}
        </p>
      )}
      <p className="mt-3 border-t border-wait-700/15 pt-3 text-meta text-ink-2">
        <strong className="font-semibold text-wait-700">{formatSessionDate(booking.expiresAt)}</strong>까지 입금해 주세요. 기한이
        지나면 예매가 저절로 만료돼요. 통장에 찍히는 이름이 입금자명과 다르면 확인이 늦어져요. 잘못 적었으면 입금하기 전에 고쳐 주세요.
      </p>
    </section>
  );
}
