import Link from "next/link";

const links = [
  { href: "/admin/reservations", label: "예약 관리" },
  { href: "/admin/refunds", label: "환불 관리" },
  { href: "/admin/checkin", label: "검표" },
  { href: "/admin/templates", label: "티켓 템플릿" },
  { href: "/admin/roles", label: "권한 관리" },
];

export default function AdminDashboard() {
  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">ADMIN</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg bg-white shadow p-4 hover:shadow-lg">
            {l.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
