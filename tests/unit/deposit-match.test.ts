import { describe, expect, it } from "vitest";
import { amountsIn, matchDeposits } from "@/lib/deposit-match";

const b = (id: string, depositorName: string, amount = 7000) => ({ id, depositorName, amount });

describe("amountsIn", () => {
  it("쉼표 금액과 그냥 숫자를 모두 읽는다", () => {
    expect(amountsIn("11.03 입금 7,000원 1234")).toEqual([11, 3, 7000, 1234]);
  });
  it("잔액·잔고 숫자는 입금액 후보에서 뺀다", () => {
    expect(amountsIn("입금 5,000 잔액 7,000")).toEqual([5000]);
    expect(amountsIn("입금 5,000 잔고: 7,000원")).toEqual([5000]);
  });
});

describe("matchDeposits", () => {
  const list = [b("a", "김민지"), b("b", "이서준"), b("c", "민수"), b("d", "김민수")];

  it("이름과 금액이 맞으면 match", () => {
    expect(matchDeposits("11.03 입금 김민지 7,000", list)).toEqual([{ kind: "match", line: "11.03 입금 김민지 7,000", booking: list[0] }]);
  });
  it("공백이 달라도 같은 이름으로 본다", () => {
    expect(matchDeposits("입금 이 서준 7000원", list)[0]).toMatchObject({ kind: "match", booking: list[1] });
  });
  it("금액이 다르면 amount(미리 고르지 않음)", () => {
    expect(matchDeposits("입금 김민지 5,000", list)[0]).toMatchObject({ kind: "amount", booking: list[0] });
  });
  it("잔액이 입금액과 같아도 맞다고 보지 않는다", () => {
    expect(matchDeposits("입금 김민지 5,000 잔액 7,000", list)[0]).toMatchObject({ kind: "amount" });
  });
  it("긴 이름부터 찾아서 '김민수' 줄이 '민수' 예매에 걸리지 않는다", () => {
    expect(matchDeposits("입금 김민수 7,000", list)[0]).toMatchObject({ kind: "match", booking: list[3] });
  });
  it("같은 입금자명 예매가 여럿이면 ambiguous", () => {
    const dup = [b("x", "박지호"), b("y", "박지호")];
    expect(matchDeposits("입금 박지호 7,000", dup)[0]).toMatchObject({ kind: "ambiguous", name: "박지호", bookings: dup });
  });
  it("이미 맞춘 예매에 또 들어온 입금은 duplicate", () => {
    const r = matchDeposits("입금 김민지 7,000\n입금 김민지 7,000", list);
    expect(r.map((l) => l.kind)).toEqual(["match", "duplicate"]);
  });
  it("앞 줄이 금액 불일치였으면 뒷줄의 맞는 입금이 match", () => {
    const r = matchDeposits("입금 김민지 5,000\n입금 김민지 7,000", list);
    expect(r.map((l) => l.kind)).toEqual(["amount", "match"]);
  });
  it("출금 줄은 건너뛰고, 모르는 이름은 none", () => {
    const r = matchDeposits("출금 김민지 7,000\n입금 홍길동 7,000\n\n   ", list);
    expect(r).toEqual([{ kind: "none", line: "입금 홍길동 7,000" }]);
  });
  it("한 글자 입금자명은 아무 줄에나 걸리므로 맞추지 않는다", () => {
    expect(matchDeposits("입금 김 7,000", [b("z", "김")])[0]).toMatchObject({ kind: "none" });
  });
});
