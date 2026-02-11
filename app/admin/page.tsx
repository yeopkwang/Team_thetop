"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { springFetch } from "@/lib/spring-client";

type PendingBooking = {
  booking: {
    id: string;
    createdAt: string;
    user?: { email?: string; name?: string };
    event?: { title?: string };
  };
};

type ReservationItem = {
  id: string;
  status: string;
  qty: number;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  event?: {
    title?: string;
    venue?: string;
    date?: string;
    time?: string;
  };
};

type CheckInResponse = {
  checkIn: { id: string; createdAt: string };
  member: { id: string; name?: string | null; email?: string | null };
  performance: { title: string; venue: string; date: string; time: string };
  ticket: { id: string; qrToken: string; reservationId: string };
};

declare global {
  interface Window {
    Html5Qrcode?: new (elementId: string) => {
      start: (
        cameraConfig: { facingMode: string } | string,
        config: { fps?: number; qrbox?: { width: number; height: number } },
        onScanSuccess: (decodedText: string) => void,
        onScanFailure?: (errorMessage: string) => void
      ) => Promise<void>;
      stop: () => Promise<void>;
      clear: () => Promise<void>;
    };
    __html5QrcodeLoading?: Promise<void>;
  }
}

const QR_READER_ID = "qr-reader";

const loadHtml5QrcodeScript = async (): Promise<void> => {
  if (window.Html5Qrcode) return;
  if (!window.__html5QrcodeLoading) {
    window.__html5QrcodeLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/html5-qrcode@2.3.8/minified/html5-qrcode.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("QR 스캐너 라이브러리를 불러오지 못했습니다."));
      document.body.appendChild(script);
    });
  }
  await window.__html5QrcodeLoading;
};

