"use client";

import { FormEvent, useEffect, useState } from "react";
import { clearAuthState, setToken, springFetch } from "@/lib/spring-client";

type AuthMode = "login" | "signup";

type MeResponse = {
  user: { id: string; name?: string | null; email?: string | null; roles?: string[] };
};

type AuthResponse = {
  token: string;
  user: { id: string; name?: string | null; email?: string | null; roles?: string[] };
};

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<MeResponse["user"] | null>(null);

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

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

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("로그인 중...");
    try {
      const data = await springFetch<AuthResponse>("/auth/login", {
        method: "POST",
        bodyJson: { id: loginId.trim(), password: loginPassword },
      });
      setToken(data.token);
      setMessage("로그인 성공");
      await refreshMe();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "로그인 실패");
    }
  };

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(signupEmail.trim())) {
      setMessage("이메일 형식을 확인해주세요.");
      return;
    }
    if (signupPassword.length < 6) {
      setMessage("비밀번호는 6자 이상 입력해주세요.");
      return;
    }
    if (!signupName.trim()) {
      setMessage("이름을 입력해주세요.");
      return;
    }

    setMessage("회원가입 중...");
    try {
      const data = await springFetch<AuthResponse>("/auth/signup", {
        method: "POST",
        bodyJson: {
          name: signupName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
        },
      });
      setToken(data.token);
      setMessage("회원가입 및 로그인 완료");
      await refreshMe();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "회원가입 실패");
    }
  };

  const handleLogout = () => {
    clearAuthState();
    setCurrentUser(null);
    setMessage("로그아웃 완료");
  };

  return (
    <main className="container-base">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow space-y-4">
        <h1 className="text-2xl font-bold">로그인 / 회원가입</h1>

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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  mode === "login" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                로그인
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  mode === "signup" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                회원가입
              </button>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <label className="block text-sm font-medium">
                  ID
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
                  로그인
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <label className="block text-sm font-medium">
                  이름
                  <input
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder="이름"
                  />
                </label>
                <label className="block text-sm font-medium">
                  이메일
                  <input
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder="example@domain.com"
                  />
                </label>
                <label className="block text-sm font-medium">
                  비밀번호
                  <input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder="비밀번호"
                  />
                </label>
                <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white hover:bg-slate-800">
                  회원가입
                </button>
              </form>
            )}
          </>
        )}

        {message && <p className="text-sm text-slate-600">{message}</p>}
      </section>
    </main>
  );
}
