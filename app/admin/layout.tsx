"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { apiFetch, getToken, readAdminRole, writeAdminRole } from "@/lib/api-client";

type MeResponse = { user?: { roles?: string[] } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // 운영진이라고 기억해 둔 계정이면 확인을 기다리지 않고 바로 연다. 목록 API는 서버에서 권한을 다시 보므로
    // 먼저 열리는 건 화면 틀뿐이고, 뒤에서 한 번 더 확인해 결과가 다르면 내보낸다.
    if (readAdminRole()?.isAdmin) {
      setAllowed(true);
      setChecked(true);
    }

    const check = async () => {
      try {
        const me = await apiFetch<MeResponse>("/auth/me");
        const roles = me?.user?.roles || [];
        const admin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
        writeAdminRole(admin);
        if (!admin) {
          router.replace("/");
          return;
        }
        if (mounted) setAllowed(true);
      } catch {
        router.replace("/login");
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
  if (!allowed) return null;

  return (
    <main className="page pb-16 pt-6 lg:pt-10">
      <h1 className="text-h1 font-bold">관리자</h1>
      <div className="mt-4">
        <AdminNav />
      </div>
      <div className="pt-6 lg:pt-8">{children}</div>
    </main>
  );
}
