"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, getToken } from "@/lib/api-client";
import Wordmark from "./Wordmark";
import { TicketIcon, UserIcon } from "./icons";

type MeResponse = { user?: { roles?: string[] } };

const ADMIN_ROLE_CACHE_KEY = "admin_role_cache_v1";
const ADMIN_ROLE_CACHE_TTL_MS = 60 * 1000;

function useAuthState() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const hasToken = !!getToken();
      if (mounted) setLoggedIn(hasToken);
      if (!hasToken) {
        if (mounted) setIsAdmin(false);
        return;
      }

      try {
        const cached = JSON.parse(window.localStorage.getItem(ADMIN_ROLE_CACHE_KEY) || "null") as {
          isAdmin: boolean;
          expiresAt: number;
        } | null;
        if (cached && cached.expiresAt > Date.now()) {
          if (mounted) setIsAdmin(cached.isAdmin);
          return;
        }
      } catch {
        // 캐시가 깨졌으면 새로 묻는다
      }

      try {
        const me = await apiFetch<MeResponse>("/auth/me");
        const roles = me?.user?.roles || [];
        const admin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
        window.localStorage.setItem(
          ADMIN_ROLE_CACHE_KEY,
          JSON.stringify({ isAdmin: admin, expiresAt: Date.now() + ADMIN_ROLE_CACHE_TTL_MS })
        );
        if (mounted) setIsAdmin(admin);
      } catch {
        if (mounted) setIsAdmin(false);
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

  return { loggedIn, isAdmin };
}

export default function SiteHeader() {
  const pathname = usePathname();
  const { loggedIn, isAdmin } = useAuthState();

  const nav = [
    { href: "/", label: "공연 안내", active: pathname === "/" },
    { href: "/book", label: "예매하기", active: pathname.startsWith("/book") },
    { href: "/myticket", label: "마이 티켓", active: pathname.startsWith("/myticket") },
    ...(isAdmin ? [{ href: "/admin", label: "관리자", active: pathname.startsWith("/admin") }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="page flex h-[52px] items-center gap-8 lg:h-16">
        <Link href="/" className="shrink-0" aria-label="작전명;문 공연 안내">
          <Wordmark />
        </Link>

        <nav className="hidden h-full items-stretch gap-7 lg:flex" aria-label="주 메뉴">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`relative flex items-center text-[15px] font-semibold ${
                item.active ? "text-brand-600" : "text-ink hover:text-brand-600"
              }`}
            >
              {item.label}
              {item.active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-brand-600" />}
            </Link>
          ))}
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
        <div className="page flex h-11 gap-6 overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`relative flex shrink-0 items-center text-ui font-semibold ${
                item.active ? "text-brand-600" : "text-ink-2"
              }`}
            >
              {item.label}
              {item.active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-brand-600" />}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
