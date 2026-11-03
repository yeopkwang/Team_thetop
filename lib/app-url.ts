// 카카오 redirect_uri 등에 쓰는 서비스 주소. NEXTAUTH_URL은 예전 이름이라 대신 읽어 준다.
export function getBaseUrl(req: Request) {
  const configured = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
