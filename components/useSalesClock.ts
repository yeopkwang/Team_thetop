"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 티켓 오픈 전이면 1초마다 시계를 돌리고, 오픈 시각이 되면 화면을 새로 받아 예매 버튼을 연다.
export function useSalesClock(salesOpenAt: string | null) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const openAt = salesOpenAt ? new Date(salesOpenAt).getTime() : 0;
  const waiting = openAt > now;

  useEffect(() => {
    if (!openAt || openAt <= Date.now()) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= openAt) {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [openAt, router]);

  return { now, waiting };
}
