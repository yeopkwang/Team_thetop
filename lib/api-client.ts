"use client";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const API_BASE = "/api";
const AUTH_PROVIDER_KEY = "auth_provider";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("token", token);
  // 다른 계정으로 바뀌었을 수 있으니, 헤더가 기억해 둔 관리자 여부를 버린다.
  window.localStorage.removeItem("admin_role_cache_v1");
  window.dispatchEvent(new Event("storage"));
}

export function setAuthProvider(provider: "kakao" | "admin"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_PROVIDER_KEY, provider);
}

export function getAuthProvider(): "kakao" | "admin" | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(AUTH_PROVIDER_KEY);
  if (value === "kakao" || value === "admin") return value;
  return null;
}

export function clearAuthState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("latestTicket");
  window.localStorage.removeItem("hasBooked");
  window.localStorage.removeItem("admin_role_cache_v1");
  window.localStorage.removeItem(AUTH_PROVIDER_KEY);
  window.dispatchEvent(new Event("storage"));
}

// 서버가 돌려준 오류. status로 로그인 필요(401) 같은 경우를 가려낸다.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit & { bodyJson?: JsonValue }
): Promise<T> {
  const headers = new Headers(init?.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body = init?.body;
  if (init?.bodyJson !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.bodyJson);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body,
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const fallback = `HTTP ${response.status}`;
    const apiMessage =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error?: string }).error || fallback)
        : fallback;
    throw new ApiError(response.status, apiMessage);
  }

  return parsed as T;
}
