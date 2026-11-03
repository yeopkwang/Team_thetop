// API 요청 본문의 모양과 문구. 라우트는 readBody(req, 아래 스키마)로 읽는다. 따로 시험할 수 있게 한곳에 둔다.
import { z } from "zod";

// 한 줄 글: 앞뒤 공백을 지우고 가운데 공백은 하나로 줄인 뒤 길이를 본다.
const oneLine = (max: number, message: string) =>
  z
    .string({ invalid_type_error: message, required_error: message })
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, message).max(max, `${max}자 안으로 적어 주세요.`));

const id = (message: string) => z.string({ required_error: message, invalid_type_error: message }).trim().min(1, message).max(100, message);

const depositorName = oneLine(20, "입금자명을 적어 주세요. 관람객 본인의 실명이어야 해요.");

export const bookingInput = z.object({
  sessionId: id("관람 회차를 골라 주세요."),
  quantity: z.literal(1, { errorMap: () => ({ message: "1인 1매만 예매할 수 있어요." }) }).default(1),
  preferredPerformerName: oneLine(50, "관심 있는 공연자를 골라 주세요. 없으면 '없음'을 골라 주세요."),
  depositorName,
});

// 입금 대기 중에 입금자명을 고친다(잘못 적었을 때).
export const depositorInput = z.object({ depositorName });

// 환불 요청과 환불받을 계좌. 계좌번호는 숫자와 -만 받고, 공백은 지운다.
export const refundInput = z.object({
  reservationId: id("환불할 예매를 골라 주세요."),
  bank: oneLine(20, "환불받을 은행을 적어 주세요."),
  account: z
    .string({ required_error: "환불받을 계좌번호를 적어 주세요.", invalid_type_error: "환불받을 계좌번호를 적어 주세요." })
    .transform((v) => v.replace(/\s+/g, ""))
    .pipe(
      z
        .string()
        .min(1, "환불받을 계좌번호를 적어 주세요.")
        .regex(/^[0-9-]+$/, "계좌번호는 숫자와 -만 적어 주세요.")
        .refine((v) => {
          const digits = v.replace(/-/g, "").length;
          return digits >= 6 && digits <= 20;
        }, "계좌번호 자릿수를 확인해 주세요.")
    ),
  holder: oneLine(20, "예금주를 적어 주세요."),
});

export const staffCancelInput = z.object({
  reason: z
    .string({ required_error: "취소 사유를 적어 주세요. 관객의 마이 티켓에 보여요." })
    .trim()
    .min(1, "취소 사유를 적어 주세요. 관객의 마이 티켓에 보여요.")
    .max(100, "취소 사유는 100자 안으로 적어 주세요."),
});

export const batchConfirmInput = z.object({
  ids: z
    .array(z.string().min(1), { required_error: "입금을 확인할 예매를 골라 주세요." })
    .min(1, "입금을 확인할 예매를 골라 주세요.")
    .max(200, "한 번에 200건까지 확인할 수 있어요."),
});

// 입장 확인: QR을 찍으면 qrToken, 이름·예매번호로 찾아 누르면 bookingId가 온다.
export const checkInInput = z
  .object({
    qrToken: z.string({ invalid_type_error: "QR을 다시 찍어 주세요." }).trim().max(200).optional(),
    bookingId: z.string({ invalid_type_error: "관객을 다시 골라 주세요." }).trim().max(100).optional(),
  })
  .refine((v) => Boolean(v.qrToken || v.bookingId), { message: "QR을 찍거나 관객을 골라 주세요." });

export const loginInput = z.object({
  id: z.string({ required_error: "아이디와 비밀번호를 적어 주세요." }).trim().min(1, "아이디와 비밀번호를 적어 주세요.").max(100),
  password: z.string({ required_error: "아이디와 비밀번호를 적어 주세요." }).min(1, "아이디와 비밀번호를 적어 주세요.").max(200),
});

// 운영진 계정. 아이디는 영문 소문자·숫자·._-, 비밀번호는 10자 이상.
const password = (label: string) =>
  z
    .string({ required_error: `${label}를 적어 주세요.`, invalid_type_error: `${label}를 적어 주세요.` })
    .min(10, `${label}는 10자 이상이어야 해요.`)
    .max(200, `${label}는 200자 안으로 적어 주세요.`);

export const accountCreateInput = z.object({
  username: z
    .string({ required_error: "아이디를 적어 주세요.", invalid_type_error: "아이디를 적어 주세요." })
    .trim()
    .toLowerCase()
    .min(3, "아이디는 3자 이상이어야 해요.")
    .max(30, "아이디는 30자 안으로 적어 주세요.")
    .regex(/^[a-z0-9._-]+$/, "아이디는 영문 소문자, 숫자, . _ -만 쓸 수 있어요."),
  name: oneLine(20, "이름을 적어 주세요. 작업 기록에 이 이름이 남아요."),
  password: password("임시 비밀번호"),
  role: z.enum(["ADMIN", "STAFF"], { errorMap: () => ({ message: "권한을 골라 주세요." }) }),
});

export const passwordResetInput = z.object({ password: password("새 비밀번호") });

export const passwordChangeInput = z.object({
  current: z.string({ required_error: "지금 비밀번호를 적어 주세요." }).min(1, "지금 비밀번호를 적어 주세요.").max(200),
  next: password("새 비밀번호"),
});
