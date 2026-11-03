// 카카오 로그인 중에만 잠깐 쓰는 쿠키. 자바스크립트가 읽을 수 없고(httpOnly) 카카오 로그인 경로에만 붙는다.
//  - state: 로그인을 시작한 브라우저와 돌아온 브라우저가 같은지 확인한다(남이 만든 로그인 링크로 바꿔치기 방지).
//  - handoff: 로그인 토큰을 주소에 싣지 않고 이 쿠키로 넘긴 뒤, 로그인 화면이 한 번 받아 가면 지운다.
export const KAKAO_STATE_COOKIE = "kakao_state";
export const KAKAO_HANDOFF_COOKIE = "kakao_handoff";

export function kakaoCookie(base: string, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: base.startsWith("https://"),
    path: "/api/auth/kakao",
    maxAge,
  };
}
