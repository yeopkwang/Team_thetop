# 공연 예약 웹 (Next.js + Prisma)

Next.js 14 App Router 기반 공연/티켓 예약 및 운영 대시보드. Prisma/PostgreSQL, NextAuth(Kakao), Tailwind를 사용합니다.

## 실행 방법
1) `.env` 생성: `.env.example`를 복사하고 값 채우기
2) 의존성 설치: `npm install`
3) DB 실행: `docker compose up -d`
4) 마이그레이션: `npx prisma migrate dev`
5) 시드: `npm run prisma:seed` (SUPER_ADMIN Kakao ID 필요)
6) 개발 서버: `npm run dev`

## 주요 스크립트
- `npm run dev` : Next.js 개발 서버
- `npm run build` / `npm start`
- `npm run prisma:migrate` : Prisma migrate dev
- `npm run prisma:seed` : 시드 실행
- `npm run prisma:studio` : Prisma Studio

## 환경 변수 (.env)
- `DATABASE_URL` : Postgres 연결 문자열
- `NEXTAUTH_SECRET` : NextAuth 암호화 키
- `NEXTAUTH_URL` : 예) http://localhost:3000
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`
- `SUPER_ADMIN_KAKAO_ID` : 시드 및 로그인 매칭용
- `PUBLIC_PAYMENT_ACCOUNT` : 안내용 계좌 문자열

## 데이터 모델 요약 (Prisma)
- 사용자/역할: `User`, `Role`, `UserRole(expiresAt/isActive)`, `RoleRequest`
- 공연/회차: `Show`, `ShowSession(totalCapacity/soldQty)`
- 예약/결제: `Reservation(status, expiresAt, paymentReviewStatus, note, reviewedBy...)`
- 티켓/검표: `Ticket(qrToken UNIQUE)`, `CheckIn`
- 환불: `Refund`, `RefundAccount`(환불 완료 시 삭제)
- 컨텐츠: `RecordPost`, `PhotoPost`, `PhotoAsset`, `TicketTemplate`
- 감사 로그: `AuditLog(action, entityType, before/after json, actor info)
- NextAuth: `Account`, `Session`, `VerificationToken`

## 핵심 API (요약)
- Auth: `/api/auth/[...nextauth]` (Kakao)
- 사용자: `GET /api/me`
- 예매: `GET /api/book/shows`, `POST /api/book/reservations`, `POST /api/book/reservations/[id]/mark-paid`
- 관리자/스탭: `GET /api/admin/reservations`, `POST /api/admin/reservations/[id]/confirm`, `POST /api/admin/checkin`
- 환불: `POST /api/refunds/request`, `POST /api/refunds/[id]/account`, `POST /api/admin/refunds/[id]/refund`
- 잡: `POST /api/admin/jobs/expire-reservations` (만료/롤 처리)
- 권한: `GET/POST/PATCH /api/admin/roles/requests`
- 기타: `GET/POST /api/admin/templates`, `POST /api/photo/upload`

## 시드 데이터
- Role 4종 생성
- SUPER_ADMIN 1명: `SUPER_ADMIN_KAKAO_ID` 기준 upsert
- 샘플 Show/Session, 글로벌 티켓 템플릿 `/public/ticket-template.png`

## 페이지 구조 (app/)
- `(public)/page.tsx` 메인
- `login`, `intro`, `book`, `mypage`, `myticket`
- `record`, `record/[id]`, `photo`, `photo/upload`
- `admin/*` 대시보드 (예약/환불/검표/템플릿/권한)

## 주의사항
- ADMIN 동시 2명 제한 (RoleRequest 승인 시 체크)
- 예약 24h 자동 만료: `/api/admin/jobs/expire-reservations`
- 환불 완료 시 티켓 REVOKED + RefundAccount 삭제
- 모든 보호 API는 역할 가드 사용 (USER/STAFF/ADMIN/SUPER_ADMIN)
