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

export default function AdminPage() {
  const [list, setList] = useState<PendingBooking[]>([]);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [scanToken, setScanToken] = useState("");
  const [scanResult, setScanResult] = useState<CheckInResponse | null>(null);
  const [scannerOn, setScannerOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const loadPending = async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await springFetch<PendingBooking[]>("/admin/bookings/pending");
      setList(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "대기 목록을 불러오지 못했습니다.");
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
      stopScanner();
    };
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

  const stopScanner = () => {
    setScannerOn(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startScanner = async () => {
    if (!("BarcodeDetector" in window)) {
      setMessage("이 브라우저는 카메라 QR 스캔을 지원하지 않습니다. 아래 수동 입력을 사용하세요.");
      return;
    }

    try {
      setMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScannerOn(true);

      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const raw = String(barcodes[0].rawValue).trim();
            setScanToken(raw);
            stopScanner();
            await processCheckIn(raw);
          }
        } catch {
          // noop
        }
      }, 500);
    } catch {
      setMessage("카메라를 시작하지 못했습니다. 권한을 확인하세요.");
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
              <p className="text-sm text-slate-600">공연명: {r.event?.title || "작전명;문 4"}</p>
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
                <p className="font-semibold">{booking.event?.title || "작전명;문 4"}</p>
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
            onClick={stopScanner}
            className="rounded border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            스캔 중지
          </button>
        </div>
        <video ref={videoRef} autoPlay muted playsInline className="w-full max-w-md rounded border bg-black" />
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
            <p>회원: {scanResult.member.name || "-"} ({scanResult.member.email || "-"})</p>
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
