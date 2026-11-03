"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { SHOW_STATUS, type ShowStatusKey } from "@/lib/status";

type FormState = {
  title: string;
  posterUrl: string;
  dateLabel: string;
  timeLabel: string;
  timeSubLabel: string;
  venue: string;
  venueAddress: string;
  contactName: string;
  contactTag: string;
  audienceInfo: string;
  notice: string;
  price: number;
  paymentBank: string;
  paymentAccount: string;
  paymentHolder: string;
  refundContact: string;
  introText: string;
  salesText: string;
  status: ShowStatusKey;
  sessionDate: string;
  totalCapacity: number;
};

type ShowDetail = Omit<FormState, "posterUrl" | "sessionDate" | "totalCapacity"> & {
  id: string;
  posterUrl: string | null;
  session: { title: string; date: string; totalCapacity: number } | null;
  reservedQty: number;
};

const EMPTY: FormState = {
  title: "",
  posterUrl: "",
  dateLabel: "",
  timeLabel: "",
  timeSubLabel: "",
  venue: "",
  venueAddress: "",
  contactName: "",
  contactTag: "",
  audienceInfo: "",
  notice: "",
  price: 0,
  paymentBank: "",
  paymentAccount: "",
  paymentHolder: "",
  refundContact: "",
  introText: "",
  salesText: "",
  status: "DRAFT",
  sessionDate: "",
  totalCapacity: 100,
};

// 새 공연을 만들 때 최근 공연에서 그대로 가져올 만한 값(장소, 입금, 판매 안내 등)
const CARRY_OVER: (keyof FormState)[] = [
  "timeLabel",
  "timeSubLabel",
  "venue",
  "venueAddress",
  "contactName",
  "contactTag",
  "audienceInfo",
  "notice",
  "price",
  "paymentBank",
  "paymentAccount",
  "paymentHolder",
  "refundContact",
  "salesText",
  "totalCapacity",
];

// <input type="datetime-local">은 시간대 없는 값을 쓴다. 브라우저(한국 시간) 기준으로 바꾼다.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toForm(show: ShowDetail): FormState {
  const { session, reservedQty: _r, posterUrl, id: _id, ...fields } = show;
  return {
    ...EMPTY,
    ...fields,
    posterUrl: posterUrl || "",
    sessionDate: session ? toLocalInput(session.date) : "",
    totalCapacity: session?.totalCapacity ?? EMPTY.totalCapacity,
  };
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {hint && <span className="mt-1 block text-cap text-ink-3">{hint}</span>}
    </label>
  );
}

