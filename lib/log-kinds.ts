// 작업 기록을 거르는 종류. 서버(audit-log.ts)와 관리자 화면이 같이 쓴다.
export const LOG_KINDS = { booking: "예매·입금·입장", show: "공연", account: "계정·로그인" } as const;
export type LogKind = keyof typeof LOG_KINDS;
