import { PrismaClient, RoleType, TicketTemplateScope } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const superAdminKakaoId = process.env.SUPER_ADMIN_KAKAO_ID || "super-admin-kakao";

  // seed roles
  for (const type of Object.values(RoleType)) {
    await prisma.role.upsert({
      where: { type },
      update: {},
      create: { type },
    });
  }

  // seed super admin user
  const superAdmin = await prisma.user.upsert({
    where: { kakaoId: superAdminKakaoId },
    update: { name: "SUPER ADMIN" },
    create: {
      kakaoId: superAdminKakaoId,
      name: "SUPER ADMIN",
      nickname: "superadmin",
    },
  });

  const superRole = await prisma.role.findUnique({ where: { type: RoleType.SUPER_ADMIN } });
  if (superRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_isActive: { userId: superAdmin.id, roleId: superRole.id, isActive: true } },
      update: {},
      create: { userId: superAdmin.id, roleId: superRole.id },
    });
  }

  // sample show and session
  const sampleShow = await prisma.show.upsert({
    where: { id: "sample-show" },
    update: {},
    create: {
      id: "sample-show",
      title: "Sample Show",
      description: "테스트 공연",
      startDate: new Date(),
    },
  });

  await prisma.showSession.upsert({
    where: { id: "sample-session" },
    update: {},
    create: {
      id: "sample-session",
      showId: sampleShow.id,
      title: "1회차",
      date: new Date(Date.now() + 1000 * 60 * 60 * 24),
      totalCapacity: 100,
    },
  });

  await prisma.ticketTemplate.upsert({
    where: { id: "global-template" },
    update: {},
    create: {
      id: "global-template",
      scope: TicketTemplateScope.GLOBAL,
      imageUrl: "/ticket-template.png",
    },
  });

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
