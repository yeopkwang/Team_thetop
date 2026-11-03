"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_MENU, menuItemFor, useStaffLevel } from "./admin/StaffLevel";
import { useSlidingIndicator } from "./useSlidingIndicator";

export default function AdminNav() {
  const pathname = usePathname();
  const level = useStaffLevel();
  const items = ADMIN_MENU.filter((item) => level === "admin" || item.staff);
  const activeHref = menuItemFor(pathname)?.href;
  const indicator = useSlidingIndicator(activeHref);

  return (
    <nav aria-label="관리 메뉴" className="-mx-4 overflow-x-auto border-b border-line px-4 md:-mx-6 md:px-6 lg:mx-0 lg:px-0 print:hidden">
      <div ref={indicator.containerRef} className="relative flex w-max gap-6">
        {items.map((item) => {
          const active = item.href === activeHref;
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
