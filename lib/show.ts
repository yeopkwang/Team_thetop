import { prisma } from "./prisma";

// 홈·예매 화면에 나오는 공연: isActive인 공연 중 가장 최근에 만든 것.
export async function getCurrentShow() {
  return prisma.show.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { sessions: { orderBy: { date: "asc" } } },
  });
}

export type CurrentShow = NonNullable<Awaited<ReturnType<typeof getCurrentShow>>>;
