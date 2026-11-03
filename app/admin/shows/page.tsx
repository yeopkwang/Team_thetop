"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { ChevronRightIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { SHOW_STATUS, type ShowStatusKey } from "@/lib/status";

type ShowRow = {
  id: string;
  title: string;
  posterUrl: string | null;
  dateLabel: string;
  status: ShowStatusKey;
  firstDate: string | null;
  totalCapacity: number;
  reservedQty: number;
};

export default function AdminShowsPage() {
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch<{ shows: ShowRow[] }>("/admin/shows")
      .then((data) => setShows(data.shows))
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "공연 목록을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lead font-bold">등록된 공연 {loading ? "" : `${shows.length}개`}</h2>
          <p className="mt-1 text-meta text-ink-3">판매 중인 공연이 첫 화면과 공연 안내에 나와요. 지난 공연은 지난 공연 목록에 나와요.</p>
        </div>
        <Link href="/admin/shows/new" className="btn-primary btn-sm shrink-0">
          새 공연 등록
        </Link>
      </div>

      {message && <p className="mt-4 rounded-md bg-surface px-4 py-3 text-meta text-ink-2">{message}</p>}

      <ul className="mt-5 divide-y divide-line border-y border-line">
        {loading && <li className="py-6 text-center text-meta text-ink-3">불러오는 중</li>}
        {!loading && shows.length === 0 && (
          <li className="py-10 text-center text-ui text-ink-3">등록된 공연이 없어요. 새 공연을 등록해 주세요.</li>
        )}
        {shows.map((s) => {
          const status = SHOW_STATUS[s.status];
          return (
            <li key={s.id}>
              <Link href={`/admin/shows/${s.id}`} className="flex items-center gap-4 py-3.5 hover:bg-surface/60">
                <div className="h-[72px] w-[54px] shrink-0 overflow-hidden rounded border border-line bg-surface">
                  {s.posterUrl && <img src={s.posterUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold">{s.title}</p>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </div>
                  <p className="mt-0.5 text-meta text-ink-3">
                    {s.dateLabel || (s.firstDate ? formatDate(s.firstDate) : "날짜 미정")}
                  </p>
                  {s.status !== "ENDED" && (
                    <p className="text-meta text-ink-3">
                      예매 {s.reservedQty}명 / 정원 {s.totalCapacity}명
                    </p>
                  )}
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-4" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
