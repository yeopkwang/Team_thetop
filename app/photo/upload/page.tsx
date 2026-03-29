"use client";

import { useState } from "react";

export default function PhotoUploadPage() {
  const [title, setTitle] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [urls, setUrls] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    try {
      const res = await fetch("/api/photo/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sessionId: sessionId || null, urls: urls.split(/\s+/).filter(Boolean) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setMessage("업로드 완료");
      setTitle("");
      setSessionId("");
      setUrls("");
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">사진 업로드</h1>
      <div className="grid gap-2 max-w-xl">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="border rounded px-3 py-2"
        />
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="회차 ID (선택)"
          className="border rounded px-3 py-2"
        />
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="이미지 URL들을 공백으로 구분"
          className="border rounded px-3 py-2 min-h-[120px]"
        />
        <button onClick={submit} className="px-4 py-2 bg-primary text-white rounded">
          업로드
        </button>
        {message && <div className="text-sm text-primary">{message}</div>}
      </div>
    </main>
  );
}
