"use client";

import { FormEvent, useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { useStaffLevel } from "@/components/admin/StaffLevel";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { ROLE_INFO } from "@/lib/roles";

type Account = { id: string; username: string; name: string; role: string | null; isMe: boolean; createdAt: string };

function Notice({ text }: { text: string }) {
  return text ? (
    <p role="status" className="mt-3 rounded-md bg-surface px-4 py-3 text-meta text-ink-2">
      {text}
    </p>
  ) : null;
}

// 내 비밀번호 바꾸기(관리자·스태프 모두).
function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (next !== again) {
      setMessage("새 비밀번호 두 칸이 서로 달라요.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await apiFetch("/auth/password", { method: "POST", bodyJson: { current, next } });
      setCurrent("");
      setNext("");
      setAgain("");
      setMessage("비밀번호를 바꿨어요. 다음 로그인부터 새 비밀번호를 써 주세요.");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "비밀번호를 바꾸지 못했어요."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="text-lead font-bold">내 비밀번호 바꾸기</h2>
      <p className="mt-1 text-meta text-ink-3">처음 받은 임시 비밀번호는 바로 바꿔 주세요. 10자 이상이어야 해요.</p>
      <form onSubmit={submit} className="mt-4 grid max-w-[400px] gap-3">
        <label>
          <span className="label">지금 비밀번호</span>
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="field mt-1.5" required />
        </label>
        <label>
          <span className="label">새 비밀번호</span>
          <input type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} className="field mt-1.5" required />
        </label>
        <label>
          <span className="label">새 비밀번호 한 번 더</span>
          <input type="password" autoComplete="new-password" minLength={10} value={again} onChange={(e) => setAgain(e.target.value)} className="field mt-1.5" required />
        </label>
        <button type="submit" disabled={busy} className="btn-primary w-fit">
          {busy ? "바꾸는 중" : "비밀번호 바꾸기"}
        </button>
      </form>
      <Notice text={message} />
    </section>
  );
}

// 운영진 계정 목록과 만들기(관리자만).
function StaffAccounts() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "STAFF" as "ADMIN" | "STAFF" });

  const load = async () => {
    try {
      const data = await apiFetch<{ accounts: Account[] }>("/admin/accounts");
      setAccounts(data.accounts);
    } catch (error: unknown) {
      setMessage(errorMessage(error, "계정 목록을 불러오지 못했어요."));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (task: () => Promise<string>) => {
    setBusy(true);
    setMessage("");
    try {
      setMessage(await task());
      await load();
    } catch (error: unknown) {
      setMessage(errorMessage(error, "처리하지 못했어요."));
    } finally {
      setBusy(false);
    }
  };

  const create = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await apiFetch("/admin/accounts", { method: "POST", bodyJson: form });
      const done = `'${form.username.trim().toLowerCase()}' 계정을 만들었어요. 아이디와 임시 비밀번호를 직접 전해 주고, 로그인한 뒤 비밀번호를 바꾸라고 알려 주세요.`;
      setForm({ username: "", name: "", password: "", role: "STAFF" });
      return done;
    });
  };

  const reset = (a: Account) => {
    const password = window.prompt(`${a.name}(${a.username})의 새 비밀번호를 적어 주세요. 10자 이상이에요. 이 비밀번호를 직접 전해 주세요.`);
    if (!password) return;
    void run(async () => {
      await apiFetch(`/admin/accounts/${a.id}/password`, { method: "POST", bodyJson: { password } });
      return `${a.name}(${a.username})의 비밀번호를 새로 정했어요.`;
    });
  };

  const remove = (a: Account) => {
    if (!window.confirm(`${a.name}(${a.username}) 계정을 지울까요? 이 계정으로는 더 로그인할 수 없어요. 작업 기록은 남아요.`)) return;
    void run(async () => {
      await apiFetch(`/admin/accounts/${a.id}`, { method: "DELETE" });
      return `${a.name}(${a.username}) 계정을 지웠어요.`;
    });
  };

  return (
    <section>
      <h2 className="text-lead font-bold">운영진 계정</h2>
      <p className="mt-1 text-meta text-ink-3">
        관리를 넘기거나 공연 당일 입구 스태프가 필요하면 여기서 계정을 만들어요. 한 사람에 한 계정씩 만들면 작업 기록에 누가 했는지 남아요.
      </p>
      <Notice text={message} />

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {accounts === null && !message && <li className="py-6 text-center text-meta text-ink-3">불러오는 중</li>}
        {accounts?.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-semibold">{a.name}</p>
                <StatusBadge label={a.role ? (ROLE_INFO[a.role]?.label ?? a.role) : "권한 없음"} tone={a.role === "STAFF" ? "muted" : "brand"} />
                {a.isMe && <span className="text-cap text-ink-3">나</span>}
              </div>
              <p className="mt-0.5 text-meta text-ink-3">
                아이디 {a.username}, {formatDate(a.createdAt)} 만듦
              </p>
            </div>
            {!a.isMe && (
              <div className="flex shrink-0 gap-1">
                <button type="button" disabled={busy} onClick={() => reset(a)} className="btn-secondary btn-sm">
                  비밀번호 새로 정하기
                </button>
                <button type="button" disabled={busy} onClick={() => remove(a)} className="btn-ghost btn-sm text-brand-600">
                  지우기
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={create} className="mt-8 rounded-lg border border-line p-5">
        <h3 className="text-[15px] font-bold">계정 만들기</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label>
            <span className="label">아이디</span>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="영문 소문자·숫자"
              autoComplete="off"
              autoCapitalize="none"
              className="field mt-1.5"
              required
            />
          </label>
          <label>
            <span className="label">이름</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 김총무" className="field mt-1.5" required />
          </label>
          <label>
            <span className="label">임시 비밀번호</span>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="10자 이상"
              autoComplete="off"
              className="field mt-1.5"
              required
            />
          </label>
        </div>
        <fieldset className="mt-4">
          <legend className="label">권한</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {(["STAFF", "ADMIN"] as const).map((role) => {
              const on = form.role === role;
              return (
                <label key={role} className={`cursor-pointer rounded-lg border p-3.5 ${on ? "border-brand-600 bg-brand-50" : "border-line-strong hover:border-ink-3"}`}>
                  <input type="radio" name="role" className="sr-only" checked={on} onChange={() => setForm({ ...form, role })} />
                  <span className="block text-ui font-semibold">{ROLE_INFO[role].label}</span>
                  <span className="mt-0.5 block text-meta text-ink-3">{ROLE_INFO[role].description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <button type="submit" disabled={busy} className="btn-primary mt-4">
          계정 만들기
        </button>
      </form>
    </section>
  );
}

export default function AdminAccountsPage() {
  const level = useStaffLevel();
  return (
    <div className="space-y-12">
      <ChangePassword />
      {level === "admin" && <StaffAccounts />}
    </div>
  );
}