export default function AdminPage() {
  const [list, setList] = useState<PendingBooking[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [scanToken, setScanToken] = useState("");
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);
  const [scannerOn, setScannerOn] = useState(false);

  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => Promise<void>;
  } | null>(null);
  const scanLockRef = useRef(false);

  const loadPending = async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await springFetch<PendingBooking[]>("/admin/bookings/pending");
      setList(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "예약 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async () => {
    setReservationsLoading(true);
    try {
      const data = await springFetch<{ reservations: ReservationItem[] }>("/admin/reservations");
      setReservations(Array.isArray(data?.reservations) ? data.reservations : []);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "전체 예매 목록을 불러오지 못했습니다.");
    } finally {
      setReservationsLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
    loadReservations();
    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmBooking = async (bookingId: string) => {
    setMessage("");
    try {
      await springFetch(`/admin/bookings/${bookingId}/confirm`, {
        method: "POST",
        bodyJson: {},
      });
      setMessage(`예약 ${bookingId} 승인 완료`);
      await loadPending();
      await loadReservations();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "승인 처리 실패");
    }
  };

  const processCheckIn = async (qrToken: string) => {
    if (!qrToken) return;
    setMessage("");
    try {
      const data = await springFetch<CheckInResponse>("/admin/checkin", {
        method: "POST",
        bodyJson: { qrToken },
      });
      setScanResult(data);
      setMessage("QR 확인 완료");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "QR 확인 실패");
    }
  };

  const stopScanner = async () => {
    setScannerOn(false);
    scanLockRef.current = false;
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // noop
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // noop
      }
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    if (scannerOn) return;

    if (!window.isSecureContext) {
      setMessage("카메라 스캔은 HTTPS(또는 localhost) 환경에서만 동작합니다.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("이 브라우저는 카메라 API를 지원하지 않습니다.");
      return;
    }

    try {
      setMessage("");
      await loadHtml5QrcodeScript();
      if (!window.Html5Qrcode) throw new Error("QR 스캐너를 초기화할 수 없습니다.");

      const scanner = new window.Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;
      setScannerOn(true);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText: string) => {
          if (scanLockRef.current) return;
          const raw = String(decodedText || "").trim();
          if (!raw) return;

          scanLockRef.current = true;
          setScanToken(raw);
          await stopScanner();
          await processCheckIn(raw);
        },
        () => {
          // scan miss noop
        }
      );
    } catch (error: unknown) {
      setScannerOn(false);
      setMessage(error instanceof Error ? error.message : "카메라를 시작하지 못했습니다. 권한을 확인하세요.");
    }
  };

  return (
    <main className="container-base space-y-4">
      <h1 className="text-2xl font-bold">관리자 페이지</h1>
      <section className="rounded-2xl bg-white p-5 shadow space-y-3">
        <h2 className="text-lg font-semibold">관리 메뉴</h2>
        <div className="flex gap-2">
          <Link href="/admin" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            예약 관리
          </Link>
          <Link href="/admin/refunds" className="rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            환불 관리
          </Link>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow space-y-3">
        <h2 className="text-lg font-semibold">전체 예매자 목록</h2>
        {reservationsLoading && <p className="text-sm text-slate-500">불러오는 중...</p>}
        {!reservationsLoading && reservations.length === 0 && (
          <p className="text-sm text-slate-500">예매 내역이 없습니다.</p>
        )}
        <div className="grid gap-2">
          {reservations.map((r) => (
            <div key={r.id} className="rounded border p-3 space-y-1">
              <p className="font-semibold">예매자: {r.userName}</p>
              <p className="text-sm text-slate-600">예매자 고유 ID: {r.userId}</p>
              <p className="text-sm text-slate-600">이메일: {r.userEmail || "-"}</p>
              <p className="text-sm text-slate-600">예매 날짜: {new Date(r.createdAt).toLocaleString("ko-KR")}</p>
              <p className="text-sm text-slate-600">예매 상태: {r.status}</p>
              <p className="text-sm text-slate-600">수량: {r.qty}</p>
              <p className="text-sm text-slate-600">공연명: {r.event?.title || "작전명 문4"}</p>
              <p className="text-sm text-slate-600">공연 장소: {r.event?.venue || "-"}</p>
              <p className="text-sm text-slate-600">
                공연 일시: {r.event?.date || "-"} {r.event?.time ? `/ ${r.event.time}` : ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow space-y-3">
        <h2 className="text-lg font-semibold">입금 확인 대기 목록</h2>
        {loading && <p className="text-sm text-slate-500">불러오는 중...</p>}
        {!loading && list.length === 0 && <p className="text-sm text-slate-500">확인 대기 예약이 없습니다.</p>}
        <div className="grid gap-2">
          {list.map(({ booking }) => (
            <div key={booking.id} className="flex items-center justify-between gap-3 rounded border p-3">
              <div>
                <p className="font-semibold">{booking.event?.title || "작전명 문4"}</p>
                <p className="text-sm text-slate-500">예약자: {booking.user?.email || booking.user?.name || "unknown"}</p>
                <p className="text-sm text-slate-500">구매시간: {new Date(booking.createdAt).toLocaleString("ko-KR")}</p>
              </div>
              <button
                type="button"
                onClick={() => confirmBooking(booking.id)}
                className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                예약 승인
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow space-y-3">
        <h2 className="text-lg font-semibold">QR 체크인</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startScanner}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            카메라 스캔 시작
          </button>
          <button
            type="button"
            onClick={() => void stopScanner()}
            className="rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            스캔 중지
          </button>
        </div>

        <div id={QR_READER_ID} className="w-full max-w-md overflow-hidden rounded border bg-black" />
        <p className="text-xs text-slate-500">{scannerOn ? "카메라 스캔 중..." : "카메라 대기 중"}</p>

        <div className="flex gap-2">
          <input
            value={scanToken}
            onChange={(e) => setScanToken(e.target.value)}
            placeholder="QR 토큰 수동 입력"
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => processCheckIn(scanToken.trim())}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            확인 처리
          </button>
        </div>

        {scanResult && (
          <div className="rounded border bg-emerald-50 border-emerald-200 p-3 space-y-1 text-sm">
            <p className="font-semibold text-emerald-800">체크인 완료</p>
            <p>
              회원: {scanResult.member.name || "-"} ({scanResult.member.email || "-"})
            </p>
            <p>공연: {scanResult.performance.title}</p>
            <p>장소: {scanResult.performance.venue}</p>
            <p>
              일시: {scanResult.performance.date} / {scanResult.performance.time}
            </p>
            <p>처리시각: {new Date(scanResult.checkIn.createdAt).toLocaleString("ko-KR")}</p>
          </div>
        )}
      </section>

      {message && <p className="text-sm text-slate-700">{message}</p>}
    </main>
  );
}
