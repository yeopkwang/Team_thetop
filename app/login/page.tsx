"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="container-base space-y-6">
      <h1 className="text-2xl font-bold">로그인</h1>
      <button
        onClick={() => signIn("kakao")}
        className="px-4 py-2 rounded bg-yellow-400 text-black font-semibold hover:brightness-95"
      >
        카카오로 로그인
      </button>
    </main>
  );
}
