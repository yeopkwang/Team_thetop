"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSlidingIndicator } from "./useSlidingIndicator";

const ITEMS = [
  { href: "/admin", label: "입금·입장 확인" },
  { href: "/admin/reservations", label: "예매자 목록" },
  { href: "/admin/refunds", label: "환불 관리" },
  { href: "/admin/shows", label: "공연 관리" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const indicator = useSlidingIndicator(ITEMS.find((item) => isActive(item.href))?.href);

  return (
    <nav aria-label="관리 메뉴" className="-mx-4 overflow-x-auto border-b border-line px-4 md:-mx-6 md:px-6 lg:mx-0 lg:px-0">
      <div ref={indicator.containerRef} className="relative flex w-max gap-6">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-indicator-key={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-12 shrink-0 items-center text-[15px] font-semibold transition-colors duration-200 ${
                active ? "text-ink" : "text-ink-3 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <span aria-hidden className="absolute -bottom-px left-0 h-[2px] bg-brand-600" style={indicator.style} />
      </div>
    </nav>
  );
}
