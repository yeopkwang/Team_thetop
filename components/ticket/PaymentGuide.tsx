"use client";

import { useState } from "react";
import { formatSessionDate, won } from "@/lib/format";
import { CheckIcon, CopyIcon } from "../icons";

type Props = {
  show: { price: number; paymentBank: string; paymentAccount: string; paymentHolder: string };
  booking: { expiresAt: string; depositorName: string };
};

// 마이 티켓의 입금 안내: 계좌(복사 버튼), 예금주, 입금자명, 금액, 입금 기한.
export default function PaymentGuide({ show, booking }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(show.paymentAccount.replace(/[^0-9]/g, "") || show.paymentAccount);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
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
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">입금자명</dt>
          <dd className="font-semibold">{booking.depositorName || "관람객 본인 실명"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-2">입금 금액</dt>
          <dd className="text-lead font-bold text-ink">{won(show.price)}</dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-wait-700/15 pt-3 text-meta text-ink-2">
        <strong className="font-semibold text-wait-700">{formatSessionDate(booking.expiresAt)}</strong>까지 입금해 주세요. 기한이
        지나면 예매가 저절로 만료돼요. 입금자명이 다르면 확인이 늦어질 수 있어요.
      </p>
    </section>
  );
}
