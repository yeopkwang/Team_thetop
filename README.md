# 작전명문 공연 예매

밴드 반송(작전명문) 연례 공연의 온라인 예매·입금 확인·QR 검표·환불을 처리하는 웹앱입니다.
운영 주소는 https://www.band-bansong.life 입니다.

- Next.js 14 (App Router) + Tailwind
- Prisma + PostgreSQL (운영은 Supabase)
- 일반 사용자는 카카오 로그인, 관리자는 ID/비밀번호 로그인. 로그인 토큰은 직접 서명하는 JWT입니다.
- 배포는 Vercel

## 흐름

1. 관객이 카카오로 로그인하고 예매합니다. 1인 1매, 예매하면 `PAYMENT_PENDING`(예매 대기) 상태가 됩니다.
2. 관객이 안내된 계좌로 입금합니다.
3. 관리자가 관리자 페이지에서 입금을 확인하고 승인하면 `CONFIRMED`가 되고 QR 티켓이 발급됩니다.
4. 공연 당일 관리자 페이지의 카메라로 QR을 찍어 입장 처리합니다.
5. 환불은 관객이 '내 티켓'에서 요청(`REFUND_PENDING`, 이때 좌석이 풀림)하고, 관리자가 송금 후 '환불 완료'를 누릅니다.

## 새 공연 준비하기

공연 제목, 일시, 장소, 관람료, 입금 계좌, 정원, 셋리스트·판매 안내문은 코드가 아니라 DB에 있습니다.
관리자로 로그인한 뒤 **관리자 페이지 > 공연 정보**(`/admin/show`)에서 고치고 저장하면 바로 반영됩니다.

- '공개하고 예매 받기'를 끄면 공연 안내에 "지금 예매 중인 공연이 없어요"가 뜨고 예매도 막힙니다. 첫 화면은 "다음 공연을 준비하고 있어요"로 바뀝니다.
- 긴 안내문은 빈 줄로 칸을 나누고, 칸 첫 줄을 `# 제목`으로 쓰면 제목 붙은 상자로 보입니다.
- 포스터는 `public/uploads/`에 파일을 넣고 `/uploads/파일명.png`로 적거나, 외부 이미지 주소를 적습니다.
- 지난 공연 예매 기록을 지우려면 `docs/supabase-reset-sales.sql`을 Supabase SQL Editor에서 실행합니다.

## 로컬 실행

```bash
cp .env.example .env          # 값 채우기 (아래 표)
npm install
docker compose up -d          # 로컬 Postgres. Supabase를 쓰면 생략
npm run prisma:deploy         # 마이그레이션 적용
npm run prisma:seed           # 역할, 관리자 계정, 비공개 공연 틀 생성
npm run dev                   # http://localhost:3000
```

## 환경변수

| 이름 | 설명 |
| --- | --- |
| `DATABASE_URL` | 앱이 쓰는 DB 주소. Supabase는 트랜잭션 풀러(6543) + `pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | 마이그레이션용 DB 주소. Supabase는 세션 연결(5432) |
| `APP_URL` | 서비스 주소(끝에 `/` 없이). 카카오 Redirect URI가 `APP_URL/api/auth/kakao/callback` |
| `JWT_SECRET` | 로그인 토큰 서명 키. 32자 이상 무작위 문자열. 없으면 로그인이 동작하지 않습니다 |
| `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET` | 카카오 REST API 키 / Client Secret |
| `KAKAO_LOGOUT_REDIRECT_URI` | 카카오 로그아웃 뒤 돌아올 주소. 카카오 콘솔에 등록 필요 |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | `npm run prisma:seed`가 만드는 관리자 계정(비밀번호 10자 이상). 시드 때만 필요 |

`JWT_SECRET`을 바꾸면 기존 로그인은 모두 풀립니다.

## 배포 (Vercel + Supabase)

1. Supabase에서 프로젝트를 만들고 연결 문자열 두 개를 받습니다.
2. 내 컴퓨터에서 `.env`에 그 값을 넣고 `npm run prisma:deploy`, `npm run prisma:seed`를 실행합니다.
3. Vercel 프로젝트 환경변수에 `DATABASE_URL`, `DIRECT_URL`, `APP_URL`, `JWT_SECRET`, 카카오 값 3개를 넣습니다.
4. 카카오 개발자 콘솔에 Redirect URI와 로그아웃 Redirect URI를 등록합니다.
5. Vercel이 배포하는 브랜치에 푸시합니다. 빌드는 `prisma generate && next build`입니다.

Supabase 무료 플랜은 오래 안 쓰면 프로젝트가 일시정지됩니다. 판매 시작 전에 대시보드에서 살아 있는지 확인하세요.

## 폴더

```
app/
  page.tsx                             첫 화면 (예매하기 / 공연 안내 버튼)
  show/, book/, myticket/, login/      관객 화면 (공연 안내, 예매, 마이 티켓, 로그인)
  admin/                               관리자 화면 (QR 검표·입금 확인, 예매자 목록, 환불, 공연 정보)
  api/                                 라우트 핸들러
components/                            화면 조각 (공연 정보 카드, 예매 폼, 관리자 메뉴 등)
lib/
  auth-helpers.ts, jwt.ts              로그인 확인과 역할 검사
  show.ts                              지금 공개 중인 공연 조회
  reservations.ts                      좌석을 차지하는 예매 상태 목록
  api-client.ts                        브라우저에서 API를 부르는 fetch 래퍼(토큰을 붙임)
prisma/                                스키마, 마이그레이션, 시드
docs/                                  운영용 SQL
```

## 알아둘 점

- 예매는 회차 행을 잠그고(`SELECT ... FOR UPDATE`) 처리해서, 동시에 몰려도 정원과 1인 1매를 넘지 않습니다.
- 예매 대기 상태에는 24시간 뒤의 `expiresAt`이 기록되지만, 자동으로 만료시키는 작업은 없습니다.
  입금을 늦게 확인한 예매가 취소되는 일을 막기 위해서입니다. 미입금 예매는 관객이 '내 티켓'에서 직접 취소해야 하고,
  관리자 화면에는 아직 대신 취소하는 버튼이 없습니다.
- 관리자 계정은 카카오로 로그인할 수 없고, 일반 계정은 ID/비밀번호로 로그인할 수 없습니다.
- 승인, 검표, 환불, 공연 정보 수정은 `AuditLog` 테이블에 남습니다.
