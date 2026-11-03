"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "입금·입장 확인" },
  { href: "/admin/reservations", label: "예매자 목록" },
  { href: "/admin/refunds", label: "환불 관리" },
  { href: "/admin/show", label: "공연 정보" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="관리 메뉴" className="-mx-4 overflow-x-auto border-b border-line px-4 md:-mx-6 md:px-6 lg:mx-0 lg:px-0">
      <div className="flex gap-6">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex h-12 shrink-0 items-center text-[15px] font-semibold ${
                active ? "text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {item.label}
              {active && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-brand-600" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
