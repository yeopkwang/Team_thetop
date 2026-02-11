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
  window.localStorage.removeItem(AUTH_PROVIDER_KEY);
  window.dispatchEvent(new Event("storage"));
}

export async function springFetch<T = unknown>(
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
    throw new Error(apiMessage);
  }

  return parsed as T;
}
