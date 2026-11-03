import { PrismaClient, RoleType, ShowStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 공연 정보는 관리자 페이지 '공연 관리'(/admin/shows)에서 채운다. 아래는 2026년 공연 안내문의 틀이고,
// ○ 표시는 해마다 바뀌는 값이다. 새 공연은 준비 중(DRAFT) 상태로 만든다.
const INTRO_TEXT = `반송고등학교 연합 밴드 '작전명문' ○번째 공연, 작전명문 ○

[작전명문 ○]는 동탄 반송고등학교 재학생과 졸업생이 함께 만드는 밴드 공연입니다.
2023년 첫 공연을 시작으로 선후배가 음악으로 교류하는 연례 무대를 만들어 나가고 있습니다.`;

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
- 예매 후 ○시간 안에 입금하지 않으면 예매가 자동으로 만료됩니다.
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

// "1. 곡명 - 아티스트" 줄들을 셋리스트 곡으로 바꾼다. 곡별 크레딧(lineup)은 관리자 페이지에서 채운다.
const songs = (lines: string) =>
  lines
    .trim()
    .split("\n")
    .map((line) => {
      const [title, ...artist] = line.replace(/^\d+\.\s*/, "").split(" - ");
      return { title: title.trim(), artist: artist.join(" - ").trim(), lineup: [] };
    });

// 지난 공연. 4회는 2026년 공연 안내 페이지에 실렸던 내용이고, 1~3회는 제목과 연도, 임시 포스터만 넣어 둔다
// (2023년에 시작해 해마다 열린 것으로 보고 연도를 적었다). 나머지는 관리자 페이지에서 채운다.
// 회차 날짜는 지난 공연 목록의 순서를 정하는 데 쓰인다.
const PAST_SHOWS = [
  { id: "operation-moon-1", title: "작전명문 1", dateLabel: "2023년", date: "2023-02-01T09:00:00Z", posterUrl: "/posters/operation-moon-1.png" },
  { id: "operation-moon-2", title: "작전명문 2", dateLabel: "2024년", date: "2024-02-01T09:00:00Z", posterUrl: "/posters/operation-moon-2.png" },
  { id: "operation-moon-3", title: "작전명문 3", dateLabel: "2025년", date: "2025-02-01T09:00:00Z", posterUrl: "/posters/operation-moon-3.png" },
  {
    id: "operation-moon-4",
    title: "작전명문 4",
    dateLabel: "2026년 02월 22일 (일)",
    date: "2026-02-22T09:00:00Z",
    posterUrl: "/posters/operation-moon-4.jpg",
    timeLabel: "18:00 ~ 21:00",
    timeSubLabel: "인터미션 포함 / 입장 가능 17:30",
    venue: "공덕 DGT 아트센터",
    venueAddress: "서울특별시 마포구 독막로 308",
    audienceInfo: "관객 100명, 전원 스탠딩",
    price: 7000,
    contactTag: "@band.bansong",
    capacity: 106,
    introText: `반송고등학교 연합 밴드 '작전명문' 4번째 공연, 작전명문 4

[작전명문 4]는 동탄 반송고등학교 재학생과 졸업생이 함께 만든 밴드 공연입니다.
2023년 첫 공연을 시작으로 4년째 이어지며, 선후배가 음악으로 교류하는 연례 무대를 만들어 나가고 있습니다.`,
    setlist: [
      {
        name: "1부",
        songs: songs(`
1. 시간을 달리네 - 한로로
2. 여우야 - 더클래식
3. 못난이 - 루시
4. 물가의 라이온 - 쏜애플
5. 계속 웃을 순 없어 - 유다빈밴드
6. Likes & Hearts - Sonakonadore
7. 사랑이 잘 - 아이유, 혁오 (With. Sunset Rollercoaster)
8. 홍련화 - L!SA
9. 빨간 피터 - 쏜애플`),
      },
      {
        name: "2부",
        songs: songs(`
1. 사랑하게 될거야 - 한로로
2. Popo (How Deep Is Our Love?) - 백예린
3. Make Up (최예근 Ver.) - 샘김
4. She Used To Be Mine - Waitress
5. Toxic (Couch Ver.) - Britney Spears
6. SOME LIKE IT HOT!! - SPYAIR
7. 나는 최강 - Mrs. Green Apple
8. T + Tik Tak Tok - 실리카겔
9. 오늘이야 - 유다빈밴드`),
      },
    ],
  },
];

async function seedShows() {
  for (const { id, date, capacity, ...fields } of PAST_SHOWS) {
    if (await prisma.show.findUnique({ where: { id }, select: { id: true } })) continue;
    await prisma.show.create({
      data: {
        id,
        ...fields,
        status: ShowStatus.ENDED,
        sessions: { create: { title: "1회차", date: new Date(date), totalCapacity: capacity ?? 100 } },
      },
    });
    console.log(`지난 공연 '${fields.title}'을(를) 만들었습니다.`);
  }

  // 판매 중이거나 준비 중인 공연이 없을 때만 다음 공연 틀을 만든다.
  if ((await prisma.show.count({ where: { status: { not: ShowStatus.ENDED } } })) > 0) {
    console.log("준비 중이거나 판매 중인 공연이 있어서 새 공연 틀은 만들지 않습니다.");
    return;
  }
  await prisma.show.create({
    data: {
      title: "작전명문 5",
      posterUrl: "/posters/operation-moon-5.png",
      notice:
        "본 공연은 온라인 예매로 진행되며, 예매하신 티켓의 취소/환불 관련 사항은 공연 안내 규정에 따라 적용됩니다.",
      contactTag: "@band.bansong",
      introText: INTRO_TEXT,
      salesText: SALES_TEXT,
      status: ShowStatus.DRAFT,
      sessions: {
        create: { title: "1회차", date: new Date("2027-02-21T09:00:00Z"), totalCapacity: 100 },
      },
    },
  });
  console.log("새 공연 틀을 만들었습니다(준비 중). 관리자 페이지 > 공연 관리에서 채운 뒤 판매 중으로 바꾸세요.");
}

async function main() {
  await seedRoles();
  await seedAdmin();
  await seedShows();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
