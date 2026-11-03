import { describe, expect, it } from "vitest";
import { isCronRequest } from "@/lib/cron";

const secret = "cron-secret-for-unit-tests-0123456789";

describe("isCronRequest", () => {
  it("Bearer 뒤에 같은 값이면 통과", () => {
    expect(isCronRequest(`Bearer ${secret}`, secret)).toBe(true);
  });
  it("헤더가 없거나, 값이 다르거나, 한 글자라도 더 붙으면 막는다", () => {
    expect(isCronRequest(null, secret)).toBe(false);
    expect(isCronRequest("", secret)).toBe(false);
    expect(isCronRequest(secret, secret)).toBe(false);
    expect(isCronRequest(`Bearer ${secret.slice(0, -1)}x`, secret)).toBe(false);
    expect(isCronRequest(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isCronRequest(`bearer ${secret}`, secret)).toBe(false);
  });
  it("서버에 비밀값이 없거나 짧으면 열어 두지 않고 오류를 낸다", () => {
    expect(() => isCronRequest(`Bearer `, "")).toThrow("CRON_SECRET");
    expect(() => isCronRequest("Bearer short", "short")).toThrow("CRON_SECRET");
  });
});
