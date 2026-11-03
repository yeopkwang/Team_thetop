// 로그인 뒤 돌아갈 주소를 이 사이트 안의 경로로만 받는다.
// "/\evil.com"이나 탭 문자가 낀 "/\t/evil.com"도 브라우저는 다른 사이트(//evil.com)로 읽으므로,
// 문자열 모양이 아니라 실제로 해석한 주소의 출처(origin)를 비교한다.
export function sameOriginPath(raw: string | null | undefined, origin: string): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