function Group({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 lg:grid-cols-[220px_1fr] lg:gap-10">
      <div>
        <h2 className="text-lead font-bold">{title}</h2>
        {description && <p className="mt-1 text-meta text-ink-3">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// 공연 등록·수정 폼. showId가 없으면 새 공연을 만든다.
export default function ShowForm({ showId }: { showId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [reservedQty, setReservedQty] = useState(0);
  const [carriedFrom, setCarriedFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        if (showId) {
          const { show } = await apiFetch<{ show: ShowDetail }>(`/admin/shows/${showId}`);
          setForm(toForm(show));
          setReservedQty(show.reservedQty);
          return;
        }
        // 새 공연: 가장 최근 공연의 장소·입금·판매 안내를 미리 채운다.
        const { shows } = await apiFetch<{ shows: { id: string; title: string }[] }>("/admin/shows");
        if (shows[0]) {
          const { show } = await apiFetch<{ show: ShowDetail }>(`/admin/shows/${shows[0].id}`);
          const source = toForm(show);
          setForm({ ...EMPTY, ...Object.fromEntries(CARRY_OVER.map((k) => [k, source[k]])) });
          setCarriedFrom(show.title);
        }
      } catch (error: unknown) {
        setMessage(error instanceof Error ? error.message : "공연 정보를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [showId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const text = (key: keyof FormState) => ({
    value: String(form[key] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
  });

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.sessionDate) {
      setMessage("공연 일시를 입력해 주세요.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const { sessionDate, totalCapacity, ...fields } = form;
      const body = { ...fields, session: { date: new Date(sessionDate).toISOString(), totalCapacity } };
      if (showId) {
        const { show } = await apiFetch<{ show: ShowDetail }>(`/admin/shows/${showId}`, { method: "PUT", bodyJson: body });
        setForm(toForm(show));
        setReservedQty(show.reservedQty);
        setMessage("저장했어요.");
      } else {
        const { id } = await apiFetch<{ id: string }>("/admin/shows", { method: "POST", bodyJson: body });
        router.replace(`/admin/shows/${id}`);
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!showId || !window.confirm(`'${form.title}' 공연을 지울까요? 되돌릴 수 없어요.`)) return;
    try {
      await apiFetch(`/admin/shows/${showId}`, { method: "DELETE" });
      router.replace("/admin/shows");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "지우지 못했어요.");
    }
  };

  if (loading) return <p className="py-16 text-center text-meta text-ink-3">불러오는 중</p>;

  const publicLink = form.status === "ON_SALE" ? "/show" : form.status === "ENDED" && showId ? `/past/${showId}` : "";

  return (
    <form onSubmit={save}>
      <div className="mb-6 flex items-center gap-2 text-meta">
        <Link href="/admin/shows" className="text-ink-3 hover:text-ink">
          공연 관리
        </Link>
        <span className="text-ink-4">/</span>
        <span className="font-semibold">{showId ? form.title || "공연 수정" : "새 공연 등록"}</span>
      </div>

      {carriedFrom && (
        <p className="mb-6 rounded-md bg-surface px-4 py-3 text-ui text-ink-2">
          최근 공연({carriedFrom})의 장소·입금·판매 안내를 미리 채워 뒀어요. 바뀐 부분만 고쳐 주세요.
        </p>
      )}

      <Group title="상태" description="판매 중은 한 번에 하나만 둘 수 있어요.">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="공연 상태">
          {(Object.keys(SHOW_STATUS) as ShowStatusKey[]).map((key) => {
            const on = form.status === key;
            return (
              <label
                key={key}
                className={`cursor-pointer rounded-lg border p-4 ${on ? "border-brand-600 bg-brand-50" : "border-line-strong hover:border-ink-3"}`}
              >
                <input type="radio" name="status" className="sr-only" checked={on} onChange={() => set("status", key)} />
                <span className="block text-[15px] font-semibold">{SHOW_STATUS[key].label}</span>
                <span className="mt-1 block text-meta text-ink-3">{SHOW_STATUS[key].description}</span>
              </label>
            );
          })}
        </div>
        {form.status === "ON_SALE" && (
          <p className="text-meta text-wait-700">지금 판매 중인 다른 공연이 있으면, 저장할 때 그 공연은 지난 공연으로 옮겨져요.</p>
        )}
      </Group>

      <Group title="판매" description="공연 일시는 회차 정렬과 예매 화면, 지난 공연 순서에 쓰여요.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="공연 일시">
            <input type="datetime-local" className="field" {...text("sessionDate")} />
          </Field>
          <Field label="정원" hint={showId ? `지금 좌석을 잡은 예매 ${reservedQty}건` : undefined}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className="field"
              value={form.totalCapacity}
              onChange={(e) => set("totalCapacity", Number(e.target.value))}
            />
          </Field>
          <Field label="관람료(원)">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className="field"
              value={form.price}
              onChange={(e) => set("price", Number(e.target.value))}
            />
          </Field>
        </div>
      </Group>

      <Group title="공연 정보" description="첫 화면과 공연 안내의 포스터 옆 정보에 나와요. 비워 둔 줄은 보이지 않아요.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="공연 제목" className="sm:col-span-2">
            <input className="field" placeholder="작전명문 5" {...text("title")} />
          </Field>
          <Field
            label="포스터 주소"
            className="sm:col-span-2"
            hint="public 폴더의 파일이면 /uploads/poster.png 처럼, 외부 이미지면 https:// 주소를 적어 주세요."
          >
            <input className="field" {...text("posterUrl")} />
          </Field>
          <Field label="공연일 (화면 문구)" hint="첫 화면·티켓·지난 공연에 이 문구가 나와요.">
            <input className="field" placeholder="2027년 02월 21일 (일)" {...text("dateLabel")} />
          </Field>
          <Field label="공연시간">
            <input className="field" placeholder="18:00 ~ 21:00" {...text("timeLabel")} />
          </Field>
          <Field label="공연시간 보충 설명">
            <input className="field" placeholder="인터미션 포함 / 입장 가능 17:30" {...text("timeSubLabel")} />
          </Field>
          <Field label="관람 안내">
            <input className="field" placeholder="관객 100명, 전원 스탠딩" {...text("audienceInfo")} />
          </Field>
          <Field label="장소">
            <input className="field" {...text("venue")} />
          </Field>
          <Field label="장소 주소">
            <input className="field" {...text("venueAddress")} />
          </Field>
          <Field label="문의 (이름)">
            <input className="field" placeholder="대표 홍길동" {...text("contactName")} />
          </Field>
          <Field label="문의 (SNS 등)">
            <input className="field" placeholder="@band.bansong" {...text("contactTag")} />
          </Field>
          <Field label="공지사항" className="sm:col-span-2" hint="공연정보 탭 맨 위에 나와요.">
            <textarea rows={2} className="field" {...text("notice")} />
          </Field>
        </div>
      </Group>

      <Group title="입금·환불" description="예매 화면과 마이 티켓의 입금 안내, 판매정보 표에 나와요.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="은행">
            <input className="field" {...text("paymentBank")} />
          </Field>
          <Field label="계좌번호">
            <input className="field" inputMode="numeric" {...text("paymentAccount")} />
          </Field>
          <Field label="예금주">
            <input className="field" {...text("paymentHolder")} />
          </Field>
        </div>
        <Field label="환불 문의 연락처" hint="관객이 환불을 요청하면 이 번호로 카카오톡을 보내라고 안내해요.">
          <input className="field" {...text("refundContact")} />
        </Field>
      </Group>

      <Group title="긴 안내문" description="빈 줄로 묶음을 나눠요. 묶음의 첫 줄을 '# 제목'으로 쓰면 소제목이 붙어요.">
        <Field label="공연정보 탭" hint="공연 소개, 셋리스트 등. 지난 공연 화면에도 이 내용이 나와요.">
          <textarea rows={14} className="field font-mono text-ui" {...text("introText")} />
        </Field>
        <Field label="판매정보 탭" hint="공연 개요, 관람료, 환불 기준, 입장 안내 등">
          <textarea rows={20} className="field font-mono text-ui" {...text("salesText")} />
        </Field>
      </Group>

      {showId && (
        <section className="border-t border-line py-8">
          <button type="button" onClick={() => void remove()} className="btn-ghost text-meta text-brand-600">
            이 공연 지우기
          </button>
          <p className="text-cap text-ink-3">예매 기록이 있는 공연은 지울 수 없어요.</p>
        </section>
      )}

      <div
        className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-white/95 px-4 pt-3 backdrop-blur md:-mx-6 md:px-6 lg:mx-0 lg:px-0"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
      >
        <button type="submit" disabled={saving} className="btn-primary min-w-[120px]">
          {saving ? "저장하는 중" : showId ? "저장" : "등록"}
        </button>
        {publicLink && (
          <Link href={publicLink} target="_blank" className="btn-ghost text-meta">
            화면에서 보기
          </Link>
        )}
        {message && (
          <p role="status" className="ml-auto text-right text-meta text-ink-2">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
