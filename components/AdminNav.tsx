"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "QR 검표" },
  { href: "/admin/reservations", label: "전체 예매자 목록" },
  { href: "/admin/refunds", label: "환불 관리" },
  { href: "/admin/show", label: "공연 정보" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <section className="space-y-3 rounded-2xl bg-white p-5 shadow">
      <h2 className="text-lg font-semibold">관리 메뉴</h2>
      <div className="flex flex-wrap gap-2">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              pathname === item.href
                ? "rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                : "rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
