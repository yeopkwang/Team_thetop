import { describe, expect, it } from "vitest";
import { normalizeSetlist, setlistFromText, setlistPerformers, songCount, splitNames } from "@/lib/setlist";
import { applyPaste, emptySong, fromEditSetlist, setlistColumns, toEditSetlist, type EditSection } from "@/lib/setlist-edit";

describe("normalizeSetlist", () => {
  it("배열이 아니면 빈 셋리스트", () => {
    expect(normalizeSetlist(null)).toEqual([]);
    expect(normalizeSetlist({})).toEqual([]);
    expect(normalizeSetlist("x")).toEqual([]);
  });
  it("곡명이 빈 곡, 이름이 빈 파트, 곡이 없는 묶음은 버린다", () => {
    const out = normalizeSetlist([
      { name: " 1부 ", songs: [{ title: " 첫 곡 ", artist: "A", lineup: [{ role: "보컬", names: ["가", " "] }, { role: "기타", names: [] }] }, { title: "  " }] },
      { name: "빈 묶음", songs: [] },
    ]);
    expect(out).toEqual([{ name: "1부", songs: [{ title: "첫 곡", artist: "A", lineup: [{ role: "보컬", names: ["가"] }] }] }]);
  });
  it("모양이 틀린 값(숫자, null)도 터지지 않고 버린다", () => {
    expect(normalizeSetlist([{ name: 3, songs: [null, { title: 5 }, { title: "곡", lineup: [null, { names: "x" }] }] }])).toEqual([
      { name: "", songs: [{ title: "곡", artist: "", lineup: [] }] },
    ]);
  });
  it("묶음 10개, 곡 60개, 길이 제한을 넘는 부분은 자른다", () => {
    const many = Array.from({ length: 12 }, () => ({ name: "x", songs: Array.from({ length: 70 }, () => ({ title: "가".repeat(150) })) }));
    const out = normalizeSetlist(many);
    expect(out).toHaveLength(10);
    expect(out[0].songs).toHaveLength(60);
    expect(out[0].songs[0].title).toHaveLength(100);
  });
});

describe("셋리스트 도우미", () => {
  const sections = normalizeSetlist([
    { name: "1부", songs: [{ title: "A", lineup: [{ role: "보컬", names: ["가", "나"] }] }, { title: "B", lineup: [{ role: "기타", names: ["나", "다"] }] }] },
    { name: "2부", songs: [{ title: "C" }] },
  ]);
  it("곡 수와 공연자(처음 나온 순서, 한 번씩)", () => {
    expect(songCount(sections)).toBe(3);
    expect(setlistPerformers(sections)).toEqual(["가", "나", "다"]);
  });
  it("이름 나누기: 쉼표·가운뎃점·빗금, 빈 이름 버림", () => {
    expect(splitNames("가, 나·다/라 ,, ")).toEqual(["가", "나", "다", "라"]);
  });
  it("공연정보 글의 # SETLIST 묶음을 옮겨 온다", () => {
    const text = "소개\n\n# SETLIST 1부\n1. 곡 하나 - 가수 - 피처링\n2) 곡 둘\n아무 줄\n\n# 다른 제목\n1. 무시될 곡\n\n# 셋리스트 2부\n1. 셋";
    expect(setlistFromText(text)).toEqual([
      { name: "1부", songs: [{ title: "곡 하나", artist: "가수 - 피처링", lineup: [] }, { title: "곡 둘", artist: "", lineup: [] }] },
      { name: "2부", songs: [{ title: "셋", artist: "", lineup: [] }] },
    ]);
  });
});

describe("셋리스트 표 편집", () => {
  const keys = ["title", "artist", "보컬", "기타"];
  const one: EditSection[] = [{ name: "1부", songs: [emptySong()] }];

  it("한 칸짜리 글은 그냥 붙여 넣게 null", () => {
    expect(applyPaste(one, 0, 0, keys, 0, "곡 하나")).toBeNull();
    expect(applyPaste(one, 0, 0, keys, 0, "곡 하나\n")).toBeNull();
  });
  it("시트 여러 줄을 곡명 칸부터 채우고, 모자란 줄은 곡을 늘린다", () => {
    const out = applyPaste(one, 0, 0, keys, 0, "곡1\t가수1\t가\t나\n곡2\t가수2\t다\n")!;
    expect(out[0].songs).toEqual([
      { title: "곡1", artist: "가수1", cells: { 보컬: "가", 기타: "나" } },
      { title: "곡2", artist: "가수2", cells: { 보컬: "다" } },
    ]);
    expect(one[0].songs[0].title).toBe(""); // 원래 값은 건드리지 않는다
  });
  it("맨 앞 열이 순번이면 버린다", () => {
    const out = applyPaste(one, 0, 0, keys, 0, "1\t곡1\t가수1\n2.\t곡2\t가수2")!;
    expect(out[0].songs.map((s) => [s.title, s.artist])).toEqual([["곡1", "가수1"], ["곡2", "가수2"]]);
  });
  it("제목 줄이 있으면 이름대로 열을 맞추고, 새 파트 열도 받는다", () => {
    const out = applyPaste(one, 0, 0, keys, 0, "번호\t곡명\t가수\t드럼\n1\t곡1\t가수1\t라")!;
    expect(out[0].songs[0]).toEqual({ title: "곡1", artist: "가수1", cells: { 드럼: "라" } });
  });
  it("중간 칸에 붙이면 그 칸부터 오른쪽으로 채운다", () => {
    const out = applyPaste(one, 0, 0, keys, 2, "가\t나\n다")!;
    expect(out[0].songs.map((s) => s.cells)).toEqual([{ 보컬: "가", 기타: "나" }, { 보컬: "다" }]);
  });
  it("열: 크레딧 파트 순서, 크레딧이 없으면 기본 파트, 칸에 적힌 다른 파트도 남긴다", () => {
    const withExtra: EditSection[] = [{ name: "", songs: [{ title: "곡", artist: "", cells: { 퍼커션: "가", 보컬: " " } }] }];
    expect(setlistColumns("기타: 가\n보컬: 나", withExtra)).toEqual(["기타", "보컬", "퍼커션"]);
    expect(setlistColumns("", [])).toEqual(["보컬", "기타", "베이스", "드럼", "키보드"]);
  });
  it("편집 형태 ↔ 저장 형태가 오간다(열 순서대로, 빈 칸은 빠진다)", () => {
    const edit: EditSection[] = [{ name: " 1부 ", songs: [{ title: " 곡 ", artist: "가수", cells: { 기타: "나, 다", 보컬: "가", 베이스: "" } }] }];
    const saved = fromEditSetlist(edit, ["보컬", "기타", "베이스"]);
    expect(saved).toEqual([{ name: "1부", songs: [{ title: "곡", artist: "가수", lineup: [{ role: "보컬", names: ["가"] }, { role: "기타", names: ["나", "다"] }] }] }]);
    expect(toEditSetlist(saved)[0].songs[0].cells).toEqual({ 보컬: "가", 기타: "나, 다" });
  });
});
