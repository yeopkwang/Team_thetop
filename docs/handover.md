# 운영 인수인계

밴드 반송 공연 예매 사이트를 다음 사람에게 넘길 때 읽는 문서입니다.
관리자 화면 쓰는 법(입금 확인, 입장 확인, 환불)은 사이트의 **관리자 > 도움말**에 있습니다.
이 문서는 그 바깥, 즉 사이트가 어디서 돌아가고 무엇을 누가 쥐고 있는지를 다룹니다.

비밀번호·키 같은 비밀값은 이 문서에 적지 않습니다. 비밀값은 Vercel 환경변수와 각 서비스 계정 안에만 둡니다.

## 서비스 지도

| 무엇 | 어디 | 하는 일 |
| --- | --- | --- |
| 코드 | GitHub `yeopkwang/Team_thetop` | `main`에 올리면 운영 사이트가 자동으로 새로 배포됩니다 |
| 서버 | Vercel 프로젝트 `team-thetop` | 사이트를 띄웁니다. 서버 지역은 서울(`vercel.json`) |
| 도메인 | `www.band-bansong.life` | Vercel 프로젝트 > Settings > Domains에 연결돼 있습니다 |
| 데이터베이스 | Supabase 프로젝트(서울, 무료 플랜) | 공연·예매·계정이 모두 여기 있습니다 |
| 카카오 로그인 | Kakao Developers의 앱 | 관객 로그인. Redirect URI가 `https://www.band-bansong.life/api/auth/kakao/callback` |
| 하루 한 번 DB 깨우기 | Vercel Cron(`vercel.json`의 `crons`) | 무료 Supabase가 7일 동안 쓰이지 않아 멈추는 것을 막습니다 |

도메인을 산 곳과 만료일은 이 표 아래에 적어 두세요(해마다 갱신해야 합니다).

- 도메인 구입처:
- 도메인 만료일:

## 넘겨줄 때 할 일

넘기는 사람과 받는 사람이 같이 확인합니다.

- [ ] 관리자 화면 > 계정에서 받는 사람에게 **관리자** 계정을 만들어 주고, 받는 사람이 로그인해 비밀번호를 바꾼다
- [ ] GitHub 저장소에 받는 사람을 Collaborator로 추가한다(Settings > Collaborators)
- [ ] Vercel 프로젝트에 받는 사람을 추가한다(팀이 없으면 프로젝트를 받는 사람 계정으로 Transfer)
- [ ] Supabase 조직에 받는 사람을 Owner로 추가한다(Organization > Team)
- [ ] Kakao Developers 앱에 받는 사람을 팀원으로 추가한다(앱 > 팀 관리)
- [ ] 도메인 갱신을 누가 할지 정하고, 구입처 계정을 넘긴다
- [ ] 넘기는 사람의 관리자 계정은 받는 사람이 지운다(관리자 > 계정)

## 해마다 할 일

1. 도메인 만료일 확인, 갱신
2. Supabase 대시보드에서 프로젝트가 살아 있는지(Paused가 아닌지) 확인
3. 관리자 > 도움말의 '한 해 공연 순서'대로 새 공연 등록부터 판매 열기까지
4. 공연이 끝나면 아래 '백업'을 한 번 받아 두기

## 코드를 고치고 올리는 법

필요한 것: Node.js 20 이상, Docker(로컬 시험용 DB).

```bash
git clone https://github.com/yeopkwang/Team_thetop.git && cd Team_thetop
npm install
git switch -c fix/무엇을-고치는지        # main에서 바로 고치지 않는다
# ... 고친다 ...
npm test                                # 화이트박스 시험
docker compose up -d && npm run build
E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/e2edb npm run test:e2e   # 블랙박스 시험
```

두 시험이 통과하면 `main`에 합쳐 올립니다. 올리면 1~2분 뒤 운영 사이트에 반영됩니다.
`prisma/schema.prisma`(DB 구조)를 바꿨다면 올린 **바로 뒤에** 운영 DB에도 적용합니다.

```bash
# 운영 DB 주소는 Supabase > Connect에서 받는다. 이 명령은 운영 DB를 바꾸니 두 번 확인할 것.
DATABASE_URL="(운영 DATABASE_URL)" DIRECT_URL="(운영 DIRECT_URL)" npx prisma migrate deploy
```

`.env`라는 이름의 파일에 운영 주소를 넣어 두지 마세요. `npm run test:e2e`는 localhost DB만 쓰도록 막혀 있지만,
다른 prisma 명령은 `.env`를 자동으로 읽어서 운영 DB를 지울 수 있습니다.

## 환경변수

Vercel 프로젝트 > Settings > Environment Variables에 있습니다. 각 값의 뜻은 README의 '환경변수' 표를 보세요.
`JWT_SECRET`을 바꾸면 모든 로그인이 풀리고, `CRON_SECRET`을 바꾸면 다음 배포부터 새 값이 쓰입니다.

## 백업

무료 Supabase는 백업을 내려받을 수 없어서 직접 받아 둡니다. 공연이 끝난 뒤 한 번이면 충분합니다.

```bash
pg_dump "(운영 DIRECT_URL)" --no-owner --no-privileges -f backup-2027.sql
```

받은 파일에는 관객 이름이 들어 있으니 공개된 곳에 올리지 않습니다.

## 관리자 계정을 모두 잃었을 때

아무도 관리자 화면에 들어갈 수 없으면, 내 컴퓨터에서 시드를 운영 DB로 돌려 관리자 계정을 다시 만듭니다.
같은 아이디가 있으면 비밀번호만 바뀝니다.

```bash
DATABASE_URL="(운영 DATABASE_URL)" DIRECT_URL="(운영 DIRECT_URL)" \
SEED_ADMIN_USERNAME=새아이디 SEED_ADMIN_PASSWORD='10자 이상 비밀번호' npm run prisma:seed
```

시드는 기존 공연을 덮어쓰지 않습니다. 다만 '준비 중'이나 '판매 중'인 공연이 하나도 없으면 빈 공연 틀을 하나 만드니,
필요 없으면 공연 관리에서 지웁니다.

## 자주 생기는 문제

| 증상 | 먼저 볼 곳 |
| --- | --- |
| 사이트 전체가 '일시적인 문제' 오류 | Supabase 프로젝트가 Paused인지. 그렇다면 대시보드에서 Restore |
| 카카오 로그인 뒤 로그인 화면으로 돌아옴 | Kakao Developers의 Redirect URI, Vercel의 `KAKAO_CLIENT_ID`·`APP_URL` |
| 운영진 로그인이 '잠시 막아 뒀어요' | 같은 아이디로 비밀번호를 10번 틀림. 15분 기다리면 풀림 |
| DB 깨우기가 도는지 궁금함 | Vercel 프로젝트 > Settings > Cron Jobs의 실행 기록 |
| 배포가 실패함 | Vercel 프로젝트 > Deployments에서 실패한 배포의 Build Logs |

코드 구조와 시험 방법은 README에 있습니다.
