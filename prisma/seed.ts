import { PrismaClient, RoleType, TicketTemplateScope } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  const userRole = await prisma.role.findUnique({ where: { type: RoleType.USER } });
  const adminRole = await prisma.role.findUnique({ where: { type: RoleType.ADMIN } });
  const superRole = await prisma.role.findUnique({ where: { type: RoleType.SUPER_ADMIN } });

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

  if (superRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_isActive: { userId: superAdmin.id, roleId: superRole.id, isActive: true } },
      update: {},
      create: { userId: superAdmin.id, roleId: superRole.id },
    });
  }

  // seed test login user (credentials: id: test / pw: test)
  const testPasswordHash = await bcrypt.hash("test", 10);
  const testUser = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: { name: "TEST USER", nickname: "test" },
    create: { email: "test@example.com", name: "TEST USER", nickname: "test" },
  });
  await prisma.credential.upsert({
    where: { username: "test" },
    update: { passwordHash: testPasswordHash, userId: testUser.id },
    create: { username: "test", passwordHash: testPasswordHash, userId: testUser.id },
  });
  if (userRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_isActive: { userId: testUser.id, roleId: userRole.id, isActive: true } },
      update: {},
      create: { userId: testUser.id, roleId: userRole.id },
    });
  }

  // predefined admin credential users
  const initialAdmins = [
    { username: "wkrwjs1", password: "audans1" },
    { username: "wkrwjs2", password: "audans2" },
    { username: "wkrwjs3", password: "audans3" },
    { username: "wkrwjs4", password: "audans4" },
    { username: "wkrwjs5", password: "audans5" },
    { username: "wkrwjs6", password: "audans6" },
  ];
  for (const [index, admin] of initialAdmins.entries()) {
    const adminUser = await prisma.user.upsert({
      where: { email: `${admin.username}@admin.local` },
      update: { name: `ADMIN ${index + 1}`, nickname: admin.username },
      create: {
        email: `${admin.username}@admin.local`,
        name: `ADMIN ${index + 1}`,
        nickname: admin.username,
      },
    });

    const passwordHash = await bcrypt.hash(admin.password, 10);
    await prisma.credential.upsert({
      where: { username: admin.username },
      update: { passwordHash, userId: adminUser.id },
      create: {
        username: admin.username,
        passwordHash,
        userId: adminUser.id,
      },
    });

    if (userRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId_isActive: { userId: adminUser.id, roleId: userRole.id, isActive: true } },
        update: {},
        create: { userId: adminUser.id, roleId: userRole.id },
      });
    }
    if (adminRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId_isActive: { userId: adminUser.id, roleId: adminRole.id, isActive: true } },
        update: {},
        create: { userId: adminUser.id, roleId: adminRole.id },
      });
    }
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

  // sample past shows for 홈 화면
  const pastShows = [
    {
      id: "past-1",
      title: "겨울 정기 공연",
      description: "지난 겨울 뜨거운 무대를 다시 보기",
      coverImage: "https://images.unsplash.com/photo-1507878866276-a947ef722fee",
      content: "겨울 정기 공연 하이라이트와 후기입니다.",
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120),
      endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 119),
      isActive: false,
    },
    {
      id: "past-2",
      title: "여름 콘서트",
      description: "여름밤을 달군 라이브",
      coverImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
      content: "여름 콘서트 포토/영상 모음",
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 240),
      endDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 239),
      isActive: false,
    },
  ];
  for (const show of pastShows) {
    await prisma.show.upsert({
      where: { id: show.id },
      update: show,
      create: show,
    });
  }

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
