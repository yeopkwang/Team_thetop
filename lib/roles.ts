// 운영진 권한. 브라우저에서도 쓰므로 Prisma를 가져오지 않는다.
// 관리자(ADMIN·SUPER_ADMIN)는 모든 메뉴, 스태프(STAFF)는 입금·입장 확인과 예매자 목록만 쓴다.
export type StaffLevel = "admin" | "staff";

export function staffLevel(roles: readonly string[]): StaffLevel | null {
  if (roles.includes("ADMIN") || roles.includes("SUPER_ADMIN")) return "admin";
  if (roles.includes("STAFF")) return "staff";
  return null;
}

export const ROLE_INFO: Record<string, { label: string; description: string }> = {
  SUPER_ADMIN: { label: "관리자", description: "모든 메뉴를 쓸 수 있어요." },
  ADMIN: { label: "관리자", description: "모든 메뉴를 쓸 수 있어요. 계정도 만들고 지울 수 있어요." },
  STAFF: { label: "스태프", description: "입금·입장 확인과 예매자 목록만 볼 수 있어요. 공연 당일 입구 담당에게 주세요." },
};
