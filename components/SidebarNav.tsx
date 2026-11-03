"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, springFetch } from "@/lib/spring-client";

type NavItem = {
  href: string;
  label: string;
};

type MeResponse = {
  user?: {
    roles?: string[];
  };
};

const ADMIN_ROLE_CACHE_KEY = "admin_role_cache_v1";
const ADMIN_ROLE_CACHE_TTL_MS = 60 * 1000;

function Item({ item, variant }: { item: NavItem; variant?: "mobile" | "desktop" }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const base =
    variant === "mobile"
      ? "flex items-center justify-center rounded-full border px-3 py-2 text-sm"
      : "flex items-center rounded-lg px-3 py-2 text-sm";
  const activeClass =
    variant === "mobile"
      ? "bg-slate-900 text-white border-slate-900"
      : "bg-slate-900 text-white shadow";
  const inactiveClass =
    variant === "mobile"
      ? "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
      : "text-slate-700 hover:bg-slate-100";

  return (
    <Link href={item.href} className={`${base} ${active ? activeClass : inactiveClass}`}>
      <span>{item.label}</span>
    </Link>
  );
}

export default function SidebarNav() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!getToken()) {
        if (mounted) setIsAdmin(false);
        return;
      }

      const cached = window.localStorage.getItem(ADMIN_ROLE_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as { isAdmin: boolean; expiresAt: number };
          if (parsed.expiresAt > Date.now()) {
            if (mounted) setIsAdmin(Boolean(parsed.isAdmin));
            return;
          }
        } catch {
          // ignore invalid cache
        }
      }

      try {
        const me = await springFetch<MeResponse>("/auth/me");
        const roles = me?.user?.roles || [];
        const nextIsAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
        window.localStorage.setItem(
          ADMIN_ROLE_CACHE_KEY,
          JSON.stringify({ isAdmin: nextIsAdmin, expiresAt: Date.now() + ADMIN_ROLE_CACHE_TTL_MS })
        );
        if (mounted) setIsAdmin(nextIsAdmin);
      } catch {
        window.localStorage.removeItem(ADMIN_ROLE_CACHE_KEY);
        if (mounted) setIsAdmin(false);
      }
    };

    load();
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const navItems: NavItem[] = [
    { href: "/myticket", label: "마이 티켓" },
    { href: "/", label: "공연 안내" },
    { href: "/login", label: "로그인 / 회원가입" },
    { href: "/book", label: "예매하기" },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin", label: "관리자 페이지" });
  }

  return (
    <>
      <nav className="hidden md:flex flex-col gap-1">
        {navItems.map((item) => (
          <Item key={item.href} item={item} />
        ))}
      </nav>
      <nav className="md:hidden grid grid-cols-2 gap-2 px-1 pb-3">
        {navItems.map((item) => (
          <Item key={item.href} item={item} variant="mobile" />
        ))}
      </nav>
    </>
  );
}
