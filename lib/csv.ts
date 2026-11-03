// 엑셀에서 바로 열리는 CSV. 한글이 깨지지 않게 BOM을 붙이고, 줄은 CRLF로 끊는다.
// =, +, -, @로 시작하는 칸은 엑셀이 수식으로 실행하므로(관객이 입금자명에 수식을 넣을 수 있다) 앞에 '를 붙여 글자로 둔다.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
