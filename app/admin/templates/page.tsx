"use client";

import { useEffect, useState } from "react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [scope, setScope] = useState("GLOBAL");
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/templates");
    if (!res.ok) return;
    const data = await res.json();
    setTemplates(data.templates || []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, imageUrl }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || "오류");
    else {
      setMessage("업데이트");
      load();
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">티켓 템플릿</h1>
      <div className="grid gap-2 max-w-xl">
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="border rounded px-3 py-2">
          <option value="GLOBAL">GLOBAL</option>
          <option value="SHOW">SHOW</option>
          <option value="SESSION">SESSION</option>
        </select>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="이미지 URL"
          className="border rounded px-3 py-2"
        />
        <button onClick={submit} className="px-3 py-2 bg-primary text-white rounded">
          저장
        </button>
        {message && <div className="text-sm text-primary">{message}</div>}
      </div>
      <div className="grid gap-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded border p-3">
            <div className="font-semibold">{t.scope}</div>
            <div className="text-xs text-slate-500">{t.imageUrl}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
