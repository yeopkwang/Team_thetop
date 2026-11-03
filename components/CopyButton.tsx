"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

// 계좌번호를 복사하는 작은 버튼. 숫자만 복사해서 은행 앱에 그대로 붙여 넣을 수 있게 한다.
export default function CopyButton({ value, label = "복사" }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/[^0-9]/g, "") || value);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      // http 주소나 권한이 막힌 브라우저. 직접 옮겨 적으라고 알린다.
      setState("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded border border-line-strong bg-white px-2 text-cap font-semibold text-ink-2 hover:text-ink"
    >
      {state === "copied" ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      {state === "copied" ? "복사됨" : state === "failed" ? "직접 적어 주세요" : label}
    </button>
  );
}
