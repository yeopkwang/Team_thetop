"use client";

import { useEffect, useRef, useState } from "react";
import { CameraIcon, CheckIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api-client";
import { bookingNumber, formatDateTime } from "@/lib/format";

type PendingBooking = {
  booking: {
    id: string;
    createdAt: string;
    preferredPerformerName: string;
    user?: { email?: string | null; name?: string | null };
    event?: { title?: string };
  };
};

type CheckInResponse = {
  checkIn: { id: string; createdAt: string };
  member: { id: string; name?: string | null; email?: string | null };
  ticket: { id: string; qrToken: string; reservationId: string };
};

type Html5QrcodeInstance = {
  start: (
    cameraConfig: { facingMode: string } | string,
    config: { fps?: number; qrbox?: { width: number; height: number } },
    onScanSuccess: (decodedText: string) => void,
    onScanFailure?: (errorMessage: string) => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => Promise<void>;
};

type Html5QrcodeCtor = {
  new (elementId: string): Html5QrcodeInstance;
  getCameras: () => Promise<Array<{ id: string; label: string }>>;
};

const QR_READER_ID = "qr-reader";
let html5QrcodeCtorPromise: Promise<Html5QrcodeCtor> | null = null;
const loadHtml5QrcodeCtor = async (): Promise<Html5QrcodeCtor> => {
  if (!html5QrcodeCtorPromise) {
    html5QrcodeCtorPromise = import("html5-qrcode").then((mod) => mod.Html5Qrcode as unknown as Html5QrcodeCtor);
  }
  return html5QrcodeCtorPromise;
};

type ScanOutcome = { ok: true; data: CheckInResponse } | { ok: false; message: string };

export default function AdminPage() {
  const [list, setList] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [listMessage, setListMessage] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [scanToken, setScanToken] = useState("");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");

  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const scanLockRef = useRef(false);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PendingBooking[]>("/admin/bookings/pending");
      setList(Array.isArray(data) ? data : []);
    } catch (error: unknown) {
      setListMessage(error instanceof Error ? error.message : "입금 대기 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPending();
    return () => {
      void stopScanner();
    };
  }, []);

  const confirmBooking = async (item: PendingBooking["booking"]) => {
    setConfirming(item.id);
    setListMessage("");
    try {
      await apiFetch(`/admin/bookings/${item.id}/confirm`, { method: "POST", bodyJson: {} });
      setListMessage(`${item.user?.name || "예매자"}님 입금을 확인했어요. QR 티켓이 발급됐어요.`);
      await loadPending();
    } catch (error: unknown) {
      setListMessage(error instanceof Error ? error.message : "입금 확인을 처리하지 못했어요.");
    } finally {
      setConfirming(null);
    }
  };

  const processCheckIn = async (qrToken: string) => {
    if (!qrToken) return;
    setOutcome(null);
    try {
      const data = await apiFetch<CheckInResponse>("/admin/checkin", { method: "POST", bodyJson: { qrToken } });
      setOutcome({ ok: true, data });
      setScanToken("");
    } catch (error: unknown) {
      setOutcome({ ok: false, message: error instanceof Error ? error.message : "입장 확인을 처리하지 못했어요." });
    }
  };

  const stopScanner = async () => {
    setScannerOn(false);
    scanLockRef.current = false;
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // 이미 멈춰 있음
      }
      try {
        await scannerRef.current.clear();
      } catch {
        // 이미 비어 있음
      }
      scannerRef.current = null;
    }
  };

  const startScanner = async () => {
    if (scannerOn) return;
    if (!window.isSecureContext) {
      setCameraMessage("카메라는 https 주소(또는 localhost)에서만 켤 수 있어요.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("이 브라우저는 카메라를 지원하지 않아요. 아래에 QR 토큰을 직접 입력해 주세요.");
      return;
    }

    try {
      setCameraMessage("");
      const Html5Qrcode = await loadHtml5QrcodeCtor();
      const scanner = new Html5Qrcode(QR_READER_ID);
      scannerRef.current = scanner;
      setScannerOn(true);

      const handleDetected = async (decodedText: string) => {
        if (scanLockRef.current) return;
        const raw = String(decodedText || "").trim();
        if (!raw) return;
        scanLockRef.current = true;
        await stopScanner();
        await processCheckIn(raw);
      };

      const config = { fps: 10, qrbox: { width: 220, height: 220 } };
      try {
        await scanner.start({ facingMode: "environment" }, config, handleDetected, () => {});
      } catch {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras.length) throw new Error("사용할 수 있는 카메라가 없어요.");
        await scanner.start(cameras[0].id, config, handleDetected, () => {});
      }
    } catch (error: unknown) {
      setScannerOn(false);
      setCameraMessage(error instanceof Error ? error.message : "카메라를 켜지 못했어요. 카메라 권한을 확인해 주세요.");
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
      <section aria-labelledby="checkin-title">
        <h2 id="checkin-title" className="text-lead font-bold">
          입장 확인
        </h2>
        <p className="mt-1 text-meta text-ink-3">관객의 마이 티켓 QR을 카메라로 찍어 주세요.</p>

        <div className="relative mt-4 aspect-square w-full max-w-[400px] overflow-hidden rounded-lg bg-ink">
          <div id={QR_READER_ID} className="h-full w-full [&_video]:h-full [&_video]:object-cover" />
          {!scannerOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
              <CameraIcon className="h-8 w-8" />
              <p className="text-meta">카메라를 켜면 여기에 화면이 나와요</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex max-w-[400px] gap-2">
          {scannerOn ? (
            <button type="button" onClick={() => void stopScanner()} className="btn-secondary flex-1">
              카메라 끄기
            </button>
          ) : (
            <button type="button" onClick={() => void startScanner()} className="btn-primary flex-1">
              <CameraIcon className="h-4 w-4" />
              카메라 켜기
            </button>
          )}
        </div>
        {cameraMessage && <p className="mt-2 max-w-[400px] text-meta text-brand-600">{cameraMessage}</p>}

        {outcome && (
          <div
            role="status"
            className={`mt-4 max-w-[400px] rounded-lg p-4 ${outcome.ok ? "bg-ok-50 text-ok-600" : "bg-brand-50 text-brand-800"}`}
          >
            {outcome.ok ? (
              <>
                <p className="flex items-center gap-2 text-h2 font-bold">
                  <CheckIcon className="h-6 w-6" />
                  입장 확인
                </p>
                <p className="mt-2 text-ui text-ink">
                  {outcome.data.member.name || "관객"}님, 예매번호 {bookingNumber(outcome.data.ticket.reservationId)}
                </p>
                <p className="text-meta text-ink-2">{formatDateTime(outcome.data.checkIn.createdAt)} 입장 처리</p>
              </>
            ) : (
              <p className="text-[15px] font-semibold">{outcome.message}</p>
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void processCheckIn(scanToken.trim());
          }}
          className="mt-6 max-w-[400px]"
        >
          <label htmlFor="qr-token" className="text-meta font-semibold text-ink-2">
            QR이 안 찍히면 토큰을 직접 입력
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="qr-token"
              value={scanToken}
              onChange={(e) => setScanToken(e.target.value)}
              placeholder="QR 아래 적힌 토큰"
              className="field"
            />
            <button type="submit" disabled={!scanToken.trim()} className="btn-secondary shrink-0">
              확인
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="pending-title">
        <div className="flex items-baseline justify-between">
          <h2 id="pending-title" className="text-lead font-bold">
            입금 확인 대기 <span className="text-brand-600">{loading ? "" : list.length}</span>
          </h2>
          <button type="button" onClick={() => void loadPending()} className="btn-ghost text-meta">
            새로고침
          </button>
        </div>
        <p className="mt-1 text-meta text-ink-3">통장에 들어온 입금자명과 예매자 이름을 맞춰 보고 확인해 주세요.</p>

        {listMessage && (
          <p role="status" className="mt-4 rounded-md bg-surface px-4 py-3 text-meta text-ink-2">
            {listMessage}
          </p>
        )}

        <ul className="mt-4 divide-y divide-line border-y border-line">
          {loading && <li className="py-6 text-center text-meta text-ink-3">불러오는 중</li>}
          {!loading && list.length === 0 && (
            <li className="py-10 text-center text-ui text-ink-3">입금 확인을 기다리는 예매가 없어요.</li>
          )}
          {list.map(({ booking }) => (
            <li key={booking.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{booking.user?.name || booking.user?.email || "이름 없음"}</p>
                <p className="mt-0.5 text-meta text-ink-3">
                  관심 공연자 {booking.preferredPerformerName}
                  <span className="mx-1.5 text-line-strong">|</span>
                  {bookingNumber(booking.id)}
                </p>
                <p className="text-meta text-ink-3">
                  {booking.event?.title ? `${booking.event.title}, ` : ""}
                  {formatDateTime(booking.createdAt)} 예매
                </p>
              </div>
              <button
                type="button"
                disabled={confirming === booking.id}
                onClick={() => void confirmBooking(booking)}
                className="btn-primary btn-sm shrink-0"
              >
                {confirming === booking.id ? "확인 중" : "입금 확인"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
