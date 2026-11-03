"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

type Person = { id: string; number: string; status: string; name: string; kakaoName: string; performer: string; checkedInAt: string | null };
type AttendeeList = { show: { id: string; title: string; dateLabel: string }; people: Person[] };

// 현장용 명단: 입금이 확인된 관객을 이름순으로 뽑아 종이에 인쇄한다. 인터넷이 끊기거나 휴대폰이 꺼졌을 때 입구에서 쓴다.
// ?show=공연id가 없으면 판매 중인 공연.
export default function PrintAttendeesPage() {
  const [list, setList] = useState<AttendeeList | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const show = new URLSearchParams(window.location.search).get("show");
    apiFetch<AttendeeList>(`/admin/attendees${show ? `?show=${encodeURIComponent(show)}` : ""}`)
      .then(setList)
      .catch((error: unknown) => setMessage(errorMessage(error, "명단을 불러오지 못했어요.")));
  }, []);

  if (message) return <p className="py-16 text-center text-ui text-ink-2">{message}</p>;
  if (!list) return <p className="py-16 text-center text-meta text-ink-3">불러오는 중</p>;

  const confirmed = list.people.filter((p) => p.status === "CONFIRMED");
  const pending = list.people.filter((p) => p.status === "PAYMENT_PENDING");

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="btn-primary btn-sm">
          인쇄하기
        </button>
        <Link href="/admin/reservations" className="btn-ghost btn-sm">
          예매자 목록으로
        </Link>
        <p className="w-full text-meta text-ink-3">
          입금이 확인된 관객만 이름순으로 나와요. 공연 전날 한 번 뽑아 두면 인터넷이 끊겨도 입구에서 확인할 수 있어요.
        </p>
      </div>

      <h2 className="text-h2 font-bold">{list.show.title} 입장 명단</h2>
      <p className="mt-1 text-meta text-ink-3">
        {[list.show.dateLabel, `예매 완료 ${confirmed.length}명`, `${formatDateTime(new Date())} 기준`].filter(Boolean).join(", ")}
      </p>

      <table className="mt-4 w-full border-collapse text-left text-ui print:text-[12px]">
        <thead>
          <tr className="border-y border-ink text-meta">
            <th className="w-10 px-2 py-2 font-semibold">#</th>
            <th className="px-2 py-2 font-semibold">입금자명</th>
            <th className="px-2 py-2 font-semibold">카카오 이름</th>
            <th className="px-2 py-2 font-semibold">예매번호</th>
            <th className="px-2 py-2 font-semibold">관심 공연자</th>
            <th className="w-16 px-2 py-2 text-center font-semibold">입장</th>
          </tr>
        </thead>
        <tbody>
          {confirmed.map((p, i) => (
            <tr key={p.id} className="border-b border-line break-inside-avoid">
              <td className="px-2 py-2 tabular-nums text-ink-3">{i + 1}</td>
              <td className="px-2 py-2 font-semibold">{p.name}</td>
              <td className="px-2 py-2 text-ink-2">{p.kakaoName !== p.name ? p.kakaoName : ""}</td>
              <td className="px-2 py-2 tabular-nums">{p.number}</td>
              <td className="px-2 py-2 text-ink-2">{p.performer}</td>
              <td className="px-2 py-2 text-center">{p.checkedInAt ? "✓" : "☐"}</td>
            </tr>
          ))}
          {confirmed.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-ink-3">
                입금이 확인된 관객이 아직 없어요.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pending.length > 0 && (
        <p className="mt-4 text-meta text-ink-3">
          입금 대기 {pending.length}명은 명단에 없어요. 현장에서 입금을 확인했다면 관리자 화면에서 입금 확인을 먼저 눌러 주세요.
        </p>
      )}
    </section>
  );
}
