"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  clearAuthState,
  getAuthProvider,
  setAuthProvider,
  setToken,
  springFetch,
} from "@/lib/spring-client";

type MeResponse = {
  user: { id: string; name?: string | null; email?: string | null; roles?: string[] };
};

type AuthResponse = {
  token: string;
  user: { id: string; name?: string | null; email?: string | null; roles?: string[] };
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<MeResponse["user"] | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const refreshMe = async () => {
    try {
      const data = await springFetch<MeResponse>("/auth/me");
      setCurrentUser(data.user);
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    const kakaoToken = searchParams.get("kakaoToken");
    const error = searchParams.get("error");

    if (error) {
      setMessage(error);
    }

    if (kakaoToken) {
      setToken(kakaoToken);
      setAuthProvider("kakao");
      setMessage("카카오 로그인 성공");
      refreshMe();
      router.replace("/login");
    }
  }, [router, searchParams]);

  const handleAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("관리자 로그인 중...");
    try {
      const data = await springFetch<AuthResponse>("/auth/login", {
        method: "POST",
        bodyJson: { id: loginId.trim(), password: loginPassword },
      });
      setToken(data.token);
      setAuthProvider("admin");
      setMessage("관리자 로그인 성공");
      await refreshMe();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "로그인 실패");
    }
  };

  const handleKakaoLogin = () => {
    window.location.href = "/api/auth/kakao/start";
  };

  const handleLogout = () => {
    const provider = getAuthProvider();
    clearAuthState();
    setCurrentUser(null);
    if (provider === "kakao") {
      window.location.href = "/api/auth/kakao/logout";
      return;
    }
    setMessage("로그아웃 완료");
  };

  return (
    <main className="container-base">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow space-y-6">
        <h1 className="text-2xl font-bold">로그인</h1>

        {currentUser ? (
          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm text-slate-600">
              {currentUser.name || "사용자"} ({currentUser.email || "-"}) 로그인됨
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-300"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <>
            <section className="rounded-xl border p-4 space-y-3">
              <h2 className="text-lg font-semibold">일반 사용자</h2>
              <p className="text-sm text-slate-600">일반 사용자는 카카오 로그인만 지원합니다.</p>
              <button
                type="button"
                onClick={handleKakaoLogin}
                className="rounded bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
              >
                카카오로 로그인
              </button>
            </section>

            <section className="rounded-xl border p-4 space-y-3">
              <h2 className="text-lg font-semibold">관리자 로그인 (ID/PW)</h2>
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <label className="block text-sm font-medium">
                  관리자 ID
                  <input
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder="wkrwjs1"
                  />
                </label>
                <label className="block text-sm font-medium">
                  비밀번호
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder="audans1"
                  />
                </label>
                <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                  관리자 로그인
                </button>
              </form>
            </section>
          </>
        )}

        {message && <p className="text-sm text-slate-600">{message}</p>}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
