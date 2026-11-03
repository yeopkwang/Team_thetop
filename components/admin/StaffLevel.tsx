"use client";

import { createContext, useContext } from "react";
import type { StaffLevel } from "@/lib/roles";

// 관리자 화면 안에서 지금 계정의 권한(관리자·스태프). 관리자 layout이 채운다.
export const StaffLevelContext = createContext<StaffLevel>("staff");
export const useStaffLevel = () => useContext(StaffLevelContext);

// 관리자 메뉴. staff: true면 스태프도 쓴다. 서버 API도 같은 기준으로 권한을 확인한다.
export const ADMIN_MENU = [
  { href: "/admin", label: "입금·입장 확인", staff: true },
  { href: "/admin/reservations", label: "예매자 목록", staff: true },
  { href: "/admin/refunds", label: "환불 관리", staff: false },
  { href: "/admin/shows", label: "공연 관리", staff: false },
  { href: "/admin/logs", label: "작업 기록", staff: false },
  { href: "/admin/accounts", label: "계정", staff: true },
  { href: "/admin/guide", label: "도움말", staff: true },
] as const;

export function menuItemFor(pathname: string) {
  // 가장 길게 맞는 메뉴(/admin/reservations/print → 예매자 목록)
  return [...ADMIN_MENU]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)));
}
