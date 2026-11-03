"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KakaoIcon } from "@/components/icons";
import Wordmark from "@/components/Wordmark";
import { loginErrorMessage } from "@/lib/login-errors";
import { staffLevel } from "@/lib/roles";
import { sameOriginPath } from "@/lib/safe-next";
import { SITE } from "@/lib/site";
import { apiFetch, clearAuthState, errorMessage, getAuthProvider, setAuthProvider, setToken } from "@/lib/api-client";

type User = { id: string; name?: string | null; email?: string | null; roles?: string[] };

const NEXT_KEY = "login_next";

// 로그인 뒤 돌아갈 곳. 카카오를 다녀오면 주소의 next가 사라지므로 sessionStorage에 잠시 둔다.
// 다른 사이트로 보내는 주소는 받지 않는다.
function popNext() {
  try {
    const next = window.sessionStorage.getItem(NEXT_KEY);
    window.sessionStorage.removeItem(NEXT_KEY);
    return sameOriginPath(next, window.location.origin);
  } catch {
    return null;
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const started = useRef(false);

  const refreshMe = async () => {
    try {
      const data = await apiFetch<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setChecked(true);
    }
  };

  useEffect(() => {
    // 주소를 정리하면 searchParams가 바뀌어 다시 불리므로, 처음 한 번만 처리한다.
    if (started.current) return;
    started.current = true;

    // 서버는 오류 코드만 보낸다. 주소에 적힌 문장을 그대로 보여 주지 않는다.
    const error = loginErrorMessage(searchParams.get("error"));
    if (error) setMessage(error);

    // 카카오 로그인에서 돌아오면(?kakao=done) 서버가 잠깐 쿠키에 넣어 둔 토큰을 한 번 받아 온다.
    const kakaoDone = searchParams.get("kakao") === "done";

    // 돌아갈 곳이 있으면 기억하고, 그냥 들어온 경우엔 예전에 남은 값을 지운다.
    const next = searchParams.get("next");
    try {
      if (next) window.sessionStorage.setItem(NEXT_KEY, next);
      else if (!kakaoDone) window.sessionStorage.removeItem(NEXT_KEY);
    } catch {
      // 저장이 막혀 있으면 로그인 뒤 이 화면에 머문다
    }
    if (!kakaoDone) {
      void refreshMe();
      return;
    }

    window.history.replaceState(null, "", "/login");
    apiFetch<{ token: string }>("/auth/kakao/session", { method: "POST", bodyJson: {} })
      .then(({ token }) => {
        setToken(token);
        setAuthProvider("kakao");
        const back = popNext();
        if (back) router.replace(back);
        else void refreshMe();
      })
      .catch((err: unknown) => {
        setMessage(errorMessage(err, "카카오 로그인을 다시 해 주세요."));
        void refreshMe();
      });
  }, [searchParams, router]);

  const handleAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const data = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        bodyJson: { id: loginId.trim(), password },
      });
      setToken(data.token);
      setAuthProvider("admin");
      const back = popNext();
      if (back) {
        router.replace(back);
        return;
      }
      await refreshMe();
    } catch (error: unknown) {
      setMessage(errorMessage(error, "로그인하지 못했어요."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    const provider = getAuthProvider();
    clearAuthState();
    setUser(null);
    if (provider === "kakao") {
      window.location.href = "/api/auth/kakao/logout";
      return;
    }
    setMessage("로그아웃했어요.");
  };

  const isStaff = staffLevel(user?.roles || []) !== null;

  return (
    <main className="page pb-16">
      <div className="mx-auto max-w-[400px] pt-12 lg:pt-20">
        <div className="text-center">
          <Wordmark className="text-[34px] text-ink" />
          <p className="mt-2 text-ui text-ink-3">{SITE.band} 공연 예매</p>
        </div>

        {!checked ? (
          <div className="mt-10 h-14 animate-pulse rounded-md bg-surface" />
        ) : user ? (
          <section className="mt-10">
            <div className="rounded-lg border border-line p-5 text-center">
              <p className="text-lead font-bold">{user.name || "관객"}님</p>
              <p className="mt-1 text-ui text-ink-3">{isStaff ? "운영진 계정으로 로그인했어요." : "카카오 계정으로 로그인했어요."}</p>
            </div>
            <div className="mt-4 grid gap-2">
              {isStaff ? (
                <Link href="/admin" className="btn-primary btn-lg">
                  관리자 페이지
                </Link>
              ) : (
                <>
                  <Link href="/myticket" className="btn-primary btn-lg">
                    마이 티켓
                  </Link>
                  <Link href="/book" className="btn-secondary">
                    예매하기
                  </Link>
                </>
              )}
              <button type="button" onClick={handleLogout} className="btn-ghost mx-auto text-meta">
                로그아웃
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-10">
            <a
              href="/api/auth/kakao/start"
              className="btn btn-lg w-full rounded-md bg-kakao text-[16px] text-black/85 hover:brightness-95"
            >
              <KakaoIcon />
              카카오 로그인
            </a>
            <p className="mt-3 text-center text-meta text-ink-3">관객은 카카오 계정으로 예매해요. 따로 가입할 필요는 없어요.</p>

            <details className="group mt-12 border-t border-line pt-5">
              <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-meta font-semibold text-ink-3 hover:text-ink [&::-webkit-details-marker]:hidden">
                운영진 로그인
                <span className="transition-transform group-open:rotate-180" aria-hidden>
                  ▾
                </span>
              </summary>
              <form onSubmit={handleAdminLogin} className="mt-5 space-y-3">
                <div>
                  <label htmlFor="admin-id" className="label">
                    아이디
                  </label>
                  <input
                    id="admin-id"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="admin-pw" className="label">
                    비밀번호
                  </label>
                  <input
                    id="admin-pw"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field mt-1.5"
                  />
                </div>
                <button type="submit" disabled={submitting || !loginId || !password} className="btn-primary w-full">
                  {submitting ? "로그인하는 중" : "운영진 로그인"}
                </button>
              </form>
            </details>
          </section>
        )}

        {message && (
          <p role="status" className="mt-6 rounded-md bg-surface px-4 py-3 text-center text-meta text-ink-2">
            {message}
          </p>
        )}
      </div>
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
