"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getToken, readStaffLevel, writeStaffLevel } from "@/lib/api-client";
import { staffLevel } from "@/lib/roles";
import Wordmark from "./Wordmark";
import { TicketIcon, UserIcon } from "./icons";
import { useSlidingIndicator } from "./useSlidingIndicator";

type MeResponse = { user?: { roles?: string[] } };

function useAuthState() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const hasToken = !!getToken();
      if (mounted) setLoggedIn(hasToken);
      if (!hasToken) {
        if (mounted) setIsStaff(false);
        return;
      }

      const cached = readStaffLevel();
      if (cached?.fresh) {
        if (mounted) setIsStaff(cached.level !== null);
        return;
      }

      try {
        const me = await apiFetch<MeResponse>("/auth/me");
        const roles = me?.user?.roles || [];
        const level = staffLevel(roles);
        writeStaffLevel(level);
        if (mounted) setIsStaff(level !== null);
      } catch {
        if (mounted) setIsStaff(false);
      }
    };

    void load();
    const onStorage = () => void load();
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { loggedIn, isStaff };
}

export default function SiteHeader() {
  const pathname = usePathname();
  const { loggedIn, isStaff } = useAuthState();

  const nav = [
    { href: "/show", label: "공연 안내", active: pathname.startsWith("/show") },
    { href: "/book", label: "예매하기", active: pathname.startsWith("/book") },
    { href: "/past", label: "지난 공연", active: pathname.startsWith("/past") },
    { href: "/myticket", label: "마이 티켓", active: pathname.startsWith("/myticket") },
    ...(isStaff ? [{ href: "/admin", label: "관리자", active: pathname.startsWith("/admin") }] : []),
  ];
  const activeHref = nav.find((item) => item.active)?.href;
  const desktop = useSlidingIndicator(activeHref, [nav.length, pathname === "/"]);
  const mobile = useSlidingIndicator(activeHref, [nav.length, pathname === "/"]);

  // 첫 화면은 버튼 두 개만 보이도록, 헤더를 투명하게 겹치고 마이 티켓·로그인만 남긴다.
  if (pathname === "/") {
    return (
      <header className="absolute inset-x-0 top-0 z-40 print:hidden">
        <div className="page flex h-16 items-center justify-end gap-5 text-meta font-semibold text-white/75">
          <Link href="/past" className="hover:text-white">
            지난 공연
          </Link>
          <Link href="/myticket" className="hover:text-white">
            마이 티켓
          </Link>
          <Link href="/login" className="hover:text-white">
            {loggedIn ? "내 계정" : "로그인"}
          </Link>
          {isStaff && (
            <Link href="/admin" className="hover:text-white">
              관리자
            </Link>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white print:hidden">
      <div className="page flex h-[52px] items-center gap-8 lg:h-16">
        <Link href="/" className="shrink-0" aria-label="작전명문 첫 화면">
          <Wordmark />
        </Link>

        <nav className="hidden h-full lg:block" aria-label="주 메뉴">
          <div ref={desktop.containerRef} className="relative flex h-full items-stretch gap-7">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-indicator-key={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center text-[15px] font-semibold transition-colors duration-200 ${
                  item.active ? "text-brand-600" : "text-ink hover:text-brand-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <span aria-hidden className="absolute bottom-0 left-0 h-[2px] bg-brand-600" style={desktop.style} />
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/myticket"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface lg:hidden"
            aria-label="마이 티켓"
          >
            <TicketIcon />
          </Link>
          <Link
            href="/login"
            className="flex h-10 items-center gap-1.5 rounded-full px-2 text-meta font-semibold text-ink-2 hover:text-ink lg:px-3"
          >
            <UserIcon className="h-5 w-5" />
            <span className="hidden lg:inline">{loggedIn ? "내 계정" : "로그인"}</span>
            <span className="sr-only lg:hidden">{loggedIn ? "내 계정" : "로그인"}</span>
          </Link>
        </div>
      </div>

      <nav className="border-t border-line lg:hidden" aria-label="주 메뉴">
        <div className="page overflow-x-auto">
          <div ref={mobile.containerRef} className="relative flex h-11 w-max gap-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-indicator-key={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`flex shrink-0 items-center text-ui font-semibold transition-colors duration-200 ${
                  item.active ? "text-brand-600" : "text-ink-2"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <span aria-hidden className="absolute bottom-0 left-0 h-[2px] bg-brand-600" style={mobile.style} />
          </div>
        </div>
      </nav>
    </header>
  );
}
