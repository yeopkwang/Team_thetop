"use client";

import { useEffect, useState } from "react";
import FilterChips from "@/components/admin/FilterChips";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { LOG_KINDS, type LogKind } from "@/lib/log-kinds";

type Log = { id: string; atText: string; action: string; actor: string; target: string; detail: string };
type LogPage = { logs: Log[]; nextCursor: string | null };

const FILTERS: { id: LogKind | "all"; label: string }[] = [
  { id: "all", label: "전체" },
  ...(Object.keys(LOG_KINDS) as LogKind[]).map((id) => ({ id, label: LOG_KINDS[id] })),
];

// 작업 기록: 누가 언제 무엇을 했는지. "이 예매 왜 취소됐지?" 같은 걸 찾을 때 본다.
export default function AdminLogsPage() {
  const [kind, setKind] = useState<LogKind | "all">("all");
  const [logs, setLogs] = useState<Log[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = async (cursor?: string) => {
    setLoading(true);
    setMessage("");
    try {
      const qs = new URLSearchParams();
      if (kind !== "all") qs.set("kind", kind);
      if (cursor) qs.set("cursor", cursor);
      const data = await apiFetch<LogPage>(`/admin/logs?${qs.toString()}`);
      setLogs((prev) => (cursor ? [...prev, ...data.logs] : data.logs));
      setNextCursor(data.nextCursor);
    } catch (error: unknown) {
      setMessage(errorMessage(error, "작업 기록을 불러오지 못했어요."));
    } finally {
      setLoading(false);
    }
  };

  // 종류를 바꾸면 처음부터 다시 받는다.
  useEffect(() => {
    void load();
  }, [kind]);

  return (
    <section>
      <h2 className="text-lead font-bold">작업 기록</h2>
      <p className="mt-1 text-meta text-ink-3">입금 확인, 취소, 환불, 입장, 공연 수정, 계정 변경을 누가 언제 했는지 남아요. 지울 수 없어요.</p>

      <div className="mt-4">
        <FilterChips label="종류로 거르기" items={FILTERS} value={kind} onChange={setKind} />
      </div>

      {message && <p className="mt-4 rounded-md bg-surface px-4 py-3 text-meta text-ink-2">{message}</p>}

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {!loading && logs.length === 0 && !message && <li className="py-10 text-center text-ui text-ink-3">아직 기록이 없어요.</li>}
        {logs.map((log) => (
          <li key={log.id} className="grid gap-1 py-3 sm:grid-cols-[170px_1fr] sm:gap-4">
            <p className="text-meta tabular-nums text-ink-3">{log.atText}</p>
            <div className="min-w-0">
              <p className="text-ui">
                <strong className="font-semibold">{log.action}</strong>
                {log.target && <span className="text-ink-2">, {log.target}</span>}
              </p>
              {log.detail && <p className="text-meta text-ink-2">{log.detail}</p>}
              {log.actor && <p className="text-cap text-ink-3">{log.actor}</p>}
            </div>
          </li>
        ))}
        {loading && <li className="py-6 text-center text-meta text-ink-3">불러오는 중</li>}
      </ul>

      {nextCursor && !loading && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => void load(nextCursor)} className="btn-secondary">
            더 불러오기
          </button>
        </div>
      )}
    </section>
  );
}
