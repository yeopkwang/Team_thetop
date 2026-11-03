"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
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
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-800">
      <span>{label}</span>
      {children}
      {hint && <span className="block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

const inputClass = "w-full rounded border px-3 py-2 text-sm font-normal";

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
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "공연 정보를 불러오지 못했습니다."))
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
      setMessage("저장했습니다. 홈과 예매 화면에 바로 반영됩니다.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">공연 정보</h1>
      <AdminNav />

      {loading ? (
        <p className="text-sm text-slate-500">페이지를 준비하고 있습니다.</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {isNew && (
            <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              아직 등록된 공연이 없습니다. 저장하면 새 공연이 만들어집니다.
            </p>
          )}

          <section className="space-y-3 rounded-2xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">판매</h2>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              홈·예매 화면에 공개하고 예매를 받습니다
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="공연 일시" hint="회차 정렬에 쓰입니다. 화면 문구는 아래 '일시'에 따로 적어 주세요.">
                <input type="datetime-local" className={inputClass} {...text("sessionDate")} />
              </Field>
              <Field label="정원" hint={`현재 좌석을 잡고 있는 예매 ${reservedQty}건`}>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.totalCapacity}
                  onChange={(e) => set("totalCapacity", Number(e.target.value))}
                />
              </Field>
              <Field label="관람료(원)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => set("price", Number(e.target.value))}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">공연 정보 카드</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="공연 제목">
                <input className={inputClass} {...text("title")} />
              </Field>
              <Field label="포스터 주소" hint="public 폴더 파일이면 /uploads/poster.png 처럼, 외부 이미지면 https:// 주소">
                <input className={inputClass} {...text("posterUrl")} />
              </Field>
              <Field label="일시">
                <input className={inputClass} placeholder="2027년 02월 21일 (일)" {...text("dateLabel")} />
              </Field>
              <Field label="시간">
                <input className={inputClass} placeholder="18:00 ~ 21:00" {...text("timeLabel")} />
              </Field>
              <Field label="시간 보충 설명">
                <input className={inputClass} placeholder="인터미션 포함 / 입장 가능 17:30" {...text("timeSubLabel")} />
              </Field>
              <Field label="입장 관련">
                <input className={inputClass} placeholder="관객 100명 · 전원 스탠딩" {...text("audienceInfo")} />
              </Field>
              <Field label="장소">
                <input className={inputClass} {...text("venue")} />
              </Field>
              <Field label="장소 주소">
                <input className={inputClass} {...text("venueAddress")} />
              </Field>
              <Field label="문의 (이름)">
                <input className={inputClass} {...text("contactName")} />
              </Field>
              <Field label="문의 (SNS 등)">
                <input className={inputClass} {...text("contactTag")} />
              </Field>
            </div>
            <Field label="안내 한 줄">
              <textarea rows={2} className={inputClass} {...text("notice")} />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">입금·환불</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="은행">
                <input className={inputClass} {...text("paymentBank")} />
              </Field>
              <Field label="계좌번호">
                <input className={inputClass} {...text("paymentAccount")} />
              </Field>
              <Field label="예금주">
                <input className={inputClass} {...text("paymentHolder")} />
              </Field>
              <Field label="환불 문의 연락처" hint="내 티켓 화면에서 환불 요청 후 이 번호로 연락하라고 안내합니다.">
                <input className={inputClass} {...text("refundContact")} />
              </Field>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold">긴 안내문</h2>
            <p className="text-xs text-slate-500">
              빈 줄로 칸을 나눕니다. 칸의 첫 줄을 &quot;# 제목&quot;으로 쓰면 그 칸은 제목 붙은 상자로 보입니다.
            </p>
            <Field label="공연 소개 (셋리스트 등)">
              <textarea rows={14} className={`${inputClass} font-mono`} {...text("introText")} />
            </Field>
            <Field label="판매 상세 (공연 개요, 관람료, 환불 기준, 입장 안내 등)">
              <textarea rows={20} className={`${inputClass} font-mono`} {...text("salesText")} />
            </Field>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            {message && <p className="text-sm text-slate-700">{message}</p>}
          </div>
        </form>
      )}

      {loading && message && <p className="text-sm text-slate-700">{message}</p>}
    </main>
  );
}
