"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

type ShowForm = {
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
  isActive: boolean;
  sessionDate: string;
  totalCapacity: number;
};

type AdminShowResponse = {
  show:
    | (Omit<ShowForm, "posterUrl" | "sessionDate" | "totalCapacity"> & {
        posterUrl: string | null;
        session: { title: string; date: string; totalCapacity: number } | null;
        reservedQty: number;
      })
    | null;
};

const EMPTY_FORM: ShowForm = {
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
  isActive: true,
  sessionDate: "",
  totalCapacity: 100,
};

// <input type="datetime-local">은 시간대 없는 값을 쓴다. 브라우저(한국 시간) 기준으로 바꾼다.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toForm(show: NonNullable<AdminShowResponse["show"]>): ShowForm {
  const { session, reservedQty: _reservedQty, posterUrl, ...fields } = show;
  return {
    ...EMPTY_FORM,
    ...fields,
    posterUrl: posterUrl || "",
    sessionDate: session ? toLocalInput(session.date) : "",
    totalCapacity: session?.totalCapacity ?? EMPTY_FORM.totalCapacity,
  };
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
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

const inputClass = "field";

export default function AdminShowPage() {
  const [form, setForm] = useState<ShowForm>(EMPTY_FORM);
  const [reservedQty, setReservedQty] = useState(0);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const apply = (data: AdminShowResponse) => {
    if (data.show) {
      setForm(toForm(data.show));
      setReservedQty(data.show.reservedQty);
      setIsNew(false);
    } else {
      setForm(EMPTY_FORM);
      setReservedQty(0);
      setIsNew(true);
    }
  };

  useEffect(() => {
    apiFetch<AdminShowResponse>("/admin/show")
      .then(apply)
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "공연 정보를 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof ShowForm>(key: K, value: ShowForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const text = (key: keyof ShowForm) => ({
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
      const data = await apiFetch<AdminShowResponse>("/admin/show", {
        method: "PUT",
        bodyJson: {
          ...fields,
          session: { date: new Date(sessionDate).toISOString(), totalCapacity },
        },
      });
      apply(data);
      setMessage("저장했어요. 홈과 예매 화면에 바로 반영돼요.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {loading ? (
        <p className="py-16 text-center text-meta text-ink-3">불러오는 중</p>
      ) : (
        <form onSubmit={save}>
          {isNew && (
            <p className="mb-6 rounded-md bg-wait-50 px-4 py-3 text-ui text-wait-700">
              아직 등록된 공연이 없어요. 저장하면 새 공연이 만들어져요.
            </p>
          )}

          <Group title="판매" description="공개를 끄면 홈에 '예매 중인 공연이 없어요'가 뜨고 예매도 막혀요.">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-4">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="h-5 w-5 accent-brand-600"
              />
              <span>
                <span className="block text-[15px] font-semibold">홈·예매 화면에 공개하고 예매 받기</span>
                <span className="block text-meta text-ink-3">{form.isActive ? "지금 공개 중이에요" : "지금은 비공개예요"}</span>
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="공연 일시" hint="회차 정렬과 예매 화면에 쓰여요.">
                <input type="datetime-local" className={inputClass} {...text("sessionDate")} />
              </Field>
              <Field label="정원" hint={`지금 좌석을 잡은 예매 ${reservedQty}건`}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  className={inputClass}
                  value={form.totalCapacity}
                  onChange={(e) => set("totalCapacity", Number(e.target.value))}
                />
              </Field>
              <Field label="관람료(원)">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => set("price", Number(e.target.value))}
                />
              </Field>
            </div>
          </Group>

          <Group title="공연 정보" description="홈 화면 위쪽 포스터 옆 정보표에 나와요. 비워 둔 줄은 보이지 않아요.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="공연 제목" className="sm:col-span-2">
                <input className={inputClass} {...text("title")} />
              </Field>
              <Field
                label="포스터 주소"
                className="sm:col-span-2"
                hint="public 폴더의 파일이면 /uploads/poster.png 처럼, 외부 이미지면 https:// 주소를 적어 주세요."
              >
                <input className={inputClass} {...text("posterUrl")} />
              </Field>
              <Field label="공연일">
                <input className={inputClass} placeholder="2027년 02월 21일 (일)" {...text("dateLabel")} />
              </Field>
              <Field label="공연시간">
                <input className={inputClass} placeholder="18:00 ~ 21:00" {...text("timeLabel")} />
              </Field>
              <Field label="공연시간 보충 설명">
                <input className={inputClass} placeholder="인터미션 포함 / 입장 가능 17:30" {...text("timeSubLabel")} />
              </Field>
              <Field label="관람 안내">
                <input className={inputClass} placeholder="관객 100명, 전원 스탠딩" {...text("audienceInfo")} />
              </Field>
              <Field label="장소">
                <input className={inputClass} {...text("venue")} />
              </Field>
              <Field label="장소 주소">
                <input className={inputClass} {...text("venueAddress")} />
              </Field>
              <Field label="문의 (이름)">
                <input className={inputClass} placeholder="대표 홍길동" {...text("contactName")} />
              </Field>
              <Field label="문의 (SNS 등)">
                <input className={inputClass} placeholder="@band.bansong" {...text("contactTag")} />
              </Field>
              <Field label="정보표 아래 안내" className="sm:col-span-2">
                <textarea rows={2} className={inputClass} {...text("notice")} />
              </Field>
            </div>
          </Group>

          <Group title="입금·환불" description="예매 화면과 마이 티켓의 입금 안내에 나와요.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="은행">
                <input className={inputClass} {...text("paymentBank")} />
              </Field>
              <Field label="계좌번호">
                <input className={inputClass} inputMode="numeric" {...text("paymentAccount")} />
              </Field>
              <Field label="예금주">
                <input className={inputClass} {...text("paymentHolder")} />
              </Field>
            </div>
            <Field label="환불 문의 연락처" hint="관객이 환불을 요청하면 이 번호로 카카오톡을 보내라고 안내해요.">
              <input className={inputClass} {...text("refundContact")} />
            </Field>
          </Group>

          <Group
            title="긴 안내문"
            description="빈 줄로 묶음을 나눠요. 묶음의 첫 줄을 '# 제목'으로 쓰면 소제목이 붙어요."
          >
            <Field label="공연 소개 탭" hint="셋리스트, 밴드 소개 등">
              <textarea rows={14} className={`${inputClass} font-mono text-ui`} {...text("introText")} />
            </Field>
            <Field label="판매 정보 탭" hint="공연 개요, 관람료, 환불 기준, 입장 안내 등">
              <textarea rows={20} className={`${inputClass} font-mono text-ui`} {...text("salesText")} />
            </Field>
          </Group>

          <div
            className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-white/95 px-4 pt-3 backdrop-blur md:-mx-6 md:px-6 lg:mx-0 lg:px-0"
            style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
          >
            <button type="submit" disabled={saving} className="btn-primary min-w-[120px]">
              {saving ? "저장하는 중" : "저장"}
            </button>
            <Link href="/" target="_blank" className="btn-ghost text-meta">
              홈에서 보기
            </Link>
            {message && (
              <p role="status" className="ml-auto text-right text-meta text-ink-2">
                {message}
              </p>
            )}
          </div>
        </form>
      )}

      {loading && message && <p className="text-meta text-ink-2">{message}</p>}
    </div>
  );
}
