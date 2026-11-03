import type { Prisma } from "@prisma/client";

// 트랜잭션이 끝날 때까지 같은 key를 잡은 다른 트랜잭션을 기다리게 한다(행이 아니라 '작업 종류'를 한 줄로 세울 때).
export const LOCK_KEYS = { showWrites: 20270221, accounts: 20270222 } as const;

export async function advisoryLock(tx: Prisma.TransactionClient, key: number) {
  // pg_advisory_xact_lock은 void를 돌려줘서 Prisma가 읽지 못한다. 글자로 바꿔 받는다.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${key})::text AS locked`;
}

// 이름으로 잡는 잠금(예: "login:아이디"). 같은 이름끼리만 서로 기다린다.
export async function advisoryLockFor(tx: Prisma.TransactionClient, name: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${name}))::text AS locked`;
}
