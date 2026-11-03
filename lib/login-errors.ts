// 로그인 화면 주소의 ?error= 값. 서버는 코드만 보내고 화면은 이 목록의 문구만 보여 준다
// (주소에 문장을 그대로 실으면 누구나 그럴듯한 가짜 안내를 띄운 링크를 만들 수 있다).
export const LOGIN_ERRORS = {
  kakao_config: "카카오 로그인 설정이 아직 안 됐어요. 운영진에게 알려 주세요.",
  kakao_denied: "카카오 로그인을 취소했어요.",
  kakao_failed: "카카오 로그인에 실패했어요. 잠시 뒤 다시 시도해 주세요.",
  admin_account: "운영진 계정은 아래 '운영진 로그인'으로 들어와 주세요.",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERRORS;

export function loginErrorMessage(code: string | null) {
  if (!code) return "";
  return LOGIN_ERRORS[code as LoginErrorCode] ?? LOGIN_ERRORS.kakao_failed;
}
