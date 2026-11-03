"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { StaffLevelContext, menuItemFor } from "@/components/admin/StaffLevel";
import { apiFetch, getToken, readStaffLevel, writeStaffLevel } from "@/lib/api-client";
import { staffLevel, type StaffLevel } from "@/lib/roles";

type MeResponse = { user?: { roles?: string[] } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [level, setLevel] = useState<StaffLevel | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!getToken()) {
      router.replace("/login?next=/admin");
      return;
    }
    // 운영진이라고 기억해 둔 계정이면 확인을 기다리지 않고 바로 연다. 목록 API는 서버에서 권한을 다시 보므로
    // 먼저 열리는 건 화면 틀뿐이고, 뒤에서 한 번 더 확인해 결과가 다르면 내보낸다.
    const cached = readStaffLevel()?.level;
    if (cached) {
      setLevel(cached);
      setChecked(true);
    }

    const check = async () => {
      try {
        const me = await apiFetch<MeResponse>("/auth/me");
        const current = staffLevel(me?.user?.roles || []);
        writeStaffLevel(current);
        if (!current) {
          router.replace("/");
          return;
        }
        if (mounted) setLevel(current);
      } catch {
        router.replace("/login?next=/admin");
      } finally {
        if (mounted) setChecked(true);
      }
    };

    void check();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (!checked) {
    return <main className="page py-20 text-center text-ui text-ink-3">운영진 계정인지 확인하고 있어요.</main>;
  }
  if (!level) return null;

  // 스태프가 관리자 전용 메뉴 주소로 들어오면 안내만 한다(서버 API도 403으로 막는다).
  const item = menuItemFor(pathname);
  const blocked = level === "staff" && item && !item.staff;

  return (
    <StaffLevelContext.Provider value={level}>
      <main className="page pb-16 pt-6 lg:pt-10 print:p-0">
        <h1 className="text-h1 font-bold print:hidden">관리자</h1>
        <div className="mt-4 print:hidden">
          <AdminNav />
        </div>
        <div className="pt-6 lg:pt-8 print:pt-0">
          {blocked ? (
            <div className="py-16 text-center">
              <p className="text-ui text-ink-2">관리자 계정만 볼 수 있는 메뉴예요.</p>
              <Link href="/admin" className="btn-secondary mt-4">
                입금·입장 확인으로 가기
              </Link>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </StaffLevelContext.Provider>
  );
}
