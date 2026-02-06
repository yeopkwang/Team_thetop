"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/book", label: "예매·예약", icon: "🎫" },
  { href: "/login", label: "로그인", icon: "🔐" },
];

function Item({ item, variant }: { item: NavItem; variant?: "mobile" | "desktop" }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const base =
    variant === "mobile"
      ? "flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm"
      : "flex items-center gap-3 rounded-lg px-3 py-2 text-sm";
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
      <span className="text-base" aria-hidden>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export default function SidebarNav() {
  return (
    <>
      <nav className="hidden md:flex flex-col gap-1">
        {navItems.map((item) => (
          <Item key={item.href} item={item} />
        ))}
      </nav>
      <nav className="md:hidden grid grid-cols-3 gap-2 px-1 pb-3">
        {navItems.map((item) => (
          <Item key={item.href} item={item} variant="mobile" />
        ))}
      </nav>
    </>
  );
}
