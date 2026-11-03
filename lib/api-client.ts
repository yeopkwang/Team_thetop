"use client";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const API_BASE = "/api";
const AUTH_PROVIDER_KEY = "auth_provider";
const ADMIN_ROLE_KEY = "admin_role_cache_v1";
const ADMIN_ROLE_TTL_MS = 60 * 1000;
const ADMIN_CACHE_PREFIX = "admin_cache:";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("token", token);
  // 다른 계정으로 바뀌었을 수 있으니, 기억해 둔 관리자 여부와 관리자 목록을 버린다.
  window.localStorage.removeItem(ADMIN_ROLE_KEY);
  clearAdminCache();
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
  window.localStorage.removeItem(ADMIN_ROLE_KEY);
  window.localStorage.removeItem(AUTH_PROVIDER_KEY);
  clearAdminCache();
  window.dispatchEvent(new Event("storage"));
}

// 이 계정이 운영진인지 기억해 둔 값. 헤더 메뉴와 관리자 화면이 같이 쓴다.
// 1분이 지나 fresh가 false여도 값은 돌려준다(관리자 화면은 일단 열고 뒤에서 다시 확인한다).
export function readAdminRole(): { isAdmin: boolean; fresh: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(ADMIN_ROLE_KEY) || "null") as { isAdmin: boolean; expiresAt: number } | null;
    return cached ? { isAdmin: cached.isAdmin, fresh: cached.expiresAt > Date.now() } : null;
  } catch {
    return null;
  }
}

export function writeAdminRole(isAdmin: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_ROLE_KEY, JSON.stringify({ isAdmin, expiresAt: Date.now() + ADMIN_ROLE_TTL_MS }));
}

// 관리자 목록을 마지막으로 받은 값. 다시 들어오면 이것부터 보여 주고 뒤에서 새로 받는다.
// 이 탭(sessionStorage)에만 두고, 계정이 바뀌거나 로그아웃하면 지운다.
export function readAdminCache<T>(name: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(ADMIN_CACHE_PREFIX + name) || "null") as T | null;
  } catch {
    return null;
  }
}

export function writeAdminCache(name: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(ADMIN_CACHE_PREFIX + name, JSON.stringify(value));
  } catch {
    // 저장이 막혀 있으면 매번 새로 받는다
  }
}

function clearAdminCache() {
  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith(ADMIN_CACHE_PREFIX) || key.startsWith("admin_reservations_cache")) window.sessionStorage.removeItem(key);
    }
  } catch {
    // 저장소를 못 쓰면 지울 것도 없다
  }
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
