// 카카오 redirect_uri 등에 쓰는 서비스 주소. APP_URL이 없으면 요청이 들어온 주소를 쓴다.
export function getBaseUrl(req: Request) {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
