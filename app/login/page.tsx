"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCredentialsLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("로그인에 실패했습니다. ID/PW를 확인하세요.");
      return;
    }
    window.location.href = "/";
  };

  return (
    <main className="container-base space-y-6">
      <h1 className="text-2xl font-bold">로그인</h1>

      <form onSubmit={handleCredentialsLogin} className="space-y-3 max-w-sm">
        <div className="space-y-1">
          <label className="block text-sm font-medium">ID</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="test"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
            placeholder="test"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500">
          ID/PW로 로그인
        </button>
      </form>

      <div className="pt-4">
        <button
          onClick={() => signIn("kakao")}
          className="px-4 py-2 rounded bg-yellow-400 text-black font-semibold hover:brightness-95"
        >
          카카오로 로그인
        </button>
      </div>
    </main>
  );
}
