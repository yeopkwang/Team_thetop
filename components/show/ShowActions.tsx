"use client";

import { useState } from "react";
import CalendarLinks from "@/components/CalendarLinks";
import { salesOpenEvent } from "@/lib/calendar";

// 공연 안내 제목 아래: 공유하기(휴대폰 공유 창, 안 되면 링크 복사)와 티켓 오픈 전이면 오픈 알림 추가.
export default function ShowActions({
  show,
  appUrl,
  upcoming,
}: {
  show: { id: string; title: string; salesOpenAt: string | null };
  appUrl: string;
  upcoming: boolean;
}) {
  const [message, setMessage] = useState("");

  const share = async () => {
    const url = `${appUrl || window.location.origin}/show`;
    try {
      if (navigator.share) {
        await navigator.share({ title: show.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMessage("링크를 복사했어요. 카카오톡이나 인스타그램에 붙여 넣어 주세요.");
    } catch {
      // 공유 창을 닫은 경우도 여기로 온다. 따로 알릴 것은 없다.
    }
  };

  const openEvent = upcoming && show.salesOpenAt ? salesOpenEvent({ ...show, salesOpenAt: new Date(show.salesOpenAt) }, appUrl) : null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void share()} className="btn-secondary btn-sm">
          공유하기
        </button>
        {openEvent && <CalendarLinks icsHref="/api/calendar?type=open" event={openEvent} label="티켓 오픈 알림 받기" />}
      </div>
      {message && (
        <p role="status" className="text-meta text-ink-2">
          {message}
        </p>
      )}
    </div>
  );
}
