"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, springFetch } from "@/lib/spring-client";

type MeResponse = {
  user?: {
    roles?: string[];
  };
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (!getToken()) {
        router.replace("/login");
        return;
      }

      try {
        const me = await springFetch<MeResponse>("/auth/me");
        const roles = me?.user?.roles || [];
        const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
        if (!isAdmin) {
          router.replace("/");
          return;
        }
        if (mounted) {
          setAllowed(true);
          setChecked(true);
        }
      } catch {
        router.replace("/login");
      } finally {
        if (mounted) setChecked(true);
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (!checked) {
    return <main className="container-base">권한 확인 중...</main>;
  }
  if (!allowed) return null;

  return <>{children}</>;
}
