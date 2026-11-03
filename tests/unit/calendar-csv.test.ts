import { describe, expect, it } from "vitest";
import { googleCalendarUrl, salesOpenEvent, showEndsAt, showEvent, toIcs } from "@/lib/calendar";
import { toCsv } from "@/lib/csv";

const START = new Date("2027-02-21T09:00:00Z"); // 한국 시간 18:00
const show = {
  id: "show1",
  title: "작전명문 5",
  venue: "반송 아트홀",
  venueAddress: "경기 화성시 동탄; 1, 2층",
  timeLabel: "18:00 ~ 21:00",
  startsAt: START,
  salesOpenAt: new Date("2027-01-10T03:00:00Z"),
};

describe("공연 끝 시각", () => {
  it("공연시간 문구의 끝 시각(한국 시간)을 쓴다", () => {
    expect(showEndsAt(START, "18:00 ~ 21:00").toISOString()).toBe("2027-02-21T12:00:00.000Z");
    expect(showEndsAt(START, "18:00-20:30").toISOString()).toBe("2027-02-21T11:30:00.000Z");
  });
  it("끝 시각이 시작보다 이르면 다음 날로 넘긴다", () => {
    const late = new Date("2027-02-21T13:00:00Z"); // 22:00
    expect(showEndsAt(late, "22:00 ~ 01:00").toISOString()).toBe("2027-02-21T16:00:00.000Z");
  });
  it("읽을 수 없으면 시작 뒤 2시간", () => {
    for (const label of ["", "저녁 공연", "18:00 ~ 25:00", "18:00 ~ 21:75"]) {
      expect(showEndsAt(START, label).toISOString()).toBe("2027-02-21T11:00:00.000Z");
    }
  });
});

describe(".ics 파일", () => {
  const ics = toIcs(showEvent(show, "https://www.band-bansong.life"), new Date("2026-11-05T00:00:00Z"));
  it("필수 줄과 UTC 시각, 알림", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("UID:show1-show@band-bansong");
    expect(ics).toContain("DTSTART:20270221T090000Z");
    expect(ics).toContain("DTEND:20270221T120000Z");
    expect(ics).toContain("TRIGGER:-PT120M");
  });
  it("; , 는 \\로 막는다(장소 칸이 쪼개지지 않게)", () => {
    expect(ics.replace(/\r\n /g, "")).toContain("LOCATION:반송 아트홀\\, 경기 화성시 동탄\\; 1\\, 2층");
  });
  it("모든 줄이 75바이트를 넘지 않는다(한글 포함)", () => {
    const long = toIcs({ ...showEvent(show, "https://x"), description: "가".repeat(100) });
    for (const line of long.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(long.replace(/\r\n /g, "")).toContain(`DESCRIPTION:${"가".repeat(100)}`);
  });
  it("오픈 알림은 오픈 일시가 있을 때만, 10분 전 알림", () => {
    expect(salesOpenEvent({ ...show, salesOpenAt: null }, "https://x")).toBeNull();
    const open = toIcs(salesOpenEvent(show, "https://x")!);
    expect(open).toContain("SUMMARY:작전명문 5 티켓 오픈");
    expect(open).toContain("TRIGGER:-PT10M");
    expect(open).toContain("URL:https://x/book");
  });
});

describe("구글 캘린더 링크", () => {
  it("제목·시각·장소를 주소에 담는다", () => {
    const url = new URL(googleCalendarUrl(showEvent(show, "https://x")));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("text")).toBe("작전명문 5");
    expect(url.searchParams.get("dates")).toBe("20270221T090000Z/20270221T120000Z");
    expect(url.searchParams.get("location")).toBe("반송 아트홀, 경기 화성시 동탄; 1, 2층");
    expect(url.searchParams.get("details")).toContain("https://x/myticket");
  });
});

describe("CSV(엑셀)", () => {
  const csv = toCsv([
    ["이름", "메모"],
    ["김민지", 'a,"b"\nc'],
    ["=HYPERLINK(\"http://evil\")", "+1"],
    ["-2", "@SUM(A1)"],
    [null, 7000],
  ]);
  it("BOM으로 시작하고 CRLF로 끝난다(엑셀에서 한글이 안 깨지게)", () => {
    expect(csv.startsWith("﻿이름,메모\r\n")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
  });
  it("쉼표·따옴표·줄바꿈이 든 칸은 따옴표로 감싼다", () => {
    expect(csv).toContain('김민지,"a,""b""\nc"');
  });
  it("=, +, -, @로 시작하는 칸은 수식으로 실행되지 않게 '를 붙인다", () => {
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")",'+1`);
    expect(csv).toContain("'-2,'@SUM(A1)");
  });
  it("빈 값은 빈칸, 숫자는 그대로", () => {
    expect(csv).toContain("\r\n,7000\r\n");
  });
});
