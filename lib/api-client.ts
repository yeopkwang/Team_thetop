"use client";

import type { StaffLevel } from "./roles";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

const API_BASE = "/api";
const AUTH_PROVIDER_KEY = "auth_provider";
const STAFF_LEVEL_KEY = "staff_level_cache_v2";
const STAFF_LEVEL_TTL_MS = 60 * 1000;
const ADMIN_CACHE_PREFIX = "admin_cache:";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("token", token);
  // 다른 계정으로 바뀌었을 수 있으니, 기억해 둔 운영진 권한과 관리자 목록을 버린다.
  window.localStorage.removeItem(STAFF_LEVEL_KEY);
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
  window.localStorage.removeItem(STAFF_LEVEL_KEY);
  window.localStorage.removeItem(AUTH_PROVIDER_KEY);
  clearAdminCache();
  window.dispatchEvent(new Event("storage"));
}

// 이 계정의 운영진 권한(관리자·스태프·아님)을 기억해 둔 값. 헤더 메뉴와 관리자 화면이 같이 쓴다.
// 1분이 지나 fresh가 false여도 값은 돌려준다(관리자 화면은 일단 열고 뒤에서 다시 확인한다).
export function readStaffLevel(): { level: StaffLevel | null; fresh: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(STAFF_LEVEL_KEY) || "null") as { level: StaffLevel | null; expiresAt: number } | null;
    return cached ? { level: cached.level, fresh: cached.expiresAt > Date.now() } : null;
  } catch {
    return null;
  }
}

export function writeStaffLevel(level: StaffLevel | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STAFF_LEVEL_KEY, JSON.stringify({ level, expiresAt: Date.now() + STAFF_LEVEL_TTL_MS }));
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

// 화면에 보여 줄 오류 문구. 서버가 준 문구가 있으면 그것을, 없으면 fallback을 쓴다.
export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, body });
  } catch {
    // 오프라인이거나 서버에 닿지 못했을 때. 브라우저 영어 문구 대신 한국어로 알려 준다.
    throw new ApiError(0, "인터넷 연결을 확인한 뒤 다시 시도해 주세요.");
  }

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    const fallback = response.status >= 500 ? "일시적인 문제로 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요." : "요청을 처리하지 못했어요.";
    const apiMessage =
      typeof parsed === "object" && parsed && "error" in parsed
        ? String((parsed as { error?: string }).error || fallback)
        : fallback;
    throw new ApiError(response.status, apiMessage);
  }

  return parsed as T;
}

// 로그인이 필요한 파일(예: 예매자 명단 엑셀)을 받아 저장한다. 주소 링크로는 토큰을 실을 수 없어서 fetch로 받는다.
export async function apiDownload(path: string, fallbackName: string) {
  const token = getToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError(0, "인터넷 연결을 확인한 뒤 다시 시도해 주세요.");
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, data?.error || "파일을 받지 못했어요.");
  }
  const disposition = response.headers.get("Content-Disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = encoded ? decodeURIComponent(encoded) : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
