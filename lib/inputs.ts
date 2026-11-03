// API 요청 본문의 모양과 문구. 라우트는 readBody(req, 아래 스키마)로 읽는다. 따로 시험할 수 있게 한곳에 둔다.
import { z } from "zod";

// 한 줄 글: 앞뒤 공백을 지우고 가운데 공백은 하나로 줄인 뒤 길이를 본다.
const oneLine = (max: number, message: string) =>
  z
    .string({ invalid_type_error: message, required_error: message })
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, message).max(max, `${max}자 안으로 적어 주세요.`));

const id = (message: string) => z.string({ required_error: message, invalid_type_error: message }).trim().min(1, message).max(100, message);

export const bookingInput = z.object({
  sessionId: id("관람 회차를 골라 주세요."),
  quantity: z.literal(1, { errorMap: () => ({ message: "1인 1매만 예매할 수 있어요." }) }).default(1),
  preferredPerformerName: oneLine(50, "관심 있는 공연자를 골라 주세요. 없으면 '없음'을 골라 주세요."),
  depositorName: oneLine(20, "입금자명을 적어 주세요. 관람객 본인의 실명이어야 해요."),
});

export const refundInput = z.object({ reservationId: id("환불할 예매를 골라 주세요.") });

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

export const checkInInput = z.object({
  qrToken: z.string({ required_error: "QR을 찍거나 토큰을 적어 주세요." }).trim().min(1, "QR을 찍거나 토큰을 적어 주세요.").max(200),
});

export const loginInput = z.object({
  id: z.string({ required_error: "아이디와 비밀번호를 적어 주세요." }).trim().min(1, "아이디와 비밀번호를 적어 주세요.").max(100),
  password: z.string({ required_error: "아이디와 비밀번호를 적어 주세요." }).min(1, "아이디와 비밀번호를 적어 주세요.").max(200),
});
