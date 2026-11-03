// 관리자 셋리스트 표 편집용 계산. 화면(SetlistEditor)과 떨어뜨려 두어서 따로 시험할 수 있다.
import { parseCredits } from "./credits";
import { splitNames, type SetlistSection } from "./setlist";

// 편집하는 동안에는 칸에 적은 글을 그대로 들고 있다("홍길동, " 처럼 쉼표까지 쳐 둔 상태도 지켜야 해서).
export type EditSong = { title: string; artist: string; cells: Record<string, string> };
export type EditSection = { name: string; songs: EditSong[] };

const DEFAULT_ROLES = ["보컬", "기타", "베이스", "드럼", "키보드"];
const TITLE_HEADER = /^(곡명|곡|제목|노래)$/;
const ARTIST_HEADER = /^(아티스트|가수|원곡|원곡자)$/;
const NUMBER_HEADER = /^(번호|순서|no\.?|#)$/i;

export const emptySong = (): EditSong => ({ title: "", artist: "", cells: {} });

export function toEditSetlist(sections: SetlistSection[]): EditSection[] {
  return sections.map((s) => ({
    name: s.name,
    songs: s.songs.map((song) => ({
      title: song.title,
      artist: song.artist,
      cells: Object.fromEntries(song.lineup.map((row) => [row.role, row.names.join(", ")])),
    })),
  }));
}

// 표의 열(파트): 크레딧에 적은 파트 순서대로, 크레딧이 비어 있으면 밴드 기본 파트. 칸에 이미 적힌 다른 파트도 지우지 않고 보여 준다.
export function setlistColumns(credits: string, sections: EditSection[]) {
  const fromCredits = parseCredits(credits)
    .map((row) => row.role)
    .filter(Boolean);
  const used = sections.flatMap((s) => s.songs.flatMap((song) => Object.keys(song.cells).filter((role) => song.cells[role].trim())));
  return Array.from(new Set([...(fromCredits.length ? fromCredits : DEFAULT_ROLES), ...used]));
}

export function fromEditSetlist(sections: EditSection[], columns: string[]): SetlistSection[] {
  return sections.map((s) => ({
    name: s.name.trim(),
    songs: s.songs.map((song) => ({
      title: song.title.trim(),
      artist: song.artist.trim(),
      lineup: columns.map((role) => ({ role, names: splitNames(song.cells[role] || "") })).filter((row) => row.names.length > 0),
    })),
  }));
}

export function readCell(song: EditSong, key: string) {
  return key === "title" ? song.title : key === "artist" ? song.artist : song.cells[key] || "";
}

export function writeCell(song: EditSong, key: string, text: string) {
  if (key === "title") song.title = text;
  else if (key === "artist") song.artist = text;
  else song.cells[key] = text;
}

// 고치기 전 표를 깊게 복사한다(React 상태를 직접 바꾸지 않으려고).
export function cloneSetlist(sections: EditSection[]): EditSection[] {
  return sections.map((s) => ({ ...s, songs: s.songs.map((song) => ({ ...song, cells: { ...song.cells } })) }));
}

// 엑셀·구글 시트에서 복사한 여러 칸(탭·줄바꿈으로 나뉜 글)을 si번째 묶음 gi번째 곡의 keys[ki] 칸부터 채운다.
// 한 칸짜리 글이면 null(그냥 붙여 넣으면 된다). keys는 ["title", "artist", ...파트].
export function applyPaste(sections: EditSection[], si: number, gi: number, keys: string[], ki: number, text: string): EditSection[] | null {
  if (!/[\t\n]/.test(text.trim())) return null;
  let rows = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.split("\t").map((c) => c.trim()))
    .filter((row) => row.some(Boolean));
  if (rows.length === 0) return null;

  // 첫 줄이 '곡명 | 아티스트 | 보컬 ...' 같은 제목 줄이면 그 이름대로 열을 맞춘다.
  let target: (string | null)[];
  if (TITLE_HEADER.test(rows[0][0]) || (NUMBER_HEADER.test(rows[0][0]) && TITLE_HEADER.test(rows[0][1] || ""))) {
    target = rows[0].map((h) => (TITLE_HEADER.test(h) ? "title" : ARTIST_HEADER.test(h) ? "artist" : NUMBER_HEADER.test(h) || !h ? null : h));
    rows = rows.slice(1);
  } else {
    // 곡명 칸에 붙였는데 맨 앞 열이 전부 숫자면 순번 열로 보고 버린다.
    if (keys[ki] === "title" && rows.every((row) => /^\d+\.?$/.test(row[0]) && row.length > 1)) rows = rows.map((row) => row.slice(1));
    target = keys.slice(ki);
  }

  const draft = cloneSetlist(sections);
  const songs = draft[si].songs;
  while (songs.length < gi + rows.length) songs.push(emptySong());
  rows.forEach((row, r) => row.forEach((value, c) => target[c] && writeCell(songs[gi + r], target[c] as string, value)));
  return draft;
}
