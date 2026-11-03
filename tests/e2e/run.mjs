// 블랙박스 시험 실행기.
//   E2E_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/e2edb npm run test:e2e
// 1) 그 DB를 비우고 마이그레이션과 시드를 다시 넣는다. 2) 빌드해 둔 앱(npm run build)을 3100번 포트에 띄운다.
// 3) blackbox.mjs를 돌린다. 4) 서버를 끈다.
// DB를 통째로 지우므로, 이 컴퓨터 안(localhost)의 DB가 아니면 돌지 않는다. 운영 DB 주소를 넣어도 막힌다.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dbUrl = process.env.E2E_DATABASE_URL;
if (!dbUrl) {
  console.error("E2E_DATABASE_URL을 넣어 주세요. 예: postgresql://postgres:postgres@localhost:5432/e2edb (docker compose up으로 띄운 DB)");
  process.exit(2);
}
const host = new URL(dbUrl).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  console.error(`시험 DB는 이 컴퓨터 안(localhost)이어야 해요. 받은 주소의 호스트: ${host}`);
  process.exit(2);
}
if (!existsSync(path.join(root, ".next/BUILD_ID"))) {
  console.error("먼저 npm run build로 앱을 빌드해 주세요.");
  process.exit(2);
}

const PORT = 3100;
const env = {
  ...process.env,
  DATABASE_URL: `${dbUrl}${dbUrl.includes("?") ? "&" : "?"}connection_limit=1`,
  DIRECT_URL: dbUrl,
  JWT_SECRET: "e2e-secret-for-blackbox-tests-0123456789abcdef",
  APP_URL: `http://localhost:${PORT}`,
  SEED_ADMIN_USERNAME: "admin",
  SEED_ADMIN_PASSWORD: "e2e-admin-pass-1234",
  KAKAO_CLIENT_ID: "e2e-kakao-client-id",
};
delete env.DEMO_LOGIN;

console.log("시험 DB를 비우고 마이그레이션·시드를 넣는 중…");
const reset = spawnSync("npx", ["prisma", "migrate", "reset", "--force", "--skip-generate"], { cwd: root, env, encoding: "utf8" });
if (reset.status !== 0) {
  console.error(reset.stdout, reset.stderr);
  process.exit(1);
}

console.log(`앱을 ${PORT}번 포트에 띄우는 중…`);
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"], detached: true });
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const stop = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    // 이미 꺼짐
  }
};

let ready = false;
for (let i = 0; i < 120 && !ready; i++) {
  await new Promise((r) => setTimeout(r, 500));
  ready = await fetch(`http://localhost:${PORT}/login`).then((r) => r.ok, () => false);
}
if (!ready) {
  console.error("앱이 뜨지 않았어요.\n" + serverLog);
  stop();
  process.exit(1);
}

const child = spawnSync("node", [path.join(root, "tests/e2e/blackbox.mjs")], {
  cwd: root,
  env: { ...env, E2E_BASE: `http://localhost:${PORT}`, E2E_DB: dbUrl },
  stdio: "inherit",
});
stop();
// 실패하면 서버 쪽 오류(500의 원인)를 같이 보여 준다.
if (child.status !== 0) console.error("\n--- 서버 기록(끝부분) ---\n" + (serverLog.slice(-6000) || "(없음)"));
process.exit(child.status ?? 1);
