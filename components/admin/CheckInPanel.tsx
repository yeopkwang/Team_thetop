"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CameraIcon, CheckIcon } from "../icons";
import { apiFetch, errorMessage } from "@/lib/api-client";
import { bookingNumber, formatDateTime } from "@/lib/format";

type CheckInResponse = { checkedInAt: string; bookingId: string; name: string; kakaoName: string | null; showTitle: string };
type TicketRow = { bookingId: string; name: string; kakaoName: string | null; checkedInAt: string | null };

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

const SEARCH_LIMIT = 8;

// 입장 확인: 카메라로 관객의 QR을 찍는다. QR이 안 되면(휴대폰이 꺼졌거나 화면이 깨졌을 때) 이름·예매번호로 찾아 누른다.
export default function CheckInPanel() {
  const [query, setQuery] = useState("");
  // undefined: 불러오는 중, null: 못 불러옴
  const [tickets, setTickets] = useState<TicketRow[] | null | undefined>(undefined);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [scannerOn, setScannerOn] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");

  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const scanLockRef = useRef(false);

  const loadTickets = async () => {
    try {
      const data = await apiFetch<{ tickets: TicketRow[] }>("/admin/checkin");
      setTickets(data.tickets);
    } catch {
      // 명단을 못 받아도 QR 입장 확인은 쓸 수 있다
      setTickets((prev) => prev ?? null);
    }
  };

  useEffect(() => {
    void loadTickets();
    return () => {
      void stopScanner();
    };
  }, []);

  const processCheckIn = async (by: { qrToken: string } | { bookingId: string }) => {
    setOutcome(null);
    try {
      const data = await apiFetch<CheckInResponse>("/admin/checkin", { method: "POST", bodyJson: by });
      setOutcome({ ok: true, data });
      setQuery("");
    } catch (error: unknown) {
      setOutcome({ ok: false, message: errorMessage(error, "입장 확인을 처리하지 못했어요.") });
    }
    void loadTickets();
  };

  const matches = useMemo(() => {
    const q = query.replace(/\s+/g, "").toLowerCase();
    if (!q || !tickets) return [];
    return tickets.filter((t) =>
      [t.name, t.kakaoName || "", bookingNumber(t.bookingId)].some((v) => v.replace(/\s+/g, "").toLowerCase().includes(q))
    );
  }, [query, tickets]);

  const manualCheckIn = (t: TicketRow) => {
    if (!window.confirm(`${t.name}님(예매번호 ${bookingNumber(t.bookingId)})을 입장 처리할까요? 본인인지 이름을 확인해 주세요.`)) return;
    void processCheckIn({ bookingId: t.bookingId });
  };

  const entered = tickets?.filter((t) => t.checkedInAt).length ?? 0;

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
      setCameraMessage("이 브라우저는 카메라를 지원하지 않아요. 아래 칸에 이름이나 예매번호를 적어 찾아 주세요.");
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
        await processCheckIn({ qrToken: raw });
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
      setCameraMessage(errorMessage(error, "카메라를 켜지 못했어요. 카메라 권한을 확인해 주세요."));
    }
  };

  return (
    <section aria-labelledby="checkin-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="checkin-title" className="text-lead font-bold">
          입장 확인
        </h2>
        {tickets && (
          <p className="text-meta tabular-nums text-ink-3">
            입장 <strong className="font-semibold text-ink">{entered}</strong> / {tickets.length}명
          </p>
        )}
      </div>
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
                <strong className="text-lead font-bold">{outcome.data.name}</strong>님, 예매번호 {bookingNumber(outcome.data.bookingId)}
              </p>
              {outcome.data.kakaoName && outcome.data.kakaoName !== outcome.data.name && (
                <p className="text-meta text-ink-2">카카오 이름 {outcome.data.kakaoName}</p>
              )}
              <p className="text-meta text-ink-2">
                {outcome.data.showTitle}, {formatDateTime(outcome.data.checkedInAt)} 입장 처리
              </p>
            </>
          ) : (
            <p className="text-[15px] font-semibold">{outcome.message}</p>
          )}
        </div>
      )}

      <div className="mt-6 max-w-[400px]">
        <label htmlFor="checkin-search" className="text-meta font-semibold text-ink-2">
          QR이 안 되면 이름이나 예매번호로 찾기
        </label>
        <input
          id="checkin-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="입금자명, 카카오 이름, 예매번호"
          className="field mt-1.5"
          autoComplete="off"
        />
        {query.trim() && (
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {tickets === undefined && <li className="px-4 py-3 text-meta text-ink-3">명단을 불러오는 중이에요.</li>}
            {tickets === null && <li className="px-4 py-3 text-meta text-ink-3">명단을 불러오지 못했어요. 새로고침해 주세요.</li>}
            {tickets && matches.length === 0 && (
              <li className="px-4 py-3 text-meta text-ink-3">입금이 확인된 관객 중에 없어요. 입금 확인 목록이나 예매자 목록을 확인해 주세요.</li>
            )}
            {matches.slice(0, SEARCH_LIMIT).map((t) => (
              <li key={t.bookingId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-ui font-semibold">{t.name}</p>
                  <p className="text-cap text-ink-3">
                    {bookingNumber(t.bookingId)}
                    {t.kakaoName && t.kakaoName !== t.name && `, 카카오 ${t.kakaoName}`}
                  </p>
                </div>
                {t.checkedInAt ? (
                  <span className="shrink-0 text-cap text-ink-3">{formatDateTime(t.checkedInAt)} 입장</span>
                ) : (
                  <button type="button" onClick={() => manualCheckIn(t)} className="btn-secondary btn-sm shrink-0">
                    입장 처리
                  </button>
                )}
              </li>
            ))}
            {matches.length > SEARCH_LIMIT && (
              <li className="px-4 py-2.5 text-cap text-ink-3">{matches.length - SEARCH_LIMIT}명이 더 있어요. 더 자세히 적어 주세요.</li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
