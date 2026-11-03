import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // 한국이 아닌 시간대의 컴퓨터에서 돌려도 한국 시간으로 계산되는지 보려고 일부러 미국 시간대로 돌린다.
    env: { TZ: "America/Los_Angeles" },
    coverage: {
      provider: "v8",
      // DB 없이 돌아가는 계산 모듈. DB를 쓰는 모듈은 tests/e2e(블랙박스)가 실제 API로 시험한다.
      include: [
        "lib/sales.ts",
        "lib/format.ts",
        "lib/deposit-match.ts",
        "lib/setlist.ts",
        "lib/setlist-edit.ts",
        "lib/credits.ts",
        "lib/safe-next.ts",
        "lib/login-errors.ts",
        "lib/jwt.ts",
        "lib/status.ts",
        "lib/inputs.ts",
        "lib/http.ts",
        "lib/reservations.ts",
        "lib/admin-shows.ts",
        "lib/calendar.ts",
        "lib/csv.ts",
        "lib/readiness.ts",
        "lib/faq.ts",
        "lib/roles.ts",
        "lib/cron.ts",
      ],
      reporter: ["text"],
    },
  },
});
