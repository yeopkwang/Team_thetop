"use client";

import Link from "next/link";
import { useState } from "react";
import { apiDownload, errorMessage } from "@/lib/api-client";

// 예매자 명단 바로가기: 엑셀로 받기, 현장용 명단 인쇄. showId가 없으면 판매 중인 공연.
export default function AttendeeListActions({ showId, excelLabel = "명단 엑셀로 받기" }: { showId?: string; excelLabel?: string }) {
  const [message, setMessage] = useState("");
  const query = showId ? `show=${encodeURIComponent(showId)}` : "";

  const download = async () => {
    setMessage("");
    try {
      await apiDownload(`/admin/attendees?${query ? `${query}&` : ""}format=csv`, "예매자 명단.csv");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "명단을 내려받지 못했어요."));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => void download()} className="btn-secondary btn-sm">
        {excelLabel}
      </button>
      <Link href={`/admin/reservations/print${query ? `?${query}` : ""}`} className="btn-secondary btn-sm">
        현장용 명단 인쇄
      </Link>
      {message && (
        <p role="status" className="text-meta text-brand-600">
          {message}
        </p>
      )}
    </div>
  );
}
