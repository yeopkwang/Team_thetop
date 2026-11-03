// 크레딧(공연자 명단) 글을 표로 바꾼다. 브라우저에서도 쓰므로 서버 전용 모듈을 import하지 않는다.
// 한 줄에 "파트: 이름, 이름" 꼴로 쓴다. 콜론이 없는 줄은 파트 없이 이름만 있는 줄로 본다.
export type CreditRow = { role: string; names: string[] };

export function parseCredits(text: string): CreditRow[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.search(/[:：]/);
      const role = colon >= 0 ? line.slice(0, colon).trim() : "";
      const rest = colon >= 0 ? line.slice(colon + 1) : line;
      const names = rest
        .split(/[,，、·/]/)
        .map((name) => name.trim())
        .filter(Boolean);
      return { role, names };
    })
    .filter((row) => row.names.length > 0);
}

// 예매할 때 고르는 공연자 목록: 크레딧에 나온 이름을 처음 나온 순서대로 한 번씩.
export function performerNames(text: string): string[] {
  return Array.from(new Set(parseCredits(text).flatMap((row) => row.names)));
}
