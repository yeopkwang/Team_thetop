"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiFetch, errorMessage, getToken } from "@/lib/api-client";
import { formatSessionDate, won } from "@/lib/format";
import { salesState, untilText } from "@/lib/sales";
import { isClosedStatus, reservationStatus } from "@/lib/status";
import { KakaoIcon } from "./icons";
import Poster from "./show/Poster";
import { useSalesClock } from "./useSalesClock";

type ShowProps = {
  title: string;
  posterUrl: string | null;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  price: number;
  paymentBank: string;
  paymentAccount: string;
  paymentHolder: string;
  paymentHours: number;
  salesOpenAt: string | null;
};

type SessionProps = { id: string; title: string; dateText: string; startsAt: string; remaining: number; total: number };

const OTHER = "__other";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-2.5 text-lead font-bold">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-cap font-bold text-white">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// 예매 화면: 회차 → 관심 공연자 → 입금 방법을 차례로 고르고 예매한다.
export default function BookingForm({
  show,
  sessions,
  performers,
  initialSessionId,
}: {
  show: ShowProps;
  sessions: SessionProps[];
  performers: string[];
  initialSessionId?: string;
}) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [existing, setExisting] = useState<{ status: string } | null>(null);
  // 공연 안내 달력에서 고른 회차가 있으면 그것부터, 없으면 남은 좌석이 있는 첫 회차
  const [sessionId, setSessionId] = useState(
    sessions.find((s) => s.id === initialSessionId && s.remaining > 0)?.id || sessions.find((s) => s.remaining > 0)?.id || ""
  );
  // 크레딧이 있으면 목록에서 고르고, 목록에 없으면 직접 적는다. 크레딧이 없으면 처음부터 직접 적는다.
  const [choice, setChoice] = useState("");
  const [typed, setTyped] = useState("");
  const [depositor, setDepositor] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const { now } = useSalesClock(show.salesOpenAt);
  const state = salesState(show.salesOpenAt, sessions, now);

  useEffect(() => {
    const token = !!getToken();
    setLoggedIn(token);
    if (!token) return;
    // 이미 예매했으면 폼을 다 채운 뒤에야 알게 되지 않도록 먼저 알려 준다.
    apiFetch<{ booking: { status: string } | null }>("/my/ticket-dashboard")
      .then((data) => {
        // 취소·환불·만료된 예매만 있으면 다시 예매할 수 있다.
        if (data.booking && !isClosedStatus(data.booking.status)) setExisting(data.booking);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) setLoggedIn(false);
      });
  }, []);

  const performer = performers.length > 0 && choice !== OTHER ? choice : typed.trim();
  const selected = sessions.find((s) => s.id === sessionId);
  const loginHref = `/login?next=${encodeURIComponent(`/book${sessionId ? `?session=${sessionId}` : ""}`)}`;
  const ready = Boolean(loggedIn && !existing && state === "open" && selected && performer && depositor.trim() && agreed);

  const missing = !loggedIn
    ? "로그인하면 예매할 수 있어요."
    : existing
      ? "이미 예매한 공연이에요."
      : state === "upcoming"
        ? "티켓 오픈 시각이 되면 예매할 수 있어요."
        : state === "closed"
          ? "예매가 끝났어요."
          : !selected
            ? "예매할 수 있는 회차가 없어요."
            : !performer
              ? "관심 있는 공연자를 골라 주세요."
              : !depositor.trim()
                ? "입금자명을 적어 주세요."
                : !agreed
                ? "취소·환불 규정에 동의해 주세요."
                : "";

  const submit = async () => {
    if (!ready || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      await apiFetch("/bookings", {
        method: "POST",
        bodyJson: { sessionId, quantity: 1, preferredPerformerName: performer, depositorName: depositor.trim() },
      });
      window.location.href = "/myticket?booked=1";
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) setLoggedIn(false);
      setMessage(errorMessage(error, "예매하지 못했어요. 잠시 뒤 다시 시도해 주세요."));
      setSubmitting(false);
    }
  };

  const submitLabel = submitting
    ? "예매하는 중"
    : state === "upcoming"
      ? "오픈 예정"
      : state === "closed"
        ? "예매 종료"
        : state === "soldout"
          ? "매진"
          : "예매하기";

  return (
    <main className="pb-16">
      <div className="page pt-6 lg:pt-10">
        <h1 className="text-h1 font-bold">예매하기</h1>

        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-10">
          <div className="space-y-8">
            {state === "upcoming" && show.salesOpenAt && (
              <div className="rounded-lg bg-ink p-4 text-white">
                <p className="text-meta text-white/70">티켓 오픈 {formatSessionDate(show.salesOpenAt)}</p>
                <p className="mt-0.5 text-h2 font-bold tabular-nums">{untilText(show.salesOpenAt, now)}</p>
                <p className="mt-1 text-meta text-white/70">시각이 되면 이 화면에서 예매 버튼이 바로 열려요. 미리 아래 내용을 채워 두세요.</p>
              </div>
            )}
            {existing && (
              <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ui text-brand-800">
                  이미 예매한 공연이에요. 지금 상태는 <strong className="font-semibold">{reservationStatus(existing.status).label}</strong>예요.
                </p>
                <Link href="/myticket" className="btn-primary btn-sm">
                  마이 티켓 보기
                </Link>
              </div>
            )}
            {loggedIn === false && (
              <div className="flex flex-col gap-3 rounded-lg bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ui text-brand-800">카카오로 로그인하면 바로 예매할 수 있어요. 로그인한 뒤 이 화면으로 돌아와요.</p>
                <Link href={loginHref} className="btn btn-sm bg-kakao text-black/85 hover:brightness-95">
                  <KakaoIcon className="h-4 w-4" />
                  카카오 로그인
                </Link>
              </div>
            )}

            <Step n={1} title="관람 회차">
              <div className="space-y-2" role="radiogroup" aria-label="관람 회차">
                {sessions.map((s) => {
                  const checked = s.id === sessionId;
                  const soldOut = s.remaining === 0 || new Date(s.startsAt).getTime() <= now;
                  return (
                    <label
                      key={s.id}
                      className={`flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-3.5 ${
                        soldOut
                          ? "cursor-not-allowed border-line bg-surface text-ink-3"
                          : checked
                            ? "border-brand-600 bg-brand-50"
                            : "border-line-strong hover:border-ink-3"
                      }`}
                    >
                      <input
                        type="radio"
                        name="session"
                        className="sr-only"
                        checked={checked}
                        disabled={soldOut}
                        onChange={() => setSessionId(s.id)}
                      />
                      <span>
                        <span className="block text-[15px] font-semibold">{s.dateText}</span>
                        <span className="block text-meta text-ink-3">{s.title}</span>
                      </span>
                      <span className={`shrink-0 text-meta font-semibold ${soldOut ? "" : "text-brand-600"}`}>
                        {soldOut ? "매진" : `${s.remaining}석 남음`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </Step>

            <Step n={2} title="관심 있는 공연자">
              {performers.length > 0 ? (
                <>
                  <p className="text-ui text-ink-2">초대해 준 공연자를 골라 주세요. 없으면 &apos;없음&apos;을 골라 주세요.</p>
                  <label htmlFor="performer" className="sr-only">
                    관심 있는 공연자
                  </label>
                  <select
                    id="performer"
                    value={choice}
                    onChange={(e) => setChoice(e.target.value)}
                    className={`field mt-3 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10 ${choice ? "" : "text-ink-4"}`}
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                    }}
                  >
                    <option value="" disabled>
                      공연자를 골라 주세요
                    </option>
                    {performers.map((name) => (
                      <option key={name} value={name} className="text-ink">
                        {name}
                      </option>
                    ))}
                    <option value="없음" className="text-ink">
                      없음
                    </option>
                    <option value={OTHER} className="text-ink">
                      목록에 없어요 (직접 적기)
                    </option>
                  </select>
                  {choice === OTHER && (
                    <input
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      placeholder="공연자 이름"
                      maxLength={50}
                      className="field mt-2"
                      aria-label="관심 있는 공연자 이름"
                      autoFocus
                    />
                  )}
                </>
              ) : (
                <>
                  <p className="text-ui text-ink-2">초대해 준 공연자가 있으면 이름을 적어 주세요. 없으면 &apos;없음&apos;이라고 적어 주세요.</p>
                  <label htmlFor="performer" className="sr-only">
                    관심 있는 공연자 이름
                  </label>
                  <input
                    id="performer"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder="예: 홍길동"
                    maxLength={50}
                    className="field mt-3"
                  />
                </>
              )}
            </Step>

            <Step n={3} title="입금 정보">
              <div className="rounded-lg border border-line">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <span className="text-[15px] font-semibold">무통장 입금</span>
                  <span className="text-meta text-ink-3">예매 후 입금</span>
                </div>
                <dl className="space-y-2 px-4 py-4 text-ui">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-3">입금 계좌</dt>
                    <dd className="text-right font-semibold">
                      {show.paymentBank} {show.paymentAccount}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-3">예금주</dt>
                    <dd>{show.paymentHolder}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-3">입금 금액</dt>
                    <dd className="font-semibold">{won(show.price)}</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-4">
                <label htmlFor="depositor" className="label">
                  입금자명
                </label>
                <input
                  id="depositor"
                  value={depositor}
                  onChange={(e) => setDepositor(e.target.value)}
                  placeholder="관람객 본인 실명 (예: 홍길동)"
                  maxLength={20}
                  autoComplete="name"
                  className="field mt-1.5"
                />
                <p className="mt-1.5 text-meta text-ink-3">통장에 찍히는 이름과 같아야 입금을 확인할 수 있어요. 입장할 때도 이 이름으로 확인해요.</p>
              </div>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-meta text-ink-2">
                <li>
                  {show.paymentHours > 0
                    ? `예매하고 ${show.paymentHours}시간 안에 입금해 주세요. 기한이 지나면 예매가 저절로 만료돼요.`
                    : "공연 시작 전까지 입금해 주세요."}
                </li>
                <li>입금이 확인되면 마이 티켓에 입장용 QR 티켓이 발급돼요.</li>
              </ul>
            </Step>
          </div>

          <aside className="mt-10 lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:mt-0">
            <div className="rounded-lg border border-line bg-white">
              <div className="flex gap-4 border-b border-line p-5">
                <Poster src={show.posterUrl} title={show.title} className="!w-16 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-6">{show.title}</p>
                  <p className="mt-1 text-meta text-ink-3">
                    {show.dateLabel} {show.timeLabel}
                  </p>
                  <p className="text-meta text-ink-3">{show.venue}</p>
                </div>
              </div>

              <dl className="space-y-2 px-5 py-4 text-ui">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-3">회차</dt>
                  <dd className="text-right">{selected ? selected.dateText : "선택 안 함"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-3">매수</dt>
                  <dd>1매 (1인 1매)</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-3">입금자명</dt>
                  <dd className="truncate text-right">{depositor.trim() || "적지 않음"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-semibold">총 결제금액</dt>
                  <dd className="text-h2 font-bold text-brand-600">{won(show.price)}</dd>
                </div>
              </dl>

              <div className="space-y-3 px-5 pb-5">
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md bg-surface p-3 text-meta text-ink-2">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
                  />
                  <span>
                    취소·환불 규정을 확인했고 동의해요. 규정은{" "}
                    <Link href="/show#sales" className="font-semibold text-ink underline underline-offset-2">
                      공연 안내의 판매 정보
                    </Link>
                    에 있어요.
                  </span>
                </label>

                <button type="button" onClick={submit} disabled={!ready || submitting} className="btn-primary btn-lg hidden w-full lg:flex">
                  {submitLabel}
                </button>
                {(message || missing) && (
                  <p role="status" className={`text-meta ${message ? "text-brand-600" : "text-ink-3"} lg:text-center`}>
                    {message || missing}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="bottom-bar lg:hidden">
        <div className="page flex items-center gap-4 py-3">
          <div className="shrink-0">
            <p className="text-cap text-ink-3">총 결제금액</p>
            <p className="text-lead font-bold text-brand-600">{won(show.price)}</p>
          </div>
          <button type="button" onClick={submit} disabled={!ready || submitting} className="btn-primary btn-lg flex-1">
            {submitLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
