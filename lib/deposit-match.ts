// 은행 앱에서 복사한 입금 내역과 입금 대기 예매를 맞춰 본다. 브라우저에서 쓴다.
// 은행마다 내역 모양이 달라서 줄을 해석하지 않고, 예매의 입금자명이 줄에 들어 있는지와
// 그 줄에 입금액과 같은 숫자가 있는지만 본다.
export type DepositCandidate = { id: string; depositorName: string; amount: number };

export type DepositLine<C extends DepositCandidate> =
  | { kind: "match"; line: string; booking: C } // 이름과 금액이 맞음
  | { kind: "amount"; line: string; booking: C } // 이름은 맞는데 금액이 다르거나 없음
  | { kind: "ambiguous"; line: string; name: string; bookings: C[] } // 같은 입금자명 예매가 여럿
  | { kind: "duplicate"; line: string; booking: C } // 앞 줄에서 이미 맞춘 예매에 또 들어온 입금
  | { kind: "none"; line: string }; // 맞는 예매가 없음

const squash = (s: string) => s.replace(/\s+/g, "");

// 줄에 있는 금액 후보. '잔액 107,000'처럼 통장 잔액은 입금액이 아니므로 빼고 본다.
export function amountsIn(line: string) {
  const withoutBalance = line.replace(/(잔액|잔고)\s*[:：]?\s*[\d,]+\s*원?/g, " ");
  return (withoutBalance.match(/\d{1,3}(?:,\d{3})+|\d+/g) || []).map((n) => Number(n.replace(/,/g, "")));
}

export function matchDeposits<C extends DepositCandidate>(text: string, bookings: C[]): DepositLine<C>[] {
  const byName = new Map<string, C[]>();
  for (const b of bookings) {
    const name = squash(b.depositorName);
    if (name.length < 2) continue; // 한 글자 이름은 아무 줄에나 걸린다
    byName.set(name, [...(byName.get(name) || []), b]);
  }
  // 긴 이름부터 찾아야 '김민수' 줄이 '민수' 예매에 걸리지 않는다.
  const names = Array.from(byName.keys()).sort((a, b) => b.length - a.length);
  const used = new Set<string>();

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !(line.includes("출금") && !line.includes("입금"))) // 나간 돈은 보지 않는다
    .map((line): DepositLine<C> => {
      const flat = squash(line);
      const name = names.find((n) => flat.includes(n));
      if (!name) return { kind: "none", line };
      const found = byName.get(name)!;
      if (found.length > 1) return { kind: "ambiguous", line, name, bookings: found };
      const booking = found[0];
      if (used.has(booking.id)) return { kind: "duplicate", line, booking };
      if (!amountsIn(line).includes(booking.amount)) return { kind: "amount", line, booking };
      used.add(booking.id);
      return { kind: "match", line, booking };
    });
}
