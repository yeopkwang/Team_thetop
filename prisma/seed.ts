import { PrismaClient, RoleType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 공연 정보는 관리자 페이지(/admin/show)에서 채운다. 아래는 2026년 공연 안내문의 틀이고,
// ○ 표시는 해마다 바뀌는 값이다. 처음에는 공개하지 않은 상태(isActive: false)로 만든다.
const INTRO_TEXT = `반송고등학교 연합 밴드 '작전명문' ○번째 공연, 작전명문 ○

[작전명문 ○]는 동탄 반송고등학교 재학생과 졸업생이 함께 만드는 밴드 공연입니다.
2023년 첫 공연을 시작으로 선후배가 음악으로 교류하는 연례 무대를 만들어 나가고 있습니다.

# SETLIST 1부
1. 곡명 - 아티스트

# SETLIST 2부
1. 곡명 - 아티스트`;

const SALES_TEXT = `# 1. 공연 개요
- 공연 일시: ○○○○년 ○월 ○일 ○요일 ○시
- 공연 장소: ○○○
- 공연 구성
(1) ○시 ~ ○시 : 1부 공연
(2) ○시 ~ ○시 : 인터미션
(3) ○시 ~ ○시 : 2부 공연
(4) ○시 ~ ○시 : 무대 인사 및 사진 촬영
- 오시는 길
○○○

# 2. 관람료
저희 공연은 유료 공연으로 진행됩니다. 현장에서의 원활한 관객 본인 확인을 위해 입금자명은 반드시 관람객 본인의 실명(성 포함)으로 진행해주시기 바랍니다.
<입금 계좌: ○○은행 ○○○ (○○○)>
- 스탠딩석 : ○,○○○원
- 예매 후 입금 확인이 완료되면 QR 티켓이 발급됩니다.
※ 환불 기준 안내 ※
(1) ~ ○.○○ (○) 23:59 -> 납입금 전액 환불
(2) ○.○○ (○) 0:00 ~ ○.○○ (○) 23:59 -> 납입금 반액 환불
(3) ○.○○ (○) 이후 -> 환불 불가

# 3. 입장 안내
- ○시 ○분 입장 시작, ○시 입장 마감
- 입장 시 상주하는 공연자에게 예매 확인 QR 티켓을 보여주신 후 지류 티켓을 받고 입장해주세요.

# 4. 공연 진행 중 유의 사항
(1) 공연 특성상 광과민성 증후군을 가진 예민한 관람객들에게 영향을 줄 수 있는 조명 효과가 포함되어 있습니다.
(2) 원활한 공연 진행을 위해 공연장 내에서는 페트병에 담긴 생수를 제외한 음료 및 음식물 반입은 제한됩니다.
(3) 공연장 내부가 협소하여 별도의 물품 보관이 어렵습니다.

# 5. 공연 관련 문의
운영위원 ○○○ ☏ ○○○-○○○○-○○○○
공식 인스타그램 @band.bansong`;

async function seedRoles() {
  for (const type of Object.values(RoleType)) {
    await prisma.role.upsert({ where: { type }, update: {}, create: { type } });
  }
}

// 관리자 계정은 환경변수로만 만든다. 비밀번호를 코드에 적으면 공개 레포에 그대로 남는다.
async function seedAdmin() {
  const username = process.env.SEED_ADMIN_USERNAME?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!username || !password) {
    console.log("SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD가 없어서 관리자 계정은 건너뜁니다.");
    return;
  }
  if (password.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD는 10자 이상이어야 합니다.");
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { type: RoleType.ADMIN } });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: `${username}@admin.local` },
    update: {},
    create: { email: `${username}@admin.local`, name: "관리자", nickname: username },
  });
  await prisma.credential.upsert({
    where: { username },
    update: { passwordHash, userId: user.id },
    create: { username, passwordHash, userId: user.id },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId_isActive: { userId: user.id, roleId: adminRole.id, isActive: true } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  });
  console.log(`관리자 계정 '${username}'을(를) 만들었습니다.`);
}

async function seedShow() {
  if ((await prisma.show.count()) > 0) {
    console.log("공연이 이미 있어서 공연 틀은 만들지 않습니다.");
    return;
  }
  await prisma.show.create({
    data: {
      title: "작전명문 5",
      posterUrl: "/uploads/sample-poster.png",
      notice:
        "본 공연은 온라인 예매로 진행되며, 예매하신 티켓의 취소/환불 관련 사항은 공연 안내 규정에 따라 적용됩니다.",
      contactTag: "@band.bansong",
      introText: INTRO_TEXT,
      salesText: SALES_TEXT,
      isActive: false,
      sessions: {
        create: { title: "1회차", date: new Date("2027-02-21T09:00:00Z"), totalCapacity: 100 },
      },
    },
  });
  console.log("공연 틀을 만들었습니다(비공개). 관리자 페이지 > 공연 정보에서 채운 뒤 공개하세요.");
}

async function main() {
  await seedRoles();
  await seedAdmin();
  await seedShow();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
